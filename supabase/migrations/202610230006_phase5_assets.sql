begin;
create table public.validated_assets (
 path text primary key, workspace_id uuid not null references public.workspaces, owner_id uuid not null references auth.users,
 mime text not null check(mime in ('image/png','image/jpeg')), byte_size integer not null check(byte_size between 1 and 5242880),
 width integer not null check(width between 1 and 4096),height integer not null check(height between 1 and 4096),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),validated_at timestamptz not null default now(),check(width::bigint*height<=16000000)
);
alter table public.validated_assets enable row level security;
revoke all on public.validated_assets from anon,authenticated;
grant select on public.validated_assets to authenticated;
grant all on public.validated_assets to service_role;
create policy "members read validated assets" on public.validated_assets for select to authenticated using(public.workspace_role(workspace_id) is not null);
create function public.register_validated_asset(p_workspace uuid,p_owner uuid,p_path text,p_mime text,p_bytes integer,p_width integer,p_height integer,p_sha256 text)
returns text language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=p_owner and role in ('manager','creator'))
   or split_part(p_path,'/',1)<>p_workspace::text or split_part(p_path,'/',2)<>p_owner::text
   or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg)$'
   or (p_path like '%.png' and p_mime<>'image/png') or (p_path like '%.jpg' and p_mime<>'image/jpeg')
   or not exists(select 1 from storage.objects where bucket_id='brand-assets' and name=p_path) then
   raise exception 'Invalid asset ownership' using errcode='42501'; end if;
 insert into public.validated_assets(path,workspace_id,owner_id,mime,byte_size,width,height,sha256)
 values(p_path,p_workspace,p_owner,p_mime,p_bytes,p_width,p_height,p_sha256) on conflict(path) do nothing;
 return p_path;
end; $$;
revoke all on function public.register_validated_asset(uuid,uuid,text,text,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.register_validated_asset(uuid,uuid,text,text,integer,integer,integer,text) to service_role;

alter table public.campaign_versions add column image_review jsonb not null default '{"logo":false,"spacing":false,"readability":false,"palette":false}',
 add column foreground text not null default '#000000',add column background text not null default '#ffffff';
create function public.publish_brand_sources(p_workspace uuid,p_expected_version integer,p_entries jsonb,p_logo text,p_palette jsonb)
returns table(id uuid,version integer) language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if public.workspace_role(p_workspace) is distinct from 'manager' then raise exception 'Manager required' using errcode='42501'; end if;
 if p_logo is not null and not exists(select 1 from public.validated_assets where path=p_logo and workspace_id=p_workspace) then raise exception 'Validate logo first' using errcode='22023'; end if;
 if p_palette is null or jsonb_typeof(p_palette)<>'array' or jsonb_array_length(p_palette)>6 or exists(select 1 from jsonb_array_elements(p_palette) x where jsonb_typeof(x) is distinct from 'string' or (x #>> '{}') !~ '^#[0-9a-fA-F]{6}$') then raise exception 'Invalid palette' using errcode='22023'; end if;
 select * into strict r from public.publish_rulebook(p_workspace,p_expected_version,p_entries);
 update public.rulebooks set logo_path=p_logo,palette=p_palette where rulebooks.id=r.id;
 return query select r.id::uuid,r.version::integer;
end; $$;
create function public.save_campaign_with_asset(p_workspace uuid,p_campaign uuid,p_expected_version integer,p_title text,p_purpose text,p_audience text,p_body text,
 p_image text,p_alt text,p_review jsonb,p_foreground text,p_background text)
returns table(campaign_id uuid,version integer,version_id uuid) language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if public.workspace_role(p_workspace) is distinct from 'creator' then raise exception 'Creator required' using errcode='42501'; end if;
 if p_image is not null and not exists(select 1 from public.validated_assets where path=p_image and workspace_id=p_workspace and owner_id=auth.uid()) then raise exception 'Validate owned image first' using errcode='22023'; end if;
 if p_alt is null or char_length(p_alt)>500 or p_review is null or jsonb_typeof(p_review)<>'object'
   or exists(select 1 from unnest(array['logo','spacing','readability','palette']) k where jsonb_typeof(p_review->k) is distinct from 'boolean')
   or p_foreground is null or p_foreground !~ '^#[0-9a-fA-F]{6}$' or p_background is null or p_background !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid image review fields' using errcode='22023'; end if;
 select * into strict r from public.save_campaign(p_workspace,p_campaign,p_expected_version,p_title,p_purpose,p_audience,p_body);
 update public.campaign_versions set image_path=p_image,alt_text=btrim(p_alt),image_review=p_review,foreground=p_foreground,background=p_background where campaign_versions.id=r.version_id;
 return query select r.campaign_id::uuid,r.version::integer,r.version_id::uuid;
end; $$;

create function brd_private.luminance(p_hex text) returns double precision language plpgsql immutable set search_path='' as $$
declare bytes bytea; result double precision:=0; channel double precision; i integer; weights double precision[]:=array[0.2126,0.7152,0.0722];
begin
 if p_hex !~ '^#[0-9a-fA-F]{6}$' then return null; end if;
 bytes := decode(substring(p_hex from 2),'hex');
 for i in 0..2 loop
  channel := get_byte(bytes,i)/255.0;
  result := result+weights[i+1]*(case when channel<=0.04045 then channel/12.92 else power((channel+0.055)/1.055,2.4) end);
 end loop;
 return result;
end; $$;
create or replace function brd_private.image_review_blocker(p_version uuid,p_book uuid) returns text language plpgsql stable set search_path='' as $$
declare v public.campaign_versions%rowtype; b public.rulebooks%rowtype; fg double precision; bg double precision;
begin
 select * into v from public.campaign_versions where id=p_version;
 if v.image_path is null then return null; end if;
 select * into b from public.rulebooks where id=p_book;
 if not exists(select 1 from public.validated_assets where path=v.image_path and workspace_id=b.workspace_id) or char_length(btrim(v.alt_text))=0 then return 'A validated image and alternative text are required.'; end if;
 if b.logo_path is null or jsonb_array_length(b.palette)=0 then return 'The manager must publish a validated logo and palette for visual comparison.'; end if;
 if exists(select 1 from unnest(array['logo','spacing','readability','palette']) k where v.image_review->k is distinct from 'true'::jsonb) then return 'Complete logo, spacing, readability and palette checks.'; end if;
 fg:=brd_private.luminance(v.foreground); bg:=brd_private.luminance(v.background);
 if fg is null or bg is null or (greatest(fg,bg)+0.05)/(least(fg,bg)+0.05)<4.5 then return 'The selected normal-text colour pair needs at least 4.5:1 contrast.'; end if;
 return null;
end; $$;
revoke all on function brd_private.luminance(text) from public,anon,authenticated;
revoke all on function public.publish_brand_sources(uuid,integer,jsonb,text,jsonb),public.save_campaign_with_asset(uuid,uuid,integer,text,text,text,text,text,text,jsonb,text,text) from public,anon;
grant execute on function public.publish_brand_sources(uuid,integer,jsonb,text,jsonb),public.save_campaign_with_asset(uuid,uuid,integer,text,text,text,text,text,text,jsonb,text,text) to authenticated;
commit;
