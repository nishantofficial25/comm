// lib/examNavigation.ts
// Helpers to build exam URLs that preserve the display name correctly.

/**
 * Build the URL path for an exam page.
 * "JEE Mains"  →  "/exam/JEE%20Mains"
 * "UPSC CSE"   →  "/exam/UPSC%20CSE"
 *
 * DO NOT slugify (no lowercasing, no replacing spaces with dashes).
 * The API key IS the display name.
 */
export function examPath(examName: string): string {
  return `/exam/${encodeURIComponent(examName)}`;
}

/**
 * Use this in router.push() calls:
 * router.push(examPath("JEE Mains"))
 */
