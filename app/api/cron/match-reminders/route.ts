import { runReminders } from "../../../schedule/_lib/reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";
  try {
    const { due, results } = await runReminders({ dryRun });
    const describe = (c: (typeof due)[number]) => ({ to: c.to, cc: c.cc, opponent: c.opponent, date: c.date, isHome: c.isHome });
    return Response.json({
      dryRun,
      due: due.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).map((r) => ({ ...describe(r.candidate), error: r.error })),
      ...(dryRun ? { would_send: due.map(describe) } : {}),
    });
  } catch (err) {
    console.error("[Match reminders] run failed:", err);
    return Response.json({ error: err instanceof Error ? err.message : "Run failed" }, { status: 500 });
  }
}
