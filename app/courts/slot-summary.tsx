/** Compact calendar badge matching the fixture list, always in Dublin time. */
export default function SlotSummary({ startsAt, endsAt, court, status, bookedTeam }: {
 startsAt: string; endsAt: string; court: string; status: string; bookedTeam?: string;
}) {
 const start = new Date(startsAt);
 const datePart = (options: Intl.DateTimeFormatOptions) => start.toLocaleDateString('en-IE', { ...options, timeZone: 'Europe/Dublin' });
 const clock = (date: string) => new Date(date).toLocaleTimeString('en-IE', {
  timeZone: 'Europe/Dublin', hour: 'numeric', minute: '2-digit', hour12: true,
 }).replace(':00', '').replace(/\s?(AM|PM)/i, (_, period: string) => ` ${period.toLowerCase()}`);
 return <div className="flex min-w-0 items-start gap-4">
  <time dateTime={startsAt} aria-label={datePart({ dateStyle: 'full' })} title={datePart({ dateStyle: 'full' })}
   className="flex w-16 shrink-0 basis-16 flex-col items-center justify-center gap-1 rounded-xl bg-forest py-3 text-center">
   <span className="text-[10px] font-bold uppercase tracking-wider text-green-200">{datePart({ weekday: 'short' })}</span>
   <span className="text-2xl font-extrabold leading-none text-white">{datePart({ day: '2-digit' })}</span>
   <span className="text-[11px] font-semibold uppercase text-green-200">{datePart({ month: 'short' })}</span>
  </time>
  <div className="flex min-w-0 flex-col justify-center gap-1.5">
   <div className="flex flex-wrap items-center gap-2">
    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-forest">{court}</span>
    <span className="text-xs text-stone-500">{datePart({ year: 'numeric' })}</span>
   </div>
   <p className="text-base font-semibold text-stone-900">{clock(startsAt)}–{clock(endsAt)}</p>
   {bookedTeam ? <div className="flex flex-wrap items-center gap-2">
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white">
     <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 10 4 4 8-8"/></svg>
     Booked
    </span>
    <span className="text-sm font-bold text-amber-950">{bookedTeam}</span>
   </div> : <p className="text-sm text-stone-500">{status}</p>}
   {bookedTeam && status === 'Closed' && <p className="text-xs text-stone-600">Bookings closed for this date</p>}
  </div>
 </div>;
}
