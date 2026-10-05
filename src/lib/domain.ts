import { z } from 'zod';
export const statuses = [
  'Novo',
  'Para contatar',
  'Contatado',
  'Respondeu',
  'Reunião marcada',
  'Proposta enviada',
  'Fechado',
  'Perdido',
  'Não contatar',
] as const;
export const categories = [
  'Website',
  'Automação IA',
  'IA Recepcionista',
  'Software',
  'Outro',
] as const;
const optionalText = z.string().trim().max(200).default('');
export const filtersSchema = z.object({
  country: optionalText,
  region: optionalText,
  city: optionalText,
  segment: optionalText,
  keywords: optionalText,
  category: z.enum(categories).or(z.literal('')).default(''),
  quantity: z.number().int().min(1).max(100).default(50),
  quantityExplicit: z.boolean().default(false),
  website: z.enum(['any', 'present', 'missing']).default('any'),
  email: z.boolean().default(false),
  phone: z.boolean().default(false),
  instagram: z.boolean().default(false),
  whatsapp: z.boolean().default(false),
});
export const searchSchema = z.object({
  prompt: z.string().trim().min(10).max(2000),
  name: z.string().trim().min(3).max(120),
  filters: filtersSchema,
});
export type SearchInput = z.infer<typeof searchSchema>;
export type Filters = z.infer<typeof filtersSchema>;
export const intentSchema = z.object({
  query: z.string().min(3).max(500),
  segment: z.string().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  quantity: z.number().int().min(1).max(100),
  categories: z.array(z.enum(categories)).max(5),
  website: z.enum(['any', 'present', 'missing']),
  requireContact: z.boolean(),
  explanation: z.string(),
});
export type Intent = z.infer<typeof intentSchema>;
const nullableText = z.string().max(3000).nullable();
export const candidateSchema = z.object({
  name: z.string().min(2).max(200),
  segment: nullableText,
  country: nullableText,
  region: nullableText,
  city: nullableText,
  website: nullableText,
  instagram: nullableText,
  linkedin: nullableText,
  facebook: nullableText,
  phone: nullableText,
  whatsapp: nullableText,
  email: nullableText,
  description: nullableText,
  website_state: z.enum(['present', 'missing', 'unknown']),
  matches_request: z.boolean(),
  evidence: z
    .array(z.object({ field: z.string().max(80), quote: z.string().min(4).max(1000) }))
    .max(30),
  opportunities: z
    .array(
      z.object({
        category: z.enum(categories),
        reason: z.string().max(1000),
        quote: z.string().min(4).max(1000),
        service: z.string().max(300),
      }),
    )
    .max(5),
});
export type Candidate = z.infer<typeof candidateSchema>;
export const extractionSchema = z.object({ companies: z.array(candidateSchema).max(30) });
export interface Lead {
  id: string;
  name: string;
  segment: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  description: string | null;
  website_state: string;
  score: number;
  score_reasons: string[];
  opportunities: Candidate['opportunities'];
  status: (typeof statuses)[number];
  created_at: string;
  updated_at: string;
  last_contact_at: string | null;
  follow_up_at: string | null;
}
export interface Campaign {
  id: string;
  name: string;
  prompt: string;
  filters: Filters;
  intent: Intent | null;
  created_at: string;
}
export interface Job {
  id: string;
  campaign_id: string;
  state: 'queued' | 'running' | 'completed' | 'partial' | 'failed';
  stage: string;
  urls: string[];
  cursor: number;
  found: number;
  valid: number;
  new_count: number;
  duplicate_count: number;
  warnings: string[];
  error: string | null;
  updated_at: string;
}
export function fold(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
export function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !url.hostname.includes('.') ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
        url.hostname,
      ) ||
      url.hostname.includes(':')
    )
      return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}
