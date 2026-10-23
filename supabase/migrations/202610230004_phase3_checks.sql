begin;
create table public.check_runs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 campaign_id uuid not null references public.campaigns, content_version_id uuid not null references public.campaign_versions,
 rulebook_id uuid not null references public.rulebooks, actor_id uuid not null references auth.users,
 status text not null check(status in ('complete','failed','manual')), model text, error_code text,
 supported_source_ids jsonb not null, created_at timestamptz not null default now()
);
create table public.findings (
 id uuid primary key, run_id uuid not null references public.check_runs,
 rule_id uuid not null, category text not null check(category in ('source_conflict','evidence_missing','style_suggestion')),
 quote text not null, explanation text not null, suggestion text,
 origin text not null check(origin in ('exact','ai')), blocking boolean not null
);
create index check_runs_campaign_idx on public.check_runs(campaign_id,created_at desc);
alter table public.check_runs enable row level security;
alter table public.findings enable row level security;
revoke all on public.check_runs,public.findings from anon,authenticated;
grant select on public.check_runs,public.findings to authenticated;
grant all on public.check_runs,public.findings to service_role;
create policy "members read check runs" on public.check_runs for select to authenticated using(public.workspace_role(workspace_id) is not null);
create policy "members read findings" on public.findings for select to authenticated using(exists(select 1 from public.check_runs r where r.id=run_id and public.workspace_role(r.workspace_id) is not null));

-- Only the trusted server may record provider output. A browser cannot forge a successful AI run.
create function public.record_check_run(p_workspace uuid,p_actor uuid,p_campaign uuid,p_version uuid,p_rulebook uuid,p_status text,p_model text,p_error text,p_supported jsonb,p_findings jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare run uuid; copy text; entries jsonb; f jsonb;
begin
 if not exists(select 1 from public.campaigns c join public.campaign_versions v on v.campaign_id=c.id
   join public.workspace_members m on m.workspace_id=c.workspace_id and m.user_id=p_actor
   where c.id=p_campaign and c.workspace_id=p_workspace and v.id=p_version and c.creator_id=p_actor and m.role='creator') then
   raise exception 'Creator access required' using errcode='42501'; end if;
 select v.body into strict copy from public.campaign_versions v where v.id=p_version;
 select r.entries into strict entries from public.rulebooks r where r.id=p_rulebook and r.workspace_id=p_workspace;
 if p_status not in ('complete','failed','manual') or jsonb_typeof(p_findings)<>'array' or jsonb_array_length(p_findings)>150
   or jsonb_typeof(p_supported)<>'array' then raise exception 'Invalid run' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements_text(p_supported) s where not exists(select 1 from jsonb_array_elements(entries) e where e->>'id'=s)) then
   raise exception 'Unknown supporting source' using errcode='22023'; end if;
 insert into public.check_runs(workspace_id,campaign_id,content_version_id,rulebook_id,actor_id,status,model,error_code,supported_source_ids)
 values(p_workspace,p_campaign,p_version,p_rulebook,p_actor,p_status,p_model,p_error,p_supported) returning id into run;
 for f in select * from jsonb_array_elements(p_findings) loop
  if char_length(coalesce(f->>'quote',''))=0 or position(f->>'quote' in copy)=0
    or not exists(select 1 from jsonb_array_elements(entries) e where e->>'id'=f->>'ruleId') then
    raise exception 'Invalid finding evidence' using errcode='22023'; end if;
  insert into public.findings(id,run_id,rule_id,category,quote,explanation,suggestion,origin,blocking)
  values((f->>'id')::uuid,run,(f->>'ruleId')::uuid,f->>'category',f->>'quote',f->>'explanation',f->>'suggestion',f->>'origin',f->>'category'<>'style_suggestion');
 end loop;
 return run;
end; $$;
revoke all on function public.record_check_run(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.record_check_run(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb) to service_role;
commit;
