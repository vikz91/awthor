import type { MetadataRoute } from "next";
import { PUBLIC_MARKETING_ROUTES, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_MARKETING_ROUTES.map((route) => ({
    url: new URL(route, SITE_URL).toString(),
  }));
}
