"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  text: string;
  link?: string | null;
};

export default function AnnouncementBar({ text, link }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show bar unless user dismissed this exact announcement already
    const dismissed = localStorage.getItem("announcement-dismissed");
    if (dismissed !== text) setVisible(true);
  }, [text]);

  function dismiss() {
    localStorage.setItem("announcement-dismissed", text);
    setVisible(false);
  }

  if (!visible) return null;

  const inner = (
    <span className="flex items-center gap-2 animate-[announcement-blink_1.2s_ease-in-out_infinite]">
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 3.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4.5Zm0 6.75a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z"/>
      </svg>
      <span>{text}</span>
      {link && <span className="underline underline-offset-2 opacity-75">→</span>}
    </span>
  );

  return (
    <div className="relative z-50 bg-[#065F46] px-4 py-2.5 text-center text-xs font-semibold text-white">
      {link ? (
        <Link href={link} className="hover:text-green-200 transition-colors">
          {inner}
        </Link>
      ) : (
        <div className="inline-flex">{inner}</div>
      )}

      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8"/>
        </svg>
      </button>
    </div>
  );
}
