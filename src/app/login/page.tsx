import { LoginForm } from '@/components/login-form';
import { configuration } from '@/lib/config';
import Link from 'next/link';
export default function Login() {
  const c = configuration();
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="eyebrow">MÁQUINA DE LEADS</div>
        <h1>
          Boas conexões
          <br />
          começam aqui.
        </h1>
        <p>Entre no seu workspace privado de prospecção.</p>
        {c.supabase && c.access ? (
          <LoginForm />
        ) : (
          <div className="notice">
            <p>Configure Supabase e ALLOWED_EMAILS no ambiente para habilitar o acesso.</p>
          </div>
        )}
        <small>Acesso restrito a usuários previamente autorizados.</small>
        {!c.supabase && <Link href="/">Ver configuração inicial →</Link>}
      </div>
    </div>
  );
}
