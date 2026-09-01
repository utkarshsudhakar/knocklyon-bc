-- Multi-team migration — paste into Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent), EXCEPT the "wipe test clubs" section which
-- deletes any existing club rows. Comment that section out if you want to
-- preserve data.

-- 1) New Knocklyon teams table
create table if not exists knocklyon_teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  division   text,
  created_at timestamptz not null default now()
);
alter table knocklyon_teams enable row level security;

-- 2) Extend clubs with team info
alter table clubs
  add column if not exists team_name         text,
  add column if not exists knocklyon_team_id uuid references knocklyon_teams(id);

-- 3) FRESH START — clear existing test clubs (cascades to fixtures).
--    Keeps home_slots and any knocklyon_teams you may have already added.
--    Comment out if you want to preserve data.
delete from clubs;

-- 4) Rewrite book_slot to be team-aware.
--    Blocks only when the SAME Knocklyon team is already scheduled that
--    date. Different Knocklyon teams on the same date = fine (that's the
--    whole point of capacity > 1).
create or replace function book_slot(p_fixture_id uuid, p_slot_id uuid)
returns void
language plpgsql
as $$
declare
  slot_date_val    date;
  slot_capacity    int;
  current_bookings int;
  fixture_row      fixtures%rowtype;
  team_id          uuid;
  team_hits        int;
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

  select slot_date, capacity into slot_date_val, slot_capacity
    from home_slots where id = p_slot_id for update;
  if not found then
    raise exception 'slot_not_found';
  end if;

  -- Which Knocklyon team is this fixture for?
  select c.knocklyon_team_id into team_id
    from clubs c where c.id = fixture_row.opponent_club_id;

  -- Same-team conflict on this date (home or away)
  if team_id is not null then
    select count(*) into team_hits
      from fixtures f
      join clubs c on c.id = f.opponent_club_id
      where c.knocklyon_team_id = team_id
        and f.status = 'confirmed'
        and (
          f.confirmed_date = slot_date_val
          or (
            f.confirmed_slot_id is not null
            and exists (
              select 1 from home_slots hs
                where hs.id = f.confirmed_slot_id
                and hs.slot_date = slot_date_val
            )
          )
        );
    if team_hits > 0 then
      raise exception 'team_conflict';
    end if;
  end if;

  -- Venue capacity check
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
