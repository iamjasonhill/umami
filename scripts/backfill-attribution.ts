/* eslint-disable no-console, no-constant-condition */
import 'dotenv/config';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { loadAttributionConfig } from '@/lib/attribution/config';
import { normalizeAttributionInput } from '@/lib/attribution/normalize';
import { classifyAttribution } from '@/lib/attribution/classifier';

const BATCH_SIZE = 500;

type CliOptions = {
  since?: Date;
  dryRun: boolean;
};

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = { dryRun: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--since') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --since');
      }
      i += 1;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date provided for --since: ${value}`);
      }
      options.since = parsed;
      continue;
    }

    if (arg.startsWith('--since=')) {
      const value = arg.split('=')[1];
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date provided for --since: ${value}`);
      }
      options.since = parsed;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function fetchLatestEvents(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Map<string, any>();
  }

  const events = await prisma.client.websiteEvent.findMany({
    where: {
      sessionId: {
        in: sessionIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      sessionId: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      utmContent: true,
      utmTerm: true,
      referrerDomain: true,
      referrerPath: true,
    },
  });

  const latest = new Map<string, (typeof events)[number]>();

  for (const event of events) {
    if (!latest.has(event.sessionId)) {
      latest.set(event.sessionId, event);
    }
  }

  return latest;
}

async function main() {
  const options = parseCliOptions();
  const { since, dryRun } = options;

  console.log('[backfill] starting attribution backfill');
  if (since) {
    console.log(`[backfill] limiting to sessions created after ${since.toISOString()}`);
  }
  if (dryRun) {
    console.log('[backfill] running in dry-run mode (no updates will be written)');
  }

  const configResult = await loadAttributionConfig();
  const { version, config } = configResult;

  const whereClause: Prisma.SessionWhereInput = {};

  whereClause.OR = [{ channelLast: null } as any, { attributionVersion: { lt: version } }];

  if (since) {
    whereClause.AND = [{ createdAt: { gte: since } }];
  }

  let cursor: { id: string } | undefined;
  let processed = 0;
  let updated = 0;

  while (true) {
    const sessions = await prisma.client.session.findMany({
      where: whereClause,
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor } : {}),
      select: {
        id: true,
        websiteId: true,
        createdAt: true,
        rawSource: true,
        rawMedium: true,
        rawCampaign: true,
        rawContent: true,
        rawTerm: true,
        rawReferrerDomain: true,
        rawReferrerPath: true,
        userAgent: true,
        channelFirst: true,
        channelLast: true,
        channelStrengthFirst: true,
        channelStrengthLast: true,
        channelReason: true,
        attributionVersion: true,
      },
    });

    if (sessions.length === 0) {
      break;
    }

    cursor = { id: sessions[sessions.length - 1].id };

    const eventLookup = await fetchLatestEvents(sessions.map(session => session.id));

    for (const session of sessions) {
      processed += 1;

      const latestEvent = eventLookup.get(session.id);

      const normalized = normalizeAttributionInput({
        utmSource: session.rawSource ?? latestEvent?.utmSource ?? undefined,
        utmMedium: session.rawMedium ?? latestEvent?.utmMedium ?? undefined,
        utmCampaign: session.rawCampaign ?? latestEvent?.utmCampaign ?? undefined,
        utmContent: session.rawContent ?? latestEvent?.utmContent ?? undefined,
        utmTerm: session.rawTerm ?? latestEvent?.utmTerm ?? undefined,
        referrerHost: session.rawReferrerDomain ?? latestEvent?.referrerDomain ?? undefined,
        userAgent: session.userAgent ?? undefined,
      });

      const classification = classifyAttribution(normalized, config);

      const updateData: Prisma.SessionUncheckedUpdateInput = {};

      if (normalized.utmSource) {
        Object.assign(updateData, { rawSource: normalized.utmSource });
      }
      if (normalized.utmMedium) {
        Object.assign(updateData, { rawMedium: normalized.utmMedium });
      }
      if (normalized.utmCampaign) {
        Object.assign(updateData, { rawCampaign: normalized.utmCampaign });
      }
      if (normalized.utmContent) {
        Object.assign(updateData, { rawContent: normalized.utmContent });
      }
      if (normalized.utmTerm) {
        Object.assign(updateData, { rawTerm: normalized.utmTerm });
      }
      if (normalized.referrerHost) {
        Object.assign(updateData, { rawReferrerDomain: normalized.referrerHost });
      }
      if (latestEvent?.referrerPath && !session.rawReferrerPath) {
        Object.assign(updateData, { rawReferrerPath: latestEvent.referrerPath });
      }

      const shouldUpdateChannel =
        session.channelLast !== classification.channel ||
        session.channelStrengthLast !== classification.strength ||
        session.attributionVersion !== version;

      if (shouldUpdateChannel) {
        Object.assign(updateData, {
          channelLast: classification.channel,
          channelStrengthLast: classification.strength,
          channelReason: classification.reasons as Prisma.InputJsonValue,
          attributionVersion: version,
        });

        if (!session.channelFirst) {
          Object.assign(updateData, { channelFirst: classification.channel });
        }

        if (session.channelStrengthFirst == null) {
          Object.assign(updateData, { channelStrengthFirst: classification.strength });
        }
      }

      if (Object.keys(updateData).length === 0) {
        continue;
      }

      updated += 1;

      if (!dryRun) {
        await prisma.client.session.update({
          where: { id: session.id },
          data: updateData,
        });
      }
    }

    console.log(
      `[backfill] processed ${processed} sessions (${updated} updates so far, latest batch size ${sessions.length})`,
    );
  }

  console.log(`[backfill] completed. processed=${processed}, updated=${updated}, dryRun=${dryRun}`);
}

main()
  .catch(error => {
    console.error('[backfill] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.client.$disconnect();
  });
