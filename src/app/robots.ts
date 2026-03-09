import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  robots.txt route handler                                           */
/* ------------------------------------------------------------------ */

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = siteConfig.urls

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/account/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
