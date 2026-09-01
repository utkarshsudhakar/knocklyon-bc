-- Venue details + export prep — paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run.
--
--  clubs.venue_location  : name/address of the opposing club's venue
--  clubs.venue_map_link  : Google Maps URL for that venue
--  knocklyon_teams.display_name : the long name used in TinaCMS (e.g. "Men's 1")
--  fixtures.match_time   : "HH:MM" 24-hour local time (nullable — home defaults to 20:00 when null)

alter table clubs
  add column if not exists venue_location text,
  add column if not exists venue_map_link text;

alter table knocklyon_teams
  add column if not exists display_name text;

alter table fixtures
  add column if not exists match_time text;
