-- Home-slot times per Knocklyon team — paste into Supabase → SQL Editor → Run.
-- Safe to re-run.

alter table team_home_availability
  add column if not exists match_time text;

-- Backfill any existing rows so they have a sensible default (8pm).
update team_home_availability
  set match_time = '20:00'
  where match_time is null;

-- Make the default apply to future rows too.
alter table team_home_availability
  alter column match_time set default '20:00';
