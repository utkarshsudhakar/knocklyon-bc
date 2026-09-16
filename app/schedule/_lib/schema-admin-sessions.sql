-- Random-token admin sessions. Paste into Supabase SQL Editor.
-- Replaces the previous static "kbc_admin=1" sentinel cookie.

create table if not exists admin_sessions (
  token       text primary key,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz
);

create index if not exists admin_sessions_expires_at_idx
  on admin_sessions (expires_at);
