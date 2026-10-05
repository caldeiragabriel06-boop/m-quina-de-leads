import { NextResponse } from 'next/server';
import { z } from 'zod';
import { advanceJob } from '@/lib/search/service';
import { authenticated, checked } from '@/lib/supabase/server';
import { sameOrigin, apiError } from '@/lib/api';
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { id } = await context.params;
    return NextResponse.json(await advanceJob(z.uuid().parse(id)));
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(_request: Request, context: Context) {
  try {
    const { db } = await authenticated();
    const { id } = await context.params;
    return NextResponse.json(
      checked(await db.from('search_jobs').select('*').eq('id', z.uuid().parse(id)).single()),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const { db } = await authenticated();
    const { id } = await context.params;
    const result = checked(
      await db
        .from('search_jobs')
        .update({
          state: 'partial',
          stage: 'Encerrada pelo usuário',
          lease_until: null,
          lease_token: null,
        })
        .eq('id', z.uuid().parse(id))
        .in('state', ['queued', 'running', 'failed'])
        .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
        .select('id'),
    );
    if (!result?.length) throw new Error('Aguarde o processamento da página atual para encerrar.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
