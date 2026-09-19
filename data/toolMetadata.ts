import type { Metadata } from "next";
import { tools } from "@/data/tools";

const siteName = "ToolMint";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://toolmint.com";

const categoryKeywords: Record<string, string[]> = {
  PDF: ["pdf tool", "online pdf tool", "free pdf tool"],
  "Image & PDF": ["file tool", "image pdf tool", "online file converter"],
  Image: ["image tool", "online image tool", "free image converter"],
  Developer: ["developer tool", "coding tool", "online developer utility"],
  Text: ["text tool", "online text tool", "text utility"],
  Calculator: ["calculator", "online calculator", "free calculator"],
  Color: ["color tool", "online color tool", "design tool"],
  SEO: ["seo tool", "online seo tool", "website seo utility"],
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getKeywords(title: string, category: string) {
  const titleKeywords = title
    .toLowerCase()
    .replace(/[/|-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .map((word) => `${word} tool`);

  return uniqueValues([
    title,
    `${title} online`,
    `${title} free`,
    `${title} ToolMint`,
    category,
    ...(categoryKeywords[category] || []),
    ...titleKeywords,
  ]);
}

export function getToolMetadata(href: string): Metadata {
  const tool = tools.find((item) => item.href === href);

  if (!tool) {
    return {
      title: "Free Online Tool",
      description:
        "Use ToolMint free online tools for PDFs, images, SEO, developers, text, colors and calculators.",
      alternates: {
        canonical: href,
      },
    };
  }

  const title = `${tool.title} - Free Online ${tool.category} Tool`;

  return {
    title,
    description: tool.description,
    keywords: getKeywords(tool.title, tool.category),
    alternates: {
      canonical: tool.href,
    },
    openGraph: {
      title,
      description: tool.description,
      url: tool.href,
      siteName,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: tool.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export { siteName, siteUrl };
