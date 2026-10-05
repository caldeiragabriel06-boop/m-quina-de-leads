import Link from 'next/link';
import { configuration } from '@/lib/config';
import { authenticated, checked } from '@/lib/supabase/server';
import { type Campaign, type Job } from '@/lib/domain';
import { PageTitle, SetupNotice, ErrorNotice, Empty, SearchLink } from '@/components/common';
import { date } from '@/lib/utils';
import { campaignWithJob } from '@/lib/records';
type CampaignRow = Campaign & { search_jobs: Job | null };
type Conversion = { campaign_id: string; status: string; total: number };
const labels: Record<string, string> = {
  queued: 'Na fila',
  running: 'Em andamento',
  completed: 'Concluída',
  partial: 'Resultados parciais',
  failed: 'Interrompida',
};
export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: raw } = await searchParams;
  const page = Math.max(1, Math.floor(Number(raw) || 1));
  let campaigns: CampaignRow[] = [];
  let total = 0;
  let error = '';
  let conversions: Conversion[] = [];
  if (configuration().supabase)
    try {
      const { db } = await authenticated();
      const result = await db
        .from('campaigns')
        .select('*,search_jobs(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * 20, page * 20 - 1);
      campaigns = campaignWithJob.array().parse(checked(result));
      total = result.count ?? 0;
      conversions = checked(await db.rpc('campaign_conversion')) as Conversion[];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Banco indisponível.';
    }
  return (
    <>
      <PageTitle
        eyebrow="PESQUISAS COM PROPÓSITO"
        title="Campanhas"
        description="Entenda quais pesquisas estão gerando suas melhores conversas."
        action={<SearchLink />}
      />
      {!configuration().supabase && <SetupNotice />}
      {error && <ErrorNotice message={error} />}
      <div className="campaign-list">
        {campaigns.length ? (
          campaigns.map((c) => (
            <section className="panel campaign-card" key={c.id}>
              <div className="panel-header">
                <div>
                  <h2>{c.name}</h2>
                  <p>
                    {date(c.created_at)} · Meta: {c.intent?.quantity ?? c.filters.quantity} leads
                  </p>
                </div>
                <span className="badge">
                  {c.search_jobs ? labels[c.search_jobs.state] : 'Aguardando'}
                </span>
              </div>
              <div className="campaign-body">
                <p className="campaign-prompt">“{c.prompt}”</p>
                {c.intent && <p>{c.intent.explanation}</p>}
                <div className="campaign-metrics">
                  {[
                    ['Válidos', c.search_jobs?.valid],
                    ['Novos', c.search_jobs?.new_count],
                    ['Já existentes', c.search_jobs?.duplicate_count],
                    ['Páginas', c.search_jobs?.urls.length],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <strong>{value ?? 0}</strong>
                      <small>{label}</small>
                    </div>
                  ))}
                </div>
                <div className="campaign-conversion">
                  {['Contatado', 'Respondeu', 'Reunião marcada', 'Proposta enviada', 'Fechado'].map(
                    (s) => (
                      <span key={s}>
                        {s}{' '}
                        <strong>
                          {conversions.find((v) => v.campaign_id === c.id && v.status === s)
                            ?.total ?? 0}
                        </strong>
                      </span>
                    ),
                  )}
                </div>
                <small>Distribuição por status atual; não representa conversões acumuladas.</small>
                <details>
                  <summary>Filtros e interpretação</summary>
                  <dl>
                    {Object.entries(c.filters)
                      .filter(([, v]) => v !== '' && v !== false)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                  </dl>
                  {c.intent && <p>Consulta: {c.intent.query}</p>}
                </details>
                {c.search_jobs?.error && <p className="error-text">{c.search_jobs.error}</p>}
                <div className="job-actions">
                  <Link href={`/leads?campaign=${c.id}`}>Ver leads da campanha ↗</Link>
                  {c.search_jobs &&
                    ['queued', 'running', 'failed'].includes(c.search_jobs.state) && (
                      <Link href="/buscar">Retomar pesquisa →</Link>
                    )}
                </div>
              </div>
            </section>
          ))
        ) : (
          <section className="panel">
            <Empty
              title="Cada pesquisa conta uma história"
              text="Crie sua primeira campanha para acompanhar resultados e oportunidades."
            />
          </section>
        )}
      </div>
      <div className="pagination">
        <span>
          {total} campanhas · Página {page}
        </span>
        <div>
          {page > 1 && <Link href={`/campanhas?page=${page - 1}`}>← Anterior</Link>}
          {page * 20 < total && <Link href={`/campanhas?page=${page + 1}`}>Próxima →</Link>}
        </div>
      </div>
    </>
  );
}
