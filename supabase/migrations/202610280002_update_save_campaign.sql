-- Round 3: update save_campaign_with_asset to accept document fields.
-- This must run after 202610280001_round3_documents.sql which adds the columns.
-- Forward-only, self-contained.
begin;

create or replace function public.save_campaign_with_asset(
  p_workspace uuid, p_campaign uuid, p_expected_version integer,
  p_title text, p_purpose text, p_audience text, p_body text,
  p_image text, p_alt text, p_review jsonb, p_foreground text, p_background text,
  p_document text, p_document_text text, p_document_pages integer
) returns table(campaign_id uuid, version integer, version_id uuid)
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  if public.workspace_role(p_workspace) is distinct from 'creator' then raise exception 'Creator required' using errcode = '42501'; end if;
  if p_image is not null and not exists(select 1 from public.validated_assets where path = p_image and workspace_id = p_workspace and owner_id = auth.uid()) then raise exception 'Validate owned image first' using errcode = '22023'; end if;
  if p_document is not null and not exists(select 1 from public.validated_documents where path = p_document and workspace_id = p_workspace and owner_id = auth.uid()) then raise exception 'Validate owned document first' using errcode = '22023'; end if;
  if p_alt is null or char_length(p_alt) > 500 or p_review is null or jsonb_typeof(p_review) <> 'object'
    or exists(select 1 from unnest(array['logo','spacing','readability','palette']) k where jsonb_typeof(p_review->k) is distinct from 'boolean')
    or p_foreground is null or p_foreground !~ '^#[0-9a-fA-F]{6}$' or p_background is null or p_background !~ '^#[0-9a-fA-F]{6}$'
    or p_document_text is null or char_length(p_document_text) > 120000
    or p_document_pages is null or p_document_pages < 0 or p_document_pages > 5 then
    raise exception 'Invalid image/document review fields' using errcode = '22023'; end if;
  select * into strict r from public.save_campaign(p_workspace, p_campaign, p_expected_version, p_title, p_purpose, p_audience, p_body);
  update public.campaign_versions set
    image_path = p_image, alt_text = btrim(p_alt), image_review = p_review, foreground = p_foreground, background = p_background,
    document_path = p_document, document_text = btrim(p_document_text), document_pages = p_document_pages
  where campaign_versions.id = r.version_id;
  return query select r.campaign_id::uuid, r.version::integer, r.version_id::uuid;
end; $$;

revoke all on function public.save_campaign_with_asset(uuid,uuid,integer,text,text,text,text,text,text,jsonb,text,text,text,text,integer) from public, anon;
grant execute on function public.save_campaign_with_asset(uuid,uuid,integer,text,text,text,text,text,text,jsonb,text,text,text,text,integer) to authenticated;

notify pgrst, 'reload schema';
commit;