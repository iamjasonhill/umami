export type ChannelLabel =
  | 'direct'
  | 'referral'
  | 'email'
  | 'social'
  | 'organic'
  | 'paid_search'
  | 'paid_social'
  | 'paid_ads'
  | 'paid_shopping'
  | 'paid_video'
  | 'organic_social'
  | 'organic_search'
  | 'organic_video'
  | 'organic_shopping'
  | 'sms'
  | 'affiliate'
  | 'partner'
  | 'push'
  | 'offline';

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type AttributionReason = {
  rule: string;
  details?: Record<string, JsonValue>;
};

export type AttributionResult = {
  channel: ChannelLabel;
  strength: number;
  reasons: AttributionReason[];
};

export type AttributionInput = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  referrerHost?: string | null;
  userAgent?: string | null;
};

export type NormalizedAttributionInput = AttributionInput & {
  utmMedium?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrerHost?: string;
  linkId?: string;
};

export type AttributionConfigV1 = {
  version: number;
  channels: {
    mediums: Record<string, ChannelLabel>;
    search_engines: string[];
    social_domains: string[];
    email_hints: string[];
    self_domains: string[];
    referral_exclusions: string[];
  };
  fallback?: {
    non_empty_referrer_without_medium?: ChannelLabel;
  };
};

export type LinkRegistryEntry = {
  shortId: string;
  url: string;
  owner?: string | null;
  tags?: string[];
};

export const enum ChannelStrength {
  Direct = 0,
  Referral = 10,
  Email = 20,
  Social = 30,
  Organic = 40,
  Paid = 50,
  UTM = 60,
}
