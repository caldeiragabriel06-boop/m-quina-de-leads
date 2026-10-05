import { redirect } from 'next/navigation';
import { configuration } from '@/lib/config';
import { authenticated } from '@/lib/supabase/server';
import { Shell } from '@/components/shell';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  let email: string | undefined;
  if (configuration().supabase) {
    try {
      email = (await authenticated()).user.email;
    } catch {
      redirect('/login');
    }
  }
  return <Shell email={email}>{children}</Shell>;
}
