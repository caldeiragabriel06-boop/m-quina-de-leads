import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticated, checked } from '@/lib/supabase/server';
import { sameOrigin, apiError } from '@/lib/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const { db } = await authenticated();
    const { id } = await params;
    const body = z
      .object({
        kind: z.enum(['note', 'contact']),
        body: z.string().trim().min(1).max(5000),
        channel: z.string().max(100).nullable(),
        contacted_at: z.iso.datetime().nullable(),
        follow_up_at: z.iso.datetime().nullable(),
      })
      .parse(await request.json());
    if (body.kind === 'contact' && (!body.contacted_at || !body.channel))
      throw new Error('Informe data e canal do contato.');
    checked(
      await db.rpc('record_activity', {
        p_lead: z.uuid().parse(id),
        p_kind: body.kind,
        p_body: body.body,
        p_channel: body.channel ?? undefined,
        p_contacted: body.contacted_at ?? undefined,
        p_follow_up: body.follow_up_at ?? undefined,
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
