-- Round 3: add confirmed image text to campaign versions.
-- Must run after 202610280001_round3_documents.sql.
begin;

alter table public.campaign_versions add column if not exists image_text text not null default '';

commit;