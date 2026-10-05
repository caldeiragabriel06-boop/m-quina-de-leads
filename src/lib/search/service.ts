import 'server-only';
import { authenticated, checked } from '@/lib/supabase/server';
import { type Job, searchSchema } from '@/lib/domain';
import { campaignRecord, jobRecord } from '@/lib/records';
import { OpenAIIntentProvider } from '@/lib/intent/provider';
import { discover, extract } from '@/lib/firecrawl/client';
import { normalize, accepts, qualify, identifiers } from '@/lib/leads/normalize';
import { ProviderError } from '@/lib/http';
export async function advanceJob(id: string) {
  const { db } = await authenticated();
  const token = crypto.randomUUID();
  const claimed = jobRecord
    .array()
    .parse(checked(await db.rpc('claim_job', { p_id: id, p_token: token })));
  if (!claimed.length) {
    return jobRecord.parse(checked(await db.from('search_jobs').select('*').eq('id', id).single()));
  }
  const job = claimed[0];
  const save = async (patch: Partial<Job> & { lease_token?: null; lease_until?: null }) =>
    jobRecord.parse(
      checked(
        await db
          .from('search_jobs')
          .update({ ...patch, lease_token: null, lease_until: null })
          .eq('id', id)
          .eq('lease_token', token)
          .select('*')
          .single(),
      ),
    );
  try {
    const campaign = campaignRecord.parse(
      checked(await db.from('campaigns').select('*').eq('id', job.campaign_id).single()),
    );
    const input = searchSchema.parse({
      name: campaign.name,
      prompt: campaign.prompt,
      filters: campaign.filters,
    });
    if (!campaign.intent) {
      const intent = await new OpenAIIntentProvider().interpret(input);
      checked(await db.from('campaigns').update({ intent }).eq('id', campaign.id));
      return await save({ stage: 'Pesquisando empresas e encontrando páginas' });
    }
    if (!job.urls.length) {
      const result = await discover(campaign.intent, input);
      return await save({
        urls: result.urls,
        state: result.urls.length ? 'running' : 'partial',
        stage: result.urls.length
          ? 'Analisando empresas e extraindo contatos'
          : 'Nenhuma página encontrada',
        warnings: result.warning ? [...job.warnings, result.warning] : job.warnings,
      });
    }
    const source = job.urls[job.cursor];
    if (!source) return await save({ state: 'partial', stage: 'Busca concluída' });
    let page;
    try {
      page = await extract(source, campaign.intent, input);
    } catch (error) {
      if (error instanceof ProviderError && [422, 404, 408].includes(error.status)) {
        checked(
          await db.rpc('ingest_page', {
            p_job: id,
            p_token: token,
            p_items: [],
            p_warning: `Página não processada: ${source}. ${error.message}`,
          }),
        );
        return jobRecord.parse(
          checked(await db.from('search_jobs').select('*').eq('id', id).single()),
        );
      }
      throw error;
    }
    const items = page.companies
      .map((c) => normalize(c, page.markdown))
      .filter((c) => c !== null)
      .filter((c) => accepts(c, campaign.intent!, input.filters))
      .map((c) => ({
        lead: { ...c, ...qualify(c, campaign.intent!) },
        identifiers: identifiers(c, source),
        source,
        evidence: c.evidence,
      }));
    checked(
      await db.rpc('ingest_page', {
        p_job: id,
        p_token: token,
        p_items: items,
        p_warning: page.warning,
      }),
    );
    return jobRecord.parse(checked(await db.from('search_jobs').select('*').eq('id', id).single()));
  } catch (error) {
    const message =
      error instanceof ProviderError
        ? error.message
        : error instanceof Error && !error.message.startsWith('[')
          ? error.message
          : 'Resposta inválida durante o processamento. Tente novamente.';
    return await save({
      state: 'failed',
      stage: 'Busca interrompida — resultados salvos preservados',
      error: message,
    });
  }
}
