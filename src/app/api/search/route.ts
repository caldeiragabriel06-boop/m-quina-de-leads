import { NextResponse } from 'next/server';
import { searchSchema } from '@/lib/domain';
import { authenticated } from '@/lib/supabase/server';
import { configuration } from '@/lib/config';
import { sameOrigin, apiError } from '@/lib/api';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await authenticated();
    if (!Object.values(configuration()).every(Boolean))
      throw new Error('Configure Supabase, Firecrawl, OpenAI e acesso privado antes da busca.');
    const input = searchSchema.parse(await request.json());
    const { data, error } = await db.rpc('create_search', {
      p_name: input.name,
      p_prompt: input.prompt,
      p_filters: input.filters,
    });
    if (error)
      throw new Error(
        error.message.includes('Retome') || error.message.includes('Limite')
          ? error.message
          : 'Não foi possível criar a campanha. Verifique as migrations.',
      );
    return NextResponse.json({ id: data });
  } catch (error) {
    return apiError(error);
  }
}
