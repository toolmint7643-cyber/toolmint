import type { Metadata } from "next";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HomePageClient, { type Tool } from "@/components/HomePageClient";
import { getOgImageUrl, siteUrl } from "@/data/toolMetadata";
import { tools } from "@/data/tools";

const homeOgImage = getOgImageUrl("ToolMint", "Free Online Tools");

export const metadata: Metadata = {
  title: "ToolMint - Free Online PDF, Image, SEO, Developer and Calculator Tools",
  description:
    "Use ToolMint for free online PDF tools, image converters, developer utilities, SEO tools, text tools, color tools and calculators in a fast mobile-friendly workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ToolMint - Free Online Tools",
    description:
      "Free online PDF, image, SEO, developer, text, color and calculator tools built for fast everyday workflows.",
    url: siteUrl,
    siteName: "ToolMint",
    type: "website",
    images: [
      {
        url: homeOgImage,
        width: 1200,
        height: 630,
        alt: "ToolMint free online tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToolMint - Free Online Tools",
    description:
      "Free online PDF, image, SEO, developer, text, color and calculator tools built for fast everyday workflows.",
    images: [homeOgImage],
  },
};

const featuredHrefs = [
  "/pdf-compressor",
  "/image-compressor",
  "/pdf-merge",
  "/json-formatter",
  "/word-counter",
  "/seo-meta-tag-generator",
];

const quickPickHrefs = [
  "/pdf-compressor",
  "/image-compressor",
  "/json-formatter",
  "/word-counter",
  "/pdf-to-jpg",
  "/pdf-to-png",
];

const popularHrefs = [
  "/pdf-merge",
  "/pdf-split",
  "/watermark-pdf",
  "/delete-pdf-pages",
  "/extract-pdf-pages",
  "/currency-converter",
];

const catalogHighlightHrefs = [
  "/pdf-text-extractor",
  "/pdf-page-number-adder",
  "/organize-pdf",
  "/pdf-compare",
  "/open-graph-preview-generator",
  "/schema-markup-generator",
];

const categoryFallbackDescriptions: Record<string, string> = {
  PDF: "PDF conversion, cleanup, organization and inspection tools.",
  Developer: "Utilities for formatting, validating, encoding and generating data.",
  SEO: "Tools for metadata, links, headings, schema and page checks.",
  Text: "Text cleanup, counting, sorting, comparison and transformation tools.",
  Calculator: "Everyday finance, date, health and business calculators.",
  Color: "Color picking, contrast checking, gradients and palette generation.",
  Image: "Image compression and optimization tools.",
  "Image & PDF": "Image conversion and PDF-adjacent file utilities.",
};

const faqStructuredData = [
  {
    question: "What is ToolMint?",
    answer:
      "ToolMint is a free online tools website with PDF tools, image converters, developer utilities, SEO tools, text tools, color tools and calculators.",
  },
  {
    question: "Are ToolMint tools free?",
    answer: "Yes. ToolMint tools are designed to be free to use for everyday online utility tasks.",
  },
  {
    question: "Do I need to install software?",
    answer: "No. ToolMint tools run as web pages in the browser.",
  },
  {
    question: "Can I use ToolMint on mobile?",
    answer: "Yes. ToolMint is designed for mobile and desktop workflows.",
  },
];

function pickExisting(hrefs: string[], catalog: Tool[]) {
  return hrefs
    .map((href) => catalog.find((tool) => tool.href === href))
    .filter((tool): tool is Tool => Boolean(tool));
}

function buildCategories(catalog: Tool[]) {
  const counts = catalog.reduce<Record<string, number>>((acc, tool) => {
    acc[tool.category] = (acc[tool.category] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      description: categoryFallbackDescriptions[name] ?? `${name} tools available on ToolMint.`,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export default function Home() {
  const catalog = tools as Tool[];
  const categories = buildCategories(catalog);
  const hasReliableLatest = catalog.some((tool) => Boolean(tool.createdAt));
  const latestTools = hasReliableLatest
    ? [...catalog]
        .filter((tool) => Boolean(tool.createdAt))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 6)
    : pickExisting(catalogHighlightHrefs, catalog);

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ToolMint",
    url: siteUrl,
    description: metadata.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqStructuredData.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <HomePageClient
        tools={catalog}
        categories={categories}
        featuredTools={pickExisting(featuredHrefs, catalog)}
        quickPicks={pickExisting(quickPickHrefs, catalog)}
        popularTools={pickExisting(popularHrefs, catalog)}
        latestTools={latestTools}
        hasReliableLatest={hasReliableLatest}
      />
      <Footer />
    </>
  );
}
