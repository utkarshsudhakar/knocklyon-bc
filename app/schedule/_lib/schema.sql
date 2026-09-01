-- Knocklyon BC — scheduling portal schema
-- Paste this into Supabase → SQL Editor → New query → Run
--
-- Tables:
--   clubs       : opposing clubs (Knocklyon itself is implicit)
--   home_slots  : Knocklyon's home dates with match-slot capacity
--   fixtures    : the auto-generated home + away matches per club
--
-- Function:
--   book_slot() : atomic "confirm a home fixture on a date" — used by external
--                 secretaries. Raises 'slot_full' if capacity is already reached.

create extension if not exists "pgcrypto";

create table if not exists clubs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  secretary_email text not null,
  access_token    text not null unique,
  created_at      timestamptz not null default now()
);

create table if not exists home_slots (
  id         uuid primary key default gen_random_uuid(),
  slot_date  date not null unique,
  capacity   int  not null check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists fixtures (
  id                uuid primary key default gen_random_uuid(),
  opponent_club_id  uuid not null references clubs(id) on delete cascade,
  is_knocklyon_home boolean not null,
  status            text not null default 'awaiting_date'
                    check (status in ('awaiting_date', 'confirmed', 'cancelled')),
  confirmed_slot_id uuid references home_slots(id),
  confirmed_date    date,
  created_at        timestamptz not null default now()
);

create index if not exists fixtures_opponent_idx on fixtures(opponent_club_id);
create index if not exists fixtures_slot_idx on fixtures(confirmed_slot_id);

-- Enable RLS on all tables. We don't add any policies, so anon/publishable
-- keys are denied by default. The service_role key bypasses RLS, which is
-- what our server actions use.
alter table clubs      enable row level security;
alter table home_slots enable row level security;
alter table fixtures   enable row level security;

-- Atomic booking: check capacity + confirm fixture in one transaction so
-- two secretaries can't race into the same last slot.
create or replace function book_slot(p_fixture_id uuid, p_slot_id uuid)
returns void
language plpgsql
as $$
declare
  slot_capacity     int;
  current_bookings  int;
  fixture_row       fixtures%rowtype;
begin
  select * into fixture_row from fixtures where id = p_fixture_id for update;
  if not found then
    raise exception 'fixture_not_found';
  end if;
  if not fixture_row.is_knocklyon_home then
    raise exception 'not_home_fixture';
  end if;
  if fixture_row.status = 'confirmed' then
    raise exception 'already_confirmed';
  end if;

  select capacity into slot_capacity from home_slots where id = p_slot_id for update;
  if not found then
    raise exception 'slot_not_found';
  end if;

  select count(*) into current_bookings
    from fixtures
    where confirmed_slot_id = p_slot_id and status = 'confirmed';

  if current_bookings >= slot_capacity then
    raise exception 'slot_full';
  end if;

  update fixtures
    set confirmed_slot_id = p_slot_id,
        status            = 'confirmed'
    where id = p_fixture_id;
end $$;
