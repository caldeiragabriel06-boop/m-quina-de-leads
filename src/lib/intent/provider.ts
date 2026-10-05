import 'server-only';
import { z } from 'zod';
import { intentSchema, type Intent, type SearchInput } from '@/lib/domain';
import { postJson } from '@/lib/http';
export interface IntentProvider {
  interpret(input: SearchInput): Promise<Intent>;
}
export class OpenAIIntentProvider implements IntentProvider {
  async interpret(input: SearchInput): Promise<Intent> {
    if (!process.env.OPENAI_API_KEY)
      throw new Error('Configure OPENAI_API_KEY para interpretar a pesquisa.');
    const raw = await postJson(
      'https://api.openai.com/v1/chat/completions',
      process.env.OPENAI_API_KEY,
      {
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        store: false,
        messages: [
          {
            role: 'system',
            content:
              'Transforme a solicitação comercial em intenção estruturada. Entenda sinônimos e idiomas. Não pesquise nem invente empresas. Query é uma consulta de busca web no idioma/local apropriado, com segmento e localização. Filtros explícitos têm precedência. Quantidade solicitada no prompt tem precedência ao valor padrão do formulário; limite 100. Ausência de site é missing, não inferir isso por um site não ter sido encontrado. Explique a interpretação em português. Retorne somente JSON.',
          },
          { role: 'user', content: JSON.stringify(input) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'lead_search_intent',
            strict: true,
            schema: z.toJSONSchema(intentSchema),
          },
        },
      },
    );
    const envelope = z
      .object({
        choices: z
          .array(z.object({ message: z.object({ content: z.string().nullable() }) }))
          .min(1),
      })
      .parse(raw);
    const intent = intentSchema.parse(JSON.parse(envelope.choices[0].message.content ?? '{}'));
    return {
      ...intent,
      quantity: input.filters.quantityExplicit ? input.filters.quantity : intent.quantity,
      country: input.filters.country || intent.country,
      region: input.filters.region || intent.region,
      city: input.filters.city || intent.city,
      segment: input.filters.segment || intent.segment,
      website: input.filters.website === 'any' ? intent.website : input.filters.website,
      categories: input.filters.category ? [input.filters.category] : intent.categories,
    };
  }
}
