import { configuration } from '@/lib/config';
import { authenticated, checked } from '@/lib/supabase/server';
import { type Job } from '@/lib/domain';
import { jobRecord } from '@/lib/records';
import { SearchForm } from '@/components/search-form';
import { PageTitle, SetupNotice, ErrorNotice } from '@/components/common';
export default async function SearchPage() {
  const config = configuration();
  let job: Job | null = null;
  let error = '';
  if (config.supabase)
    try {
      const { db } = await authenticated();
      const jobs = jobRecord
        .array()
        .parse(
          checked(
            await db
              .from('search_jobs')
              .select('*')
              .in('state', ['queued', 'running', 'failed'])
              .order('created_at', { ascending: false })
              .limit(1),
          ),
        );
      job = jobs[0] ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Banco indisponível.';
    }
  const ready = Object.values(config).every(Boolean) && !error;
  return (
    <>
      <PageTitle
        eyebrow="DESCOBERTA DE OPORTUNIDADES"
        title="Buscar Leads"
        description="Seu cliente ideal está por aí. Vamos encontrá-lo."
      />
      {!Object.values(config).every(Boolean) && <SetupNotice />}
      {error && <ErrorNotice message={error} />}
      <SearchForm ready={ready} initialJob={job} />
    </>
  );
}
