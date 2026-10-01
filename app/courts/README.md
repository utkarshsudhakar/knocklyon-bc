# Court bookings

Use **Court bookings** in `/schedule/admin`. Existing admin authentication, Knocklyon teams, captain names, emails and access tokens are reused. `/courts/admin` redirects there. Match availability, fixtures and booking rules remain independent.

Select a date, **8–9 pm**, **9–10 pm**, or both, and Court 1, 2 or 3, then **Add selected slots** to save a hidden draft without sending email. **Notify captains** publishes all future drafts across dates and creates one notification per eligible team for that release batch. The email announces new slots and includes their personal `/courts/c/<existing-access-token>` link showing all released, future slots. Additional drafts on an already released date remain hidden until the next Notify captains action. Clicking again with no new drafts does not send another notification. Use **Retry notifications** for delivery failures.

Slots stop appearing in the captain booking page at their start time, not end time. The page refreshes at start boundaries and when a tab regains focus; the database also rejects expired submissions. No scheduled cleanup is needed, and reservation history is retained. Closed dates are excluded. Teams missing captain email or access token are listed and skipped; maintain these details in Knocklyon teams.

New slots are limited to 8–9 pm and 9–10 pm. Selecting both creates them atomically: if either conflicts, neither is added. Existing slots retain the broader time options when edited. All times use Europe/Dublin, including daylight saving. One booking per team per day; captains can cancel before start. Overlapping slots on a court are rejected. No match conflict checks are performed.

Admins can modify or delete booked slots. Editing a booked slot preserves the reservation and immediately queues a branded update email showing the old and new details. Deleting cancels the reservation and queues a cancellation email. Unbooked edits still return to draft. All changes are transactional and retain history; overlapping courts and an existing team booking on the destination date are rejected. Started slots cannot be changed. Captain cancellations, bookings and admin overrides share the same database lock.

Booking update emails are persisted atomically with each change and sent after saving. Failed delivery does not undo the change. Use **Retry booking updates** to send pending notices, including cancellations of slots no longer shown in the upcoming list.

Release and confirmation emails reuse the scheduling email shell, configured logo, green CTA and captain footer, with plain-text fallbacks.

## Database setup

**For the new add-slot form, run `_lib/upgrade-evening-slots.sql` after the previous migrations.** It can be rerun safely.

**Existing slot-management installation: run `_lib/upgrade-admin-overrides.sql` only.** If you have not applied `_lib/upgrade-manual-release.sql` and `_lib/upgrade-slot-management.sql`, run those first in that order. This transactional, repeatable migration preserves records, keeps previously released slots visible until start, and adds per-slot publication and batch notifications. Do not rerun the fresh schema. Old per-slot pending notification records are retained for history; the new sender processes batch notifications only.


- **Fresh installation:** run `_lib/schema.sql` after the existing scheduling and captain migrations.
- **Previous standalone court schema already installed:** run `_lib/upgrade-shared-teams.sql` instead. It preserves reservations and maps old court teams to scheduling teams by exact name, aborting if any match is missing or ambiguous. Old tables remain for history, but obsolete RPCs are disabled. Existing draft releases stay hidden until a new slot is added for that date. Old standalone court links are replaced by links using existing scheduling captain tokens.

After either installation path above, run `_lib/upgrade-manual-release.sql`, then `_lib/upgrade-slot-management.sql`, then `_lib/upgrade-admin-overrides.sql`, followed by `_lib/upgrade-evening-slots.sql`. Do not rerun older upgrades after the latest one.

Use existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `CONTACT_FROM` and `NEXT_PUBLIC_SITE_URL` settings. No separate court login or captain setup is needed. A missing court migration displays a setup message without blocking match scheduling.

Email sending runs in the admin request. Pending batch emails can be retried; sent rows are skipped, with provider idempotency keys protecting concurrent retries within the provider retention window. There is no background mail worker. Email failures do not undo a slot or booking. Captain links are bearer credentials; the existing captain-link reset also changes court access. Pages use noindex/no-referrer metadata.

## Checks

`npx tsc --noEmit` and `npx eslint app/courts app/schedule/admin/court-bookings.tsx`.
Run `_lib/verify.sql` in a test database. It rolls back its test data and checks hidden drafts, one notification per batch, duplicate publication, same-date drafts, overlapping courts, daily limits, ownership, expiry and cancellation. Also test simultaneous bookings from two browsers, real mail delivery, and retry behavior with the configured services before production use.
