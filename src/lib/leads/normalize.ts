import { fold, safeUrl, type Candidate, type Intent, type Filters } from '@/lib/domain';
const socialHosts = [
  'instagram.com',
  'facebook.com',
  'linkedin.com',
  'wa.me',
  'whatsapp.com',
  'yelp.com',
  'tripadvisor.com',
  'google.com',
];
export function normalize(candidate: Candidate, markdown: string) {
  const content = fold(markdown);
  const evidence = candidate.evidence.filter((e) => content.includes(fold(e.quote)));
  const supports = (field: string) => evidence.some((e) => e.field === field);
  if (
    !supports('name') ||
    !content.includes(fold(candidate.name)) ||
    !candidate.matches_request ||
    !supports('matches_request')
  )
    return null;
  const c = { ...candidate, evidence };
  for (const field of [
    'segment',
    'country',
    'region',
    'city',
    'website',
    'instagram',
    'linkedin',
    'facebook',
    'phone',
    'whatsapp',
    'email',
    'description',
  ] as const) {
    if (!supports(field)) c[field] = null;
  }
  for (const field of ['website', 'instagram', 'linkedin', 'facebook'] as const) {
    c[field] = safeUrl(c[field]);
    if (c[field] && !content.includes(fold(c[field]!.replace(/\/$/, '')))) c[field] = null;
  }
  if (
    c.website &&
    socialHosts.some(
      (h) => new URL(c.website!).hostname === h || new URL(c.website!).hostname.endsWith(`.${h}`),
    )
  )
    c.website = null;
  for (const [field, host] of [
    ['instagram', 'instagram.com'],
    ['linkedin', 'linkedin.com'],
    ['facebook', 'facebook.com'],
  ] as const)
    if (c[field] && ![host, `www.${host}`].includes(new URL(c[field]!).hostname)) c[field] = null;
  if (c.email) {
    c.email = c.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) || !content.includes(c.email)) c.email = null;
  }
  for (const field of ['phone', 'whatsapp'] as const)
    if (c[field]) {
      const digits = c[field]!.replace(/\D/g, '');
      c[field] =
        digits.length >= 8 &&
        digits.length <= 15 &&
        evidence.some((e) => e.field === field && e.quote.replace(/\D/g, '').includes(digits))
          ? digits
          : null;
    }
  c.website_state = c.website
    ? 'present'
    : supports('website_state') && c.website_state === 'missing'
      ? 'missing'
      : 'unknown';
  c.opportunities = c.opportunities.filter((o) => content.includes(fold(o.quote)));
  return c;
}
export function accepts(c: Candidate, intent: Intent, filters: Filters) {
  for (const field of ['country', 'region', 'city'] as const)
    if (intent[field] && (!c[field] || fold(c[field]!) !== fold(intent[field]!))) return false;
  if (intent.segment && !c.segment) return false;
  if (intent.website !== 'any' && c.website_state !== intent.website) return false;
  for (const field of ['email', 'phone', 'instagram', 'whatsapp'] as const)
    if (filters[field] && !c[field]) return false;
  if (
    intent.requireContact &&
    !c.email &&
    !c.phone &&
    !c.whatsapp &&
    !c.instagram &&
    !c.linkedin &&
    !c.facebook
  )
    return false;
  if (
    intent.categories.length &&
    !c.opportunities.some((o) => intent.categories.includes(o.category))
  )
    return false;
  return true;
}
export function identifiers(c: Candidate, source: string) {
  const keys: string[] = [];
  if (c.website) keys.push(`domain:${new URL(c.website).hostname.replace(/^www\./, '')}`);
  for (const f of ['email', 'phone', 'whatsapp', 'instagram', 'linkedin', 'facebook'] as const)
    if (c[f])
      keys.push(`${f === 'whatsapp' ? 'phone' : f}:${c[f]!.toLowerCase().replace(/\/$/, '')}`);
  if (c.city) keys.push(`name_city:${fold(c.name)}|${fold(c.city)}|${fold(c.country ?? '')}`);
  keys.push(`source_name:${source}|${fold(c.name)}`);
  return [...new Set(keys)];
}
export function qualify(c: Candidate, intent: Intent) {
  const reasons: string[] = [];
  let score = 0;
  const add = (n: number, reason: string) => {
    score += n;
    reasons.push(`+${n} ${reason}`);
  };
  if (c.segment && intent.segment) add(20, 'Segmento identificado e compatível com a pesquisa.');
  if ((intent.city && c.city) || (intent.country && c.country))
    add(20, 'Localização solicitada confirmada na fonte.');
  if (c.email || c.phone || c.whatsapp) add(20, 'Contato comercial público verificado.');
  if (c.instagram || c.linkedin || c.facebook) add(10, 'Perfil social público identificado.');
  if (intent.website === 'missing' && c.website_state === 'missing')
    add(15, 'Fonte afirma ausência de website próprio.');
  else if (c.website) add(5, 'Website próprio identificado.');
  if (c.opportunities.length) add(15, 'Oportunidade apoiada por trecho da fonte.');
  return { score: Math.min(100, score), score_reasons: reasons };
}
