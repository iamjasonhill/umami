import { normalizeAttributionInput, canonicalizeHost, extractContentLinkId } from '../normalize';

describe('normalizeAttributionInput', () => {
  it('lowercases and trims utm fields', () => {
    const result = normalizeAttributionInput({
      utmSource: '  GOOGLE  ',
      utmMedium: '  CPC ',
      utmCampaign: ' Spring_Sale ',
      utmContent: ' Hero ',
      utmTerm: ' Running Shoes ',
    });

    expect(result).toEqual(
      expect.objectContaining({
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'spring_sale',
        utmContent: 'hero',
        utmTerm: 'running shoes',
      }),
    );
  });

  it('canonicalizes referrer host', () => {
    const result = normalizeAttributionInput({
      referrerHost: '  WWW.Example.COM  ',
    });

    expect(result.referrerHost).toBe('example.com');
  });

  it('extracts link id from content', () => {
    const result = normalizeAttributionInput({ utmContent: 'lnk_AbC123' });
    expect(result.linkId).toBe('AbC123');
  });

  it('ignores invalid link ids', () => {
    const result = normalizeAttributionInput({ utmContent: 'not_a_link' });
    expect(result.linkId).toBeUndefined();
  });
});

describe('canonicalizeHost', () => {
  it('returns registrable domain when possible', () => {
    expect(canonicalizeHost('news.google.co.uk')).toBe('google.co.uk');
  });

  it('returns trimmed host if parsing fails', () => {
    expect(canonicalizeHost('invalid host')).toBe('invalid host');
  });
});

describe('extractContentLinkId', () => {
  it('returns link id when pattern matches', () => {
    expect(extractContentLinkId('lnk_XYZ789')).toBe('XYZ789');
  });

  it('returns undefined when pattern does not match', () => {
    expect(extractContentLinkId('abc')).toBeUndefined();
  });
});
