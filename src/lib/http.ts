import 'server-only';
export class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function postJson(
  url: string,
  key: string,
  body: unknown,
  timeout = 45000,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
    });
  } catch {
    throw new ProviderError('O provedor não respondeu a tempo. Tente retomar a busca.', 408);
  }
  if (!response.ok) {
    const status = response.status;
    const host = new URL(url).hostname;
    const provider =
      host === 'api.openai.com'
        ? 'OpenAI'
        : host === 'api.firecrawl.dev'
          ? 'Firecrawl'
          : 'Provedor';
    // Read only classification fields. Never expose upstream messages or credentials.
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code;
    const type = payload?.error?.type;
    const quotaExceeded =
      status === 429 &&
      (type === 'insufficient_quota' ||
        [
          'insufficient_quota',
          'credit_balance_exhausted',
          'billing_hard_limit_reached',
          'organization_usage_limit_exceeded',
          'project_usage_limit_exceeded',
        ].includes(code));
    throw new ProviderError(
      quotaExceeded
        ? `${provider}: saldo de créditos esgotado ou limite de gastos atingido. Verifique créditos e limites na conta da API e depois retome a busca. Aguardar não resolve esse bloqueio.`
        : status === 429
          ? `${provider}: Limite temporário de requisições atingido. Aguarde e retome a busca.`
          : status === 401 || status === 403
            ? `${provider}: Credencial do provedor inválida. Verifique as configurações.`
            : status === 402
              ? `${provider}: Créditos insuficientes. Adicione créditos à conta da API e retome a busca.`
              : `${provider} indisponível (HTTP ${status}).`,
      status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderError('O provedor retornou uma resposta inválida.', 502);
  }
}
