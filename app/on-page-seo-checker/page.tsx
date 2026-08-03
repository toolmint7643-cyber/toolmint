"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type CheckStatus = "good" | "warning" | "bad";

type AuditItem = {
  label: string;
  value: string;
  status: CheckStatus;
  note: string;
};

const sampleHtml = `<!doctype html>
<html>
  <head>
    <title>ToolMint - Free Online Developer and SEO Tools</title>
    <meta name="description" content="Use free online developer, SEO, text, image, PDF and calculator tools. Fast, mobile-friendly and easy to use." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://toolmint.com" />
  </head>
  <body>
    <h1>Free Online Tools</h1>
    <h2>Developer Tools</h2>
    <p>ToolMint provides free tools for developers and creators.</p>
    <img src="/og-image.png" alt="ToolMint free online tools dashboard" />
    <img src="/logo.png" />
    <a href="/json-formatter">JSON Formatter</a>
    <a href="https://nextjs.org">Next.js</a>
  </body>
</html>`;

function getAttribute(tag: string, attribute: string) {
  const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i");
  return tag.match(regex)?.[1] || "";
}

function stripTags(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  const textarea =
    typeof document !== "undefined" ? document.createElement("textarea") : null;

  if (!textarea) return value;

  textarea.innerHTML = value;
  return textarea.value;
}

function getTitle(html: string) {
  return decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
}

function getMetaContent(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const nameRegex = new RegExp(
    `<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );

  const propertyRegex = new RegExp(
    `<meta[^>]+property=["']${escapedName}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );

  const reverseNameRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapedName}["'][^>]*>`,
    "i"
  );

  const reversePropertyRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapedName}["'][^>]*>`,
    "i"
  );

  return decodeHtml(
    html.match(nameRegex)?.[1] ||
      html.match(propertyRegex)?.[1] ||
      html.match(reverseNameRegex)?.[1] ||
      html.match(reversePropertyRegex)?.[1] ||
      ""
  ).trim();
}

function extractHeadings(html: string, level: number) {
  const regex = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
  const headings: string[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    headings.push(decodeHtml(stripTags(match[1] || "")));
  }

  return headings;
}

function extractCanonicals(html: string) {
  const links = html.match(/<link\b[^>]*>/gi) || [];

  return links
    .filter((tag) => getAttribute(tag, "rel").toLowerCase().split(/\s+/).includes("canonical"))
    .map((tag) => decodeHtml(getAttribute(tag, "href")).trim());
}

function extractImages(html: string) {
  const images = html.match(/<img\b[^>]*>/gi) || [];

  return images.map((tag) => ({
    src: decodeHtml(getAttribute(tag, "src")).trim(),
    alt: decodeHtml(getAttribute(tag, "alt")).trim(),
    hasAlt: /\salt\s*=/i.test(tag),
  }));
}

function extractLinks(html: string) {
  const anchors = html.match(/<a\b[^>]*>/gi) || [];

  return anchors.map((tag) => decodeHtml(getAttribute(tag, "href")).trim());
}

function wordCount(html: string) {
  return stripTags(html).split(/\s+/).filter(Boolean).length;
}

function getStatusStyle(status: CheckStatus) {
  if (status === "good") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "warning") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  return "border-red-500/30 bg-red-500/10 text-red-300";
}

function getScore(items: AuditItem[]) {
  const points = items.reduce((total, item) => {
    if (item.status === "good") return total + 10;
    if (item.status === "warning") return total + 5;
    return total;
  }, 0);

  return Math.round((points / (items.length * 10)) * 100);
}

export default function OnPageSeoCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com");
  const [sourceUrl, setSourceUrl] = useState("https://toolmint.com");
  const [html, setHtml] = useState(sampleHtml);
  const [xRobotsTag, setXRobotsTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const audit = useMemo(() => {
    const title = getTitle(html);
    const description = getMetaContent(html, "description");
    const robots = getMetaContent(html, "robots");
    const ogTitle = getMetaContent(html, "og:title");
    const ogImage = getMetaContent(html, "og:image");
    const h1s = extractHeadings(html, 1);
    const h2s = extractHeadings(html, 2);
    const canonicals = extractCanonicals(html);
    const images = extractImages(html);
    const links = extractLinks(html);
    const missingAlt = images.filter((image) => !image.hasAlt || !image.alt).length;
    const words = wordCount(html);
    const robotText = `${robots}, ${xRobotsTag}`.toLowerCase();

    const items: AuditItem[] = [
      {
        label: "Title Tag",
        value: title || "Missing",
        status: title.length >= 35 && title.length <= 60 ? "good" : title ? "warning" : "bad",
        note: "Best title length is usually 35 to 60 characters.",
      },
      {
        label: "Meta Description",
        value: description || "Missing",
        status:
          description.length >= 120 && description.length <= 160
            ? "good"
            : description
              ? "warning"
              : "bad",
        note: "Best meta description length is usually 120 to 160 characters.",
      },
      {
        label: "H1 Heading",
        value: `${h1s.length} found`,
        status: h1s.length === 1 ? "good" : h1s.length > 1 ? "warning" : "bad",
        note: "Most pages should have one clear H1 heading.",
      },
      {
        label: "H2 Headings",
        value: `${h2s.length} found`,
        status: h2s.length > 0 ? "good" : "warning",
        note: "H2 headings help organize page sections.",
      },
      {
        label: "Canonical URL",
        value: canonicals[0] || "Missing",
        status: canonicals.length === 1 ? "good" : canonicals.length > 1 ? "warning" : "bad",
        note: "Use one canonical URL to avoid duplicate URL confusion.",
      },
      {
        label: "Indexability",
        value: robotText.includes("noindex") ? "noindex found" : "indexable",
        status: robotText.includes("noindex") ? "bad" : "good",
        note: "Noindex can remove a page from search results.",
      },
      {
        label: "Followability",
        value: robotText.includes("nofollow") ? "nofollow found" : "followable",
        status: robotText.includes("nofollow") ? "warning" : "good",
        note: "Nofollow may stop search engines from following page links.",
      },
      {
        label: "Image Alt Text",
        value: `${missingAlt} missing out of ${images.length}`,
        status: images.length === 0 ? "warning" : missingAlt === 0 ? "good" : "warning",
        note: "Important images should have helpful alt text.",
      },
      {
        label: "Open Graph",
        value: ogTitle || ogImage ? "Found" : "Missing",
        status: ogTitle && ogImage ? "good" : ogTitle || ogImage ? "warning" : "bad",
        note: "Open Graph tags improve social sharing previews.",
      },
      {
        label: "Content Length",
        value: `${words} words`,
        status: words >= 300 ? "good" : words >= 100 ? "warning" : "bad",
        note: "Thin pages may perform poorly if they do not satisfy search intent.",
      },
      {
        label: "Links",
        value: `${links.length} links found`,
        status: links.length > 0 ? "good" : "warning",
        note: "Useful internal links help users and search engines discover pages.",
      },
    ];

    return {
      title,
      description,
      robots,
      ogTitle,
      ogImage,
      h1s,
      h2s,
      canonicals,
      images,
      links,
      missingAlt,
      words,
      items,
      score: getScore(items),
    };
  }, [html, xRobotsTag]);

  const report = `On-Page SEO Audit Report

Source: ${mode === "url" ? sourceUrl || url : "Manual HTML"}
SEO Score: ${audit.score}%

Title: ${audit.title || "(missing)"}
Meta Description: ${audit.description || "(missing)"}
Robots: ${audit.robots || "(missing)"}
X-Robots-Tag: ${xRobotsTag || "(missing)"}
Canonical: ${audit.canonicals[0] || "(missing)"}
H1 Count: ${audit.h1s.length}
H2 Count: ${audit.h2s.length}
Images: ${audit.images.length}
Missing Alt: ${audit.missingAlt}
Links: ${audit.links.length}
Words: ${audit.words}

Checks:
${audit.items.map((item) => `- ${item.label}: ${item.value} (${item.status})`).join("\n")}`;

  const fetchHtml = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/on-page-seo-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch SEO data.");
        return;
      }

      setHtml(data.html || "");
      setSourceUrl(data.sourceUrl || url.trim());
      setXRobotsTag(data.xRobotsTag || "");
      setMode("url");
      alert("On-page SEO data fetched!");
    } catch {
      setError("Something went wrong while fetching this URL.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("SEO audit report copied!");
  };

  const loadSample = () => {
    setMode("html");
    setUrl("https://toolmint.com");
    setSourceUrl("https://toolmint.com");
    setHtml(sampleHtml);
    setXRobotsTag("");
    setError("");
  };

  const resetTool = () => {
    setMode("html");
    setUrl("");
    setSourceUrl("");
    setHtml("");
    setXRobotsTag("");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="📈 On-Page SEO Checker"
          description="Audit title, meta description, headings, canonical URL, robots directives, image alt text, links and content length."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Page SEO
                </h2>
                <p className="text-slate-300">
                  Fetch a URL or paste HTML manually to run a quick on-page SEO
                  audit.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  onClick={() => setMode("url")}
                  variant={mode === "url" ? "primary" : "secondary"}
                >
                  🌐 URL Mode
                </Button>
                <Button
                  onClick={() => setMode("html")}
                  variant={mode === "html" ? "primary" : "secondary"}
                >
                  🧩 HTML Mode
                </Button>
              </div>

              {mode === "url" && (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Page URL
                    </span>
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                      placeholder="https://example.com/page"
                    />
                  </label>

                  <Button onClick={fetchHtml}>
                    {loading ? "⏳ Fetching" : "🚀 Fetch SEO Data"}
                  </Button>

                  {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                      ⚠️ {error}
                    </div>
                  )}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  HTML Input
                </span>
                <textarea
                  value={html}
                  onChange={(event) => {
                    setHtml(event.target.value);
                    setMode("html");
                  }}
                  className="min-h-[360px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                  placeholder="<title>Your page title</title>"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  X-Robots-Tag Header
                </span>
                <input
                  type="text"
                  value={xRobotsTag}
                  onChange={(event) => setXRobotsTag(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Example: noindex, nofollow"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={copyReport}>📋 Copy Report</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🧾 SEO Score
                </h2>
                <p className="text-slate-300">
                  A fast summary of important on-page SEO signals.
                </p>
              </div>

              <div
                className={`rounded-2xl border p-6 ${
                  audit.score >= 80
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : audit.score >= 55
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <p className="text-sm font-bold uppercase tracking-wide text-slate-300">
                  Overall Score
                </p>
                <p
                  className={`mt-2 text-6xl font-black ${
                    audit.score >= 80
                      ? "text-emerald-300"
                      : audit.score >= 55
                        ? "text-yellow-300"
                        : "text-red-300"
                  }`}
                >
                  {audit.score}%
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Words</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {audit.words}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Images</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {audit.images.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Headings</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {audit.h1s.length + audit.h2s.length}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Links</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {audit.links.length}
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {audit.items.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-white">{item.label}</h3>
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-bold ${getStatusStyle(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
              <p className="break-words text-slate-200">{item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Use this audit before publishing pages to catch common SEO issues
              in title, description, headings, canonical tags and indexing.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Use one clear H1, helpful metadata, clean canonical URLs,
              indexable robots settings and descriptive image alt text.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This is a single page audit. Full website crawling and ranking
              data need a larger backend crawler or SEO API.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}