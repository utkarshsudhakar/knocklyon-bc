import type { Metadata } from 'next';
import './courts.css';
export const metadata: Metadata = { title: 'Court bookings — Knocklyon BC', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Layout({ children }: { children: React.ReactNode }) { return <main className="courts mx-auto max-w-4xl px-5 py-12">{children}</main>; }
