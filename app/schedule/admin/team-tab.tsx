"use client";

import Link, { useLinkStatus } from "next/link";

function Spinner() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-forest border-t-transparent bg-white animate-spin transition-opacity ${
        pending ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

export default function TeamTab({
  href,
  active,
  name,
  division,
}: {
  href: string;
  active: boolean;
  name: string;
  division: string | null;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-all ${
        active
          ? "border-forest bg-forest text-white shadow-sm"
          : "border-zinc-200 bg-white text-zinc-800 hover:border-forest hover:text-forest hover:shadow-sm"
      }`}
    >
      <span className="font-semibold">{name}</span>
      {division && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            active
              ? "bg-white/20 text-white"
              : "bg-zinc-100 text-zinc-700 group-hover:bg-forest/10 group-hover:text-forest"
          }`}
        >
          {division}
        </span>
      )}
      <Spinner />
    </Link>
  );
}
