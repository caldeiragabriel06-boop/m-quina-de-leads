'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Mail, Phone, Globe } from 'lucide-react';
import { type Lead, statuses } from '@/lib/domain';
import { date } from '@/lib/utils';
import { StatusSelect } from '@/components/lead-controls';
import { Button } from '@/components/ui/button';
export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  return (
    <>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selecionados</span>
          <select aria-label="Novo status dos selecionados" id="bulk-status">
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Button
            disabled={busy}
            size="sm"
            onClick={async () => {
              setBusy(true);
              setMessage('');
              const status = (document.getElementById('bulk-status') as HTMLSelectElement).value;
              try {
                const results = await Promise.allSettled(
                  selected.map(async (id) => {
                    const r = await fetch(`/api/leads/${id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status }),
                    });
                    if (!r.ok) throw new Error('Falha');
                  }),
                );
                const failed = results.filter((r) => r.status === 'rejected').length;
                setMessage(
                  failed
                    ? `${failed} alterações falharam. Recarregue e tente novamente.`
                    : 'Status atualizados.',
                );
                setSelected([]);
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            Alterar status
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      <div className="table-wrap">
        <table className="leads-table">
          <thead>
            <tr>
              <th>
                <input
                  aria-label="Selecionar página"
                  type="checkbox"
                  checked={selected.length === leads.length && leads.length > 0}
                  onChange={(e) => setSelected(e.target.checked ? leads.map((l) => l.id) : [])}
                />
              </th>
              <th>Empresa</th>
              <th>Localização</th>
              <th>Oportunidade</th>
              <th>Score</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Encontrado</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar ${l.name}`}
                    checked={selected.includes(l.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, l.id]
                          : selected.filter((id) => id !== l.id),
                      )
                    }
                  />
                </td>
                <td>
                  <Link href={`/leads/${l.id}`} className="company">
                    {l.name}
                  </Link>
                  <small>{l.segment ?? 'Não informado'}</small>
                </td>
                <td>
                  {l.city ?? '—'}
                  <small>{l.country ?? 'Não informado'}</small>
                </td>
                <td>
                  <div className="tags">
                    {[...new Set(l.opportunities.map((o) => o.category))].map((c) => (
                      <span className="tag" key={c}>
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="score">{l.score}</span>
                </td>
                <td>
                  <div className="contact-icons">
                    {l.email && (
                      <a href={`mailto:${l.email}`} aria-label="Enviar e-mail">
                        <Mail size={16} />
                      </a>
                    )}
                    {l.phone && (
                      <a href={`tel:${l.phone}`} aria-label="Ligar">
                        <Phone size={16} />
                      </a>
                    )}
                    {l.website && (
                      <a
                        href={l.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Abrir website"
                      >
                        <Globe size={16} />
                      </a>
                    )}
                    {!l.email && !l.phone && !l.website && '—'}
                  </div>
                </td>
                <td>
                  <StatusSelect id={l.id} status={l.status} />
                </td>
                <td>{date(l.created_at)}</td>
                <td>
                  <Link href={`/leads/${l.id}`} aria-label={`Abrir ${l.name}`}>
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
