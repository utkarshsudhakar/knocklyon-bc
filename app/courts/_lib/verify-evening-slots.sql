-- Test database only. Requires upgrade-evening-slots.sql; rolls back all changes.
begin;
do $$
declare day date:=current_date+200;
begin
 perform court_create_evening_drafts(day,'Court 1',array['20:00-21:00','21:00-22:00']);
 if (select count(*) from court_slots s join court_releases r on r.id=s.release_id where r.day=day and s.court='Court 1' and s.published_at is null and s.deleted_at is null)<>2 then raise exception 'Expected two drafts'; end if;
 perform court_create_evening_drafts(day,'Court 2',array['21:00-22:00']);
 begin
  perform court_create_evening_drafts(day,'Court 2',array['20:00-21:00','21:00-22:00']);
  raise exception 'TEST FAILED: overlap accepted';
 exception when exclusion_violation then null; end;
 if exists(select 1 from court_slots s join court_releases r on r.id=s.release_id where r.day=day and s.court='Court 2' and (s.starts_at at time zone 'Europe/Dublin')::time='20:00') then raise exception 'Partial slot creation was not rolled back'; end if;
 begin
  perform court_create_evening_drafts(day,'Court 3',array[]::text[]);
  raise exception 'TEST FAILED: empty selection accepted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
 begin
  perform court_create_evening_drafts(day,'Court 3',array['18:00-19:00']);
  raise exception 'TEST FAILED: invalid time accepted';
 exception when raise_exception then if sqlerrm like 'TEST FAILED:%' then raise; end if; end;
end $$;
rollback;
