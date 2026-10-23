-- Phase 2: immutable source publications and numbered campaign revisions.
begin;
alter table public.workspaces add column rulebook_version integer not null default 0 check (rulebook_version >= 0);

create table public.rulebooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  version integer not null check (version > 0),
  entries jsonb not null check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) between 1 and 30),
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  -- Metadata is reserved here; actual asset controls belong to Phase 5.
  logo_path text,
  palette jsonb not null default '[]'::jsonb,
  unique (workspace_id, version)
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  creator_id uuid not null references auth.users(id),
  current_version integer not null check (current_version > 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'changes_requested', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.campaign_versions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  version integer not null check (version > 0),
  title text not null check (char_length(title) between 1 and 120),
  purpose text not null check (char_length(purpose) between 1 and 300),
  audience text not null check (char_length(audience) between 1 and 300),
  body text not null check (char_length(body) between 1 and 120000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  image_path text,
  alt_text text not null default '',
  unique (campaign_id, version)
);
create index campaigns_workspace_idx on public.campaigns(workspace_id);
alter table public.rulebooks enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_versions enable row level security;
revoke all on public.rulebooks, public.campaigns, public.campaign_versions from anon, authenticated;
grant select on public.rulebooks, public.campaigns, public.campaign_versions to authenticated;
grant all on public.rulebooks, public.campaigns, public.campaign_versions to service_role;
create policy "members read source versions" on public.rulebooks for select to authenticated
using (public.workspace_role(workspace_id) is not null);
create policy "members read campaigns" on public.campaigns for select to authenticated
using (public.workspace_role(workspace_id) is not null);
create policy "members read campaign versions" on public.campaign_versions for select to authenticated
using (exists (select 1 from public.campaigns c where c.id = campaign_id and public.workspace_role(c.workspace_id) is not null));

create function public.publish_rulebook(p_workspace uuid, p_expected_version integer, p_entries jsonb)
returns table(id uuid, version integer)
language plpgsql security definer set search_path = '' as $$
declare entry jsonb; next_version integer; new_id uuid;
begin
  if public.workspace_role(p_workspace) is distinct from 'manager' then
    raise exception 'Manager role required' using errcode = '42501';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array'
    or jsonb_array_length(p_entries) not between 1 and 30 then
    raise exception 'Use between 1 and 30 sources' using errcode = '22023';
  end if;
  if (select count(distinct item->>'id') from jsonb_array_elements(p_entries) item) <> jsonb_array_length(p_entries) then
    raise exception 'Source IDs must be distinct' using errcode = '22023';
  end if;
  for entry in select * from jsonb_array_elements(p_entries) loop
    if not (entry ?& array['id','kind','title','value','owner','source','validFrom','validUntil','aliases'])
      or exists (select 1 from unnest(array['id','kind','title','value','owner','source']) field
        where jsonb_typeof(entry->field) is distinct from 'string')
      or coalesce(entry->>'id', '') !~ '^[a-fA-F0-9-]{36}$'
      or coalesce(entry->>'kind', '') not in ('terminology', 'trial_days', 'monthly_price', 'offer', 'tone', 'evidence')
      or char_length(btrim(coalesce(entry->>'title', ''))) not between 1 and 80
      or char_length(btrim(coalesce(entry->>'value', ''))) not between 1 and 500
      or char_length(btrim(coalesce(entry->>'owner', ''))) not between 1 and 100
      or char_length(btrim(coalesce(entry->>'source', ''))) not between 1 and 200
      or jsonb_typeof(entry->'aliases') is distinct from 'array' then
      raise exception 'Invalid source fields' using errcode = '22023';
    end if;
    perform (entry->>'id')::uuid;
    if exists (select 1 from unnest(array['validFrom','validUntil']) field
      where jsonb_typeof(entry->field) not in ('null','string')
      or (entry->>field is not null and entry->>field !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')) then
      raise exception 'Use ISO source dates or null' using errcode = '22023';
    end if;
    if jsonb_array_length(entry->'aliases') > 8 or exists (
      select 1 from jsonb_array_elements(entry->'aliases') alias
      where jsonb_typeof(alias) <> 'string' or char_length(btrim(alias #>> '{}')) not between 1 and 80
    ) then raise exception 'Invalid terminology aliases' using errcode = '22023'; end if;
    if entry->>'kind' in ('trial_days', 'monthly_price') then
      if entry->>'value' !~ '^[0-9]{1,7}$' then raise exception 'Use a positive integer' using errcode = '22023'; end if;
      if (entry->>'value')::integer not between 1 and 1000000 then raise exception 'Invalid approved number' using errcode = '22023'; end if;
    end if;
    if (entry->>'validFrom')::date > (entry->>'validUntil')::date then
      raise exception 'Invalid source dates' using errcode = '22023';
    end if;
    -- Validate an individual date even if the other bound is null.
    perform (entry->>'validFrom')::date, (entry->>'validUntil')::date;
  end loop;
  update public.workspaces w set rulebook_version = w.rulebook_version + 1
    where w.id = p_workspace and w.rulebook_version = p_expected_version
    returning w.rulebook_version into next_version;
  if not found then raise exception 'Source version changed' using errcode = '40001'; end if;
  insert into public.rulebooks(workspace_id, version, entries, published_by)
    values (p_workspace, next_version, p_entries, auth.uid()) returning rulebooks.id into new_id;
  return query select new_id, next_version;
end;
$$;

create function public.save_campaign(p_workspace uuid, p_campaign uuid, p_expected_version integer,
  p_title text, p_purpose text, p_audience text, p_body text)
returns table(campaign_id uuid, version integer, version_id uuid)
language plpgsql security definer set search_path = '' as $$
declare chosen_id uuid; next_version integer; snapshot_id uuid; existing public.campaigns%rowtype;
begin
  if public.workspace_role(p_workspace) is distinct from 'creator' then
    raise exception 'Creator role required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120
    or p_purpose is null or char_length(btrim(p_purpose)) not between 1 and 300
    or p_audience is null or char_length(btrim(p_audience)) not between 1 and 300
    or p_body is null or char_length(btrim(p_body)) not between 1 and 120000
    or cardinality(regexp_split_to_array(btrim(p_body), '\s+')) > 1500 then
    raise exception 'Invalid campaign fields or word limit' using errcode = '22023';
  end if;
  if p_campaign is null then
    if p_expected_version is distinct from 0 then raise exception 'Invalid starting version' using errcode = '40001'; end if;
    insert into public.campaigns(workspace_id, creator_id, current_version)
      values (p_workspace, auth.uid(), 1) returning campaigns.id into chosen_id;
    next_version := 1;
  else
    select c.* into existing from public.campaigns c where c.id = p_campaign and c.workspace_id = p_workspace;
    if not found or existing.creator_id <> auth.uid() then raise exception 'Campaign access denied' using errcode = '42501'; end if;
    -- This conditional update locks the same campaign row used by Phase 4 approval.
    update public.campaigns c set current_version = c.current_version + 1, status = 'draft', updated_at = now()
      where c.id = p_campaign and c.current_version = p_expected_version
      returning c.id, c.current_version into chosen_id, next_version;
    if not found then raise exception 'Campaign version changed' using errcode = '40001'; end if;
  end if;
  insert into public.campaign_versions(campaign_id, version, title, purpose, audience, body, created_by)
    values (chosen_id, next_version, btrim(p_title), btrim(p_purpose), btrim(p_audience), btrim(p_body), auth.uid())
    returning campaign_versions.id into snapshot_id;
  return query select chosen_id, next_version, snapshot_id;
end;
$$;

revoke all on function public.publish_rulebook(uuid, integer, jsonb) from public, anon;
revoke all on function public.save_campaign(uuid, uuid, integer, text, text, text, text) from public, anon;
grant execute on function public.publish_rulebook(uuid, integer, jsonb),
  public.save_campaign(uuid, uuid, integer, text, text, text, text) to authenticated;
commit;
