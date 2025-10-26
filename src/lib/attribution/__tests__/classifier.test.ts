import yaml from 'js-yaml';
import { classifyAttribution } from '../classifier';
import type { AttributionConfigV1, NormalizedAttributionInput } from '../types';
import { attributionConfigV1Yaml } from '../defaultConfig';

describe('classifyAttribution', () => {
  const config = yaml.load(attributionConfigV1Yaml) as AttributionConfigV1;

  it('prioritises explicit utm medium mappings', () => {
    const input: NormalizedAttributionInput = {
      utmMedium: 'cpc',
    };

    const result = classifyAttribution(input, config);

    expect(result.channel).toBe('paid_search');
    expect(result.strength).toBe(60);
    expect(result.reasons[0]?.rule).toBe('utm_medium_dict');
  });

  it('detects search engine referrers', () => {
    const input: NormalizedAttributionInput = {
      referrerHost: 'google.com',
    };

    const result = classifyAttribution(input, config);

    expect(result.channel).toBe('organic');
    expect(result.strength).toBe(40);
    expect(result.reasons[0]?.rule).toBe('search_engine_referrer');
  });

  it('detects social referrers', () => {
    const input: NormalizedAttributionInput = {
      referrerHost: 'twitter.com',
    };

    const result = classifyAttribution(input, config);

    expect(result.channel).toBe('social');
    expect(result.strength).toBe(30);
    expect(result.reasons[0]?.rule).toBe('social_domain_referrer');
  });

  it('falls back to referral when referrer present without medium', () => {
    const input: NormalizedAttributionInput = {
      referrerHost: 'partner-site.com',
    };

    const result = classifyAttribution(input, config);

    expect(result.channel).toBe('referral');
    expect(result.reasons[0]?.rule).toBe('non_empty_referrer');
  });

  it('defaults to direct when no signals detected', () => {
    const input: NormalizedAttributionInput = {};

    const result = classifyAttribution(input, config);

    expect(result.channel).toBe('direct');
    expect(result.strength).toBe(0);
    expect(result.reasons[0]?.rule).toBe('no_signal');
  });
});
