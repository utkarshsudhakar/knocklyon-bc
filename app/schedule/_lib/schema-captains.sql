-- Captains — paste into Supabase SQL Editor. Safe to re-run.
-- Adds captain contact + tokenised access to knocklyon_teams so each team's
-- captain can enter their own home dates via /schedule/k/{token}.

alter table knocklyon_teams
  add column if not exists captain_name text,
  add column if not exists captain_email text,
  add column if not exists access_token text,
  add column if not exists invite_sent_at timestamptz;

-- Enforce uniqueness on tokens (skip conflict if constraint already exists).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'knocklyon_teams_access_token_key'
  ) then
    alter table knocklyon_teams
      add constraint knocklyon_teams_access_token_key unique (access_token);
  end if;
end $$;
