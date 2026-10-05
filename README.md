# Máquina de Leads

Workspace privado para descobrir, qualificar e acompanhar empresas a partir de informações públicas. A aplicação usa Firecrawl como motor de pesquisa e extração; contatos ausentes permanecem `null`. Não há seed de leads, métricas artificiais ou modo de busca simulado.

## V1

- Login por e-mail/senha com Supabase Auth e lista de e-mails autorizados.
- Dashboard com métricas reais, categorias, campanhas e leads prioritários.
- Prompt em linguagem natural, filtros opcionais e campanhas persistidas.
- Pesquisa Firecrawl v2, extração JSON e verificação de trechos no conteúdo original.
- Processamento retomável por página, com progresso, resultados parciais e avisos.
- Deduplicação transacional por domínio, contatos, redes sociais, nome/cidade/país e fonte/nome.
- Tabela com filtros, paginação, seleção e alteração de status individual/em lote.
- Detalhe do lead com score explicado, evidências, fontes, notas e contatos registrados.
- Pipeline, próximo follow-up e métricas de campanha por status atual.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, componentes no padrão shadcn/ui, Supabase/Postgres, Zod e Lucide. Dependências fixadas no `package-lock.json`. TypeScript 6 e ESLint 9 foram mantidos por compatibilidade com o parser/plugins de lint do Next.js instalado. Não desabilitamos verificações de tipos ou lint para compilar.

Use Node.js **24 LTS** e npm. A Vercel deve usar Node 24.x.

## Instalação local

```sh
npm ci
cp .env.example .env.local
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env.local` **apenas se o arquivo local ainda não existir**, para não sobrescrever suas credenciais. Acesse http://127.0.0.1:3000.

O projeto Supabase selecionado é `dhgqpfughkbpksseysyg` (maquina de leads). As migrations foram aplicadas nesse projeto durante a implementação. `.env.local` é ignorado pelo Git e nunca deve ser enviado ao repositório ou incluído em logs.

## Variáveis de ambiente

| Variável                               | Onde     | Uso                                                               |
| -------------------------------------- | -------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Pública  | URL do projeto Supabase                                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública  | Chave publishable; a segurança dos dados depende das policies RLS |
| `ALLOWED_EMAILS`                       | Servidor | E-mails autorizados separados por vírgula; vazio bloqueia o login |
| `FIRECRAWL_API_KEY`                    | Servidor | Pesquisa e extração via API oficial Firecrawl                     |
| `OPENAI_API_KEY`                       | Servidor | Interpretação semântica do prompt                                 |
| `OPENAI_MODEL`                         | Servidor | Modelo com Structured Outputs; padrão `gpt-4.1-mini`              |

Não são necessárias `SUPABASE_SERVICE_ROLE_KEY`, senha do banco ou JWT secret na aplicação. Nunca prefixe uma chave secreta com `NEXT_PUBLIC_`.

A tela Configurações verifica a presença das variáveis, não a validade das credenciais. Falhas de autenticação/créditos dos provedores são mostradas quando uma pesquisa é executada. Reinicie o servidor ou faça novo deploy após alterar variáveis.

## Supabase e acesso privado

1. Abra seu projeto no [Supabase](https://supabase.com/dashboard/project/dhgqpfughkbpksseysyg).
2. Em Authentication, desative cadastros públicos e sign-ins anônimos. Esta V1 não possui formulário de cadastro.
3. Crie seu usuário por Authentication → Users → Add user, configure a senha e confirme o e-mail. Não adicione usuários diretamente por SQL.
4. Inclua o e-mail confirmado em `ALLOWED_EMAILS` no ambiente local e na Vercel.
5. Confira as migrations aplicadas antes de executar novas alterações.

Para instalar o schema em outro projeto, aplique os arquivos de `supabase/migrations` em ordem pelo SQL Editor, ou use o CLI autenticado:

```sh
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Não reaplique o SQL inicial a um banco já migrado. As migrations criam tabelas e funções específicas; não removem dados existentes. Para mudanças novas, gere uma migration com `npx supabase migration new nome` e revise antes de aplicar.

Todas as tabelas expostas têm RLS. Dados comerciais pertencem ao usuário (`owner_id = auth.uid()`). Foreign keys compostas impedem associar registros de proprietários diferentes. Categorias são um catálogo compartilhado somente para leitura. Funções são `SECURITY INVOKER`, sem contornar RLS; funções comerciais não podem ser executadas por `anon`. A allowlist adicional no servidor limita o acesso à aplicação; para uso interno, desativar o cadastro público no Auth continua sendo obrigatório.

## Arquitetura

```text
Prompt + filtros
  → Route Handler autenticado
  → campanha + search_job no Postgres
  → IntentProvider (OpenAI, JSON validado)
  → Firecrawl /v2/search
  → Firecrawl /v2/scrape (markdown + JSON estruturado)
  → normalização + evidências + filtros
  → score com motivos
  → ingest_page (transação, deduplicação e cursor)
  → lista de leads e CRM
```

```text
src/app/(workspace)/   Dashboard, busca, leads, campanhas, pipeline e configuração
src/app/api/           Autenticação, busca e alterações no CRM
src/components/        Componentes de interface e estado de interação
src/lib/intent/        Interface do interpretador e provider OpenAI
src/lib/firecrawl/     Chamadas à API oficial v2, restritas ao servidor
src/lib/search/        Orquestração de uma etapa do job
src/lib/leads/         Normalização, identificadores, critérios e pontuação
src/lib/supabase/      Cliente SSR e tipos gerados do schema remoto
src/lib/records.ts     Validação de JSONB e registros recebidos do banco
supabase/migrations/  Schema, RLS, índices, transações e auditoria
tests/                Regras de negócio, falhas de provedores e Postgres real em PGlite
```

### Como a busca progride

`POST /api/search` cria campanha/job em uma transação. `POST /api/search/:id` processa uma etapa: interpretação, descoberta ou uma página. O navegador agenda a etapa seguinte; não há fila autônoma ou tarefa que continue indefinidamente após fechar a tela.

O banco guarda URLs, cursor, contadores, avisos e estado. Cada etapa obtém um lease exclusivo de 75 segundos. A função Vercel tem duração máxima de 60 segundos e o timeout HTTP dos provedores é 45 segundos. Se o processo morrer, o job pode ser retomado após o lease expirar. A gravação de leads e avanço de cursor acontecem na mesma transação, impedindo recontagem em reenvios.

Fechar a página pausa o agendamento; a requisição corrente pode terminar. Retorne a Buscar Leads e pressione **Retomar**. **Encerrar busca** preserva os resultados e requer que nenhuma etapa esteja em execução. Há limite de 10 novas pesquisas por usuário/hora e uma pesquisa em estado queued/running por usuário. O limitador é persistido, não uma variável em memória.

Timeouts/páginas inacessíveis são registrados como avisos e a busca continua. Rate limit, falta de créditos ou credenciais inválidas interrompem o job para retomada manual após correção. Não há repetição automática de requisições que possa consumir créditos indefinidamente.

### Veracidade e qualificação

As extrações precisam incluir trechos literais do markdown para os campos. Nomes e contatos passam por verificações adicionais; URLs inseguras são descartadas. O conteúdo de páginas é tratado como dado, nunca como instrução. O retorno dos provedores é validado com Zod antes do uso.

`website_state` separa `present`, `missing` e `unknown`. **Não encontrar um site não prova que ele não existe.** Buscas que exigem ausência só aceitam uma declaração explícita na fonte, o que é deliberadamente conservador e pode produzir poucos ou zero resultados. A qualidade visual de sites não é auditada por screenshot nesta V1.

Score inicial: segmento compatível (+20), localização solicitada (+20), contato público (+20), perfil social (+10), ausência explícita de site quando pedida (+15) ou website identificado (+5), oportunidade com evidência (+15). Sem dados, sem pontos. A correspondência semântica é avaliada pelo extrator e deve ser revisada pelo usuário nas evidências; um trecho verdadeiro não garante que uma inferência comercial seja correta.

Localizações estruturadas são comparadas por texto normalizado; abreviações/traduções divergentes podem ser rejeitadas. Segmento e necessidade comercial dependem da classificação semântica baseada na fonte. Não há pontuação por Instagram “ativo” sem evidência temporal.

### Deduplicação

Aliases são únicos por usuário em `lead_identifiers`. A ingestão serializa as gravações do mesmo usuário com advisory lock. Um match reaproveita o registro, completa campos vazios, acrescenta fontes/categorias e preserva status, notas e dados previamente conhecidos. Se aliases apontam para mais de um lead, a empresa é ignorada com aviso para revisão; não há merge destrutivo automático.

Contatos iguais e domínios compartilhados podem representar filiais. Números locais sem código internacional podem não coincidir com versões internacionais. O score permanece o da pesquisa de origem quando o lead é enriquecido; não é requalificado silenciosamente. Uma empresa aparece uma vez por campanha; o contador de duplicados indica empresas já existentes na base, não todas as páginas repetidas.

## Banco

| Tabela                           | Responsabilidade                                        |
| -------------------------------- | ------------------------------------------------------- |
| `leads`                          | Empresa, contatos principais, score, status e follow-up |
| `categories` / `lead_categories` | Categorias reutilizáveis e relação N:N                  |
| `lead_identifiers`               | Aliases normalizados para deduplicação                  |
| `campaigns` / `campaign_leads`   | Solicitação, filtros e vínculo N:N com empresas         |
| `lead_sources`                   | URL, evidências e campanha de descoberta                |
| `lead_activities`                | Histórico de status, notas e contatos                   |
| `search_jobs`                    | Estado retomável, URLs, cursor, lease e contadores      |

Contatos principais ficam em `leads`; notas e histórico de contato ficam em `lead_activities`, evitando tabelas redundantes nesta milestone. Alterações de status são auditadas por trigger. Índices cobrem proprietário, status, score, datas, localizações, aliases e foreign keys compostas.

## Deploy na Vercel

1. Importe `caldeiragabriel06-boop/m-quina-de-leads` e selecione Next.js, raiz do repositório e Node 24.x.
2. Configure as variáveis acima em **Production** e, se for usar previews, em **Preview** também. Não misture projetos Supabase por acidente.
3. Build: `npm run build`; instalação: `npm ci`. Não altere o diretório de saída padrão do Next.js.
4. Configure os domínios autorizados no Supabase Auth, mantendo cadastro público desabilitado.
5. Faça deploy, entre com o usuário autorizado e execute a validação real abaixo.

As migrations não são executadas automaticamente a cada deploy. Publique primeiro alterações compatíveis do banco e depois o código. A proteção de deployment da Vercel pode permanecer habilitada; o login da aplicação continua obrigatório.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Os testes SQL usam Postgres em PGlite local, roles e RLS. Dados de teste existem apenas nos arquivos de teste e nunca são inseridos na aplicação ou no Supabase remoto. A suíte cobre deduplicação, enriquecimento sem sobrescrever status, idempotência, isolamento entre usuários, acesso anônimo, recuperação de lease e falhas dos provedores.

Para provar o fluxo real após configurar credenciais:

1. Entre e execute uma pesquisa pequena (3–5 empresas, sem restrições excessivas).
2. Confira o progresso, a intenção interpretada na campanha e eventuais avisos.
3. Abra um lead, confira cada contato na fonte e os motivos do score.
4. Altere o status e registre um contato; recarregue e confira a persistência/histórico.
5. Execute a mesma pesquisa em outra campanha e confira a contagem de existentes.
6. Teste uma pesquisa sem resultados e uma interrupção/retomada.

**A validação ponta a ponta com créditos reais de Firecrawl/OpenAI depende das chaves e de um usuário Auth configurado. Build e testes locais não substituem essa validação.**

## Limitações e próximos passos

- Até 100 leads desejados e até 100 páginas de uma consulta Firecrawl por campanha. Não há paginação ilimitada de buscadores nem promessa de atingir a meta.
- O extrator lê uma página por etapa; não segue automaticamente links de contato internos. Sites bloqueados, conteúdo inacessível ou páginas sem evidência reduzem os resultados.
- O navegador aciona etapas; execução autônoma requer uma fila/worker posterior.
- Campanhas exibem distribuição por **status atual**, não funil acumulado nem atribuição histórica de receita.
- O pipeline exibe os 20 leads de maior score por etapa com link para a lista completa. Campanhas são paginadas; o seletor da lista traz as 200 mais recentes.
- Não há envio de mensagens/e-mails, importação/exportação CSV, Apollo, Google Maps, webhooks ou automações nesta V1.
- Auditoria de dependências de produção sem alertas na implementação. A ferramenta de lint possui dependência transitiva `braces <=3.0.3` com advisory de DoS por padrões profundamente aninhados, ainda sem versão corrigida no registry consultado. Ela é usada apenas no desenvolvimento/CI, sem padrões enviados por usuários. Não foi feito downgrade inseguro do Next.js nem ocultação do advisory.

## Documentação consultada

- [Firecrawl Search v2](https://docs.firecrawl.dev/api-reference/endpoint/search)
- [Firecrawl JSON extraction](https://docs.firecrawl.dev/features/llm-extract)
- [Supabase Auth server-side](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel deployments](https://vercel.com/docs/deployments)

Consulte também os guias locais em `node_modules/next/dist/docs/` para a versão instalada.
