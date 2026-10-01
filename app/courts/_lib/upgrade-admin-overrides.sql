-- Run after upgrade-slot-management.sql. Safe to rerun; retains audit history.
begin;
create table if not exists court_booking_changes (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references court_bookings(id) on delete cascade,
 team_id uuid not null references knocklyon_teams(id) on delete cascade,
 kind text not null check(kind in ('updated','cancelled')),
 old_slot jsonb not null, new_slot jsonb,
 created_at timestamptz not null default now(), sent_at timestamptz
);
alter table court_booking_changes enable row level security;
create or replace function court_admin_edit_slot(p_slot uuid,p_day date,p_court text,p_start time,p_end time) returns uuid language plpgsql security definer set search_path=public as $$
declare s court_slots; r court_releases; b court_bookings; event_id uuid; updated_slot court_slots;
begin
 perform pg_advisory_xact_lock(734021);
 select * into s from court_slots where id=p_slot for update;
 if s.id is null or s.deleted_at is not null then raise exception 'Slot no longer exists'; end if;
 if s.starts_at<=clock_timestamp() then raise exception 'Started slots cannot be changed'; end if;
 select * into b from court_bookings where slot_id=p_slot and cancelled_at is null for update;
 if b.id is null then
  perform court_edit_slot(p_slot,p_day,p_court,p_start,p_end);
  return null;
 end if;
 if p_day is null or p_start is null or p_end is null or p_court is null or p_court not in ('Court 1','Court 2','Court 3') then raise exception 'Select a date, time and court'; end if;
 if p_end<=p_start or (p_day+p_start) at time zone 'Europe/Dublin'<=clock_timestamp() then raise exception 'Choose a future time, with end after start'; end if;
 if s.court=p_court and s.starts_at=(p_day+p_start) at time zone 'Europe/Dublin' and s.ends_at=(p_day+p_end) at time zone 'Europe/Dublin' then raise exception 'No changes to save'; end if;
 insert into court_releases(day,published_at) values(p_day,now()) on conflict do nothing;
 select * into r from court_releases where day=p_day for update;
 if r.closed then raise exception 'Bookings are closed for this date'; end if;
 if exists(select 1 from court_bookings where team_id=b.team_id and release_id=r.id and cancelled_at is null and id<>b.id) then raise exception 'This team already has a booking on the selected date'; end if;
 update court_releases set published_at=coalesce(published_at,now()) where id=r.id;
 update court_slots set release_id=r.id,court=p_court,
  starts_at=(p_day+p_start) at time zone 'Europe/Dublin',ends_at=(p_day+p_end) at time zone 'Europe/Dublin',
  published_at=coalesce(published_at,now()) where id=p_slot returning * into updated_slot;
 update court_bookings set release_id=r.id where id=b.id;
 insert into court_booking_changes(booking_id,team_id,kind,old_slot,new_slot)
 values(b.id,b.team_id,'updated',to_jsonb(s),to_jsonb(updated_slot)) returning id into event_id;
 return event_id;
end $$;
create or replace function court_admin_delete_slot(p_slot uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare s court_slots; b court_bookings; event_id uuid;
begin
 perform pg_advisory_xact_lock(734021);
 select * into s from court_slots where id=p_slot for update;
 if s.id is null or s.deleted_at is not null then raise exception 'Slot no longer exists'; end if;
 if s.starts_at<=clock_timestamp() then raise exception 'Started slots cannot be deleted'; end if;
 select * into b from court_bookings where slot_id=p_slot and cancelled_at is null for update;
 if b.id is not null then
  update court_bookings set cancelled_at=now() where id=b.id;
  insert into court_booking_changes(booking_id,team_id,kind,old_slot)
  values(b.id,b.team_id,'cancelled',to_jsonb(s)) returning id into event_id;
 end if;
 update court_slots set deleted_at=now() where id=p_slot;
 return event_id;
end $$;
-- Serialize captain cancellations with admin changes as well as new bookings.
create or replace function court_cancel(p_token text,p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
declare t uuid;
begin
 perform pg_advisory_xact_lock(734021);
 select id into t from knocklyon_teams where access_token=p_token for update;
 if t is null then raise exception 'Invalid captain link'; end if;
 update court_bookings b set cancelled_at=now() from court_slots s
 where b.id=p_booking and b.team_id=t and b.cancelled_at is null and s.id=b.slot_id and s.starts_at>clock_timestamp();
 if not found then raise exception 'Booking cannot be cancelled (it may already have started)'; end if;
end $$;
revoke all on function court_admin_edit_slot(uuid,date,text,time,time),court_admin_delete_slot(uuid),court_cancel(text,uuid) from public,anon,authenticated;
grant execute on function court_admin_edit_slot(uuid,date,text,time,time),court_admin_delete_slot(uuid),court_cancel(text,uuid) to service_role;
commit;
