'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { statuses, type Lead } from '@/lib/domain';
import { Button } from '@/components/ui/button';
export function StatusSelect({ id, status }: { id: string; status: Lead['status'] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <div>
      <select
        aria-label="Status comercial"
        value={status}
        disabled={busy}
        className="status-select"
        onChange={async (e) => {
          setBusy(true);
          setError('');
          try {
            const r = await fetch(`/api/leads/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: e.target.value }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Não foi possível atualizar.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {statuses.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {error && (
        <small role="alert" className="error-text">
          {error}
        </small>
      )}
    </div>
  );
}
export function CopyButton({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState(label);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setMessage('Copiado');
        } catch {
          setMessage('Não foi possível copiar');
        }
      }}
    >
      {message}
    </Button>
  );
}
export function ActivityForm({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState('note');
  return (
    <form
      className="activity-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        setMessage('');
        const dt = (key: string) =>
          f.get(key) ? new Date(String(f.get(key))).toISOString() : null;
        try {
          const r = await fetch(`/api/leads/${id}/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kind,
              body: f.get('body'),
              channel: kind === 'contact' ? f.get('channel') : null,
              contacted_at: kind === 'contact' ? dt('contacted') : null,
              follow_up_at: kind === 'contact' ? dt('follow_up') : null,
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          form.reset();
          setMessage('Registro salvo.');
          router.refresh();
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Falha ao salvar.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Tipo de registro
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="note">Nota interna</option>
          <option value="contact">Contato realizado</option>
        </select>
      </label>
      {kind === 'contact' && (
        <>
          <label>
            Canal
            <select name="channel">
              <option>E-mail</option>
              <option>Telefone</option>
              <option>WhatsApp</option>
              <option>Instagram</option>
              <option>LinkedIn</option>
              <option>Outro</option>
            </select>
          </label>
          <label>
            Data do contato (seu horário local)
            <input type="datetime-local" name="contacted" required />
          </label>
          <label>
            Próximo follow-up
            <input type="datetime-local" name="follow_up" />
          </label>
        </>
      )}
      <label>
        Observação
        <textarea
          name="body"
          required
          maxLength={5000}
          placeholder="Registre o contexto para sua próxima conversa…"
        />
      </label>
      <Button disabled={busy}>{busy ? 'Salvando…' : 'Salvar registro'}</Button>
      <p role="status">{message}</p>
    </form>
  );
}
