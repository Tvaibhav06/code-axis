-- Forward-only repair for already-applied migrations 003/005.
-- A stale user edit is an HTTP conflict, not a retryable database serialization fault.
begin;
do $migration$
declare
  target text;
  function_id regprocedure;
  definition text;
begin
  foreach target in array array[
    'public.publish_rulebook(uuid,integer,jsonb)',
    'public.save_campaign(uuid,uuid,integer,text,text,text,text)',
    'public.review_action(uuid,integer,text,text,uuid)',
    'public.approve_campaign(uuid,integer,uuid,uuid,jsonb)'
  ] loop
    function_id := pg_catalog.to_regprocedure(target);
    if function_id is null then
      raise exception 'Required function missing: %. Apply migrations 001 through 006 first.', target;
    end if;
    definition := pg_catalog.pg_get_functiondef(function_id);
    if position(quote_literal('40001') in definition) = 0
       and position(quote_literal('PT409') in definition) = 0 then
      raise exception 'Unexpected version-check function body: %', target;
    end if;
    -- CREATE OR REPLACE retains the existing owner and execute grants.
    -- All role checks, row locks and conditional updates remain intact.
    execute replace(definition, quote_literal('40001'), quote_literal('PT409'));
  end loop;
end;
$migration$;
notify pgrst, 'reload schema';
commit;
