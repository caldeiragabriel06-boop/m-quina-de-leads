-- Cover composite ownership foreign keys used by RLS and relationship joins.
create index campaign_leads_campaign_owner on public.campaign_leads(campaign_id,owner_id);
create index campaign_leads_lead_owner on public.campaign_leads(lead_id,owner_id);
create index activities_lead_owner on public.lead_activities(lead_id,owner_id);
create index categories_category on public.lead_categories(category);
create index categories_lead_owner on public.lead_categories(lead_id,owner_id);
create index identifiers_lead_owner on public.lead_identifiers(lead_id,owner_id);
create index sources_campaign_owner on public.lead_sources(campaign_id,owner_id);
create index sources_lead_owner on public.lead_sources(lead_id,owner_id);
create index jobs_campaign_owner on public.search_jobs(campaign_id,owner_id);
