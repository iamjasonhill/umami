import { z } from 'zod';
import { isbot } from 'isbot';
import { startOfHour, startOfMonth } from 'date-fns';
import { Prisma } from '@prisma/client';
import clickhouse from '@/lib/clickhouse';
import prisma from '@/lib/prisma';
import { parseRequest } from '@/lib/request';
import { badRequest, json, forbidden, serverError } from '@/lib/response';
import { fetchWebsite } from '@/lib/load';
import { getClientInfo, hasBlockedIp } from '@/lib/detect';
import { createToken, parseToken } from '@/lib/jwt';
import { secret, uuid, hash } from '@/lib/crypto';
import { COLLECTION_TYPE } from '@/lib/constants';
import { anyObjectParam, urlOrPathParam } from '@/lib/schema';
import { safeDecodeURI, safeDecodeURIComponent } from '@/lib/url';
import { createSession, saveEvent, saveSessionData } from '@/queries';
import { loadAttributionConfig } from '@/lib/attribution/config';
import { normalizeAttributionInput } from '@/lib/attribution/normalize';
import { classifyAttribution } from '@/lib/attribution/classifier';

type TrackingContext = {
  urlPath: string;
  urlQuery: string;
  urlDomain: string;
  referrerDomain?: string;
  referrerPath?: string;
  referrerQuery?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  lifatid?: string;
  twclid?: string;
};

type TrackingContextInput = {
  url?: string | null;
  hostname?: string;
  referrer?: string | null;
  data?: Record<string, any> | null;
  removeTrailingSlash: boolean;
};

function buildTrackingContext({
  url,
  hostname,
  referrer,
  data,
  removeTrailingSlash,
}: TrackingContextInput): TrackingContext {
  const base = hostname ? `https://${hostname}` : 'https://localhost';

  let currentUrl: URL | null = null;

  if (url) {
    try {
      currentUrl = new URL(url, base);
    } catch {
      currentUrl = null;
    }
  }

  let referrerUrl: URL | null = null;

  if (referrer) {
    try {
      referrerUrl = new URL(referrer, base);
    } catch {
      referrerUrl = null;
    }
  }

  let urlPath = '';

  if (currentUrl) {
    urlPath = currentUrl.pathname === '/undefined' ? '' : currentUrl.pathname + currentUrl.hash;
  }

  if (removeTrailingSlash) {
    urlPath = urlPath.replace(/\/(?=(#.*)?$)/, '');
  }

  const urlQuery = currentUrl?.search.substring(1) ?? '';
  const urlDomain =
    currentUrl?.hostname.replace(/^www\./, '') ?? hostname?.replace(/^www\./, '') ?? 'localhost';

  const derivedReferrerDomain = (() => {
    const fromData = data?.referrerDomain as string | undefined;

    if (fromData) {
      return fromData;
    }

    if (referrerUrl?.hostname && referrerUrl.hostname !== 'localhost') {
      return referrerUrl.hostname.replace(/^www\./, '');
    }

    return undefined;
  })();

  const referrerPath =
    (data?.referrerPath as string | undefined) ?? referrerUrl?.pathname ?? undefined;
  const referrerQuery = referrerUrl?.search.substring(1) ?? undefined;

  const searchParams = currentUrl?.searchParams;

  const utmSource =
    (data?.utmSource as string | undefined) ?? searchParams?.get('utm_source') ?? undefined;
  const utmMedium =
    (data?.utmMedium as string | undefined) ?? searchParams?.get('utm_medium') ?? undefined;
  const utmCampaign =
    (data?.utmCampaign as string | undefined) ?? searchParams?.get('utm_campaign') ?? undefined;
  const utmContent =
    (data?.utmContent as string | undefined) ?? searchParams?.get('utm_content') ?? undefined;
  const utmTerm =
    (data?.utmTerm as string | undefined) ?? searchParams?.get('utm_term') ?? undefined;

  const gclid = searchParams?.get('gclid') ?? undefined;
  const fbclid = searchParams?.get('fbclid') ?? undefined;
  const msclkid = searchParams?.get('msclkid') ?? undefined;
  const ttclid = searchParams?.get('ttclid') ?? undefined;
  const lifatid = searchParams?.get('li_fat_id') ?? undefined;
  const twclid = searchParams?.get('twclid') ?? undefined;

  return {
    urlPath,
    urlQuery,
    urlDomain,
    referrerDomain: derivedReferrerDomain,
    referrerPath,
    referrerQuery,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    fbclid,
    msclkid,
    ttclid,
    lifatid,
    twclid,
  };
}

const schema = z.object({
  type: z.enum(['event', 'identify']),
  payload: z.object({
    website: z.string().uuid(),
    data: anyObjectParam.optional(),
    hostname: z.string().max(100).optional(),
    language: z.string().max(35).optional(),
    referrer: urlOrPathParam.optional(),
    screen: z.string().max(11).optional(),
    title: z.string().optional(),
    url: urlOrPathParam.optional(),
    name: z.string().max(50).optional(),
    tag: z.string().max(50).optional(),
    ip: z.string().ip().optional(),
    userAgent: z.string().optional(),
    timestamp: z.coerce.number().int().optional(),
    id: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const { body, error } = await parseRequest(request, schema, { skipAuth: true });

    if (error) {
      return error();
    }

    const { type, payload } = body;

    const {
      website: websiteId,
      hostname,
      screen,
      language,
      url,
      referrer,
      name,
      data,
      title,
      tag,
      timestamp,
      id,
    } = payload;

    const refererHeader = request.headers.get('referer') ?? undefined;
    const tracking = buildTrackingContext({
      url,
      hostname,
      referrer: referrer ?? refererHeader,
      data,
      removeTrailingSlash: Boolean(process.env.REMOVE_TRAILING_SLASH),
    });

    // Cache check
    let cache: { websiteId: string; sessionId: string; visitId: string; iat: number } | null = null;
    const cacheHeader = request.headers.get('x-umami-cache');

    if (cacheHeader) {
      const result = await parseToken(cacheHeader, secret());

      if (result) {
        cache = result;
      }
    }

    // Find website
    if (!cache?.websiteId) {
      const website = await fetchWebsite(websiteId);

      if (!website) {
        return badRequest('Website not found.');
      }
    }

    // Client info
    const { ip, userAgent, device, browser, os, country, region, city } = await getClientInfo(
      request,
      payload,
    );

    // Bot check
    if (!process.env.DISABLE_BOT_CHECK && isbot(userAgent)) {
      return json({ beep: 'boop' });
    }

    // IP block
    if (hasBlockedIp(ip)) {
      return forbidden();
    }

    const createdAt = timestamp ? new Date(timestamp * 1000) : new Date();
    const now = Math.floor(new Date().getTime() / 1000);

    const sessionSalt = hash(startOfMonth(createdAt).toUTCString());
    const visitSalt = hash(startOfHour(createdAt).toUTCString());

    const sessionId = id ? uuid(websiteId, id) : uuid(websiteId, ip, userAgent, sessionSalt);

    // Create a session if not found
    let attribution;
    let attributionConfig: Awaited<ReturnType<typeof loadAttributionConfig>> | null = null;

    if (!clickhouse.enabled && !cache?.sessionId) {
      attributionConfig = await loadAttributionConfig();

      const normalized = normalizeAttributionInput({
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
        utmTerm: tracking.utmTerm,
        referrerHost: tracking.referrerDomain,
        userAgent,
      });

      attribution = classifyAttribution(normalized, attributionConfig.config);

      const sessionCreateInput = {
        id: sessionId,
        websiteId,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,
        distinctId: id,
        rawSource: normalized.utmSource,
        rawMedium: normalized.utmMedium,
        rawCampaign: normalized.utmCampaign,
        rawContent: normalized.utmContent,
        rawTerm: normalized.utmTerm,
        rawReferrerDomain: normalized.referrerHost,
        rawReferrerPath: tracking.referrerPath,
        userAgent,
        attributionVersion: attributionConfig.version,
        channelFirst: attribution.channel,
        channelLast: attribution.channel,
        channelStrengthFirst: attribution.strength,
        channelStrengthLast: attribution.strength,
        channelReason: attribution.reasons as Prisma.InputJsonValue,
      } as Prisma.SessionUncheckedCreateInput;

      await createSession(sessionCreateInput, { skipDuplicates: true });
    }

    // Visit info
    let visitId = cache?.visitId || uuid(sessionId, visitSalt);
    let iat = cache?.iat || now;

    // Expire visit after 30 minutes
    if (!timestamp && now - iat > 1800) {
      visitId = uuid(sessionId, visitSalt);
      iat = now;
    }

    if (type === COLLECTION_TYPE.event) {
      const {
        urlPath,
        urlQuery,
        urlDomain,
        referrerDomain: resolvedReferrerDomain,
        referrerPath,
        referrerQuery,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        gclid,
        fbclid,
        msclkid,
        ttclid,
        lifatid,
        twclid,
      } = tracking;

      const configResult = attributionConfig ?? (await loadAttributionConfig());
      const normalized = normalizeAttributionInput({
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        referrerHost: resolvedReferrerDomain,
        userAgent,
      });

      const classification = classifyAttribution(normalized, configResult.config);

      if (!clickhouse.enabled) {
        const session = await prisma.client.session.findUnique({
          where: { id: sessionId },
          select: {
            channelLast: true,
            channelStrengthLast: true,
          },
        });

        const sessionUpdate: Prisma.SessionUncheckedUpdateInput = {};

        if (normalized.utmSource !== undefined) {
          Object.assign(sessionUpdate, { rawSource: normalized.utmSource });
        }

        if (normalized.utmMedium !== undefined) {
          Object.assign(sessionUpdate, { rawMedium: normalized.utmMedium });
        }

        if (normalized.utmCampaign !== undefined) {
          Object.assign(sessionUpdate, { rawCampaign: normalized.utmCampaign });
        }

        if (normalized.utmContent !== undefined) {
          Object.assign(sessionUpdate, { rawContent: normalized.utmContent });
        }

        if (normalized.utmTerm !== undefined) {
          Object.assign(sessionUpdate, { rawTerm: normalized.utmTerm });
        }

        if (normalized.referrerHost !== undefined) {
          Object.assign(sessionUpdate, { rawReferrerDomain: normalized.referrerHost });
        }

        const currentStrength = session?.channelStrengthLast ?? -1;
        const shouldUpdateChannel =
          session === null ||
          session === undefined ||
          classification.strength > currentStrength ||
          (classification.strength === currentStrength &&
            classification.channel !== session.channelLast);

        if (shouldUpdateChannel) {
          Object.assign(sessionUpdate, {
            channelLast: classification.channel,
            channelStrengthLast: classification.strength,
            channelReason: classification.reasons as Prisma.InputJsonValue,
            attributionVersion: configResult.version,
          });
        }

        if (Object.keys(sessionUpdate).length > 0) {
          await prisma.client.session.update({
            where: { id: sessionId },
            data: sessionUpdate,
          });
        }
      }

      await saveEvent({
        websiteId,
        sessionId,
        visitId,
        createdAt,

        // Page
        pageTitle: safeDecodeURIComponent(title),
        hostname: hostname || urlDomain,
        urlPath: safeDecodeURI(urlPath),
        urlQuery: urlQuery ?? '',
        referrerPath: safeDecodeURI(referrerPath),
        referrerQuery,
        referrerDomain: resolvedReferrerDomain,

        // Session
        distinctId: id,
        browser,
        os,
        device,
        screen,
        language,
        country,
        region,
        city,

        // Events
        eventName: name,
        tag,

        // UTM
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,

        // Click IDs
        gclid,
        fbclid,
        msclkid,
        ttclid,
        lifatid,
        twclid,
      });
    }

    if (type === COLLECTION_TYPE.identify) {
      if (data) {
        await saveSessionData({
          websiteId,
          sessionId,
          sessionData: data,
          distinctId: id,
          createdAt,
        });
      }
    }

    const token = createToken({ websiteId, sessionId, visitId, iat }, secret());

    return json({ cache: token, sessionId, visitId });
  } catch (e) {
    return serverError(e);
  }
}
