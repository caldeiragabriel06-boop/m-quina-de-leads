-- Private, owner-scoped workspace. No service-role key is required by the app.
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id),
 name text not null, prompt text not null, filters jsonb not null, intent jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id),
 name text not null, segment text, country text, region text, city text, website text,
 instagram text, linkedin text, facebook text, phone text, whatsapp text, email text, description text,
 website_state text not null default 'unknown' check(website_state in ('unknown','present','missing')),
 score integer not null default 0 check(score between 0 and 100), score_reasons jsonb not null default '[]', opportunities jsonb not null default '[]',
 status text not null default 'Novo' check(status in ('Novo','Para contatar','Contatado','Respondeu','Reunião marcada','Proposta enviada','Fechado','Perdido','Não contatar')),
 last_contact_at timestamptz, follow_up_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.categories (name text primary key);
insert into public.categories(name) values ('Website'),('Automação IA'),('IA Recepcionista'),('Software'),('Outro');
create table public.lead_categories (
 owner_id uuid not null default auth.uid(), lead_id uuid not null, category text not null references public.categories(name),
 created_at timestamptz not null default now(), primary key(lead_id,category), foreign key(lead_id,owner_id) references public.leads(id,owner_id) on delete cascade
);
create table public.lead_identifiers (
 owner_id uuid not null default auth.uid(), identifier text not null, lead_id uuid not null,
 created_at timestamptz not null default now(), primary key(owner_id,identifier), foreign key(lead_id,owner_id) references public.leads(id,owner_id) on delete cascade
);
create table public.campaign_leads (
 owner_id uuid not null default auth.uid(), campaign_id uuid not null, lead_id uuid not null, is_new boolean not null,
 created_at timestamptz not null default now(), primary key(campaign_id,lead_id),
 foreign key(campaign_id,owner_id) references public.campaigns(id,owner_id) on delete cascade,
 foreign key(lead_id,owner_id) references public.leads(id,owner_id) on delete cascade
);
create table public.lead_sources (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), lead_id uuid not null, campaign_id uuid not null,
 url text not null, evidence jsonb not null, created_at timestamptz not null default now(), unique(lead_id,url,campaign_id),
 foreign key(lead_id,owner_id) references public.leads(id,owner_id) on delete cascade,
 foreign key(campaign_id,owner_id) references public.campaigns(id,owner_id) on delete cascade
);
create table public.lead_activities (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), lead_id uuid not null,
 kind text not null check(kind in ('status','contact','note')), body text not null, channel text, contacted_at timestamptz, follow_up_at timestamptz,
 created_at timestamptz not null default now(), foreign key(lead_id,owner_id) references public.leads(id,owner_id) on delete cascade
);
create table public.search_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(), campaign_id uuid not null unique,
 state text not null default 'queued' check(state in ('queued','running','completed','partial','failed')),
 stage text not null default 'Interpretando solicitação', urls jsonb not null default '[]', cursor integer not null default 0,
 found integer not null default 0, valid integer not null default 0, new_count integer not null default 0, duplicate_count integer not null default 0,
 warnings jsonb not null default '[]', error text, lease_token uuid, lease_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(campaign_id,owner_id) references public.campaigns(id,owner_id) on delete cascade
);
create index leads_owner_status on public.leads(owner_id,status);
create index leads_owner_score on public.leads(owner_id,score desc);
create index leads_owner_created on public.leads(owner_id,created_at desc);
create index leads_location on public.leads(owner_id,country,city);
create index leads_search on public.leads using gin(to_tsvector('simple',coalesce(name,'')||' '||coalesce(segment,'')||' '||coalesce(city,'')));
create index campaigns_owner on public.campaigns(owner_id,created_at desc);
create index jobs_owner on public.search_jobs(owner_id,created_at desc);
create index identifiers_lead on public.lead_identifiers(lead_id);
create index category_owner on public.lead_categories(owner_id,category);
create index campaign_leads_lead on public.campaign_leads(lead_id);
create index sources_lead on public.lead_sources(lead_id,created_at desc);
create index activities_lead on public.lead_activities(lead_id,created_at desc);

do $$ declare t text; begin
 foreach t in array array['campaigns','leads','lead_categories','lead_identifiers','campaign_leads','lead_sources','lead_activities','search_jobs'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id)',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
alter table public.categories enable row level security;
create policy category_read on public.categories for select to authenticated using(true);
grant select on public.categories to authenticated;

create function public.touch_record() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now();return new;end $$;
create trigger leads_touch before update on public.leads for each row execute function public.touch_record();
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_record();
create trigger jobs_touch before update on public.search_jobs for each row execute function public.touch_record();
create function public.audit_status() returns trigger language plpgsql security invoker set search_path='' as $$ begin
 if old.status is distinct from new.status then insert into public.lead_activities(owner_id,lead_id,kind,body) values(new.owner_id,new.id,'status',old.status||' → '||new.status); end if;return new;end $$;
create trigger leads_status after update on public.leads for each row execute function public.audit_status();

create function public.create_search(p_name text,p_prompt text,p_filters jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare c uuid; j uuid;begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.search_jobs where owner_id=auth.uid() and state in ('queued','running')) then raise exception 'Retome ou encerre a busca existente antes de iniciar outra.';end if;
 if (select count(*) from public.search_jobs where owner_id=auth.uid() and created_at>now()-interval '1 hour')>=10 then raise exception 'Limite de 10 buscas por hora atingido.';end if;
 insert into public.campaigns(name,prompt,filters) values(p_name,p_prompt,p_filters) returning id into c;
 insert into public.search_jobs(campaign_id) values(c) returning id into j;
 return j;
end $$;
create function public.claim_job(p_id uuid,p_token uuid) returns setof public.search_jobs language plpgsql security invoker set search_path='' as $$ begin
 return query update public.search_jobs set lease_token=p_token,lease_until=now()+interval '75 seconds',state='running',error=null
 where id=p_id and owner_id=auth.uid() and state in ('queued','running','failed') and (lease_until is null or lease_until<now()) returning *;
end $$;

-- One page is committed atomically, including all aliases and the processing cursor.
create function public.ingest_page(p_job uuid,p_token uuid,p_items jsonb,p_warning text default null) returns void language plpgsql security invoker set search_path='' as $$
declare j public.search_jobs; item jsonb; c jsonb; ids uuid[]; lid uuid; was_new boolean; k text; cat jsonb; n integer; total integer; target integer;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into j from public.search_jobs where id=p_job and owner_id=auth.uid() and lease_token=p_token and lease_until>now() for update;
 if not found then raise exception 'Search lease expired';end if;
 select (intent->>'quantity')::integer into target from public.campaigns where id=j.campaign_id;
 for item in select value from jsonb_array_elements(p_items) loop
  if (select count(*) from public.campaign_leads where campaign_id=j.campaign_id)>=target then exit;end if;
  c=item->'lead';
  select array_agg(distinct lead_id) into ids from public.lead_identifiers where owner_id=auth.uid() and identifier in(select jsonb_array_elements_text(item->'identifiers'));
  if coalesce(array_length(ids,1),0)>1 then
   j.warnings=j.warnings||jsonb_build_array('Identificadores conflitantes; empresa ignorada para revisão: '||(c->>'name'));continue;
  end if;
  was_new=coalesce(array_length(ids,1),0)=0;
  if was_new then
   insert into public.leads(name,segment,country,region,city,website,instagram,linkedin,facebook,phone,whatsapp,email,description,website_state,score,score_reasons,opportunities)
   values(c->>'name',c->>'segment',c->>'country',c->>'region',c->>'city',c->>'website',c->>'instagram',c->>'linkedin',c->>'facebook',c->>'phone',c->>'whatsapp',c->>'email',c->>'description',c->>'website_state',(c->>'score')::integer,c->'score_reasons',c->'opportunities') returning id into lid;
  else
   lid=ids[1];
   update public.leads set segment=coalesce(segment,c->>'segment'),country=coalesce(country,c->>'country'),region=coalesce(region,c->>'region'),city=coalesce(city,c->>'city'),website=coalesce(website,c->>'website'),instagram=coalesce(instagram,c->>'instagram'),linkedin=coalesce(linkedin,c->>'linkedin'),facebook=coalesce(facebook,c->>'facebook'),phone=coalesce(phone,c->>'phone'),whatsapp=coalesce(whatsapp,c->>'whatsapp'),email=coalesce(email,c->>'email'),description=coalesce(description,c->>'description'),website_state=case when coalesce(website,c->>'website') is not null then 'present' else website_state end,
   opportunities=(select coalesce(jsonb_agg(distinct value),'[]') from jsonb_array_elements(opportunities||(c->'opportunities'))) where id=lid;
  end if;
  for k in select jsonb_array_elements_text(item->'identifiers') loop insert into public.lead_identifiers(identifier,lead_id) values(k,lid) on conflict do nothing;end loop;
  for cat in select value from jsonb_array_elements(c->'opportunities') loop insert into public.lead_categories(lead_id,category) values(lid,cat->>'category') on conflict do nothing;end loop;
  insert into public.campaign_leads(campaign_id,lead_id,is_new) values(j.campaign_id,lid,was_new) on conflict do nothing;
  insert into public.lead_sources(lead_id,campaign_id,url,evidence) values(lid,j.campaign_id,item->>'source',item->'evidence') on conflict do nothing;
 end loop;
 select count(*),count(*) filter(where is_new) into total,n from public.campaign_leads where campaign_id=j.campaign_id;
 if p_warning is not null then j.warnings=j.warnings||jsonb_build_array(p_warning);end if;
 update public.search_jobs set cursor=j.cursor+1,found=j.found+jsonb_array_length(p_items),valid=total,new_count=n,duplicate_count=total-n,warnings=j.warnings,
 state=case when total>=target then 'completed' when j.cursor+1>=jsonb_array_length(j.urls) then case when jsonb_array_length(j.warnings)>0 or total<target then 'partial' else 'completed' end else 'running' end,
 stage=case when total>=target or j.cursor+1>=jsonb_array_length(j.urls) then 'Busca concluída' else 'Analisando empresas e extraindo contatos' end,lease_token=null,lease_until=null where id=p_job;
end $$;
create function public.record_activity(p_lead uuid,p_kind text,p_body text,p_channel text default null,p_contacted timestamptz default null,p_follow_up timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$ begin
 if not exists(select 1 from public.leads where id=p_lead and owner_id=auth.uid()) then raise exception 'Lead not found';end if;
 insert into public.lead_activities(lead_id,kind,body,channel,contacted_at,follow_up_at) values(p_lead,p_kind,p_body,p_channel,p_contacted,p_follow_up);
 if p_kind='contact' then update public.leads set last_contact_at=greatest(last_contact_at,p_contacted),follow_up_at=p_follow_up where id=p_lead;end if;
end $$;
revoke execute on function public.create_search(text,text,jsonb),public.claim_job(uuid,uuid),public.ingest_page(uuid,uuid,jsonb,text),public.record_activity(uuid,text,text,text,timestamptz,timestamptz),public.touch_record(),public.audit_status() from public,anon;
grant execute on function public.create_search(text,text,jsonb),public.claim_job(uuid,uuid),public.ingest_page(uuid,uuid,jsonb,text),public.record_activity(uuid,text,text,text,timestamptz,timestamptz) to authenticated;
create function public.dashboard_stats() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'total',(select count(*) from public.leads),
 'statuses',coalesce((select jsonb_object_agg(status,n) from(select status,count(*) n from public.leads group by status)s),'{}'),
 'categories',coalesce((select jsonb_object_agg(category,n) from(select category,count(*) n from public.lead_categories group by category)c),'{}'),
 'campaigns',coalesce((select jsonb_agg(x) from(select c.id,c.name,count(cl.lead_id) total from public.campaigns c left join public.campaign_leads cl on cl.campaign_id=c.id group by c.id order by c.created_at desc limit 8)x),'[]')
 );
$$;
revoke execute on function public.dashboard_stats() from public,anon;
grant execute on function public.dashboard_stats() to authenticated;
create function public.campaign_conversion() returns table(campaign_id uuid,status text,total bigint) language sql stable security invoker set search_path='' as $$
 select cl.campaign_id,l.status,count(*) from public.campaign_leads cl join public.leads l on l.id=cl.lead_id group by cl.campaign_id,l.status;
$$;
revoke execute on function public.campaign_conversion() from public,anon;
grant execute on function public.campaign_conversion() to authenticated;

