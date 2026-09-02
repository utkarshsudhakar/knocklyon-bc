-- Track when invite emails were last sent. Paste into Supabase SQL Editor.
alter table clubs
  add column if not exists invite_sent_at timestamptz;
