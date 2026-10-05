import Link from 'next/link';
import { authenticated, checked } from '@/lib/supabase/server';
import { configuration } from '@/lib/config';
import { type Lead, type Campaign, categories, statuses } from '@/lib/domain';
import { PageTitle, SearchLink, SetupNotice, ErrorNotice, Empty } from '@/components/common';
import { LeadsTable } from '@/components/leads-table';
import { Button } from '@/components/ui/button';
import { leadRecord, campaignRecord } from '@/lib/records';
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).filter((v): v is [string, string] => typeof v[1] === 'string'),
  );
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1)));
  let leads: Lead[] = [];
  let total = 0;
  let campaigns: Campaign[] = [];
  let error = '';
  if (configuration().supabase)
    try {
      const { db } = await authenticated();
      campaigns = campaignRecord
        .array()
        .parse(
          checked(
            await db
              .from('campaigns')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(200),
          ),
        );
      const select = `*${params.category ? ',lead_categories!inner(category)' : ''}${params.campaign ? ',campaign_leads!inner(campaign_id)' : ''}`;
      let q = db.from('leads').select(select, { count: 'exact' });
      if (params.q) {
        const term = params.q
          .replace(/[%_,().]/g, ' ')
          .trim()
          .slice(0, 150);
        if (term) q = q.ilike('name', `%${term}%`);
      }
      for (const f of ['country', 'city', 'segment', 'status'] as const)
        if (params[f]) q = q.eq(f, params[f]);
      if (params.category) q = q.eq('lead_categories.category', params.category);
      if (params.campaign) q = q.eq('campaign_leads.campaign_id', params.campaign);
      if (params.score) q = q.gte('score', Math.max(0, Math.min(100, Number(params.score) || 0)));
      for (const f of ['email', 'phone', 'whatsapp', 'website'] as const)
        if (params[f] === 'yes') q = q.not(f, 'is', null);
      const sort = ['score', 'name', 'created_at'].includes(params.sort)
        ? params.sort
        : 'created_at';
      const result = await q
        .order(sort, { ascending: sort === 'name' })
        .order('id')
        .range((page - 1) * 25, page * 25 - 1);
      leads = leadRecord.array().parse(checked(result));
      total = result.count ?? 0;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Banco indisponível.';
    }
  const href = (n: number) => `/leads?${new URLSearchParams({ ...params, page: String(n) })}`;
  return (
    <>
      <PageTitle
        eyebrow="SUA BASE COMERCIAL"
        title={params.category || 'Todos os Leads'}
        description="Contexto, contatos e oportunidades. Tudo em um só lugar."
        action={<SearchLink />}
      />
      {!configuration().supabase && <SetupNotice />}
      {error && <ErrorNotice message={error} />}
      <section className="panel">
        <form className="table-filters">
          <div className="filter-main">
            <input
              aria-label="Buscar empresa"
              name="q"
              placeholder="Buscar pelo nome da empresa…"
              defaultValue={params.q}
            />
            <select aria-label="Categoria" name="category" defaultValue={params.category || ''}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select aria-label="Status" name="status" defaultValue={params.status || ''}>
              <option value="">Todos os status</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </div>
          <details>
            <summary>Mais filtros e ordenação</summary>
            <div className="filter-grid">
              {[
                ['country', 'País'],
                ['city', 'Cidade'],
                ['segment', 'Segmento'],
              ].map(([f, l]) => (
                <label key={f}>
                  {l}
                  <input name={f} defaultValue={params[f]} />
                </label>
              ))}
              <label>
                Score mínimo
                <input name="score" type="number" min={0} max={100} defaultValue={params.score} />
              </label>
              <label>
                Campanha
                <select name="campaign" defaultValue={params.campaign || ''}>
                  <option value="">Todas</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ordenar por
                <select name="sort" defaultValue={params.sort || 'created_at'}>
                  <option value="created_at">Mais recentes</option>
                  <option value="score">Maior score</option>
                  <option value="name">Nome A–Z</option>
                </select>
              </label>
              <div className="checkbox-group">
                {[
                  ['email', 'E-mail'],
                  ['phone', 'Telefone'],
                  ['whatsapp', 'WhatsApp'],
                  ['website', 'Website'],
                ].map(([f, l]) => (
                  <label key={f}>
                    <input
                      type="checkbox"
                      name={f}
                      value="yes"
                      defaultChecked={params[f] === 'yes'}
                    />
                    {l} disponível
                  </label>
                ))}
              </div>
            </div>
          </details>
        </form>
        {leads.length ? (
          <LeadsTable key={JSON.stringify(params)} leads={leads} />
        ) : (
          <Empty
            title={
              Object.keys(params).length
                ? 'Nenhum lead corresponde aos filtros'
                : 'Sua base está pronta para crescer'
            }
            text="Apenas empresas encontradas e verificadas nas suas buscas aparecerão aqui."
          />
        )}
        <div className="pagination">
          <span>
            {error
              ? 'Dados indisponíveis'
              : `${total} leads · Página ${page} de ${Math.max(1, Math.ceil(total / 25))}`}
          </span>
          <div>
            {page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}
            {page * 25 < total && <Link href={href(page + 1)}>Próxima →</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
