-- Cup ties: a cup tie is a clubs row with competition = 'cup' and a single fixture.
-- Existing rows stay league. Safe to run more than once.
alter table clubs add column if not exists competition text not null default 'league';
alter table clubs add column if not exists cup_round text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_competition_check') then
    alter table clubs add constraint clubs_competition_check
      check (competition in ('league', 'cup'));
  end if;
end $$;

-- Set when the opposing secretary confirms the date Knocklyon set for a cup home tie.
alter table fixtures add column if not exists secretary_confirmed_at timestamptz;
