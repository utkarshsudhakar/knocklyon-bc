-- Fresh install: run once after the existing scheduling/captain migrations.
-- Teams and captain credentials are shared; all court reservations are separate.
create extension if not exists btree_gist;
create table court_releases (
 id uuid primary key default gen_random_uuid(), day date not null unique,
 published_at timestamptz, closed boolean not null default false
);
create table court_slots (
 id uuid primary key default gen_random_uuid(), release_id uuid not null references court_releases(id),
 court text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 check (ends_at > starts_at),
 exclude using gist (court with =, tstzrange(starts_at, ends_at, '[)') with &&)
);
create table court_bookings (
 id uuid primary key default gen_random_uuid(), slot_id uuid not null references court_slots(id),
 release_id uuid not null references court_releases(id), team_id uuid not null references knocklyon_teams(id) on delete cascade,
 created_at timestamptz not null default now(), cancelled_at timestamptz
);
create unique index court_slot_reserved on court_bookings(slot_id) where cancelled_at is null;
create unique index court_team_daily_limit on court_bookings(release_id, team_id) where cancelled_at is null;
create table court_slot_notifications (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references knocklyon_teams(id) on delete cascade,
 slot_id uuid not null references court_slots(id), sent_at timestamptz,
 unique(team_id,slot_id)
);
alter table court_releases enable row level security;
alter table court_slots enable row level security;
alter table court_bookings enable row level security;
alter table court_slot_notifications enable row level security;

create function court_book(p_token text, p_slot uuid) returns uuid language plpgsql security definer set search_path = public as $$
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
create function court_add_slot_and_notify(p_day date,p_court text,p_start time,p_end time) returns uuid language plpgsql security definer set search_path=public as $$
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
create function court_cancel(p_token text,p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
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
