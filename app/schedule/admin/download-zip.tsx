"use client";

import { useState } from "react";
import { Spinner } from "../_lib/submit-button";

type Status = "idle" | "preparing" | "done" | "error";

export default function DownloadZip({
  href,
  label,
  fallbackName = "fixtures.zip",
  variant = "button",
}: {
  href: string;
  label: string;
  fallbackName?: string;
  variant?: "button" | "link";
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (status === "preparing") return;
    setStatus("preparing");
    setError(null);
    try {
      const res = await fetch(href, { cache: "no-store" });
      if (!res.ok) {
        const text = (await res.text()).trim();
        throw new Error(
          res.status === 401
            ? "Your admin session has expired. Sign in again."
            : text || `Download failed (${res.status}).`
        );
      }
      const name =
        /filename="([^"]+)"/.exec(
          res.headers.get("Content-Disposition") ?? ""
        )?.[1] ?? fallbackName;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
      setStatus("error");
    }
  }

  const preparing = status === "preparing";
  const base =
    variant === "button"
      ? "rounded bg-forest px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-dark"
      : "underline hover:text-zinc-800";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={preparing}
        aria-busy={preparing || undefined}
        className={`inline-flex items-center gap-2 transition-opacity ${
          preparing ? "cursor-wait opacity-80" : ""
        } ${base}`}
      >
        {preparing && <Spinner />}
        {preparing
          ? "Preparing…"
          : status === "done"
            ? "Downloaded ✓"
            : label}
      </button>
      {status === "error" && error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}
