import { loadPublishPlan } from "../_lib/export-data";
import DownloadZip from "./download-zip";

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PublishPanel() {
  const { folder, items } = await loadPublishPlan();
  if (!folder) return null;

  const fresh = items.filter((i) => i.status === "new");
  const changed = items.filter((i) => i.status === "changed");
  const live = items.filter((i) => i.status === "live");
  const clashes = items.filter((i) => i.status === "clash");
  const toPublish = fresh.length + changed.length;

  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Publish fixtures to the website
          </h2>
          <p className="text-xs text-zinc-600">
            {toPublish > 0 ? (
              <>
                <strong>{fresh.length}</strong> new,{" "}
                <strong>{changed.length}</strong> changed,{" "}
                {live.length} already live
              </>
            ) : (
              <>All {live.length} confirmed fixtures are already live.</>
            )}
          </p>
        </div>
        {toPublish > 0 && (
          <DownloadZip
            href="/schedule/admin/export"
            fallbackName={`fixtures-${folder}.zip`}
            label={`↓ Download ${toPublish} file${toPublish === 1 ? "" : "s"} (zip)`}
          />
        )}
      </div>

      {toPublish > 0 && (
        <>
          <ul className="divide-y divide-zinc-100 rounded border border-zinc-200 text-xs">
            {[...changed, ...fresh].map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2"
              >
                <span>
                  <span
                    className={`mr-2 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide ${
                      i.status === "changed"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {i.status}
                  </span>
                  <span className="font-medium text-zinc-800">
                    {i.teamName}
                  </span>{" "}
                  <span className="text-zinc-600">
                    {i.json.venue === "Home" ? "v" : "@"} {i.json.opponent}
                  </span>
                </span>
                <span className="text-zinc-500">
                  {i.status === "changed" && i.previousDate && (
                    <>
                      <span className="line-through">
                        {when(i.previousDate)}
                      </span>{" "}
                      &rarr;{" "}
                    </>
                  )}
                  {when(i.json.date)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Unzip, then on GitHub open{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              content/fixtures/{folder}
            </code>
            , choose Add file &rarr; Upload files, drag the files in and
            commit. Changed fixtures keep their existing result, notes and
            venue details; only the date is updated.{" "}
            {live.length > 0 && (
              <DownloadZip
                href="/schedule/admin/export?all=1"
                fallbackName={`fixtures-${folder}.zip`}
                label="Download everything including already-live"
                variant="link"
              />
            )}
          </p>
        </>
      )}

      {clashes.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {clashes.length} fixtures would write the same file name and were
          left out: {clashes.map((c) => `${c.teamName} (${c.filename})`).join(", ")}.
          Export these one at a time from each team&rsquo;s tab.
        </div>
      )}
    </section>
  );
}
