import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { configuration } from '@/lib/config';
import type { Database } from './database.types';
export async function database() {
  if (!configuration().supabase) throw new Error('Configure o Supabase em .env.local.');
  const jar = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values) {
            try {
              jar.set(name, value, options);
            } catch {
              /* Read-only Server Component; proxy refreshes cookies. */
            }
          }
        },
      },
    },
  );
}
export async function authenticated() {
  const db = await database();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new Error('Sessão expirada. Entre novamente.');
  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!user.email || !allowed.includes(user.email.toLowerCase()))
    throw new Error('Usuário sem acesso a este workspace.');
  return { db, user };
}
export function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error('Banco de dados indisponível ou migrations não aplicadas.');
  return result.data;
}
