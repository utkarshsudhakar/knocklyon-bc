-- Match reminder emails: the match date a reminder was last sent for.
-- A reminder is due when this differs from the fixture's current date, so a
-- rescheduled match is reminded again.
alter table fixtures
  add column if not exists reminder_sent_for date;
