import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, units } from "@/lib/db/schema";
import { APP_URL, PUBLIC_PAGES } from "@/lib/site";

// Hosts opt in per request, so the list must not be frozen at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((p) => ({
    url: `${APP_URL}${p.path}`,
    changeFrequency: p.path === "/login" || p.path === "/register" ? "monthly" : "yearly",
    priority: p.path === "/login" ? 0.5 : 0.3,
  }));

  try {
    const listed = await db
      .select({ host: organizations.slug, unit: units.publicSlug })
      .from(organizations)
      .leftJoin(
        units,
        and(
          eq(units.organizationId, organizations.id),
          eq(units.status, "active"),
          isNull(units.deletedAt),
        ),
      )
      .where(
        and(
          eq(organizations.publicListingEnabled, true),
          eq(organizations.publicPageLive, true),
        ),
      );
    const hosts = new Set<string>();
    for (const row of listed) {
      if (!hosts.has(row.host)) {
        hosts.add(row.host);
        pages.push({ url: `${APP_URL}/h/${row.host}`, changeFrequency: "weekly", priority: 0.6 });
      }
      if (row.unit) {
        pages.push({ url: `${APP_URL}/h/${row.host}/${row.unit}`, changeFrequency: "weekly", priority: 0.5 });
      }
    }
  } catch {
    // The static pages are still worth serving if the database is briefly unreachable.
  }
  return pages;
}
