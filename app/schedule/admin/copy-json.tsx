"use client";

import { useState } from "react";

export default function CopyJson({
  data,
  label = "Copy",
}: {
  data: unknown;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: create a textarea and select
      const ta = document.createElement("textarea");
      ta.value = JSON.stringify(data, null, 2);
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // give up silently
      }
      document.body.removeChild(ta);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-800 hover:border-forest hover:text-forest"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
