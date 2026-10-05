import { NextResponse } from 'next/server';
import { z } from 'zod';
import { database } from '@/lib/supabase/server';
import { sameOrigin, apiError } from '@/lib/api';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({ email: z.email(), password: z.string().min(8).max(200) })
      .parse(await request.json());
    const allowed = (process.env.ALLOWED_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase());
    if (!allowed.includes(input.email.toLowerCase()))
      throw new Error('Credenciais inválidas ou usuário sem acesso.');
    const db = await database();
    const { error } = await db.auth.signInWithPassword(input);
    if (error) throw new Error('Credenciais inválidas ou serviço de autenticação indisponível.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const db = await database();
    const { error } = await db.auth.signOut();
    if (error) throw new Error('Não foi possível encerrar a sessão.');
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
