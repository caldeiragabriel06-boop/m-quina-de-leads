import { NextResponse } from 'next/server';
import { z } from 'zod';
import { statuses } from '@/lib/domain';
import { authenticated, checked } from '@/lib/supabase/server';
import { sameOrigin, apiError } from '@/lib/api';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    sameOrigin(request);
    const { db } = await authenticated();
    const { id } = await params;
    const body = z.object({ status: z.enum(statuses) }).parse(await request.json());
    const data = checked(
      await db.from('leads').update(body).eq('id', z.uuid().parse(id)).select('id,status').single(),
    );
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
