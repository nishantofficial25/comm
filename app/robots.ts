// app/robots.ts
// Auto-generates /robots.txt at build time
// Next.js App Router built-in — no package needed

import type { MetadataRoute } from "next";

const BASE_URL = process.env.BASE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/","/admin/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
