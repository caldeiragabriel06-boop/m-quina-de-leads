import { z } from 'zod';
import { candidateSchema, filtersSchema, intentSchema, statuses } from '@/lib/domain';
// Validate JSONB and database enum values at the boundary, not with type assertions.
export const leadRecord = candidateSchema.omit({ matches_request: true, evidence: true }).extend({
  id: z.uuid(),
  score: z.number().int().min(0).max(100),
  score_reasons: z.array(z.string()),
  status: z.enum(statuses),
  created_at: z.string(),
  updated_at: z.string(),
  last_contact_at: z.string().nullable(),
  follow_up_at: z.string().nullable(),
});
export const campaignRecord = z.object({
  id: z.uuid(),
  name: z.string(),
  prompt: z.string(),
  filters: filtersSchema,
  intent: intentSchema.nullable(),
  created_at: z.string(),
});
export const jobRecord = z.object({
  id: z.uuid(),
  campaign_id: z.uuid(),
  state: z.enum(['queued', 'running', 'completed', 'partial', 'failed']),
  stage: z.string(),
  urls: z.array(z.string()),
  cursor: z.number(),
  found: z.number(),
  valid: z.number(),
  new_count: z.number(),
  duplicate_count: z.number(),
  warnings: z.array(z.string()),
  error: z.string().nullable(),
  updated_at: z.string(),
});
export const campaignWithJob = campaignRecord.extend({ search_jobs: jobRecord.nullable() });
export const dashboardRecord = z.object({
  total: z.number(),
  statuses: z.record(z.string(), z.number()),
  categories: z.record(z.string(), z.number()),
  campaigns: z.array(z.object({ id: z.uuid(), name: z.string(), total: z.number() })),
});
