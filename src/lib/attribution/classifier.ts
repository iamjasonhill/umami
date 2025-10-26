import {
  NormalizedAttributionInput,
  AttributionResult,
  AttributionReason,
  AttributionConfigV1,
  ChannelLabel,
} from './types';

const DEFAULT_FALLBACK_CHANNEL: ChannelLabel = 'referral';

const STRENGTH = {
  DIRECT: 0,
  REFERRAL: 10,
  EMAIL: 20,
  SOCIAL: 30,
  ORGANIC: 40,
  PAID: 50,
  UTM: 60,
} as const;

type MatchFn = (value: string | undefined, candidates: string[]) => boolean;

const normalizeCandidate = (entry: string) => entry.trim().toLowerCase();

const hasSuffixMatch: MatchFn = (value, candidates) => {
  if (!value) return false;
  const lowerValue = value.toLowerCase();
  return candidates.some(raw => {
    const candidate = normalizeCandidate(raw).replace(/^\.+/, '');
    return lowerValue === candidate || lowerValue.endsWith(`.${candidate}`);
  });
};

const hasPartialMatch: MatchFn = (value, candidates) => {
  if (!value) return false;
  const lowerValue = value.toLowerCase();
  return candidates.some(entry => lowerValue.includes(normalizeCandidate(entry)));
};

function createReason(rule: string, details?: Record<string, string | number | boolean | null>) {
  const reason: AttributionReason = { rule };
  if (details) {
    reason.details = details;
  }
  return reason;
}

function getFallbackChannel(config: AttributionConfigV1): ChannelLabel {
  return config.fallback?.non_empty_referrer_without_medium ?? DEFAULT_FALLBACK_CHANNEL;
}

function classifyByMedium(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const medium = input.utmMedium;
  if (medium && config.channels.mediums[medium]) {
    return {
      channel: config.channels.mediums[medium],
      strength: STRENGTH.UTM,
      reasons: [createReason('utm_medium_dict', { medium })],
    } satisfies AttributionResult;
  }
  return null;
}

function classifyBySelfOrExcluded(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const { referrerHost } = input;
  if (
    referrerHost &&
    (hasSuffixMatch(referrerHost, config.channels.self_domains) ||
      hasSuffixMatch(referrerHost, config.channels.referral_exclusions))
  ) {
    return {
      channel: 'direct',
      strength: STRENGTH.DIRECT,
      reasons: [createReason('self_or_excluded_referrer', { referrerHost })],
    } satisfies AttributionResult;
  }
  return null;
}

function classifyBySearch(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const { referrerHost } = input;
  if (hasSuffixMatch(referrerHost, config.channels.search_engines)) {
    return {
      channel: 'organic',
      strength: STRENGTH.ORGANIC,
      reasons: [createReason('search_engine_referrer', { referrerHost })],
    } satisfies AttributionResult;
  }
  return null;
}

function classifyBySocial(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const { referrerHost, userAgent } = input;
  if (hasSuffixMatch(referrerHost, config.channels.social_domains)) {
    return {
      channel: 'social',
      strength: STRENGTH.SOCIAL,
      reasons: [createReason('social_domain_referrer', { referrerHost })],
    } satisfies AttributionResult;
  }

  if (userAgent && hasPartialMatch(userAgent.toLowerCase(), config.channels.social_domains)) {
    return {
      channel: 'social',
      strength: STRENGTH.SOCIAL,
      reasons: [createReason('social_user_agent_hint')],
    } satisfies AttributionResult;
  }

  return null;
}

function classifyByEmail(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const { referrerHost, userAgent } = input;
  if (hasSuffixMatch(referrerHost, config.channels.email_hints)) {
    return {
      channel: 'email',
      strength: STRENGTH.EMAIL,
      reasons: [createReason('email_referrer_hint', { referrerHost })],
    } satisfies AttributionResult;
  }

  if (userAgent && hasPartialMatch(userAgent.toLowerCase(), config.channels.email_hints)) {
    return {
      channel: 'email',
      strength: STRENGTH.EMAIL,
      reasons: [createReason('email_user_agent_hint')],
    } satisfies AttributionResult;
  }

  return null;
}

function classifyByReferrer(input: NormalizedAttributionInput, config: AttributionConfigV1) {
  const { referrerHost } = input;
  if (referrerHost) {
    return {
      channel: getFallbackChannel(config),
      strength: STRENGTH.REFERRAL,
      reasons: [createReason('non_empty_referrer', { referrerHost })],
    } satisfies AttributionResult;
  }
  return null;
}

export function classifyAttribution(
  input: NormalizedAttributionInput,
  config: AttributionConfigV1,
): AttributionResult {
  const steps: ((
    input: NormalizedAttributionInput,
    config: AttributionConfigV1,
  ) => AttributionResult | null)[] = [
    classifyByMedium,
    classifyBySelfOrExcluded,
    classifyBySearch,
    classifyBySocial,
    classifyByEmail,
    classifyByReferrer,
  ];

  for (const step of steps) {
    const result = step(input, config);
    if (result) {
      return result;
    }
  }

  return {
    channel: 'direct',
    strength: STRENGTH.DIRECT,
    reasons: [createReason('no_signal')],
  } satisfies AttributionResult;
}
