-- Secretary note — paste into Supabase → SQL Editor → Run. Safe to re-run.
alter table clubs
  add column if not exists secretary_note text;
