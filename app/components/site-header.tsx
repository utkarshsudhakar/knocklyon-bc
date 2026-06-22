"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

type Props = { clubName?: string | null; logo?: string | null };

const navItems = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/news", label: "News" },
  { href: "/gallery", label: "Gallery" },
  { href: "/useful-links", label: "Useful Links" },
];

export default function SiteHeader({ clubName, logo }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <header className={`sticky top-0 z-40 overflow-visible backdrop-blur-sm ${
      isHome
        ? "border-b border-white/10 bg-[#065F46]/95"
        : "border-b border-stone-200 bg-[#fafaf7]/95"
    }`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-1">

        <Link
          href="/"
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 py-0 text-[1.3125rem] font-bold transition-colors ${
            isHome ? "text-white hover:text-green-200" : "text-stone-900 hover:text-forest"
          }`}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={clubName ?? "KBC"} className="h-[78px] w-auto object-contain relative z-10 drop-shadow-sm" />
          ) : (
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black text-white ${
              isHome ? "bg-white/20" : "bg-forest"
            }`}>
              KBC
            </span>
          )}
          <span className="hidden tracking-tight sm:inline">
            {clubName ?? "Knocklyon Badminton Club"}
          </span>
          <span className="tracking-tight sm:hidden">KBC</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isHome
                    ? active
                      ? "bg-white/20 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                    : active
                      ? "bg-green-100 text-forest"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex">
          <Link
            href="/contact"
            className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${
              isHome
                ? "bg-white text-forest hover:bg-green-50"
                : "bg-forest text-white hover:bg-forest-dark"
            }`}
          >
            Contact Us
          </Link>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg md:hidden ${
            isHome ? "text-white/75 hover:bg-white/10" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className={`md:hidden ${
          isHome ? "border-t border-white/10 bg-[#065F46]" : "border-t border-stone-200 bg-[#fafaf7]"
        }`}>
          <nav className={`mx-auto flex max-w-6xl flex-col px-6 ${
            isHome ? "divide-y divide-white/10" : "divide-y divide-stone-100"
          }`}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`py-3.5 text-sm font-medium ${
                  isHome ? "text-white/80 hover:text-white" : "text-stone-700 hover:text-forest"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="py-4">
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className={`block w-full rounded-full py-2.5 text-center text-sm font-semibold ${
                  isHome
                    ? "bg-white text-forest hover:bg-green-50"
                    : "bg-forest text-white hover:bg-forest-dark"
                }`}
              >
                Contact Us
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
