import type { MetadataRoute } from "next";

import { SITE_URL } from "./site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/schedule/admin",
          "/schedule/c/",
          "/schedule/k/",
          "/api/",
          "/launch-preview",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
