'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Refresh at each start boundary, and when returning to a suspended/background tab.
export default function RefreshAtStart({ startsAt }: { startsAt: string[] }) {
 const router=useRouter();
 useEffect(()=>{
  const times=startsAt.map(t=>new Date(t).getTime()).filter(t=>t>Date.now());
  const delay=times.length?Math.min(Math.max(0,Math.min(...times)-Date.now()+100),2147483647):null;
  const timer=delay===null?null:setTimeout(()=>router.refresh(),delay);
  const refresh=()=>{if(document.visibilityState==='visible') router.refresh();};
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('focus',refresh);
  return ()=>{if(timer!==null) clearTimeout(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};
 },[startsAt,router]);
 return null;
}
