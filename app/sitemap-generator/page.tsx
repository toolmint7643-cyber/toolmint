"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

const sampleUrls = `/
/about
/contact
/tools
/json-formatter
/word-counter
/sitemap-generator`;

const changeFrequencyOptions: ChangeFrequency[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "always",
  "hourly",
  "never",
];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cleanBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeUrl(baseUrl: string, value: string) {
  const cleanedValue = value.trim();

  if (!cleanedValue) {
    return "";
  }

  if (/^https?:\/\//i.test(cleanedValue)) {
    return cleanedValue.replace(/\/+$/, "");
  }

  const cleanBase = cleanBaseUrl(baseUrl);
  const path = cleanedValue.startsWith("/") ? cleanedValue : `/${cleanedValue}`;

  return `${cleanBase}${path}`.replace(/([^:]\/)\/+/g, "$1");
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  return value;
}

export default function SitemapGeneratorPage() {
  const today = new Date().toISOString().slice(0, 10);

  const [baseUrl, setBaseUrl] = useState("https://toolmint.com");
  const [urls, setUrls] = useState(sampleUrls);
  const [changeFrequency, setChangeFrequency] =
    useState<ChangeFrequency>("weekly");
  const [priority, setPriority] = useState("0.8");
  const [lastModified, setLastModified] = useState(today);
  const [includeLastModified, setIncludeLastModified] = useState(true);
  const [includeChangeFrequency, setIncludeChangeFrequency] = useState(true);
  const [includePriority, setIncludePriority] = useState(true);

  const normalizedUrls = useMemo(() => {
    const uniqueUrls = new Set<string>();

    urls
      .split("\n")
      .map((url) => normalizeUrl(baseUrl, url))
      .filter(Boolean)
      .forEach((url) => uniqueUrls.add(url));

    return Array.from(uniqueUrls);
  }, [baseUrl, urls]);

  const invalidUrls = useMemo(() => {
    return normalizedUrls.filter((url) => !isValidUrl(url));
  }, [normalizedUrls]);

  const safePriority = useMemo(() => {
    const numericPriority = Number(priority);

    if (Number.isNaN(numericPriority)) {
      return "0.8";
    }

    return Math.min(Math.max(numericPriority, 0), 1).toFixed(1);
  }, [priority]);

  const sitemapXml = useMemo(() => {
    if (!cleanBaseUrl(baseUrl) || normalizedUrls.length === 0 || invalidUrls.length > 0) {
      return "";
    }

    const urlBlocks = normalizedUrls
      .map((url) => {
        const lines = [
          "  <url>",
          `    <loc>${escapeXml(url)}</loc>`,
        ];

        if (includeLastModified && lastModified) {
          lines.push(`    <lastmod>${escapeXml(formatDate(lastModified))}</lastmod>`);
        }

        if (includeChangeFrequency) {
          lines.push(`    <changefreq>${escapeXml(changeFrequency)}</changefreq>`);
        }

        if (includePriority) {
          lines.push(`    <priority>${escapeXml(safePriority)}</priority>`);
        }

        lines.push("  </url>");

        return lines.join("\n");
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>`;
  }, [
    baseUrl,
    normalizedUrls,
    invalidUrls.length,
    includeLastModified,
    lastModified,
    includeChangeFrequency,
    changeFrequency,
    includePriority,
    safePriority,
  ]);

  const copySitemap = async () => {
    if (!sitemapXml) {
      alert("Please add valid website URL and page URLs first.");
      return;
    }

    await navigator.clipboard.writeText(sitemapXml);
    alert("Sitemap XML copied!");
  };

  const downloadSitemap = () => {
    if (!sitemapXml) {
      alert("Please add valid website URL and page URLs first.");
      return;
    }

    const blob = new Blob([sitemapXml], {
      type: "application/xml;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "sitemap.xml";
    link.click();

    URL.revokeObjectURL(url);
  };

  const loadSample = () => {
    setBaseUrl("https://toolmint.com");
    setUrls(sampleUrls);
    setChangeFrequency("weekly");
    setPriority("0.8");
    setLastModified(today);
    setIncludeLastModified(true);
    setIncludeChangeFrequency(true);
    setIncludePriority(true);
  };

  const resetTool = () => {
    setBaseUrl("");
    setUrls("");
    setChangeFrequency("weekly");
    setPriority("0.8");
    setLastModified(today);
    setIncludeLastModified(true);
    setIncludeChangeFrequency(true);
    setIncludePriority(true);
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🗺️ Sitemap Generator"
          description="Create SEO-friendly XML sitemaps online for Google Search Console, Bing Webmaster Tools and website indexing."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🌐 Website Pages
                </h2>
                <p className="text-slate-300">
                  Add your website URL and page paths to generate a clean
                  sitemap.xml file.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Website Base URL
                </span>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Page URLs or Paths
                </span>
                <textarea
                  value={urls}
                  onChange={(event) => setUrls(event.target.value)}
                  className="min-h-[260px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                  placeholder="/&#10;/about&#10;/contact&#10;https://example.com/blog"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Changefreq
                  </span>
                  <select
                    value={changeFrequency}
                    onChange={(event) =>
                      setChangeFrequency(event.target.value as ChangeFrequency)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    {changeFrequencyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Priority
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Last Modified
                  </span>
                  <input
                    type="date"
                    value={lastModified}
                    onChange={(event) => setLastModified(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeLastModified}
                    onChange={(event) =>
                      setIncludeLastModified(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Lastmod
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeChangeFrequency}
                    onChange={(event) =>
                      setIncludeChangeFrequency(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Changefreq
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includePriority}
                    onChange={(event) =>
                      setIncludePriority(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Priority
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={copySitemap}>📋 Copy XML</Button>
                <Button onClick={downloadSitemap}>⬇️ Download</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
              </div>

              <Button onClick={resetTool} variant="secondary">
                🔄 Reset
              </Button>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Generated Sitemap
                </h2>
                <p className="text-slate-300">
                  Copy this XML or download it as sitemap.xml.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Total URLs</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {normalizedUrls.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Valid URLs</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {normalizedUrls.length - invalidUrls.length}
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-slate-300">Invalid URLs</p>
                  <p className="mt-1 text-3xl font-bold text-red-300">
                    {invalidUrls.length}
                  </p>
                </div>
              </div>

              {invalidUrls.length > 0 && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                  <h3 className="mb-2 font-bold text-red-300">
                    ⚠️ Invalid URLs found
                  </h3>
                  <ul className="space-y-1 text-sm text-red-100">
                    {invalidUrls.slice(0, 5).map((url) => (
                      <li key={url}>{url}</li>
                    ))}
                  </ul>
                </div>
              )}

              <pre className="min-h-[430px] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {sitemapXml || "Your sitemap XML will appear here..."}
              </pre>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Use
            </h2>
            <p className="text-slate-300">
              A sitemap helps search engines discover important pages on your
              website faster and understand your site structure.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              📌 Best Practice
            </h2>
            <p className="text-slate-300">
              Keep your sitemap clean, include only canonical URLs, and submit
              it in Google Search Console after uploading it to your website.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This browser-only tool generates XML from the URLs you enter. It
              does not automatically crawl your website.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}