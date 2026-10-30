-- Recycle expired demo slots so they can be reused.
-- A slot is recycled when all its leases have expired.
create or replace function public.recycle_expired_demo_slots()
returns integer language plpgsql security definer set search_path = '' as $$
declare recycled integer;
begin
  update brd_private.demo_slots
  set claimed_at = null
  where claimed_at is not null
    and not verification_only
    and not exists (
      select 1 from brd_private.demo_leases l
      where l.slot_id = brd_private.demo_slots.id
        and l.expires_at > now()
    );
  get diagnostics recycled = row_count;
  -- Clean up expired leases
  delete from brd_private.demo_leases where expires_at <= now();
  return recycled;
end;
$$;
revoke all on function public.recycle_expired_demo_slots() from public, anon, authenticated;
grant execute on function public.recycle_expired_demo_slots() to service_role;

