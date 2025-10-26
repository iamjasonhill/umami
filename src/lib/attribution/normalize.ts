import { parse } from 'tldts';
import type { AttributionInput, NormalizedAttributionInput } from './types';

const LINK_ID_PATTERN = /^lnk_([0-9a-zA-Z]+)$/;

function canonicalHost(host?: string | null): string | undefined {
  if (!host) {
    return undefined;
  }

  const trimmed = host.trim().toLowerCase();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = parse(trimmed);
    if (parsed.domain) {
      return parsed.domain.toLowerCase();
    }
  } catch {
    // ignore parse errors and fall through to returning the trimmed value
  }

  return trimmed;
}

function normalizeUtm(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.trim().toLowerCase();

  return cleaned || undefined;
}

function normalizeOptional(value?: string | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const cleaned = value.trim();

  return cleaned || undefined;
}

function extractLinkId(utmContent?: string | null): string | undefined {
  const normalized = normalizeOptional(utmContent);

  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(LINK_ID_PATTERN);

  if (!match) {
    return undefined;
  }

  return match[1];
}

export function normalizeAttributionInput(raw: AttributionInput): NormalizedAttributionInput {
  const utmSource = normalizeUtm(raw.utmSource);
  const utmMedium = normalizeUtm(raw.utmMedium);
  const utmCampaign = normalizeUtm(raw.utmCampaign);
  const utmContent = normalizeUtm(raw.utmContent);
  const utmTerm = normalizeUtm(raw.utmTerm);
  const referrerHost = canonicalHost(raw.referrerHost);
  const userAgent = normalizeOptional(raw.userAgent);
  const linkId = extractLinkId(raw.utmContent);

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    referrerHost,
    userAgent,
    linkId,
  };
}

export function canonicalizeHost(host?: string | null): string | undefined {
  return canonicalHost(host);
}

export function extractContentLinkId(utmContent?: string | null): string | undefined {
  return extractLinkId(utmContent);
}
