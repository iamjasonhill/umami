export const DEFAULT_ATTRIBUTION_CONFIG_VERSION = 1;

export const attributionConfigV1Yaml = `version: 1
channels:
  mediums:
    cpc: paid_search
    ppc: paid_search
    sem: paid_search
    gclid: paid_search
    display: paid_ads
    email: email
    newsletter: email
    referral: referral
    social: social
    influencer: social
    affiliate: affiliate
    partner: partner
    sms: sms
    push: push
    offline: offline
  search_engines:
    - google.com
    - bing.com
    - yahoo.com
    - duckduckgo.com
    - ecosia.org
  social_domains:
    - facebook.com
    - instagram.com
    - t.co
    - x.com
    - twitter.com
    - linkedin.com
    - reddit.com
    - youtube.com
    - pinterest.com
    - tiktok.com
  email_hints:
    - mail.
    - webmail.
    - outlook.
    - mailchi.mp
    - sendgrid.net
  self_domains:
    - moveroo.com.au
    - www.moveroo.com.au
    - movingagain.com.au
    - vehicle.net.au
  referral_exclusions:
    - checkout.stripe.com
    - pay.google.com
    - paypal.com
    - linktr.ee
fallback:
  non_empty_referrer_without_medium: referral
`;
