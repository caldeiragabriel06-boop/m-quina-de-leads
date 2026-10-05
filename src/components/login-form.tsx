'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const f = new FormData(e.currentTarget);
        try {
          const r = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          router.replace('/');
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Falha ao entrar.');
          setBusy(false);
        }
      }}
    >
      <label>
        E-mail
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label>
        Senha
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          minLength={8}
          required
        />
      </label>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <Button disabled={busy}>{busy ? 'Entrando…' : 'Entrar no workspace'}</Button>
    </form>
  );
}
