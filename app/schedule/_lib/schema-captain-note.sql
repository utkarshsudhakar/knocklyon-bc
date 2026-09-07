-- Captain note — paste into Supabase → SQL Editor → Run. Safe to re-run.
alter table knocklyon_teams
  add column if not exists captain_note text;
