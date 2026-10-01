import { getSupabase } from "../../schedule/_lib/supabase";
import { isAdmin } from "../../schedule/_lib/admin-session";
export const db = getSupabase;
export async function requireAdmin() { if (!await isAdmin()) throw new Error("Please sign in to scheduling admin."); }
export function dateLabel(day: string) { return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin' }); }
export function timeLabel(value: string) { return new Date(value).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin' }); }
