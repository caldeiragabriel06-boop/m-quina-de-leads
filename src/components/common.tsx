import Link from 'next/link';
import { ArrowUpRight, Search, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SearchLink() {
  return (
    <Button asChild>
      <Link href="/buscar">
        <Search size={16} /> Buscar Leads <ArrowUpRight size={16} />
      </Link>
    </Button>
  );
}
export function Empty({
  title = 'Seu próximo cliente começa aqui',
  text = 'Faça sua primeira busca para descobrir empresas e oportunidades reais.',
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Search size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      <Button variant="outline" asChild>
        <Link href="/buscar">
          Criar uma busca <ArrowUpRight size={15} />
        </Link>
      </Button>
    </div>
  );
}
export function SetupNotice() {
  return (
    <div className="notice">
      <Database size={19} />
      <div>
        <strong>Conecte suas integrações para começar</strong>
        <p>
          Configure Supabase, Firecrawl e o interpretador de intenção. Seus leads aparecerão aqui
          após a primeira busca real.
        </p>
      </div>
      <Link href="/configuracoes">
        Configurar <ArrowUpRight size={15} />
      </Link>
    </div>
  );
}
export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Não foi possível carregar os dados</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}
