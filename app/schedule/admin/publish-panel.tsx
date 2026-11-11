import { loadPublishPlan } from "../_lib/export-data";
import { isGithubPublishConfigured } from "../_lib/github-publish";
import DownloadZip from "./download-zip";
import PublishButton, { VenueUpdateButton } from "./publish-button";

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
  const githubReady = isGithubPublishConfigured();
  const venueDiffs = items.filter((i) => i.venueUpdate && i.status !== "clash");

  return (
    <details className="group overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-green-50/60 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">
            Publish fixtures to the website
          </span>
          {toPublish > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {fresh.length} new, {changed.length} changed
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              All live
            </span>
          )}
          {venueDiffs.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {venueDiffs.length} location{venueDiffs.length === 1 ? "" : "s"} differ
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {live.length} already live
          </span>
        </div>
        <span className="text-xs text-zinc-500 group-open:hidden">Expand</span>
        <span className="hidden text-xs text-zinc-500 group-open:inline">
          Collapse
        </span>
      </summary>

      <div className="space-y-3 px-4 py-4">
        {toPublish > 0 && githubReady && <PublishButton count={toPublish} />}
        {toPublish > 0 && !githubReady && (
          <DownloadZip
            href="/schedule/admin/export"
            fallbackName={`fixtures-${folder}.zip`}
            label={`↓ Download ${toPublish} file${
              toPublish === 1 ? "" : "s"
            } (zip)`}
          />
        )}
        {toPublish === 0 && (
          <p className="text-xs text-zinc-600">
            All {live.length} confirmed fixtures are already live.
          </p>
        )}

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
              {githubReady ? (
                <>Publishing adds the files to the website automatically. </>
              ) : (
                <>
                  Unzip, then on GitHub open{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">
                    content/fixtures/{folder}
                  </code>
                  , choose Add file &rarr; Upload files, drag the files in and
                  commit.{" "}
                </>
              )}
              Changed fixtures keep their existing result, notes and venue
              details; only the date is updated.{" "}
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

        {venueDiffs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-800">
              Location differs from the website
            </p>
            <ul className="divide-y divide-zinc-100 rounded border border-zinc-200 text-xs">
              {venueDiffs.map((i) => (
                <li key={i.id} className="space-y-1.5 px-3 py-2">
                  <div className="font-medium text-zinc-800">
                    {i.teamName}{" "}
                    <span className="font-normal text-zinc-600">
                      {i.json.venue === "Home" ? "v" : "@"} {i.json.opponent}
                    </span>
                  </div>
                  <div className="text-zinc-500">
                    On the website:{" "}
                    <span className="text-zinc-700">
                      {i.venueUpdate!.from.location || "(none)"}
                    </span>
                  </div>
                  <div className="text-zinc-500">
                    Club record:{" "}
                    <span className="text-zinc-700">
                      {i.venueUpdate!.to.location}
                    </span>
                  </div>
                  {githubReady ? (
                    <VenueUpdateButton fixtureId={i.id} />
                  ) : (
                    <p className="text-zinc-500">
                      Edit this fixture in TinaCMS to change it.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">
              Only the location and map link are changed. Results, notes and
              the date are kept.
            </p>
          </div>
        )}

        {clashes.length > 0 && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {clashes.length} fixtures would write the same file name and were
            left out:{" "}
            {clashes.map((c) => `${c.teamName} (${c.filename})`).join(", ")}.
            Export these one at a time from each team&rsquo;s tab.
          </div>
        )}
      </div>
    </details>
  );
}
