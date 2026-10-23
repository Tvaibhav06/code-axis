-- Phase 0 fixture only. Apply to the dedicated Brand Review Desk project.
-- Full application tables and demo-pool policies belong to Phase 1.
begin;

create table public.phase0_smoke_checks (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  nonce uuid not null,
  created_at timestamptz not null default now()
);
alter table public.phase0_smoke_checks enable row level security;
revoke all on public.phase0_smoke_checks from anon;
grant select, insert, delete on public.phase0_smoke_checks to authenticated;

create policy "smoke read own" on public.phase0_smoke_checks
for select to authenticated using (owner_id = (select auth.uid()));
create policy "smoke insert own" on public.phase0_smoke_checks
for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "smoke delete own" on public.phase0_smoke_checks
for delete to authenticated using (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('phase0-smoke', 'phase0-smoke', false, 1048576, array['image/png']);

create policy "smoke upload own" on storage.objects for insert to authenticated
with check (bucket_id = 'phase0-smoke' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "smoke download own" on storage.objects for select to authenticated
using (bucket_id = 'phase0-smoke' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "smoke remove own" on storage.objects for delete to authenticated
using (bucket_id = 'phase0-smoke' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
