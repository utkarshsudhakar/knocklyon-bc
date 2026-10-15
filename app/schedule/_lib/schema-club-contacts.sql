-- Remembered club name + secretary email pairs, used for autosuggest in the
-- admin add-club forms. Survives "Reset season". Idempotent: safe to re-run.

create table if not exists club_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists club_contacts_name_email_key
  on club_contacts (lower(name), lower(email));

alter table club_contacts enable row level security;

-- Seed from the opposing clubs already entered.
insert into club_contacts (name, email)
select distinct on (lower(name), lower(secretary_email)) name, secretary_email
from clubs
on conflict do nothing;
