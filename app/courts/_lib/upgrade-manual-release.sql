-- Run after schema.sql (fresh install) or upgrade-shared-teams.sql (older install).
-- Safe to rerun; existing published slots remain published. No records deleted.
begin;
do $$ begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='court_slots' and column_name='published_at') then
  alter table court_slots add column published_at timestamptz;
  update court_slots s set published_at=r.published_at from court_releases r where r.id=s.release_id;
 end if;
end $$;
create table if not exists court_notification_batches (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now()
);
alter table court_slots add column if not exists notification_batch_id uuid references court_notification_batches(id);
create table if not exists court_batch_notifications (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references court_notification_batches(id),
 team_id uuid not null references knocklyon_teams(id) on delete cascade, sent_at timestamptz,
 unique(batch_id,team_id)
);
alter table court_notification_batches enable row level security;
alter table court_batch_notifications enable row level security;
create or replace function court_create_draft(p_day date,p_court text,p_start time,p_end time) returns uuid language plpgsql security definer set search_path=public as $$
declare r court_releases; s uuid;
begin
 if p_day is null or p_start is null or p_end is null or p_court is null or p_court not in ('Court 1','Court 2','Court 3') then raise exception 'Select a date, time and court'; end if;
 if p_end<=p_start or (p_day+p_start) at time zone 'Europe/Dublin' <= now() then raise exception 'Choose a future time, with end after start'; end if;
 insert into court_releases(day) values(p_day) on conflict do nothing;
 select * into r from court_releases where day=p_day for update;
 if r.closed then raise exception 'Bookings are closed for this date'; end if;
 insert into court_slots(release_id,court,starts_at,ends_at) values(r.id,p_court,(p_day+p_start) at time zone 'Europe/Dublin',(p_day+p_end) at time zone 'Europe/Dublin') returning id into s;
 return s;
end $$;
create or replace function court_release_drafts() returns uuid language plpgsql security definer set search_path=public as $$
declare batch uuid; published_ids uuid[];
begin
 -- Serialize button presses: only the first publishes the pending drafts.
 perform pg_advisory_xact_lock(734021);
 insert into court_notification_batches default values returning id into batch;
 with released as (
  update court_slots s set published_at=now(),notification_batch_id=batch
  from court_releases r where r.id=s.release_id and not r.closed and s.published_at is null and s.starts_at>now()
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
 select id into t from knocklyon_teams where access_token=p_token for update;
 if t is null then raise exception 'Invalid captain link'; end if;
 select * into s from court_slots where id=p_slot;
 if s.id is null then raise exception 'Slot unavailable'; end if;
 select * into r from court_releases where id=s.release_id for update;
 if s.published_at is null or r.closed or s.starts_at<=clock_timestamp() then raise exception 'Slot unavailable or expired'; end if;
 insert into court_bookings(slot_id,release_id,team_id) values(s.id,r.id,t) returning id into b;
 return b;
exception when unique_violation then raise exception 'Slot taken or your team already has a booking that day';
end $$;
revoke all on function court_add_slot_and_notify(date,text,time,time) from public,anon,authenticated,service_role;
revoke all on function court_create_draft(date,text,time,time),court_release_drafts(),court_book(text,uuid) from public,anon,authenticated;
grant execute on function court_create_draft(date,text,time,time),court_release_drafts(),court_book(text,uuid) to service_role;
commit;
