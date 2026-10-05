import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const token = '33333333-3333-4333-8333-333333333333';
async function scalar<T>(sql: string, params: unknown[] = []) {
  return (await db.query<{ value: T }>(sql, params)).rows[0].value;
}
async function newJob() {
  const id = await scalar<string>(
    "select public.create_search('Teste','Restaurantes em Portugal','{}') as value",
  );
  await db.query(
    'update public.campaigns set intent=$1 where id=(select campaign_id from public.search_jobs where id=$2)',
    [JSON.stringify({ quantity: 5 }), id],
  );
  await db.query('update public.search_jobs set urls=\'["https://example.com"]\' where id=$1', [
    id,
  ]);
  await db.query('select * from public.claim_job($1,$2)', [id, token]);
  return id;
}
function item(name = 'Empresa de teste', extra: Record<string, unknown> = {}) {
  return {
    lead: {
      name,
      segment: 'Restaurante',
      city: 'Lisboa',
      country: 'Portugal',
      website: 'https://example.com',
      website_state: 'present',
      score: 60,
      score_reasons: ['Contato e localização'],
      opportunities: [
        {
          category: 'Website',
          reason: 'Evidência de teste',
          quote: 'Falha no site',
          service: 'Website',
        },
      ],
      ...extra,
    },
    identifiers: ['domain:example.com', 'phone:351211234567'],
    source: 'https://example.com',
    evidence: [{ field: 'name', quote: name }],
  };
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated;grant select on auth.users to authenticated;insert into auth.users values('${owner}'),('${other}');`,
  );
  await db.exec(
    readFileSync('supabase/migrations/20261005132932_initial_lead_workspace.sql', 'utf8'),
  );
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`,
  );
});
afterAll(async () => {
  await db.close();
});
describe('Postgres transactions, RLS and CRM', () => {
  it('creates a campaign and enforces a single active search', async () => {
    const id = await newJob();
    expect(id).toBeTruthy();
    await expect(
      db.query("select public.create_search('Outra','Outra pesquisa','{}')"),
    ).rejects.toThrow('Retome');
    await db.query('select public.ingest_page($1,$2,$3)', [id, token, JSON.stringify([item()])]);
    expect(await scalar<number>('select count(*)::int as value from public.leads')).toBe(1);
  });
  it('deduplicates across campaigns, enriches only empty fields and keeps status', async () => {
    await db.exec("update public.leads set status='Não contatar'");
    const id = await newJob();
    await db.query('select public.ingest_page($1,$2,$3)', [
      id,
      token,
      JSON.stringify([item('Nome alternativo', { email: 'contato@example.com' })]),
    ]);
    const lead = (
      await db.query<{ status: string; email: string; name: string }>(
        'select status,email,name from public.leads',
      )
    ).rows[0];
    expect(lead.status).toBe('Não contatar');
    expect(lead.name).toBe('Empresa de teste');
    expect(lead.email).toBe('contato@example.com');
    expect(await scalar<number>('select count(*)::int as value from public.leads')).toBe(1);
    expect(
      await scalar<number>('select duplicate_count as value from public.search_jobs where id=$1', [
        id,
      ]),
    ).toBe(1);
    expect(
      await scalar<number>(
        "select count(*)::int as value from public.lead_activities where kind='status'",
      ),
    ).toBe(1);
  });
  it('does not allow replaying a committed page', async () => {
    const id = await scalar<string>(
      'select id as value from public.search_jobs order by created_at desc limit 1',
    );
    await expect(
      db.query('select public.ingest_page($1,$2,$3)', [id, token, JSON.stringify([item()])]),
    ).rejects.toThrow('lease');
  });
  it('records contact and follow-up atomically', async () => {
    const id = await scalar<string>('select id as value from public.leads');
    await db.query(
      "select public.record_activity($1,'contact','Conversamos','Telefone','2026-10-05T12:00:00Z','2026-10-07T12:00:00Z')",
      [id],
    );
    expect(
      await scalar<string>('select last_contact_at::text as value from public.leads where id=$1', [
        id,
      ]),
    ).toContain('2026-10-05');
  });
  it('hides another owner data and blocks ownership reassignment', async () => {
    await expect(db.query('update public.leads set owner_id=$1', [other])).rejects.toThrow();
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
    expect(await scalar<number>('select count(*)::int as value from public.leads')).toBe(0);
    expect(await scalar<number>('select count(*)::int as value from public.lead_sources')).toBe(0);
    const stats = await scalar<{ total: number }>('select public.dashboard_stats() as value');
    expect(stats.total).toBe(0);
    await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`);
  });
  it('denies anonymous data and function access', async () => {
    await db.exec('reset role;set role anon');
    await expect(db.query('select * from public.leads')).rejects.toThrow();
    await expect(db.query('select public.dashboard_stats()')).rejects.toThrow();
    await db.exec(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`,
    );
  });
  it('denies a second lease and supports expired lease recovery', async () => {
    const id = await newJob();
    const rows = await db.query('select * from public.claim_job($1,$2)', [
      id,
      '44444444-4444-4444-8444-444444444444',
    ]);
    expect(rows.rows).toHaveLength(0);
    await db.query(
      "update public.search_jobs set lease_until=now()-interval '1 second' where id=$1",
      [id],
    );
    expect(
      (await db.query('select * from public.claim_job($1,$2)', [id, token])).rows,
    ).toHaveLength(1);
    await db.query('select public.ingest_page($1,$2,$3)', [id, token, '[]']);
    expect(
      await scalar<string>('select state as value from public.search_jobs where id=$1', [id]),
    ).toBe('partial');
  });
});
