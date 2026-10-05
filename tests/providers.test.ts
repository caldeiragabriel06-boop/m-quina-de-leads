import { afterEach, describe, it, expect, vi } from 'vitest';
import { postJson } from '@/lib/http';
afterEach(() => vi.unstubAllGlobals());
describe('provider failures', () => {
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
