begin;
create table public.review_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces,
 campaign_id uuid not null references public.campaigns, content_version_id uuid not null references public.campaign_versions,
 actor_id uuid not null references auth.users, actor_role text not null,
 event_type text not null check(event_type in ('comment','submit','confirm','dispute','dismiss','request_changes','clarification_request','clarification_answer')),
 finding_id uuid references public.findings, note text not null check(char_length(note) between 1 and 1500), created_at timestamptz not null default clock_timestamp()
);
create table public.approvals (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces,
 campaign_id uuid not null references public.campaigns,content_version_id uuid not null references public.campaign_versions,
 rulebook_id uuid not null references public.rulebooks,run_id uuid not null references public.check_runs,
 reviewer_id uuid not null references auth.users,approved_at timestamptz not null default clock_timestamp(),
 review_mode text not null check(review_mode in ('ai_assisted','manual')), checklist jsonb not null
);
create index review_events_campaign_idx on public.review_events(campaign_id,created_at desc);
alter table public.review_events enable row level security;
alter table public.approvals enable row level security;
revoke all on public.review_events,public.approvals from anon,authenticated;
grant select on public.review_events,public.approvals to authenticated;
grant all on public.review_events,public.approvals to service_role;
create policy "members read review history" on public.review_events for select to authenticated using(public.workspace_role(workspace_id) is not null);
create policy "members read approval history" on public.approvals for select to authenticated using(public.workspace_role(workspace_id) is not null);

create function public.review_action(p_campaign uuid,p_expected_version integer,p_action text,p_note text,p_finding uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype; v uuid; role text; event_id uuid; f_run public.check_runs%rowtype;
begin
 select x.* into c from public.campaigns x where x.id=p_campaign and public.workspace_role(x.workspace_id) is not null for update;
 if not found then raise exception 'Campaign access denied' using errcode='42501'; end if;
 role := public.workspace_role(c.workspace_id);
 if c.current_version<>p_expected_version then raise exception 'Version changed' using errcode='40001'; end if;
 select x.id into strict v from public.campaign_versions x where x.campaign_id=c.id and x.version=c.current_version;
 if p_action is null or p_action not in ('comment','submit','confirm','dispute','dismiss','request_changes','clarification_request','clarification_answer')
   or p_note is null or char_length(btrim(p_note)) not between 1 and 1500 then raise exception 'Invalid review action' using errcode='22023'; end if;
 if p_action='submit' and (role<>'creator' or c.creator_id<>auth.uid()) then raise exception 'Creator required' using errcode='42501'; end if;
 if p_action in ('confirm','dispute','dismiss','request_changes') and (role<>'reviewer' or c.creator_id=auth.uid()) then raise exception 'Independent reviewer required' using errcode='42501'; end if;
 if p_action='clarification_answer' and role<>'manager' then raise exception 'Manager required' using errcode='42501'; end if;
 if p_action in ('confirm','dispute','dismiss') then
   select r.* into f_run from public.findings f join public.check_runs r on r.id=f.run_id where f.id=p_finding and r.campaign_id=c.id and r.content_version_id=v;
   if not found or f_run.rulebook_id<>(select r.id from public.rulebooks r join public.workspaces w on w.id=r.workspace_id and w.rulebook_version=r.version where w.id=c.workspace_id)
    or f_run.id<>(select r.id from public.check_runs r where r.campaign_id=c.id and r.content_version_id=v and r.rulebook_id=f_run.rulebook_id order by r.created_at desc,r.id desc limit 1)
   then raise exception 'Finding is no longer current' using errcode='40001'; end if;
 elsif p_finding is not null then raise exception 'Unexpected finding' using errcode='22023'; end if;
 if p_action='submit' then update public.campaigns set status='submitted',updated_at=now() where id=c.id;
 elsif p_action='request_changes' then update public.campaigns set status='changes_requested',updated_at=now() where id=c.id;
 elsif p_action in ('confirm','dispute','dismiss') and c.status='approved' then update public.campaigns set status='submitted',updated_at=now() where id=c.id; end if;
 insert into public.review_events(workspace_id,campaign_id,content_version_id,actor_id,actor_role,event_type,finding_id,note)
 values(c.workspace_id,c.id,v,auth.uid(),role,p_action,p_finding,btrim(p_note)) returning id into event_id;
 return event_id;
end; $$;

-- Phase 5 replaces this hook with image/alt-text/contrast eligibility.
create function brd_private.image_review_blocker(p_version uuid,p_book uuid) returns text language sql stable set search_path='' as $$ select null::text $$;

create function brd_private.run_blocker(p_run uuid) returns text language plpgsql stable set search_path='' as $$
declare r public.check_runs%rowtype; e jsonb; today text := to_char(timezone('UTC',now()),'YYYY-MM-DD');
begin
 select * into r from public.check_runs where id=p_run;
 if not found then return 'Run checks on this saved version first.'; end if;
 if exists(select 1 from public.findings f where f.run_id=r.id and f.blocking and
   (select ev.event_type from public.review_events ev where ev.finding_id=f.id and ev.event_type in ('confirm','dispute','dismiss') order by ev.created_at desc,ev.id desc limit 1) is distinct from 'dismiss') then
   return 'Blocking findings must be corrected in a new version or dismissed by the reviewer with a reason.'; end if;
 for e in select x from public.rulebooks b cross join lateral jsonb_array_elements(b.entries) x where b.id=r.rulebook_id
   and r.supported_source_ids ? (x->>'id') loop
   if (e->>'validFrom' is not null and e->>'validFrom'>today) or (e->>'validUntil' is not null and e->>'validUntil'<today) then
    return 'A supporting source is outside its validity dates. Publish current support and re-check.'; end if;
 end loop;
 return brd_private.image_review_blocker(r.content_version_id,r.rulebook_id);
end; $$;

create function public.approve_campaign(p_campaign uuid,p_expected_version integer,p_rulebook uuid,p_run uuid,p_checklist jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.campaigns%rowtype; v uuid; r public.check_runs%rowtype; reason text; result uuid; book uuid;
begin
 -- The first operation locks the authorised campaign row. Saves/review decisions use the same row.
 select x.* into c from public.campaigns x where x.id=p_campaign and public.workspace_role(x.workspace_id) is not null for update;
 if not found or public.workspace_role(c.workspace_id) is distinct from 'reviewer' or c.creator_id=auth.uid() then raise exception 'Independent reviewer required' using errcode='42501'; end if;
 -- Lock source publication while deciding which version is current.
 perform 1 from public.workspaces w where w.id=c.workspace_id for share;
 select b.id into book from public.rulebooks b join public.workspaces w on w.id=b.workspace_id and w.rulebook_version=b.version where w.id=c.workspace_id;
 select x.id into v from public.campaign_versions x where x.campaign_id=c.id and x.version=c.current_version;
 if c.current_version<>p_expected_version or book is distinct from p_rulebook or c.status<>'submitted' then raise exception 'Review version or status changed' using errcode='40001'; end if;
 select * into r from public.check_runs where id=p_run and campaign_id=c.id and content_version_id=v and rulebook_id=book;
 if not found or r.id is distinct from (select x.id from public.check_runs x where x.campaign_id=c.id and x.content_version_id=v and x.rulebook_id=book order by x.created_at desc,x.id desc limit 1) then raise exception 'Current check required' using errcode='40001'; end if;
 reason := brd_private.run_blocker(r.id);
 if reason is not null then raise exception '%',reason using errcode='22023'; end if;
 if p_checklist->'finalReview' is distinct from 'true'::jsonb or (r.status<>'complete' and
   (p_checklist->'facts' is distinct from 'true'::jsonb or p_checklist->'claims' is distinct from 'true'::jsonb or p_checklist->'tone' is distinct from 'true'::jsonb)) then
   raise exception 'Complete the required reviewer checklist' using errcode='22023'; end if;
 insert into public.approvals(workspace_id,campaign_id,content_version_id,rulebook_id,run_id,reviewer_id,review_mode,checklist)
 values(c.workspace_id,c.id,v,book,r.id,auth.uid(),case when r.status='complete' then 'ai_assisted' else 'manual' end,p_checklist) returning id into result;
 update public.campaigns set status='approved',updated_at=now() where id=c.id;
 return result;
end; $$;

create function public.approval_state(p_campaign uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.campaigns%rowtype; a public.approvals%rowtype; current_v uuid; book uuid; reason text;
begin
 select * into c from public.campaigns where id=p_campaign and public.workspace_role(workspace_id) is not null;
 if not found then raise exception 'Campaign access denied' using errcode='42501'; end if;
 select * into a from public.approvals where campaign_id=c.id order by approved_at desc,id desc limit 1;
 if not found then return jsonb_build_object('current',false,'reason','No approval yet.','checked_at',now(),'approval',null); end if;
 select v.id into current_v from public.campaign_versions v where v.campaign_id=c.id and v.version=c.current_version;
 select b.id into book from public.rulebooks b join public.workspaces w on w.id=b.workspace_id and w.rulebook_version=b.version where w.id=c.workspace_id;
 if c.status<>'approved' or a.content_version_id<>current_v then reason := 'Copy, image or review status changed. Approval is historical.';
 elsif a.rulebook_id is distinct from book then reason := 'Approved sources changed. Re-check and obtain a new approval.';
 elsif a.run_id is distinct from (select r.id from public.check_runs r where r.campaign_id=c.id and r.content_version_id=current_v and r.rulebook_id=book order by r.created_at desc,r.id desc limit 1) then reason := 'A newer check requires a new review.';
 else reason := brd_private.run_blocker(a.run_id); end if;
 return jsonb_build_object('current',reason is null,'reason',coalesce(reason,'Approval is current.'),'checked_at',now(),
  'approval',jsonb_build_object('id',a.id,'reviewer_id',a.reviewer_id,'approved_at',a.approved_at,'content_version_id',a.content_version_id,'rulebook_id',a.rulebook_id,'run_id',a.run_id,'review_mode',a.review_mode));
end; $$;
revoke all on function brd_private.image_review_blocker(uuid,uuid),brd_private.run_blocker(uuid) from public,anon,authenticated;
revoke all on function public.review_action(uuid,integer,text,text,uuid),public.approve_campaign(uuid,integer,uuid,uuid,jsonb),public.approval_state(uuid) from public,anon;
grant execute on function public.review_action(uuid,integer,text,text,uuid),public.approve_campaign(uuid,integer,uuid,uuid,jsonb),public.approval_state(uuid) to authenticated;
commit;
