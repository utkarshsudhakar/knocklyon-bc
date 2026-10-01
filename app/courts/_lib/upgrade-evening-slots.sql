-- Run after the existing court migrations. Safe to rerun.
-- Both selected times are added in one transaction; any conflict rolls back both.
begin;
create or replace function court_create_evening_drafts(p_day date,p_court text,p_times text[])
returns void language plpgsql security definer set search_path=public as $$
declare selected text;
begin
 if p_times is null or cardinality(p_times)=0 or cardinality(p_times)>2 then
  raise exception 'Select one or both evening slots';
 end if;
 if exists(select 1 from unnest(p_times) t where t is null or t not in ('20:00-21:00','21:00-22:00')) then
  raise exception 'Choose 8–9 pm or 9–10 pm';
 end if;
 perform pg_advisory_xact_lock(734021);
 for selected in select distinct t from unnest(p_times) t order by t loop
  perform court_create_draft(p_day,p_court,split_part(selected,'-',1)::time,split_part(selected,'-',2)::time);
 end loop;
end $$;
revoke all on function court_create_evening_drafts(date,text,text[]) from public,anon,authenticated;
grant execute on function court_create_evening_drafts(date,text,text[]) to service_role;
commit;
