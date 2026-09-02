"use client";

import { useState } from "react";

export default function DownloadJson({
  data,
  filename,
  label = "Download JSON",
}: {
  data: unknown;
  filename: string;
  label?: string;
}) {
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Free the URL after a tick so Safari has time to trigger the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded border border-forest bg-forest text-white px-3 py-1 text-xs font-medium hover:bg-forest-dark"
    >
      {downloaded ? "Downloaded ✓" : `↓ ${label}`}
    </button>
  );
}
