import SlotSummary from "../../courts/slot-summary";
import Link from "next/link";
import { db, timeLabel } from '../../courts/_lib/data';
import { COURT_TIME_SLOTS, COURT_ADD_TIME_SLOTS } from '../../courts/_lib/config';
import { addSlot, notifyCaptains, retryNotifications, editSlot, deleteSlot, retryBookingUpdates } from '../../courts/actions';
import Form from '../../courts/form';
import '../../courts/courts.css';
export default async function CourtBookings({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
 const supabase=db();
 const [slots,releases,bookings,teams,notifications,changes]=await Promise.all([
  supabase.from('court_slots').select('id,release_id,court,starts_at,ends_at,published_at,notification_batch_id').is('deleted_at',null).gt('starts_at',new Date().toISOString()).order('starts_at', { ascending: false }).order('court').order('id'),
  supabase.from('court_releases').select('id,day,closed'),
  supabase.from('court_bookings').select('slot_id,team_id').is('cancelled_at',null),
  supabase.from('knocklyon_teams').select('id,name,captain_email,access_token'),
  supabase.from('court_batch_notifications').select('batch_id,sent_at'),
  supabase.from('court_booking_changes').select('id',{count:'exact',head:true}).is('sent_at',null),
 ]);
 const unavailable=[slots,releases,bookings,teams,notifications,changes].some(r=>r.error);
 const missing=(teams.data??[]).filter(t=>!t.captain_email || !t.access_token);
 const pageSize = 10;
 const total = slots.data?.length ?? 0;
 const pageCount = Math.max(1, Math.ceil(total / pageSize));
 const requestedPage = typeof searchParams.courtPage === 'string' ? Number(searchParams.courtPage) : 1;
 const page = Math.min(pageCount, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1);
 const offset = (page - 1) * pageSize;
 const visibleSlots = slots.data?.slice(offset, offset + pageSize) ?? [];
 function pageUrl(nextPage: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
   if (key === 'courtPage' || value === undefined) continue;
   for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
  }
  query.set('courtPage', String(nextPage));
  return `/schedule/admin?${query.toString()}#court-bookings`;
 }

 return <details id="court-bookings" className="rounded-lg border border-zinc-200" open><summary className="cursor-pointer px-4 py-3 font-semibold text-forest">Court bookings</summary><div className="courts p-4 space-y-3">
 <p className="text-sm text-zinc-600">Prepare your slots, then click Notify captains to release all future drafts and send each captain one email with their personal link. Slots expire at their start time. Times are Dublin time.</p>
 {unavailable?<p role="alert">Court bookings need the database migration before slots can be added. Existing match scheduling is available as usual.</p>:<>
 {missing.length>0 && <p className="notice">No notification will be sent to: {missing.map(t=>t.name).join(', ')}. Add their captain email and generate a captain link in Knocklyon teams first.</p>}
 <Form action={addSlot} label="Add selected slots"><label>Date<input name="day" type="date" required/></label><fieldset><legend className="text-sm mb-2">Time slots — select one or both</legend><div className="flex flex-wrap gap-4">{COURT_ADD_TIME_SLOTS.map(t=><label key={t.value} style={{flexDirection:'row',alignItems:'center'}}><input name="times" type="checkbox" value={t.value}/>{t.label}</label>)}</div></fieldset><label>Court<select className="rounded border border-zinc-300 px-3 py-2 bg-white" name="court">{[1,2,3].map(n=><option key={n}>Court {n}</option>)}</select></label></Form>
 <p>{slots.data?.filter(s=>!s.published_at && !releases.data?.find(r=>r.id===s.release_id)?.closed).length ?? 0} draft slot(s) ready to release.</p>
 <Form action={notifyCaptains} label="Notify captains"/>
 {notifications.data?.some(n=>!n.sent_at && slots.data?.some(s=>s.notification_batch_id===n.batch_id && !releases.data?.find(r=>r.id===s.release_id)?.closed)) && <Form action={retryNotifications} label="Retry notifications"/>}
 {(changes.count ?? 0)>0 && <div><p>{changes.count} booking update email(s) pending.</p><Form action={retryBookingUpdates} label="Retry booking updates"/></div>}
 {!slots.data?.length && <p className="text-sm text-zinc-500">No upcoming court slots.</p>}
 {visibleSlots.map(s=>{const release=releases.data?.find(r=>r.id===s.release_id);const booking=bookings.data?.find(b=>b.slot_id===s.id);return <div key={s.id} className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${booking ? "border-amber-300 bg-amber-50 ring-1 ring-amber-200" : "border-stone-200 bg-white"}`}><SlotSummary startsAt={s.starts_at} endsAt={s.ends_at} court={s.court} bookedTeam={booking ? teams.data?.find(t=>t.id===booking.team_id)?.name ?? 'Team' : undefined} status={release?.closed?'Closed':!s.published_at?'Draft — not visible to captains':booking?`Booked · ${teams.data?.find(t=>t.id===booking.team_id)?.name ?? 'Team'}`:'Released — available'}/>{<details className="mt-3 border-t border-stone-100 pt-3"><summary className="cursor-pointer text-sm text-forest">Modify / delete</summary><Form action={editSlot} label={booking?"Save & notify captain":"Save changes"}><input type="hidden" name="slot" value={s.id}/><label>Date<input name="day" type="date" defaultValue={release?.day} required/></label><label>Time slot<select name="time" defaultValue={`${timeLabel(s.starts_at)}-${timeLabel(s.ends_at)}`} className="rounded border p-2">{!COURT_TIME_SLOTS.some(t=>t.value===`${timeLabel(s.starts_at)}-${timeLabel(s.ends_at)}`) && <option value="">Choose a time slot</option>}{COURT_TIME_SLOTS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label>Court<select name="court" defaultValue={s.court} className="rounded border p-2">{[1,2,3].map(n=><option key={n}>Court {n}</option>)}</select></label></Form><p className="text-xs text-zinc-500">{booking?"Changes keep this team’s reservation and email the captain immediately.":"Changes return the slot to draft until you notify captains again."}</p><Form action={deleteSlot} label="Delete slot" confirmMessage={booking?"Delete this booked slot? The team’s reservation will be cancelled and the captain will be emailed.":"Delete this slot? Any reservation made since this page loaded will also be cancelled and its captain notified."}><input type="hidden" name="slot" value={s.id}/></Form></details>}</div>;})}
 {total > 0 && <nav aria-label="Court slot pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
  <p className="text-sm text-zinc-600">Showing {offset + 1}–{Math.min(offset + pageSize, total)} of {total} slots · Page {page} of {pageCount}</p>
  {pageCount > 1 && <div className="flex gap-4 text-sm">
   {page > 1 ? <Link className="font-medium text-forest underline" href={pageUrl(page - 1)}>Previous</Link> : <span aria-disabled="true" className="text-zinc-400">Previous</span>}
   {page < pageCount ? <Link className="font-medium text-forest underline" href={pageUrl(page + 1)}>Next</Link> : <span aria-disabled="true" className="text-zinc-400">Next</span>}
  </div>}
 </nav>}
 </>}
 </div></details>;
}
