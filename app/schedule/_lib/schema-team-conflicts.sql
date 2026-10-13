-- Teams that share players (e.g. M1 and X1) cannot have matches on the same date.
-- Paste into Supabase -> SQL Editor -> Run. Safe to re-run.
-- Each link is stored in both directions.
create table if not exists team_conflicts (
  team_a uuid not null references knocklyon_teams(id) on delete cascade,
  team_b uuid not null references knocklyon_teams(id) on delete cascade,
  primary key (team_a, team_b),
  check (team_a <> team_b)
);
alter table team_conflicts enable row level security;

-- book_slot: same as before, but the same-date conflict check now covers
-- every team linked to the fixture's team, not just the team itself.
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
  conflict_teams   uuid[];
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

  -- Locks the date's row, so two picks for the same date run one at a time.
  select slot_date, capacity into slot_date_val, slot_capacity
    from home_slots where id = p_slot_id for update;
  if not found then
    raise exception 'slot_not_found';
  end if;

  select c.knocklyon_team_id into team_id
    from clubs c where c.id = fixture_row.opponent_club_id;

  if team_id is not null then
    conflict_teams := array[team_id]
      || array(select tc.team_b from team_conflicts tc where tc.team_a = team_id);

    select count(*) into team_hits
      from fixtures f
      join clubs c on c.id = f.opponent_club_id
      where c.knocklyon_team_id = any(conflict_teams)
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
