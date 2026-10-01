'use client';
import { useActionState } from 'react';
export type Result = { message: string; status: 'success' | 'error' | 'warning' };
export default function Form({ action, children, label, confirmMessage }: { action: (state: Result, data: FormData) => Promise<Result>; children?: React.ReactNode; label: string; confirmMessage?: string }) {
 async function submitSafely(state: Result, data: FormData): Promise<Result> {
  try { return await action(state, data); }
  catch { return { status: 'warning', message: 'We could not confirm the result. Refresh to check whether your change was saved before trying again. If your session expired, sign in again.' }; }
 }
 const [state, submit, pending] = useActionState<Result, FormData>(submitSafely, { message: '', status: 'success' });
 const heading = state.status === 'error' ? 'Error' : state.status === 'warning' ? 'Needs attention' : 'Success';
 return <div>
  <form action={submit} onSubmit={event => { if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault(); }}>
   {children}<button disabled={pending}>{pending ? 'Please wait…' : label}</button>
  </form>
  {!pending && state.message && <p role={state.status === 'success' ? 'status' : 'alert'} className={`notice notice-${state.status}`}>
   <strong>{heading}: </strong>{state.message}
  </p>}
 </div>;
}
