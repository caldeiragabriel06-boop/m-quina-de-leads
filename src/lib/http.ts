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
    throw new ProviderError(
      status === 429
        ? 'Limite do provedor atingido. Aguarde e retome a busca.'
        : status === 401 || status === 403
          ? 'Credencial do provedor inválida. Verifique as configurações.'
          : status === 402
            ? 'Créditos insuficientes no provedor.'
            : `Provedor indisponível (HTTP ${status}).`,
      status,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderError('O provedor retornou uma resposta inválida.', 502);
  }
}
