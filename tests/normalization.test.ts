import { describe, it, expect } from 'vitest';
import { normalize, identifiers, accepts, qualify } from '@/lib/leads/normalize';
import { safeUrl, filtersSchema, type Candidate, type Intent } from '@/lib/domain';
const intent: Intent = {
  query: 'restaurantes Lisboa Portugal',
  segment: 'Restaurante',
  country: 'Portugal',
  region: null,
  city: 'Lisboa',
  quantity: 50,
  categories: [],
  website: 'any',
  requireContact: true,
  explanation: 'Pesquisa de restaurantes',
};
const candidate: Candidate = {
  name: 'Empresa de teste',
  segment: 'Restaurante',
  country: 'Portugal',
  region: null,
  city: 'Lisboa',
  website: null,
  instagram: null,
  linkedin: null,
  facebook: null,
  phone: '351 211 234 567',
  whatsapp: null,
  email: 'contato@example.com',
  description: null,
  website_state: 'unknown',
  matches_request: true,
  evidence: [
    { field: 'name', quote: 'Empresa de teste' },
    { field: 'matches_request', quote: 'Restaurante em Lisboa, Portugal' },
    { field: 'segment', quote: 'Restaurante em Lisboa, Portugal' },
    { field: 'country', quote: 'Restaurante em Lisboa, Portugal' },
    { field: 'city', quote: 'Restaurante em Lisboa, Portugal' },
    { field: 'phone', quote: '351 211 234 567' },
    { field: 'email', quote: 'contato@example.com' },
  ],
  opportunities: [],
};
const markdown =
  'Empresa de teste. Restaurante em Lisboa, Portugal. 351 211 234 567. contato@example.com';
describe('evidence-based normalization', () => {
  it('keeps verifiable contacts and no inferred website absence', () => {
    const c = normalize(candidate, markdown)!;
    expect(c.phone).toBe('351211234567');
    expect(c.email).toBe('contato@example.com');
    expect(c.website_state).toBe('unknown');
    expect(accepts(c, intent, filtersSchema.parse({}))).toBe(true);
    expect(accepts(c, { ...intent, website: 'missing' }, filtersSchema.parse({}))).toBe(false);
  });
  it('drops invented contacts even when a fabricated quote was returned', () => {
    const c = normalize(
      {
        ...candidate,
        email: 'inventado@example.com',
        phone: '99999999999',
        whatsapp: '88888888888',
        evidence: [...candidate.evidence, { field: 'whatsapp', quote: '88888888888' }],
      },
      markdown,
    )!;
    expect(c.email).toBeNull();
    expect(c.phone).toBeNull();
    expect(c.whatsapp).toBeNull();
  });
  it('rejects ungrounded names and request matches', () => {
    expect(normalize({ ...candidate, name: 'Inventada' }, markdown)).toBeNull();
    expect(
      normalize(
        { ...candidate, evidence: candidate.evidence.filter((e) => e.field !== 'matches_request') },
        markdown,
      ),
    ).toBeNull();
  });
  it('does not treat a social profile as a company website', () => {
    const c = normalize(
      {
        ...candidate,
        website: 'https://instagram.com/exemplo',
        evidence: [
          ...candidate.evidence,
          { field: 'website', quote: 'https://instagram.com/exemplo' },
        ],
      },
      markdown + ' https://instagram.com/exemplo',
    )!;
    expect(c.website).toBeNull();
    expect(c.website_state).toBe('unknown');
  });
  it('requires requested location and contacts', () => {
    const c = normalize(candidate, markdown)!;
    expect(accepts({ ...c, city: 'Porto' }, intent, filtersSchema.parse({}))).toBe(false);
    expect(accepts(c, intent, filtersSchema.parse({ whatsapp: true }))).toBe(false);
  });
  it('canonicalizes matching aliases across sources', () => {
    const c = normalize(candidate, markdown)!;
    const ids = identifiers(
      {
        ...c,
        website: 'https://www.example.com/contact',
        instagram: 'https://instagram.com/teste/',
      },
      'https://directory.example/a',
    );
    expect(ids).toContain('domain:example.com');
    expect(ids).toContain('phone:351211234567');
    expect(ids).toContain('instagram:https://instagram.com/teste');
    expect(ids).toContain('name_city:empresa de teste|lisboa|portugal');
  });
  it('explains scores without granting points for missing information', () => {
    expect(
      qualify(
        { ...candidate, segment: null, country: null, city: null, email: null, phone: null },
        intent,
      ).score,
    ).toBe(0);
    const q = qualify(candidate, intent);
    expect(q.score).toBe(60);
    expect(q.score_reasons).toHaveLength(3);
  });
  it('rejects unsafe URL protocols and local destinations', () => {
    for (const url of [
      'javascript:alert(1)',
      'file:///etc/passwd',
      'http://127.0.0.1',
      'http://192.168.1.1',
      'https://user:pass@example.com',
    ])
      expect(safeUrl(url)).toBeNull();
    expect(safeUrl('https://example.com/a#b')).toBe('https://example.com/a');
  });
});
