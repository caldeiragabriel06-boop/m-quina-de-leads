import { afterEach, describe, it, expect, vi } from 'vitest';
import { postJson } from '@/lib/http';
afterEach(() => vi.unstubAllGlobals());
describe('provider failures', () => {
  it.each(['insufficient_quota', 'credit_balance_exhausted'])(
    'identifies OpenAI billing failure %s without leaking upstream content',
    async (code) => {
      const fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code, type: 'insufficient_quota', message: 'SECRET' },
          }),
          { status: 429 },
        ),
      );
      vi.stubGlobal('fetch', fetch);
      const error = await postJson('https://api.openai.com/v1/chat/completions', 'key', {}).catch(
        (e) => e,
      );
      if (!(error instanceof Error)) throw new Error('Expected provider failure');
      expect(error.message).toContain('OpenAI: saldo de créditos');
      expect(error.message).toContain('Aguardar não resolve');
      expect(error.message).not.toContain('SECRET');
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('does not leak upstream error bodies or API credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('SECRET upstream', { status: 401 })),
    );
    await expect(postJson('https://api.example.com', 'secret-key', {})).rejects.toThrow(
      'Credencial do provedor inválida',
    );
  });
  it('handles rate limiting without repeated credit-consuming retries', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    await expect(postJson('https://api.example.com', 'key', {})).rejects.toThrow('Limite');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('handles invalid JSON and timeouts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad-json')));
    await expect(postJson('https://api.example.com', 'key', {})).rejects.toThrow('inválida');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    await expect(postJson('https://api.example.com', 'key', {})).rejects.toThrow('tempo');
  });
});
