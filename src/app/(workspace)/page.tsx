import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Users, Target, MessageSquare, Handshake } from 'lucide-react';
import { configuration } from '@/lib/config';
import { authenticated, checked } from '@/lib/supabase/server';
import { type Lead, categories, statuses } from '@/lib/domain';
import { PageTitle, SearchLink, SetupNotice, Empty, ErrorNotice } from '@/components/common';
import { date } from '@/lib/utils';
import { leadRecord, dashboardRecord } from '@/lib/records';
type Stats = {
  total: number;
  statuses: Record<string, number>;
  categories: Record<string, number>;
  campaigns: { id: string; name: string; total: number }[];
};
export default async function Dashboard() {
  let stats: Stats = { total: 0, statuses: {}, categories: {}, campaigns: [] };
  let recent: Lead[] = [];
  let best: Lead[] = [];
  let error = '';
  const configured = configuration().supabase;
  if (configured)
    try {
      const { db } = await authenticated();
      const results = await Promise.all([
        db.rpc('dashboard_stats'),
        db.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
        db
          .from('leads')
          .select('*')
          .in('status', ['Novo', 'Para contatar'])
          .order('score', { ascending: false })
          .limit(4),
      ]);
      stats = dashboardRecord.parse(checked(results[0]));
      recent = leadRecord.array().parse(checked(results[1]));
      best = leadRecord.array().parse(checked(results[2]));
    } catch (e) {
      error = e instanceof Error ? e.message : 'Banco indisponível.';
    }
  const primary = [
    {
      title: 'Total de leads',
      value: stats.total,
      icon: Users,
      caption: 'Sua base de oportunidades',
    },
    {
      title: 'Para contatar',
      value: stats.statuses['Para contatar'] ?? 0,
      icon: Target,
      caption: 'Prontos para a próxima conversa',
    },
    {
      title: 'Respostas',
      value: stats.statuses.Respondeu ?? 0,
      icon: MessageSquare,
      caption: 'Conversas em andamento',
    },
    {
      title: 'Fechados',
      value: stats.statuses.Fechado ?? 0,
      icon: Handshake,
      caption: 'Oportunidades conquistadas',
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="SEU RADAR COMERCIAL"
        title="Visão geral"
        description="Encontre boas oportunidades. Transforme contexto em conversas."
        action={<SearchLink />}
      />
      {!configured && <SetupNotice />}
      {error && <ErrorNotice message={error} />}
      <div className="stats-grid">
        {primary.map((s) => (
          <div className="stat-card" key={s.title}>
            <div>
              <span>{s.title}</span>
              <s.icon size={18} />
            </div>
            <strong>{error ? '—' : s.value.toLocaleString('pt-BR')}</strong>
            <small>{s.caption}</small>
          </div>
        ))}
      </div>
      <div className="mini-stats">
        {['Novo', 'Contatado', 'Reunião marcada', 'Proposta enviada'].map((s) => (
          <div key={s}>
            <span>{s === 'Novo' ? 'Novos leads' : s}</span>
            <strong>{error ? '—' : (stats.statuses[s] ?? 0)}</strong>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Leads recentes</h2>
              <p>As últimas empresas descobertas pelo seu radar.</p>
            </div>
            <Link href="/leads">
              Ver todos <ArrowUpRight size={15} />
            </Link>
          </div>
          {recent.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Localização</th>
                    <th>Score</th>
                    <th>Encontrado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link className="company" href={`/leads/${l.id}`}>
                          {l.name}
                        </Link>
                        <small>{l.segment ?? 'Segmento não informado'}</small>
                      </td>
                      <td>{[l.city, l.country].filter(Boolean).join(', ') || '—'}</td>
                      <td>
                        <span className="score">{l.score}</span>
                      </td>
                      <td>{date(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Por oportunidade</h2>
              <p>Onde você pode gerar valor.</p>
            </div>
            <Target size={18} />
          </div>
          <div className="category-list">
            {categories.map((c, i) => (
              <Link href={`/leads?category=${encodeURIComponent(c)}`} key={c}>
                <span className={`category-mark mark-${i}`} />
                <span>{c}</span>
                <strong>{error ? '—' : (stats.categories[c] ?? 0)}</strong>
                <ArrowRight size={14} />
              </Link>
            ))}
          </div>
          <div className="panel-foot">Uma empresa pode ter mais de uma oportunidade.</div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Priorize sua próxima conversa</h2>
              <p>Melhores scores entre leads ainda não contatados.</p>
            </div>
          </div>
          {best.length ? (
            <div className="best-list">
              {best.map((l) => (
                <Link key={l.id} href={`/leads/${l.id}`}>
                  <span className="company-avatar">{l.name.slice(0, 2).toUpperCase()}</span>
                  <span>
                    <strong>{l.name}</strong>
                    <small>{l.city ?? l.country ?? 'Localização não informada'}</small>
                  </span>
                  <span className="score">{l.score}</span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="compact-empty">
              Seu próximo bom lead ainda está por descobrir.
              <Link href="/buscar">
                Começar uma pesquisa <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Seu pipeline</h2>
              <p>Uma visão clara de cada etapa.</p>
            </div>
            <Link href="/pipeline">
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="pipeline-summary">
            {statuses.slice(0, 7).map((s, i) => (
              <div key={s}>
                <span>
                  <i style={{ opacity: 0.35 + i * 0.09 }} />
                  {s}
                </span>
                <strong>{error ? '—' : (stats.statuses[s] ?? 0)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      {stats.campaigns.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>Leads por campanha</h2>
            <Link href="/campanhas">Ver campanhas →</Link>
          </div>
          <div className="category-list">
            {stats.campaigns.map((c) => (
              <Link key={c.id} href={`/leads?campaign=${c.id}`}>
                <span>{c.name}</span>
                <strong>{c.total}</strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
