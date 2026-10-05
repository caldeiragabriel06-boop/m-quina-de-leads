'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Users,
  Columns3,
  Folder,
  Settings,
  Globe,
  Sparkles,
  Phone,
  Code2,
  ArrowUpRight,
  Command,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
const navigation = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buscar', label: 'Buscar Leads', icon: Search },
  { href: '/leads', label: 'Todos os Leads', icon: Users },
];
export function Shell({ children, email }: { children: React.ReactNode; email?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const nav = (href: string, label: string, Icon: typeof Search) => (
    <Link
      onClick={() => setOpen(false)}
      key={href}
      href={href}
      className={cn('nav-item', pathname === href && 'active')}
    >
      <Icon size={17} />
      {label}
      {pathname === href && <span className="nav-dot" />}
    </Link>
  );
  return (
    <div className="workspace">
      <button className="mobile-menu" aria-label="Abrir menu" onClick={() => setOpen(!open)}>
        {open ? <X /> : <Menu />}
      </button>
      <aside className={cn('sidebar', open && 'sidebar-open')}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Command size={21} />
          </span>
          <span>
            Máquina de Leads<small>WORKSPACE PRIVADO</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="avatar">ML</span>
          <span>
            Meu workspace<small>Prospecção comercial</small>
          </span>
          <span className="tiny-dot" />
        </div>
        <nav>
          <span className="nav-label">WORKSPACE</span>
          {navigation.map((n) => nav(n.href, n.label, n.icon))}
          <span className="nav-label category-label">CATEGORIAS</span>
          {[
            { label: 'Website', icon: Globe },
            { label: 'Automação IA', icon: Sparkles },
            { label: 'IA Recepcionista', icon: Phone },
            { label: 'Software', icon: Code2 },
          ].map((n) => nav(`/leads?category=${encodeURIComponent(n.label)}`, n.label, n.icon))}
          <div className="nav-divider" />
          {nav('/pipeline', 'Pipeline', Columns3)}
          {nav('/campanhas', 'Campanhas', Folder)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tiny-dot" /> Dados reais. Boas conexões.
            <p>Da descoberta à próxima conversa.</p>
          </div>
          {nav('/configuracoes', 'Configurações', Settings)}
          <div className="profile">
            <span className="avatar">{email ? email.slice(0, 2).toUpperCase() : 'ML'}</span>
            <div>
              <strong>{email?.split('@')[0] ?? 'Seu workspace'}</strong>
              <small>{email ? 'Acesso privado' : 'Configuração inicial'}</small>
            </div>
            {email ? (
              <button
                title="Sair"
                onClick={async () => {
                  const r = await fetch('/api/auth', { method: 'DELETE' });
                  if (r.ok) {
                    router.replace('/login');
                    router.refresh();
                  } else setError('Não foi possível sair.');
                }}
              >
                <LogOut size={16} />
              </button>
            ) : (
              <ArrowUpRight size={16} />
            )}
          </div>
          {error && <small role="alert">{error}</small>}
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{' '}
            <strong>
              {pathname === '/buscar'
                ? 'Buscar Leads'
                : pathname.startsWith('/leads')
                  ? 'Leads'
                  : pathname === '/campanhas'
                    ? 'Campanhas'
                    : pathname === '/pipeline'
                      ? 'Pipeline'
                      : pathname === '/configuracoes'
                        ? 'Configurações'
                        : 'Visão geral'}
            </strong>
          </span>
          <span className="private-badge">
            <span className="tiny-dot" /> Ambiente privado
          </span>
        </header>
        <main>{children}</main>
        <footer>
          Máquina de Leads <span>Informação pública. Prospecção com contexto.</span>
        </footer>
      </div>
    </div>
  );
}
