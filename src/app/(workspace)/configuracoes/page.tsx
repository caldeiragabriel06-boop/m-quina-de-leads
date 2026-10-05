import { CheckCircle2, Circle, Database, Flame, Sparkles, LockKeyhole } from 'lucide-react';
import { configuration } from '@/lib/config';
import { PageTitle } from '@/components/common';
export default function Settings() {
  const c = configuration();
  const integrations = [
    {
      name: 'Supabase',
      icon: Database,
      ready: c.supabase,
      description: 'Banco de dados e autenticação privada.',
      variables: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    },
    {
      name: 'Firecrawl',
      icon: Flame,
      ready: c.firecrawl,
      description: 'Pesquisa web e extração de informações públicas.',
      variables: ['FIRECRAWL_API_KEY'],
    },
    {
      name: 'Interpretação de intenção',
      icon: Sparkles,
      ready: c.intent,
      description: 'Transforma sua solicitação em critérios estruturados.',
      variables: ['OPENAI_API_KEY', 'OPENAI_MODEL (opcional)'],
    },
    {
      name: 'Acesso privado',
      icon: LockKeyhole,
      ready: c.access,
      description: 'Lista de e-mails autorizados a entrar no workspace.',
      variables: ['ALLOWED_EMAILS'],
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="SEU WORKSPACE, SUAS CONEXÕES"
        title="Configurações"
        description="Integrações seguras. Credenciais mantidas somente no ambiente do servidor."
      />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Integrações</h2>
            <p>A presença das variáveis não confirma a validade das credenciais.</p>
          </div>
        </div>
        {integrations.map((i) => (
          <div className="integration" key={i.name}>
            <span className="integration-icon">
              <i.icon size={21} />
            </span>
            <div>
              <h3>{i.name}</h3>
              <p>{i.description}</p>
              {i.variables.map((v) => (
                <code key={v}>{v}</code>
              ))}
            </div>
            <span className={`integration-status ${i.ready ? 'configured' : ''}`}>
              {i.ready ? <CheckCircle2 size={16} /> : <Circle size={16} />}{' '}
              {i.ready ? 'Variáveis configuradas' : 'Configuração pendente'}
            </span>
          </div>
        ))}
      </section>
      <section className="panel detail-section setup-guide">
        <h2>Preparar o ambiente</h2>
        <ol>
          <li>
            Copie <code>.env.example</code> para <code>.env.local</code> e preencha as variáveis.
          </li>
          <li>
            Aplique as migrations versionadas em <code>supabase/migrations</code> no projeto
            Supabase.
          </li>
          <li>
            Desative cadastros públicos no Supabase Auth. Crie o usuário autorizado e configure sua
            senha.
          </li>
          <li>
            Adicione o e-mail do usuário em <code>ALLOWED_EMAILS</code>. Reinicie o servidor após
            alterar o ambiente.
          </li>
          <li>
            Na Vercel, configure as mesmas variáveis para o ambiente desejado e faça novo deploy.
          </li>
        </ol>
        <p>
          As chaves do Firecrawl e da OpenAI nunca são enviadas ao navegador. Esta aplicação não
          precisa de <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
        <p>
          Projeto Supabase:{' '}
          <a
            href="https://supabase.com/dashboard/project/dhgqpfughkbpksseysyg"
            target="_blank"
            rel="noopener noreferrer"
          >
            maquina de leads ↗
          </a>
        </p>
      </section>
    </>
  );
}
