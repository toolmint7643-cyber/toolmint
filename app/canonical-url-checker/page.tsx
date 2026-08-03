"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type CanonicalItem = {
  href: string;
  index: number;
};

const sampleHtml = `<!doctype html>
<html>
  <head>
    <title>ToolMint - Free Online Tools</title>
    <link rel="canonical" href="https://toolmint.com/free-online-tools" />
    <meta name="description" content="Free online tools for developers, SEO and productivity." />
  </head>
  <body>
    <h1>Free Online Tools</h1>
  </body>
</html>`;

function getAttribute(tag: string, attribute: string) {
  const regex = new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i");
  return tag.match(regex)?.[1] || "";
}

function decodeHtml(value: string) {
  const textarea =
    typeof document !== "undefined" ? document.createElement("textarea") : null;

  if (!textarea) {
    return value;
  }

  textarea.innerHTML = value;
  return textarea.value;
}

function extractCanonicals(html: string): CanonicalItem[] {
  const canonicals: CanonicalItem[] = [];
  const regex = /<link\b[^>]*>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const rel = getAttribute(tag, "rel").toLowerCase();

    if (rel.split(/\s+/).includes("canonical")) {
      canonicals.push({
        href: decodeHtml(getAttribute(tag, "href")).trim(),
        index,
      });
    }

    index += 1;
  }

  return canonicals;
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function compareCanonical(sourceUrl: string, canonicalUrl: string) {
  if (!sourceUrl || !canonicalUrl || !isAbsoluteHttpUrl(canonicalUrl)) {
    return "Unknown";
  }

  return normalizeUrl(sourceUrl) === normalizeUrl(canonicalUrl)
    ? "Self Canonical"
    : "Different Canonical";
}

function analyzeCanonicals(canonicals: CanonicalItem[], sourceUrl: string) {
  const warnings: string[] = [];

  if (canonicals.length === 0) {
    warnings.push("No canonical tag found on this page.");
  }

  if (canonicals.length > 1) {
    warnings.push(`Multiple canonical tags found (${canonicals.length}). Only one canonical tag is recommended.`);
  }

  canonicals.forEach((canonical, index) => {
    if (!canonical.href) {
      warnings.push(`Canonical tag #${index + 1} has empty href.`);
    } else if (!isAbsoluteHttpUrl(canonical.href)) {
      warnings.push(`Canonical tag #${index + 1} is relative or invalid. Absolute HTTPS URL is recommended.`);
    }
  });

  if (
    sourceUrl &&
    canonicals.length === 1 &&
    isAbsoluteHttpUrl(canonicals[0].href) &&
    compareCanonical(sourceUrl, canonicals[0].href) === "Different Canonical"
  ) {
    warnings.push("Canonical URL is different from the checked page URL. This can be correct, but review it carefully.");
  }

  return warnings;
}

export default function CanonicalUrlCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com/free-online-tools");
  const [sourceUrl, setSourceUrl] = useState("https://toolmint.com/free-online-tools");
  const [html, setHtml] = useState(sampleHtml);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canonicals = useMemo(() => extractCanonicals(html), [html]);
  const warnings = useMemo(
    () => analyzeCanonicals(canonicals, sourceUrl),
    [canonicals, sourceUrl]
  );

  const primaryCanonical = canonicals[0]?.href || "";
  const canonicalStatus = compareCanonical(sourceUrl, primaryCanonical);

  const score =
    canonicals.length === 1 &&
    isAbsoluteHttpUrl(primaryCanonical) &&
    warnings.length === 0
      ? 100
      : canonicals.length === 1 && isAbsoluteHttpUrl(primaryCanonical)
        ? 75
        : canonicals.length > 0
          ? 40
          : 0;

  const report = `Canonical URL Checker Report

Source: ${mode === "url" ? sourceUrl || url : "Manual HTML"}
Canonical count: ${canonicals.length}
Primary canonical: ${primaryCanonical || "(not found)"}
Status: ${canonicalStatus}
Score: ${score}%

Warnings:
${
  warnings.length > 0
    ? warnings.map((warning) => `- ${warning}`).join("\n")
    : "- No major canonical issues found."
}

Canonical tags:
${canonicals
  .map((canonical, index) => `${index + 1}. ${canonical.href || "(empty href)"}`)
  .join("\n")}`;

  const fetchHtml = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/canonical-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch canonical data.");
        return;
      }

      setHtml(data.html || "");
      setSourceUrl(data.sourceUrl || url.trim());
      setMode("url");
      alert("Page HTML fetched!");
    } catch {
      setError("Something went wrong while fetching this URL.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Canonical report copied!");
  };

  const loadSample = () => {
    setMode("html");
    setUrl("https://toolmint.com/free-online-tools");
    setSourceUrl("https://toolmint.com/free-online-tools");
    setHtml(sampleHtml);
    setError("");
  };

  const resetTool = () => {
    setMode("html");
    setUrl("");
    setSourceUrl("");
    setHtml("");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔗 Canonical URL Checker"
          description="Check canonical tags, missing canonical URLs, duplicate canonical tags and SEO canonical issues from a URL or HTML."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Canonical Tag
                </h2>
                <p className="text-slate-300">
                  Fetch a page URL or paste HTML manually to inspect canonical
                  link tags.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
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
                    {loading ? "⏳ Fetching" : "🚀 Fetch Canonical"}
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
                  placeholder='<link rel="canonical" href="https://example.com/page" />'
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
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
                  📊 Canonical Summary
                </h2>
                <p className="text-slate-300">
                  Review canonical URL health and duplicate canonical issues.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Canonical Tags</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {canonicals.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">SEO Score</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {score}%
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  warnings.length > 0
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <h3
                  className={`mb-3 text-xl font-bold ${
                    warnings.length > 0
                      ? "text-yellow-300"
                      : "text-emerald-300"
                  }`}
                >
                  {warnings.length > 0
                    ? "⚠️ Canonical Warnings"
                    : "✅ Looks Good"}
                </h3>

                {warnings.length > 0 ? (
                  <ul className="space-y-2 text-slate-200">
                    {warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-200">
                    One valid canonical tag found with no major issues.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">
                  🔗 Primary Canonical
                </h3>
                <p className="break-words text-slate-200">
                  {primaryCanonical || "No canonical URL found."}
                </p>
                <span className="mt-4 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300">
                  {canonicalStatus}
                </span>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">
            🧾 Canonical Tag Results
          </h2>

          {canonicals.length === 0 ? (
            <ToolCard>
              <p className="text-slate-400">No canonical tags found yet.</p>
            </ToolCard>
          ) : (
            canonicals.map((canonical, index) => (
              <div
                key={`${canonical.index}-${canonical.href}`}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
              >
                <p className="mb-2 text-sm text-slate-400">
                  Canonical #{index + 1}
                </p>
                <p className="break-words text-slate-100">
                  {canonical.href || "(empty href)"}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Canonical tags tell search engines which URL is the preferred
              version when similar or duplicate pages exist.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Use one absolute canonical URL per page, usually matching the
              final indexable page URL.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              A different canonical URL can be correct for duplicate pages, but
              it should be reviewed carefully before publishing.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}