import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { authenticated, checked } from '@/lib/supabase/server';
import { safeUrl } from '@/lib/domain';
import { leadRecord } from '@/lib/records';
import { PageTitle } from '@/components/common';
import { StatusSelect, CopyButton, ActivityForm } from '@/components/lead-controls';
import { date } from '@/lib/utils';
type Source = {
  id: string;
  url: string;
  evidence: { field: string; quote: string }[];
  created_at: string;
  campaigns: { id: string; name: string };
};
type Activity = {
  id: string;
  kind: string;
  body: string;
  channel: string | null;
  created_at: string;
  contacted_at: string | null;
  follow_up_at: string | null;
};
export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { db } = await authenticated();
  const { data, error } = await db.from('leads').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('Banco indisponível.');
  if (!data) notFound();
  const l = leadRecord.parse(data);
  const results = await Promise.all([
    db
      .from('lead_sources')
      .select('*,campaigns(id,name)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    db
      .from('lead_activities')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ]);
  const sources = checked(results[0]) as unknown as Source[];
  const activities = checked(results[1]) as Activity[];
  return (
    <>
      <Link href="/leads" className="back-link">
        ← Todos os leads
      </Link>
      <PageTitle
        eyebrow={l.segment ?? 'EMPRESA'}
        title={l.name}
        description={
          [l.city, l.region, l.country].filter(Boolean).join(' · ') || 'Localização não informada'
        }
        action={<StatusSelect id={l.id} status={l.status} />}
      />
      <div className="detail-grid">
        <div>
          <section className="panel detail-section">
            <h2>Sobre a empresa</h2>
            <p>{l.description ?? 'Descrição não disponível na fonte.'}</p>
            <div className="detail-links">
              {[
                ['Website', l.website],
                ['Instagram', l.instagram],
                ['LinkedIn', l.linkedin],
                ['Facebook', l.facebook],
                ['WhatsApp', l.whatsapp ? `https://wa.me/${l.whatsapp}` : null],
              ].map(
                ([label, url]) =>
                  url &&
                  safeUrl(url) && (
                    <a key={label} href={url} target="_blank" rel="noopener noreferrer">
                      {label} ↗
                    </a>
                  ),
              )}
            </div>
            <dl>
              <dt>E-mail público</dt>
              <dd>
                {l.email ?? 'Não encontrado'}{' '}
                {l.email && <CopyButton value={l.email} label="Copiar e-mail" />}
              </dd>
              <dt>Telefone</dt>
              <dd>
                {l.phone ?? 'Não encontrado'}{' '}
                {l.phone && <CopyButton value={l.phone} label="Copiar telefone" />}
              </dd>
              <dt>Encontrado em</dt>
              <dd>{date(l.created_at)}</dd>
              <dt>Último contato</dt>
              <dd>{l.last_contact_at ? date(l.last_contact_at) : 'Nenhum registrado'}</dd>
              <dt>Próximo follow-up</dt>
              <dd>{l.follow_up_at ? date(l.follow_up_at) : 'Não agendado'}</dd>
            </dl>
          </section>
          <section className="panel detail-section">
            <h2>Oportunidades identificadas</h2>
            {l.opportunities.length ? (
              l.opportunities.map((o, i) => (
                <div key={i} className="opportunity">
                  <span className="tag">{o.category}</span>
                  <h3>{o.service}</h3>
                  <p>{o.reason}</p>
                  <blockquote>{o.quote}</blockquote>
                </div>
              ))
            ) : (
              <p>Nenhuma oportunidade comprovada nas fontes.</p>
            )}
          </section>
          <section className="panel detail-section">
            <h2>Fontes e campanhas</h2>
            {sources.map((s) => (
              <div className="source" key={s.id}>
                {safeUrl(s.url) && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.url} ↗
                  </a>
                )}
                <p>
                  <Link href={`/leads?campaign=${s.campaigns.id}`}>{s.campaigns.name}</Link> ·{' '}
                  {date(s.created_at)}
                </p>
                <details>
                  <summary>Ver evidências ({s.evidence.length})</summary>
                  {s.evidence.map((e, i) => (
                    <blockquote key={i}>
                      <strong>{e.field}</strong>
                      <br />
                      {e.quote}
                    </blockquote>
                  ))}
                </details>
              </div>
            ))}
          </section>
          <section className="panel detail-section">
            <h2>Histórico comercial</h2>
            {activities.length ? (
              activities.map((a) => (
                <div className="activity" key={a.id}>
                  <span className="tag">
                    {a.kind === 'status' ? 'Status' : a.kind === 'note' ? 'Nota' : 'Contato'}
                  </span>
                  <small>
                    {date(a.created_at)} {a.channel && `· ${a.channel}`}
                  </small>
                  <p>{a.body}</p>
                  {a.contacted_at && <small>Contato: {date(a.contacted_at)}</small>}
                  {a.follow_up_at && <small>Follow-up: {date(a.follow_up_at)}</small>}
                </div>
              ))
            ) : (
              <p>Nenhuma atividade registrada.</p>
            )}
          </section>
        </div>
        <div>
          <section className="panel detail-section">
            <div className="score-heading">
              <h2>Qualificação</h2>
              <span className="score large">
                {l.score}
                <small>/100</small>
              </span>
            </div>
            <p>Score baseado em sinais da pesquisa de origem.</p>
            <ul className="reasons">
              {l.score_reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <small>Avaliação inicial; revise as evidências antes da abordagem.</small>
          </section>
          <section className="panel detail-section">
            <h2>Registrar atividade</h2>
            <ActivityForm id={l.id} />
          </section>
        </div>
      </div>
    </>
  );
}
