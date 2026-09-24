import type { MetadataRoute } from "next";

import { guides } from "@/data/guides";
import { siteUrl } from "@/data/toolMetadata";
import { tools } from "@/data/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    ...tools.map((tool) => tool.href),
    "/privacy-policy",
    "/terms",
    "/contact",
    "/about",
    "/guides",
    ...guides.map((guide) => `/guides/${guide.slug}`),
  ];

  return Array.from(new Set(routes)).map((route) => ({
    url: new URL(route, siteUrl).toString(),
  }));
}