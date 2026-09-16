import type { MetadataRoute } from "next";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

import { SITE_URL } from "./site-url";

const STATIC_ROUTES = [
  { path: "", priority: 1.0 },
  { path: "about", priority: 0.8 },
  { path: "contact", priority: 0.7 },
  { path: "fixtures", priority: 0.7 },
  { path: "gallery", priority: 0.6 },
  { path: "news", priority: 0.8 },
  { path: "schedule", priority: 0.5 },
  { path: "useful-links", priority: 0.4 },
];

async function listNewsSlugs(): Promise<
  { slug: string; lastModified: Date }[]
> {
  try {
    const dir = path.join(process.cwd(), "content", "news");
    const files = await readdir(dir);
    return await Promise.all(
      files
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const info = await stat(path.join(dir, f));
          return { slug: f.replace(/\.md$/, ""), lastModified: info.mtime };
        }),
    );
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const newsSlugs = await listNewsSlugs();

  return [
    ...STATIC_ROUTES.map(({ path: p, priority }) => ({
      url: p ? `${SITE_URL}/${p}` : SITE_URL,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority,
    })),
    ...newsSlugs.map(({ slug, lastModified }) => ({
      url: `${SITE_URL}/news/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
