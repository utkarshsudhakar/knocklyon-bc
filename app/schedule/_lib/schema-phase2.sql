-- Phase 2 additions — run in Supabase SQL editor after the initial schema.sql
-- Safe to re-run (idempotent).

alter table fixtures
  add column if not exists proposed_dates jsonb;

alter table clubs
  add column if not exists division text;

alter table clubs
  add column if not exists confirmation_email_sent_at timestamptz;
