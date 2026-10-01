-- Only for databases where the previous standalone court schema was installed.
-- Transactional: ambiguous/missing team matches abort without changing data.
begin;
create temporary table court_team_mapping on commit drop as
 select old.id as old_id, min(existing.id::text)::uuid as new_id, count(existing.id) as matches
 from court_teams old left join knocklyon_teams existing on existing.name=old.name
 group by old.id;
do $$ begin
 if exists(select 1 from court_team_mapping where matches<>1) then
  raise exception 'Each old court team must match exactly one existing scheduling team by name. Resolve team names before retrying.';
 end if;
end $$;
alter table court_bookings drop constraint court_bookings_team_id_fkey;
update court_bookings b set team_id=m.new_id from court_team_mapping m where b.team_id=m.old_id;
alter table court_bookings add constraint court_bookings_team_id_fkey foreign key(team_id) references knocklyon_teams(id) on delete cascade;
create table court_slot_notifications (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references knocklyon_teams(id) on delete cascade,
 slot_id uuid not null references court_slots(id), sent_at timestamptz,
 unique(team_id,slot_id)
);
alter table court_slot_notifications enable row level security;
-- Retain old tables for history, but disable obsolete mutation entry points.
revoke all on function court_publish(uuid),court_add_slot(date,text,time,time),court_remove_draft(uuid) from service_role;
create or replace function court_book(p_token text, p_slot uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid; s court_slots; r court_releases; b uuid;
begin
 select id into t from knocklyon_teams where access_token=p_token for update;
 if t is null then raise exception 'Invalid captain link'; end if;
 select * into s from court_slots where id=p_slot;
 if s.id is null then raise exception 'Slot unavailable'; end if;
 select * into r from court_releases where id=s.release_id for update;
 if r.published_at is null or r.closed or s.starts_at<=now() then raise exception 'Slot unavailable'; end if;
 insert into court_bookings(slot_id,release_id,team_id) values(s.id,r.id,t) returning id into b;
 return b;
exception when unique_violation then raise exception 'Slot taken or your team already has a booking that day';
end $$;
create or replace function court_add_slot_and_notify(p_day date,p_court text,p_start time,p_end time) returns uuid language plpgsql security definer set search_path=public as $$
declare r court_releases; s uuid;
begin
 if p_day is null or p_start is null or p_end is null or p_court is null or p_court not in ('Court 1','Court 2','Court 3') then raise exception 'Select a date, time and court'; end if;
 if p_end<=p_start or (p_day+p_start) at time zone 'Europe/Dublin' <= now() then raise exception 'Choose a future time, with end after start'; end if;
 insert into court_releases(day,published_at) values(p_day,now()) on conflict do nothing;
 select * into r from court_releases where day=p_day for update;
 if r.closed then raise exception 'Bookings are closed for this date'; end if;
 update court_releases set published_at=coalesce(published_at,now()) where id=r.id;
 insert into court_slots(release_id,court,starts_at,ends_at) values(r.id,p_court,(p_day+p_start) at time zone 'Europe/Dublin',(p_day+p_end) at time zone 'Europe/Dublin') returning id into s;
 insert into court_slot_notifications(team_id,slot_id)
 select id,s from knocklyon_teams where nullif(trim(captain_email),'') is not null and nullif(access_token,'') is not null;
 return s;
end $$;
revoke all on function court_book(text,uuid),court_add_slot_and_notify(date,text,time,time) from public,anon,authenticated;
grant execute on function court_book(text,uuid),court_add_slot_and_notify(date,text,time,time) to service_role;
create or replace function court_cancel(p_token text,p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
declare t uuid;
begin
 select id into t from knocklyon_teams where access_token=p_token for update;
 if t is null then raise exception 'Invalid captain link'; end if;
 update court_bookings b set cancelled_at=now() from court_slots s
 where b.id=p_booking and b.team_id=t and b.cancelled_at is null and s.id=b.slot_id and s.starts_at>now();
 if not found then raise exception 'Booking cannot be cancelled (it may already have started)'; end if;
end $$;
revoke all on function court_cancel(text,uuid) from public,anon,authenticated;
grant execute on function court_cancel(text,uuid) to service_role;

commit;
