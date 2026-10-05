'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  ArrowUpRight,
  CheckCircle2,
  Pause,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories, filtersSchema, type Job } from '@/lib/domain';
const suggestions = [
  'Encontre 50 restaurantes em Portugal sem site próprio e com contato público.',
  'Encontre clínicas odontológicas em São Paulo com oportunidades para IA recepcionista.',
  'Encontre empresas no Texas com problemas verificáveis no website.',
];
export function SearchForm({ ready, initialJob }: { ready: boolean; initialJob: Job | null }) {
  const [prompt, setPrompt] = useState('');
  const [job, setJob] = useState<Job | null>(initialJob);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!running || !job) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search/${job.id}`, { method: 'POST' });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        if (!stopped && mounted.current) {
          setJob(data);
          if (['completed', 'partial', 'failed'].includes(data.state)) setRunning(false);
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Falha de conexão. Você pode retomar.');
          setRunning(false);
        }
      }
    }, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [running, job]);
  const active = job && ['queued', 'running', 'failed'].includes(job.state);
  return (
    <>
      <section className="prompt-panel">
        <div className="prompt-heading">
          <span className="spark-icon">
            <Sparkles size={20} />
          </span>
          <div>
            <h2>Quem você quer encontrar?</h2>
            <p>Descreva seu cliente ideal. Nós pesquisamos os sinais.</p>
          </div>
          <span className="badge">Pesquisa com IA</span>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const f = new FormData(e.currentTarget);
            try {
              const filters = filtersSchema.parse({
                country: f.get('country') ?? '',
                region: f.get('region') ?? '',
                city: f.get('city') ?? '',
                segment: f.get('segment') ?? '',
                keywords: f.get('keywords') ?? '',
                category: f.get('category') ?? '',
                quantity: Number(f.get('quantity') || 50),
                quantityExplicit: Boolean(f.get('quantity')),
                website: f.get('website') ?? 'any',
                email: f.get('email') === 'on',
                phone: f.get('phone') === 'on',
                instagram: f.get('instagram') === 'on',
                whatsapp: f.get('whatsapp') === 'on',
              });
              const r = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name: f.get('name'), filters }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              const jr = await fetch(`/api/search/${data.id}`);
              const j = await jr.json();
              if (!jr.ok) throw new Error(j.error);
              setJob(j);
              setRunning(true);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erro ao iniciar busca.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="sr-only" htmlFor="prompt">
            Descreva sua busca
          </label>
          <textarea
            id="prompt"
            className="prompt-input"
            placeholder="Encontre 50 restaurantes em Portugal que não tenham site próprio e possuam alguma forma de contato…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
          />
          <div className="prompt-bottom">
            <span>
              <span className="tiny-dot" /> Somente dados públicos e verificáveis
            </span>
            <small>{prompt.length}/2000</small>
          </div>
          <div className="search-meta">
            <label>
              Nome da campanha
              <input
                name="name"
                placeholder="Ex.: Restaurantes Portugal — Sites"
                required
                minLength={3}
                maxLength={120}
              />
            </label>
            <label>
              Quantidade desejada
              <input type="number" name="quantity" min={1} max={100} placeholder="Prompt ou 50" />
            </label>
          </div>
          <button
            type="button"
            className="filters-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <SlidersHorizontal size={16} /> Refinar a pesquisa <span>{expanded ? '−' : '+'}</span>
          </button>
          <div className={expanded ? 'filter-grid' : 'filter-grid hidden'}>
            {[
              ['country', 'País'],
              ['region', 'Estado / região'],
              ['city', 'Cidade'],
              ['segment', 'Segmento'],
              ['keywords', 'Palavras-chave'],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input name={name} maxLength={200} placeholder="Qualquer" />
              </label>
            ))}
            <label>
              Oportunidade
              <select name="category">
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Website
              <select name="website">
                <option value="any">Indiferente</option>
                <option value="present">Possui site próprio</option>
                <option value="missing">Ausência comprovada</option>
              </select>
            </label>
            <div className="checkbox-group">
              {[
                ['email', 'E-mail'],
                ['phone', 'Telefone'],
                ['instagram', 'Instagram'],
                ['whatsapp', 'WhatsApp'],
              ].map(([n, l]) => (
                <label key={n}>
                  <input type="checkbox" name={n} />
                  {l} disponível
                </label>
              ))}
            </div>
          </div>
          <div className="search-submit">
            <small>
              A quantidade é uma meta, nunca uma promessa.
              <br />A pesquisa utiliza créditos dos provedores.
            </small>
            <Button disabled={!ready || busy || Boolean(active)}>
              <Search size={17} />
              {busy ? 'Iniciando…' : 'Buscar Leads'}
              <ArrowUpRight size={16} />
            </Button>
          </div>
        </form>
      </section>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {job && (
        <section className="panel job-panel" aria-live="polite">
          <div className="panel-header">
            <div>
              <h2>
                {running
                  ? 'Pesquisa em andamento'
                  : job.state === 'failed'
                    ? 'Pesquisa interrompida'
                    : ['completed', 'partial'].includes(job.state)
                      ? 'Pesquisa finalizada'
                      : 'Pesquisa pronta para retomar'}
              </h2>
              <p>{job.stage}</p>
            </div>
            {running ? (
              <Button variant="outline" onClick={() => setRunning(false)}>
                <Pause size={15} /> Pausar após esta etapa
              </Button>
            ) : active ? (
              <Button
                onClick={() => {
                  setError('');
                  setRunning(true);
                }}
              >
                <Play size={15} /> Retomar
              </Button>
            ) : (
              <CheckCircle2 size={23} />
            )}
          </div>
          <div className="job-body">
            <progress max={Math.max(job.urls.length, 1)} value={job.cursor} />
            <div className="job-metrics">
              <span>
                <strong>{job.valid}</strong> leads válidos
              </span>
              <span>
                <strong>{job.new_count}</strong> novos
              </span>
              <span>
                <strong>{job.duplicate_count}</strong> já existentes
              </span>
              <span>
                <strong>
                  {job.cursor}/{job.urls.length}
                </strong>{' '}
                páginas processadas
              </span>
            </div>
            {job.error && <p className="error-text">{job.error}</p>}
            {job.state === 'partial' && (
              <p>
                Busca encerrada com os resultados reais disponíveis. A meta pode não ter sido
                atingida.
              </p>
            )}
            {job.warnings.length > 0 && (
              <details>
                <summary>{job.warnings.length} avisos da pesquisa</summary>
                {job.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </details>
            )}
            <div className="job-actions">
              <Link href={`/leads?campaign=${job.campaign_id}`}>
                Ver resultados salvos <ArrowUpRight size={14} />
              </Link>
              {active && !running && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const r = await fetch(`/api/search/${job.id}`, { method: 'DELETE' });
                    const data = await r.json();
                    if (!r.ok) setError(data.error);
                    else setJob({ ...job, state: 'partial', stage: 'Encerrada pelo usuário' });
                  }}
                >
                  Encerrar busca
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
      {!job && (
        <div className="suggestions">
          <div className="eyebrow">UM PONTO DE PARTIDA</div>
          <h3>Boas buscas começam com boas perguntas.</h3>
          <div>
            {suggestions.map((s, i) => (
              <button key={s} onClick={() => setPrompt(s)}>
                <span>0{i + 1}</span>
                <p>{s}</p>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="search-principles">
        <span>
          01 <strong>Descobrir</strong>
          <small>Pesquisa em fontes públicas</small>
        </span>
        <span>
          02 <strong>Verificar</strong>
          <small>Evidências antes de hipóteses</small>
        </span>
        <span>
          03 <strong>Organizar</strong>
          <small>Sem duplicar sua base</small>
        </span>
      </div>
    </>
  );
}
