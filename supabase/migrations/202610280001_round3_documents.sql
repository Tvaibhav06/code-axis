-- Round 3: private document review and guideline import.
-- Forward-only. Migration 008 is the first to create new tables, so it is
-- self-contained and does not depend on later Round 3 migrations.
begin;

-- A second private bucket for text documents. Images already use brand-assets;
-- documents get their own boundary, mime set and size limit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-documents', 'brand-documents', false, 2097152, array['application/pdf'])
on conflict (id) do nothing;

-- Authors upload their own document; members read it. No public access.
create policy "authors upload own documents" on storage.objects for insert to authenticated
with check (bucket_id = 'brand-documents'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.workspace_members m
    where m.user_id = (select auth.uid()) and m.role in ('creator', 'manager')
    and m.workspace_id::text = (storage.foldername(name))[1]));
create policy "members read documents" on storage.objects for select to authenticated
using (bucket_id = 'brand-documents' and exists (
  select 1 from public.workspace_members m where m.user_id = (select auth.uid())
  and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "authors delete own documents" on storage.objects for delete to authenticated
using (bucket_id = 'brand-documents' and (storage.foldername(name))[2] = (select auth.uid())::text);

-- The server registers extraction results. Browser-supplied page counts, word
-- counts and text are never trusted: this row is written by the service-role
-- client after the server itself decoded the file.
create table public.validated_documents (
  path text primary key,
  workspace_id uuid not null references public.workspaces,
  owner_id uuid not null references auth.users,
  mime text not null check (mime = 'application/pdf'),
  byte_size integer not null check (byte_size between 1 and 2097152),
  page_count integer not null check (page_count between 1 and 5),
  word_count integer not null check (word_count between 1 and 1500),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  page_map jsonb not null,
  extracted_text text not null,
  validated_at timestamptz not null default now()
);
alter table public.validated_documents enable row level security;
revoke all on public.validated_documents from anon, authenticated;
grant select on public.validated_documents to authenticated;
grant all on public.validated_documents to service_role;
create policy "members read validated documents" on public.validated_documents for select to authenticated
using (public.workspace_role(workspace_id) is not null);

create function public.register_validated_document(
  p_workspace uuid, p_owner uuid, p_path text, p_mime text, p_bytes integer,
  p_pages integer, p_words integer, p_sha256 text, p_page_map jsonb, p_text text
) returns text language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.workspace_members where workspace_id = p_workspace and user_id = p_owner and role in ('manager', 'creator'))
    or split_part(p_path, '/', 1) <> p_workspace::text or split_part(p_path, '/', 2) <> p_owner::text
    or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
    or p_mime <> 'application/pdf'
    or not exists(select 1 from storage.objects where bucket_id = 'brand-documents' and name = p_path)
    or p_pages < 1 or p_pages > 5 or p_words < 1 or p_words > 1500
    or p_bytes < 1 or p_bytes > 2097152
    or jsonb_typeof(p_page_map) <> 'array' or jsonb_array_length(p_page_map) < 1 or jsonb_array_length(p_page_map) > 5
    or char_length(coalesce(p_text, '')) = 0 then
    raise exception 'Invalid document reference' using errcode = '22023';
  end if;
  insert into public.validated_documents(path, workspace_id, owner_id, mime, byte_size, page_count, word_count, sha256, page_map, extracted_text)
  values (p_path, p_workspace, p_owner, p_mime, p_bytes, p_pages, p_words, p_sha256, p_page_map, p_text)
  on conflict (path) do nothing;
  return p_path;
end; $$;
revoke all on function public.register_validated_document(uuid,uuid,text,text,integer,integer,integer,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.register_validated_document(uuid,uuid,text,text,integer,integer,integer,text,jsonb,text) to service_role;

-- Document columns on campaign versions. Optional: a text-only campaign has no
-- document, and the existing image columns are untouched.
alter table public.campaign_versions add column if not exists document_path text;
alter table public.campaign_versions add column if not exists document_text text;
alter table public.campaign_versions add column if not exists document_pages integer;

commit;