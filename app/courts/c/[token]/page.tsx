import RefreshAtStart from '../../refresh-at-start';
import { notFound } from 'next/navigation';
import { db, dateLabel, timeLabel } from '../../_lib/data';
import Form from '../../form';
import { book, cancel } from '../../actions';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{date?:string}>}) {
 const {token}=await params; const {date}=await searchParams; const supabase=db();
 const {data:team,error}=await supabase.from('knocklyon_teams').select('id,name,captain_name').eq('access_token',token).maybeSingle();
 if (error) throw new Error('Unable to load court bookings');
 if (!team) notFound();
 const results=await Promise.all([
 supabase.from('court_releases').select('*').not('published_at','is',null).eq('closed',false).order('day'),
 supabase.from('court_slots').select('*').is('deleted_at',null).not('published_at','is',null).gt('starts_at',new Date().toISOString()).order('starts_at'),
 supabase.from('court_bookings').select('id,slot_id,release_id,team_id').is('cancelled_at',null),
 supabase.from('knocklyon_teams').select('id,name'),
 ]);
 if(results.some(r=>r.error)) throw new Error('Unable to load availability');
 const [releases,slots,bookings,teams]=results.map(r=>r.data ?? []);
 const visible=releases.filter(r=>slots.some(s=>s.release_id===r.id)).sort((a,b)=>a.day===date?-1:b.day===date?1:a.day.localeCompare(b.day));
 return <><RefreshAtStart startsAt={slots.map(s=>s.starts_at)}/><h1>Court bookings</h1><p>Hi {team.captain_name}. You’re booking for <strong>{team.name}</strong>.</p><p>One slot per team per day. All times are Dublin time. Cancel any time before the slot starts.</p><p><small>Keep this personal link private. It works for every release.</small></p>
 {!visible.length && <section>No upcoming slots have been released. We’ll email you when bookings open.</section>}
 {visible.map(r=>{const own=bookings.find(b=>b.release_id===r.id && b.team_id===team.id);return <section key={r.id}><h2>{dateLabel(r.day)}</h2>{r.closed && <p>New bookings are closed for this date.</p>}
 {slots.filter(s=>s.release_id===r.id).map(s=>{const booking=bookings.find(b=>b.slot_id===s.id);const started=new Date(s.starts_at).getTime()<=Date.now();const mine=booking?.team_id===team.id;return <div className="row" key={s.id} style={mine?{background:'#edf4ec',border:'2px solid #174e35',borderRadius:12,padding:'1rem',margin:'.5rem 0'}:undefined}><div><strong>{s.court}</strong><p>{timeLabel(s.starts_at)}–{timeLabel(s.ends_at)}</p></div>
 {booking?.team_id===team.id?<div><strong style={{color:'#174e35'}}>✓ Your booking · {team.name}</strong><p><small>You have this slot booked.{!started && ' Changed your mind? You can cancel it below.'}</small></p>{!started && <div className="cancel-booking"><Form action={cancel} label="Cancel my booking" confirmMessage="Cancel your booking for this slot? It will become available to other teams."><input type="hidden" name="token" value={token}/><input type="hidden" name="booking" value={booking.id}/></Form></div>}</div>:booking?<span><strong style={{color:'#b91c1c'}}>Not available</strong> · Booked by {teams.find(t=>t.id===booking.team_id)?.name ?? 'another team'}</span>:started?<span>Started</span>:r.closed?<span>Closed</span>:own?<span>Available · daily limit reached</span>:<Form action={book} label="Confirm booking"><input type="hidden" name="token" value={token}/><input type="hidden" name="slot" value={s.id}/></Form>}
 </div>;})}</section>;})}</>;
}
