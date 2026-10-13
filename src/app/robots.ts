import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/site";

// Only the sign-in, legal and public host pages are crawlable; everything else is a private
// workspace. Host pages decide for themselves via a robots meta tag (publicListingEnabled).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$",
        "/login",
        "/register",
        "/terms",
        "/privacy",
        "/refunds",
        "/cookies",
        "/h/",
        "/llms.txt",
      ],
      disallow: "/",
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
