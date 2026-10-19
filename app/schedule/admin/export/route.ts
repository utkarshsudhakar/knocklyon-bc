import { isAdmin } from "../../_lib/admin-session";
import { loadPublishPlan } from "../../_lib/export-data";
import { createZip } from "../../_lib/zip";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const includeLive = new URL(request.url).searchParams.get("all") === "1";
  const { folder, items } = await loadPublishPlan();
  if (!folder) {
    return new Response("Could not read the current season", { status: 500 });
  }

  const files = items
    .filter((i) =>
      includeLive
        ? i.status !== "clash"
        : i.status === "new" || i.status === "changed"
    )
    .map((i) => ({
      name: i.filename,
      content: JSON.stringify(i.output, null, 2) + "\n",
    }));

  if (files.length === 0) {
    return new Response("Nothing to export", { status: 404 });
  }

  const zip = createZip(files);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fixtures-${folder}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
