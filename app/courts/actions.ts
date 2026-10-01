'use server';
import { courtBookingEmailHtml, courtBookingChangeEmailHtml } from '../schedule/_lib/email-templates';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { SITE_URL } from '../site-url';
import { db, requireAdmin, timeLabel } from './_lib/data';
import { COURT_TIME_SLOTS, COURT_ADD_TIME_SLOTS } from './_lib/config';
import type { Result } from './form';
const value = (f: FormData, key: string) => String(f.get(key) ?? '').trim();
function refresh() { revalidatePath('/courts', 'layout'); revalidatePath('/schedule/admin'); }
function message(error: { message: string } | null, ok: string): Result { return { status: error ? "error" : "success", message: error ? error.message : ok }; }
async function send(to: string, subject: string, text: string, key: string, html: string) {
 if (!process.env.RESEND_API_KEY || !process.env.CONTACT_FROM) throw new Error('Email is not configured');
 const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.CONTACT_FROM, to, subject, text, html }, { idempotencyKey: key });
 if (error) throw new Error('Email delivery failed');
}
async function sendPendingNotifications(): Promise<Result> {
 const supabase=db();
 const {data:pending,error}=await supabase.from('court_batch_notifications').select('id,team_id,batch_id').is('sent_at',null);
 if(error) return {status:'error',message:'Slots released, but the email queue could not be loaded. Retry notifications.'};
 let sent=0,failed=0;
 for(const n of pending ?? []) {
  // Avoid sending an old release notice once every slot in that batch has started.
  const {data:open,error:openError}=await supabase.from('court_slots').select('id,court_releases!inner(closed)').is('deleted_at',null).eq('notification_batch_id',n.batch_id).eq('court_releases.closed',false).gt('starts_at',new Date().toISOString()).limit(1);
  if(openError) {failed++; continue;}
  if(!open?.length) continue;
  const {data:t}=await supabase.from('knocklyon_teams').select('name,captain_name,captain_email,access_token').eq('id',n.team_id).single();
  if(!t?.captain_email || !t.access_token) {failed++; continue;}
  try {
   await send(t.captain_email,'New slots released for court booking',`Hi ${t.captain_name || 'captain'},\n\nNew slots have been released for court booking. View all open slots and book for ${t.name}:\n\n${SITE_URL}/courts/c/${t.access_token}\n\nOne booking per team per day. Slots close when their start time is reached. Keep this personal link private.`,`court-batch-${n.id}`,courtBookingEmailHtml({captainName:t.captain_name,teamLabel:t.name,link:`${SITE_URL}/courts/c/${t.access_token}`}));
   const {error:markError}=await supabase.from('court_batch_notifications').update({sent_at:new Date().toISOString()}).eq('id',n.id);
   if(markError) failed++; else sent++;
  } catch {failed++;}
 }
 refresh(); return {status:failed?'warning':'success',message:`${sent} notification(s) sent.${failed?` ${failed} pending — retry notifications.`:''}`};
}
export async function notifyCaptains():Promise<Result> {
 await requireAdmin();
 const {data:batch,error}=await db().rpc('court_release_drafts');
 if(error) return message(error,'');
 refresh();
 if(!batch) return {status:'warning',message:'No new future slots to release. Use Retry notifications for unsent emails.'};
 const result=await sendPendingNotifications();
 return {status:result.status,message:`New slots are now visible to captains. ${result.message}`};
}
export async function addSlot(_: Result,f:FormData):Promise<Result> {
 await requireAdmin();
 const day=value(f,'day'),court=value(f,'court');
 const times=[...new Set(f.getAll('times').map(String))];
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !['Court 1','Court 2','Court 3'].includes(court) || !times.length || times.some(time=>!COURT_ADD_TIME_SLOTS.some(option=>option.value===time))) return {status:'error',message:'Select a date, court and at least one time slot.'};
 const {error}=await db().rpc('court_create_evening_drafts',{p_day:day,p_court:court,p_times:times});
 if(error) return {status:'error',message:error.code==='23P01'?'That court already has an overlapping slot. No slots were added; adjust your selection and try again.':error.message};
 refresh(); return {status:'success',message:`${times.length===1?'Slot saved':'Both slots saved'} as drafts. Click Notify captains when all slots are ready.`};
}
export async function retryNotifications():Promise<Result> {
 await requireAdmin(); return sendPendingNotifications();
}
export async function closeRelease(_: Result, f: FormData): Promise<Result> {
 await requireAdmin(); const {error}=await db().from('court_releases').update({closed:true}).eq('id',value(f,'release'));
 refresh(); return message(error,'Bookings closed for this date. Existing bookings remain valid.');
}
export async function book(_: Result, f: FormData): Promise<Result> {
 const token=value(f,'token'); const supabase=db();
 const {data:id,error}=await supabase.rpc('court_book',{p_token:token,p_slot:value(f,'slot')});
 if (error) { refresh(); return message(error,''); }
 refresh();
 const {data:t}=await supabase.from('knocklyon_teams').select('name,captain_name,captain_email').eq('access_token',token).single();
 const {data:s}=await supabase.from('court_slots').select('court,starts_at,ends_at').eq('id',value(f,'slot')).single();
 try {
  if (!t || !s) throw new Error();
  const day=new Date(s.starts_at).toLocaleDateString('en-CA',{timeZone:'Europe/Dublin'});
  await send(t.captain_email, 'Court booking confirmed', `${t.name}: ${s.court}, ${day}, ${timeLabel(s.starts_at)}–${timeLabel(s.ends_at)} (Dublin time).\n\nManage your booking: ${SITE_URL}/courts/c/${token}`,`court-booking-${id}`,courtBookingEmailHtml({captainName:t.captain_name,teamLabel:t.name,link:`${SITE_URL}/courts/c/${token}`,booking:{court:s.court,date:day,time:`${timeLabel(s.starts_at)}–${timeLabel(s.ends_at)}`}}));
  return {status:'success',message:'Your court is booked. Confirmation email sent.'};
 } catch { return {status:'warning',message:'Your court is booked. The confirmation email could not be sent; your booking is shown below.'}; }
}
export async function cancel(_: Result, f: FormData): Promise<Result> {
 const {error}=await db().rpc('court_cancel',{p_token:value(f,'token'),p_booking:value(f,'booking')});
 refresh(); return message(error,'Booking cancelled. The slot is available again.');
}

export async function editSlot(_: Result, f: FormData): Promise<Result> {
 await requireAdmin();
 const day=value(f,'day'),court=value(f,'court'),range=COURT_TIME_SLOTS.find(s=>s.value===value(f,'time'));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !['Court 1','Court 2','Court 3'].includes(court) || !range) return {status:'error',message:'Select a date, time slot and court.'};
 const {data:changeId,error}=await db().rpc('court_admin_edit_slot',{p_slot:value(f,'slot'),p_day:day,p_court:court,p_start:range.start,p_end:range.end});
 refresh();
 if(error) return {status:'error',message:error.code==='23P01'?'That court already has an overlapping slot.':error.message};
 if(changeId) { const result=await sendBookingChanges(changeId); return {...result,message:`Booking updated; the team's reservation is confirmed. ${result.message}`}; }
 return {status:'success',message:'Slot updated and saved as a draft. Click Notify captains to release it.'};
}
export async function deleteSlot(_: Result, f: FormData): Promise<Result> {
 await requireAdmin();
 const {data:changeId,error}=await db().rpc('court_admin_delete_slot',{p_slot:value(f,'slot')});
 refresh();
 if(error) return message(error,'');
 if(changeId) { const result=await sendBookingChanges(changeId); return {...result,message:`Slot deleted and reservation cancelled. ${result.message}`}; }
 return {status:'success',message:'Slot deleted. It is no longer available to captains.'};
}

type SlotSnapshot = { court: string; starts_at: string; ends_at: string };
function describeSlot(slot: SlotSnapshot) {
 const day=new Date(slot.starts_at).toLocaleDateString('en-IE',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Dublin'});
 return `${slot.court}, ${day}, ${timeLabel(slot.starts_at)}–${timeLabel(slot.ends_at)}`;
}
async function sendBookingChanges(changeId?: string): Promise<Result> {
 const supabase=db();
 let query=supabase.from('court_booking_changes').select('id,team_id,kind,old_slot,new_slot').is('sent_at',null).order('created_at').order('id');
 if(changeId) query=query.eq('id',changeId);
 const {data:changes,error}=await query;
 if(error) return {status:'error',message:'The change is saved, but email delivery could not be checked. Use Retry booking updates.'};
 let sent=0,failed=0;
 for(const change of changes ?? []) {
  const {data:team}=await supabase.from('knocklyon_teams').select('name,captain_name,captain_email,access_token').eq('id',change.team_id).single();
  if(!team?.captain_email || !team.access_token) {failed++;continue;}
  const previous=describeSlot(change.old_slot as SlotSnapshot);
  const updated=change.kind==='updated'?describeSlot(change.new_slot as SlotSnapshot):undefined;
  const link=`${SITE_URL}/courts/c/${team.access_token}`;
  try {
   await send(team.captain_email,updated?'Court booking updated':'Court booking cancelled',
    `Hi ${team.captain_name || 'captain'},\n\nAn admin has ${updated?'updated':'cancelled'} the booking for ${team.name}.\nPrevious booking: ${previous}\n${updated?`Updated booking: ${updated}\nYour team's reservation is still confirmed.`:'Your reservation has been cancelled.'}\nAll times are Dublin time.\n\nView court bookings: ${link}`,
    `court-change-${change.id}`,courtBookingChangeEmailHtml({captainName:team.captain_name,teamLabel:team.name,link,previous,updated}));
   const {error:markError}=await supabase.from('court_booking_changes').update({sent_at:new Date().toISOString()}).eq('id',change.id);
   if(markError) failed++;else sent++;
  } catch {failed++;}
 }
 refresh(); return {status:failed?'warning':'success',message:`${sent} booking update email(s) sent.${failed?` ${failed} pending — use Retry booking updates.`:''}`};
}
export async function retryBookingUpdates(): Promise<Result> {
 await requireAdmin(); return sendBookingChanges();
}
