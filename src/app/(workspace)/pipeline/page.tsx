import Link from 'next/link';
import { configuration } from '@/lib/config';
import { authenticated, checked } from '@/lib/supabase/server';
import { statuses, type Lead } from '@/lib/domain';
import { PageTitle, SetupNotice, ErrorNotice, SearchLink } from '@/components/common';
import { StatusSelect } from '@/components/lead-controls';
import { leadRecord } from '@/lib/records';
export default async function Pipeline() {
  let columns: { status: (typeof statuses)[number]; leads: Lead[]; total: number }[] = statuses.map(
    (status) => ({ status, leads: [], total: 0 }),
  );
  let error = '';
  if (configuration().supabase)
    try {
      const { db } = await authenticated();
      columns = await Promise.all(
        statuses.map(async (status) => {
          const result = await db
            .from('leads')
            .select('*', { count: 'exact' })
            .eq('status', status)
            .order('score', { ascending: false })
            .limit(20);
          return {
            status,
            leads: leadRecord.array().parse(checked(result)),
            total: result.count ?? 0,
          };
        }),
      );
    } catch (e) {
      error = e instanceof Error ? e.message : 'Banco indisponível.';
    }
  return (
    <>
      <PageTitle
        eyebrow="DA DESCOBERTA À CONVERSÃO"
        title="Pipeline"
        description="Saiba onde cada conversa está e qual é o próximo passo."
        action={<SearchLink />}
      />
      {!configuration().supabase && <SetupNotice />}
      {error && <ErrorNotice message={error} />}
      <div className="kanban">
        {columns.map((c) => (
          <section className="kanban-column" key={c.status}>
            <header>
              <h2>
                <span className="tiny-dot" />
                {c.status}
              </h2>
              <span className="badge">{error ? '—' : c.total}</span>
            </header>
            {c.leads.length ? (
              c.leads.map((l) => (
                <article className="kanban-card" key={l.id}>
                  <div>
                    <Link href={`/leads/${l.id}`}>{l.name}</Link>
                    <span className="score">{l.score}</span>
                  </div>
                  <p>{[l.segment, l.city].filter(Boolean).join(' · ') || 'Dados não informados'}</p>
                  <StatusSelect id={l.id} status={l.status} />
                </article>
              ))
            ) : (
              <div className="kanban-empty">Nenhum lead nesta etapa.</div>
            )}
            {c.total > 20 && (
              <Link href={`/leads?status=${encodeURIComponent(c.status)}`}>
                Ver todos os {c.total} leads →
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
