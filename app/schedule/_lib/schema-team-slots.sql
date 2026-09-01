-- Per-team home dates — paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run.
--
-- home_slots stays as the venue-wide date table (one row per calendar date +
-- venue capacity). The new junction says which Knocklyon teams are available
-- on which venue dates. Two teams available on the same date share capacity.

create table if not exists team_home_availability (
  id                uuid primary key default gen_random_uuid(),
  knocklyon_team_id uuid not null references knocklyon_teams(id) on delete cascade,
  home_slot_id      uuid not null references home_slots(id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (knocklyon_team_id, home_slot_id)
);

alter table team_home_availability enable row level security;

create index if not exists team_home_availability_team_idx
  on team_home_availability(knocklyon_team_id);
create index if not exists team_home_availability_slot_idx
  on team_home_availability(home_slot_id);
