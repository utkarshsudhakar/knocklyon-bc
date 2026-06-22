import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const sitePath = path.join(process.cwd(), "content/settings/site.json");
    const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
    return NextResponse.json({ season: site.current_season ?? "" });
  } catch {
    return NextResponse.json({ season: "" });
  }
}
