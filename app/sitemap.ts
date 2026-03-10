// app/sitemap.ts
// Auto-generates /sitemap.xml at build time.
// Fetches the full exam list from the API so every exam page is indexed.
// Next.js App Router built-in — no extra package needed.

import type { MetadataRoute } from "next";
import { fetchExamMetadata } from "../lib/exam-api";
const BASE_URL = process.env.BASE_URL;
const API_BASE = process.env.API_BASE;

/* ── Static tool pages ───────────────────────────────────────────────────── */
const STATIC_PAGES: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  },
  {
    url: `${BASE_URL}image-resizer`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE_URL}pdf-compressor`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE_URL}image-to-pdf`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  },
];

/* ── Fetch all exam names from API ───────────────────────────────────────── */
async function fetchAllExamNames(): Promise<string[]> {
  // Try the most likely endpoint patterns in order.
  // Adjust the first URL to whatever your backend actually exposes.
  const candidates = [
    `${API_BASE}/api/conditions`, // returns string[] or { exams: string[] }
    `${API_BASE}/api/exams`, // alternative list endpoint
    `${API_BASE}/api/admin/exams`, // admin list
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 86400 }, // re-fetch once a day
        headers: { Accept: "application/json" },
      });

      if (!res.ok) continue;

      const data = await res.json();

      // Handle common shapes:  string[]  |  { exams: string[] }  |  { data: string[] }
      if (Array.isArray(data)) {
        const names = data
          .map((item) =>
            typeof item === "string"
              ? item
              : (item?.name ?? item?.exam ?? null),
          )
          .filter(Boolean) as string[];
        if (names.length) return names;
      }

      for (const key of ["exams", "data", "conditions", "list", "items"]) {
        if (Array.isArray(data?.[key])) {
          const names = data[key]
            .map((item: any) =>
              typeof item === "string"
                ? item
                : (item?.name ?? item?.exam ?? null),
            )
            .filter(Boolean) as string[];
          if (names.length) return names;
        }
      }
    } catch {
      // try next candidate
    }
  }

  console.warn(
    "[sitemap] Could not fetch exam list — only static pages will be in sitemap.",
  );
  return [];
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const examNames = await fetchExamMetadata();

  const examPages: MetadataRoute.Sitemap = examNames.map((item) => ({
    url: `${BASE_URL}${item.exam
      .toString()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...STATIC_PAGES, ...examPages];
}
