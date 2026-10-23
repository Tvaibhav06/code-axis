-- Phase 1 only: identities, isolated workspaces, private files and demo leases.
-- Apply after the Phase 0 migration. No campaign-review behaviour is claimed here.
begin;

create schema if not exists brd_private;
revoke all on schema brd_private from public, anon, authenticated;

create table public.workspaces (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('creator', 'reviewer', 'manager')),
  primary key (workspace_id, user_id),
  unique (workspace_id, role)
);
create index workspace_members_user_idx on public.workspace_members(user_id);
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on public.workspaces, public.workspace_members from anon, authenticated;
grant select on public.workspaces, public.workspace_members to authenticated;
grant all on public.workspaces, public.workspace_members to service_role;

-- A narrowly scoped definer avoids recursive membership RLS. Never accept a user ID.
create function public.workspace_role(p_workspace uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.workspace_members m
  where m.workspace_id = p_workspace and m.user_id = (select auth.uid());
$$;
revoke all on function public.workspace_role(uuid) from public, anon;
grant execute on function public.workspace_role(uuid) to authenticated;
create policy "members read workspace" on public.workspaces for select to authenticated
using (public.workspace_role(id) is not null);
create policy "members read memberships" on public.workspace_members for select to authenticated
using (public.workspace_role(workspace_id) is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', false, 5242880, array['image/png', 'image/jpeg']);
-- Object names: workspace/user/random-name. No public viewing, overwrite or client
-- deletion policy: an old version must not lose its stored image behind its back.
create policy "members read brand assets" on storage.objects for select to authenticated
using (bucket_id = 'brand-assets' and exists (
  select 1 from public.workspace_members m where m.user_id = (select auth.uid())
  and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "authors upload own brand assets" on storage.objects for insert to authenticated
with check (bucket_id = 'brand-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.workspace_members m
    where m.user_id = (select auth.uid()) and m.role in ('creator', 'manager')
    and m.workspace_id::text = (storage.foldername(name))[1]));
create table brd_private.demo_settings (
  singleton boolean primary key default true check (singleton),
  session_attempt_limit integer not null default 5 check (session_attempt_limit between 1 and 15),
  global_attempt_limit integer not null default 0 check (global_attempt_limit >= 0),
  global_attempts integer not null default 0 check (global_attempts >= 0)
);
insert into brd_private.demo_settings(singleton) values (true);
create table brd_private.demo_slots (
  id uuid primary key,
  workspace_id uuid not null unique references public.workspaces(id),
  verification_only boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create table brd_private.demo_leases (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  slot_id uuid not null unique references brd_private.demo_slots(id),
  expires_at timestamptz not null,
  ai_attempts integer not null default 0 check (ai_attempts >= 0),
  ai_attempt_limit integer not null check (ai_attempt_limit between 1 and 15)
);
alter table brd_private.demo_settings enable row level security;
alter table brd_private.demo_slots enable row level security;
alter table brd_private.demo_leases enable row level security;
revoke all on all tables in schema brd_private from public, anon, authenticated;

create function public.configure_demo_pool(p_session_limit integer, p_global_limit integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_session_limit is null or p_session_limit not between 1 and 15
    or p_global_limit is null or p_global_limit < 0 then
    raise exception 'Invalid demo allowance';
  end if;
  -- Preserve already consumed global attempts. Configuration never resets usage.
  update brd_private.demo_settings set session_attempt_limit = p_session_limit,
    global_attempt_limit = p_global_limit where singleton;
end;
$$;

create function public.register_demo_slot(p_slot uuid, p_workspace uuid, p_verification boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.workspace_members where workspace_id = p_workspace) <> 3 then
    raise exception 'Three distinct pre-provisioned role identities are required';
  end if;
  if exists (select 1 from brd_private.demo_slots where id = p_slot
    and (workspace_id <> p_workspace or verification_only <> p_verification)) then
    raise exception 'Existing slot does not match';
  end if;
  -- Re-running setup does not recycle a previously claimed workspace.
  insert into brd_private.demo_slots(id, workspace_id, verification_only)
  values (p_slot, p_workspace, p_verification) on conflict (id) do nothing;
end;
$$;

create function public.claim_demo_slot(p_token_hash text, p_verification boolean default false)
returns table(slot_id uuid, workspace_id uuid, expires_at timestamptz, ai_attempts integer, ai_attempt_limit integer)
language plpgsql security definer set search_path = '' as $$
declare chosen brd_private.demo_slots%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid lease';
  end if;
  -- The server serialises repeated requests from an existing cookie by reusing it.
  if exists (select 1 from brd_private.demo_leases l where l.token_hash = p_token_hash) then
    return query select s.id, s.workspace_id, l.expires_at, l.ai_attempts, l.ai_attempt_limit
      from brd_private.demo_leases l join brd_private.demo_slots s on s.id = l.slot_id
      where l.token_hash = p_token_hash and l.expires_at > now();
    return;
  end if;
  select s.* into chosen from brd_private.demo_slots s
    where s.claimed_at is null and s.verification_only = p_verification
    order by s.created_at, s.id for update skip locked limit 1;
  if chosen.id is null then return; end if;
  update brd_private.demo_slots set claimed_at = now() where id = chosen.id;
  insert into brd_private.demo_leases(token_hash, slot_id, expires_at, ai_attempt_limit)
    select p_token_hash, chosen.id, now() + interval '8 hours', settings.session_attempt_limit
    from brd_private.demo_settings settings where settings.singleton;
  return query select chosen.id, chosen.workspace_id, l.expires_at, l.ai_attempts, l.ai_attempt_limit
    from brd_private.demo_leases l where l.token_hash = p_token_hash;
end;
$$;

create function public.resolve_demo_lease(p_token_hash text)
returns table(slot_id uuid, workspace_id uuid, expires_at timestamptz, ai_attempts integer, ai_attempt_limit integer)
language sql stable security definer set search_path = '' as $$
  select s.id, s.workspace_id, l.expires_at, l.ai_attempts, l.ai_attempt_limit
  from brd_private.demo_leases l join brd_private.demo_slots s on s.id = l.slot_id
  where l.token_hash = p_token_hash and l.expires_at > now();
$$;

create function public.reserve_demo_ai_attempt(p_token_hash text)
returns integer language plpgsql security definer set search_path = '' as $$
declare remaining integer;
begin
  -- Both conditional updates share one transaction. Exceptions roll both back.
  update brd_private.demo_settings set global_attempts = global_attempts + 1
    where singleton and global_attempts < global_attempt_limit;
  if not found then raise exception 'Global AI allowance exhausted'; end if;
  update brd_private.demo_leases set ai_attempts = ai_attempts + 1
    where token_hash = p_token_hash and expires_at > now() and ai_attempts < ai_attempt_limit
    returning ai_attempt_limit - ai_attempts into remaining;
  if not found then raise exception 'Session AI allowance exhausted or lease expired'; end if;
  return remaining;
end;
$$;

create function public.demo_pool_capacity()
returns table(available bigint, claimed bigint)
language sql stable security definer set search_path = '' as $$
  select count(*) filter (where claimed_at is null), count(*) filter (where claimed_at is not null)
  from brd_private.demo_slots where not verification_only;
$$;

-- No anonymous/client RPC may allocate a slot, resolve credentials or consume budget.
revoke all on function public.configure_demo_pool(integer, integer) from public, anon, authenticated;
revoke all on function public.register_demo_slot(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.claim_demo_slot(text, boolean) from public, anon, authenticated;
revoke all on function public.resolve_demo_lease(text) from public, anon, authenticated;
revoke all on function public.reserve_demo_ai_attempt(text) from public, anon, authenticated;
revoke all on function public.demo_pool_capacity() from public, anon, authenticated;
grant execute on function public.configure_demo_pool(integer, integer),
  public.register_demo_slot(uuid, uuid, boolean), public.claim_demo_slot(text, boolean),
  public.resolve_demo_lease(text), public.reserve_demo_ai_attempt(text),
  public.demo_pool_capacity() to service_role;

commit;
