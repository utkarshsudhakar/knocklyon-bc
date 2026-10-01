-- Run after upgrade-manual-release.sql. Safe to rerun; preserves history.
begin;
alter table court_slots add column if not exists deleted_at timestamptz;
-- Deleted slots must not reserve their old court/time.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.court_slots'::regclass and contype='x' loop
  execute format('alter table public.court_slots drop constraint %I',c.conname);
 end loop;
end $$;
alter table court_slots add constraint court_slots_no_overlap exclude using gist
 (court with =, tstzrange(starts_at,ends_at,'[)') with &&) where (deleted_at is null);

create or replace function court_edit_slot(p_slot uuid,p_day date,p_court text,p_start time,p_end time) returns void language plpgsql security definer set search_path=public as $$
declare s court_slots; r court_releases;
begin
 perform pg_advisory_xact_lock(734021);
 select * into s from court_slots where id=p_slot for update;
 if s.id is null or s.deleted_at is not null then raise exception 'Slot no longer exists'; end if;
 if s.starts_at<=clock_timestamp() then raise exception 'Started slots cannot be changed'; end if;
 if exists(select 1 from court_bookings where slot_id=p_slot and cancelled_at is null) then raise exception 'This slot is booked. Ask the captain to cancel before changing it.'; end if;
 if p_day is null or p_start is null or p_end is null or p_court is null or p_court not in ('Court 1','Court 2','Court 3') then raise exception 'Select a date, time and court'; end if;
 if p_end<=p_start or (p_day+p_start) at time zone 'Europe/Dublin' <=clock_timestamp() then raise exception 'Choose a future time, with end after start'; end if;
 insert into court_releases(day) values(p_day) on conflict do nothing;
 select * into r from court_releases where day=p_day for update;
 if r.closed then raise exception 'Bookings are closed for this date'; end if;
 -- If a slot has cancelled booking history, retain that original record and
 -- replace the active slot so its historical court/time are never overwritten.
 if exists(select 1 from court_bookings where slot_id=p_slot) then
  update court_slots set deleted_at=now() where id=p_slot;
  insert into court_slots(release_id,court,starts_at,ends_at)
  values(r.id,p_court,(p_day+p_start) at time zone 'Europe/Dublin',(p_day+p_end) at time zone 'Europe/Dublin');
 else
  update court_slots set release_id=r.id,court=p_court,
   starts_at=(p_day+p_start) at time zone 'Europe/Dublin',ends_at=(p_day+p_end) at time zone 'Europe/Dublin',
   published_at=null,notification_batch_id=null where id=p_slot;
 end if;
end $$;
create or replace function court_delete_slot(p_slot uuid) returns void language plpgsql security definer set search_path=public as $$
declare s court_slots;
begin
 perform pg_advisory_xact_lock(734021);
 select * into s from court_slots where id=p_slot for update;
 if s.id is null or s.deleted_at is not null then raise exception 'Slot no longer exists'; end if;
 if s.starts_at<=clock_timestamp() then raise exception 'Started slots cannot be deleted'; end if;
 if exists(select 1 from court_bookings where slot_id=p_slot and cancelled_at is null) then raise exception 'This slot is booked. Ask the captain to cancel before deleting it.'; end if;
 update court_slots set deleted_at=now() where id=p_slot;
end $$;
create or replace function court_release_drafts() returns uuid language plpgsql security definer set search_path=public as $$
declare batch uuid; published_ids uuid[];
begin
 -- Serialize button presses: only the first publishes the pending drafts.
 perform pg_advisory_xact_lock(734021);
 insert into court_notification_batches default values returning id into batch;
 with released as (
  update court_slots s set published_at=now(),notification_batch_id=batch
  from court_releases r where r.id=s.release_id and not r.closed and s.deleted_at is null and s.published_at is null and s.starts_at>now()
  returning s.release_id
 ) select array_agg(release_id) into published_ids from released;
 if published_ids is null then
  delete from court_notification_batches where id=batch;
  return null;
 end if;
 update court_releases set published_at=coalesce(published_at,now()) where id=any(published_ids);
 insert into court_batch_notifications(batch_id,team_id)
 select batch,id from knocklyon_teams where nullif(trim(captain_email),'') is not null and nullif(access_token,'') is not null;
 return batch;
end $$;
create or replace function court_book(p_token text,p_slot uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare t uuid; s court_slots; r court_releases; b uuid;
begin
 perform pg_advisory_xact_lock(734021);
 select id into t from knocklyon_teams where access_token=p_token for update;
 if t is null then raise exception 'Invalid captain link'; end if;
 select * into s from court_slots where id=p_slot;
 if s.id is null or s.deleted_at is not null then raise exception 'Slot unavailable'; end if;
 select * into r from court_releases where id=s.release_id for update;
 if s.published_at is null or r.closed or s.starts_at<=clock_timestamp() then raise exception 'Slot unavailable or expired'; end if;
 insert into court_bookings(slot_id,release_id,team_id) values(s.id,r.id,t) returning id into b;
 return b;
exception when unique_violation then raise exception 'Slot taken or your team already has a booking that day';
end $$;

revoke all on function court_edit_slot(uuid,date,text,time,time),court_delete_slot(uuid),court_release_drafts(),court_book(text,uuid) from public,anon,authenticated;
grant execute on function court_edit_slot(uuid,date,text,time,time),court_delete_slot(uuid),court_release_drafts(),court_book(text,uuid) to service_role;
commit;
