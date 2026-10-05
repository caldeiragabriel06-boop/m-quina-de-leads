import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new Error('Origem da requisição não permitida.');
}
export function apiError(error: unknown) {
  const message =
    error instanceof ZodError
      ? 'Dados inválidos. Verifique os campos.'
      : error instanceof Error
        ? error.message
        : 'Falha inesperada.';
  return NextResponse.json(
    { error: message },
    {
      status: message.includes('Sessão')
        ? 401
        : message.includes('acesso') || message.includes('Origem')
          ? 403
          : 400,
    },
  );
}
