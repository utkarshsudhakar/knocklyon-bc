-- Admin-edited version of the captain note shown to opposing secretaries.
-- NULL means secretaries see the captain's original note. Safe to re-run.
alter table knocklyon_teams
  add column if not exists secretary_visible_note text;
