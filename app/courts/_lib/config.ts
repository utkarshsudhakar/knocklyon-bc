// One-hour slots starting every half-hour, matching the home-date time range.
export const COURT_TIME_SLOTS = Array.from({length:21},(_,i)=>{
 const minutes=12*60+i*30;
 const clock=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
 const start=clock(minutes),end=clock(minutes+60);
 return {value:`${start}-${end}`,start,end,label:`${start}–${end}`};
});

// New evening slots can be selected together; existing slots retain their edit options.
export const COURT_ADD_TIME_SLOTS = [
 { value: '20:00-21:00', start: '20:00', end: '21:00', label: '8–9 pm' },
 { value: '21:00-22:00', start: '21:00', end: '22:00', label: '9–10 pm' },
] as const;
