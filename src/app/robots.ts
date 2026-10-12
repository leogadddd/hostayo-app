import type { MetadataRoute } from "next";

// Only the sign-in and legal pages are public; everything else is a private workspace.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/login", "/register", "/terms", "/privacy", "/refunds", "/cookies"],
      disallow: "/",
    },
  };
}
