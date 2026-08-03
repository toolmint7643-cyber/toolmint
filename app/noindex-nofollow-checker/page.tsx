"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RobotsMeta = {
  name: string;
  content: string;
  index: number;
};

const sampleHtml = `<!doctype html>
<html>
  <head>
    <title>ToolMint SEO Tools</title>
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
    <meta name="googlebot" content="index, follow" />
  </head>
  <body>
    <h1>SEO Tools</h1>
  </body>
</html>`;

const directives = [
  "noindex",
  "nofollow",
  "index",
  "follow",
  "noarchive",
  "nosnippet",
  "noimageindex",
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
];

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

function extractRobotsMeta(html: string): RobotsMeta[] {
  const metas: RobotsMeta[] = [];
  const regex = /<meta\b[^>]*>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const name = getAttribute(tag, "name").toLowerCase();

    if (name === "robots" || name === "googlebot" || name === "bingbot") {
      metas.push({
        name,
        content: decodeHtml(getAttribute(tag, "content")).trim(),
        index,
      });
    }

    index += 1;
  }

  return metas;
}

function normalizeDirective(value: string) {
  return value.trim().toLowerCase();
}

function getAllDirectiveText(metas: RobotsMeta[], xRobotsTag: string) {
  return [
    ...metas.map((meta) => meta.content),
    xRobotsTag,
  ]
    .join(", ")
    .toLowerCase();
}

function hasDirective(allText: string, directive: string) {
  if (directive.startsWith("max-") || directive === "unavailable_after") {
    return allText.includes(directive);
  }

  return allText
    .split(",")
    .map(normalizeDirective)
    .some((item) => item === directive);
}

function analyzeIndexability(metas: RobotsMeta[], xRobotsTag: string) {
  const allText = getAllDirectiveText(metas, xRobotsTag);
  const warnings: string[] = [];

  const noindex = hasDirective(allText, "noindex");
  const nofollow = hasDirective(allText, "nofollow");
  const noarchive = hasDirective(allText, "noarchive");
  const nosnippet = hasDirective(allText, "nosnippet");
  const noimageindex = hasDirective(allText, "noimageindex");

  if (noindex) {
    warnings.push("This page has noindex. Search engines may not index it.");
  }

  if (nofollow) {
    warnings.push("This page has nofollow. Search engines may not follow links on it.");
  }

  if (noarchive) {
    warnings.push("This page has noarchive. Search engines may not show cached copies.");
  }

  if (nosnippet) {
    warnings.push("This page has nosnippet. Search engines may not show a text snippet.");
  }

  if (noimageindex) {
    warnings.push("This page has noimageindex. Images may not be indexed.");
  }

  if (metas.length > 1) {
    warnings.push(`Multiple robots meta tags found (${metas.length}). Review directives carefully.`);
  }

  return {
    warnings,
    noindex,
    nofollow,
    noarchive,
    nosnippet,
    noimageindex,
    indexable: !noindex,
    followable: !nofollow,
  };
}

export default function NoindexNofollowCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com");
  const [sourceUrl, setSourceUrl] = useState("https://toolmint.com");
  const [html, setHtml] = useState(sampleHtml);
  const [xRobotsTag, setXRobotsTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const metas = useMemo(() => extractRobotsMeta(html), [html]);
  const analysis = useMemo(
    () => analyzeIndexability(metas, xRobotsTag),
    [metas, xRobotsTag]
  );

  const foundDirectives = useMemo(() => {
    const allText = getAllDirectiveText(metas, xRobotsTag);

    return directives.filter((directive) => hasDirective(allText, directive));
  }, [metas, xRobotsTag]);

  const score =
    analysis.noindex || analysis.nofollow
      ? 45
      : analysis.warnings.length > 0
        ? 75
        : 100;

  const report = `Noindex Nofollow Checker Report

Source: ${mode === "url" ? sourceUrl || url : "Manual HTML"}
Indexable: ${analysis.indexable ? "Yes" : "No"}
Followable: ${analysis.followable ? "Yes" : "No"}
SEO Score: ${score}%

X-Robots-Tag:
${xRobotsTag || "(not found)"}

Robots meta tags:
${
  metas.length > 0
    ? metas.map((meta, index) => `${index + 1}. ${meta.name}: ${meta.content}`).join("\n")
    : "(not found)"
}

Found directives:
${foundDirectives.length > 0 ? foundDirectives.join(", ") : "(none)"}

Warnings:
${
  analysis.warnings.length > 0
    ? analysis.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- No major indexability issues found."
}`;

  const fetchHtml = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/indexability-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch indexability data.");
        return;
      }

      setHtml(data.html || "");
      setSourceUrl(data.sourceUrl || url.trim());
      setXRobotsTag(data.xRobotsTag || "");
      setMode("url");
      alert("Indexability data fetched!");
    } catch {
      setError("Something went wrong while fetching this URL.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Indexability report copied!");
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
          title="🚦 Noindex Nofollow Checker"
          description="Check robots meta tags and X-Robots-Tag headers for noindex, nofollow, noarchive, nosnippet and indexability issues."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Indexability
                </h2>
                <p className="text-slate-300">
                  Fetch a page URL or paste HTML manually to inspect robots meta
                  directives.
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
                    {loading ? "⏳ Fetching" : "🚀 Fetch Directives"}
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
                  className="min-h-[300px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                  placeholder='<meta name="robots" content="index, follow" />'
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
                  📊 Indexability Summary
                </h2>
                <p className="text-slate-300">
                  Review whether the page can be indexed and followed.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div
                  className={`rounded-xl border p-4 ${
                    analysis.indexable
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p className="text-sm text-slate-300">Indexable</p>
                  <p
                    className={`mt-1 text-3xl font-bold ${
                      analysis.indexable ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {analysis.indexable ? "Yes" : "No"}
                  </p>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    analysis.followable
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p className="text-sm text-slate-300">Followable</p>
                  <p
                    className={`mt-1 text-3xl font-bold ${
                      analysis.followable ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {analysis.followable ? "Yes" : "No"}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Robots Tags</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {metas.length}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">SEO Score</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {score}%
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  analysis.warnings.length > 0
                    ? "border-yellow-500/30 bg-yellow-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <h3
                  className={`mb-3 text-xl font-bold ${
                    analysis.warnings.length > 0
                      ? "text-yellow-300"
                      : "text-emerald-300"
                  }`}
                >
                  {analysis.warnings.length > 0
                    ? "⚠️ Indexability Warnings"
                    : "✅ Looks Good"}
                </h3>

                {analysis.warnings.length > 0 ? (
                  <ul className="space-y-2 text-slate-200">
                    {analysis.warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-200">
                    No major noindex or nofollow issues found.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">
                  🧭 Found Directives
                </h3>

                {foundDirectives.length === 0 ? (
                  <p className="text-slate-400">No robots directives found.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {foundDirectives.map((directive) => (
                      <span
                        key={directive}
                        className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300"
                      >
                        {directive}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="mb-4 text-xl font-bold text-white">
              🤖 Robots Meta Tags
            </h2>

            {metas.length === 0 ? (
              <p className="text-slate-400">No robots meta tags found.</p>
            ) : (
              <div className="space-y-3">
                {metas.map((meta, index) => (
                  <div
                    key={`${meta.index}-${meta.name}-${meta.content}`}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                  >
                    <p className="mb-1 text-sm text-slate-400">
                      Meta #{index + 1}
                    </p>
                    <p className="font-bold text-slate-100">{meta.name}</p>
                    <p className="break-words text-slate-300">
                      {meta.content || "(empty content)"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ToolCard>

          <ToolCard>
            <h2 className="mb-4 text-xl font-bold text-white">
              🧾 X-Robots-Tag Header
            </h2>
            <p className="break-words text-slate-300">
              {xRobotsTag || "No X-Robots-Tag header found or entered."}
            </p>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Use this checker before launch to make sure important pages are
              not accidentally blocked from indexing.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Important public pages should usually be indexable and followable,
              while private, duplicate or staging pages may use noindex.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Robots directives are powerful. A single noindex tag can remove a
              page from search results.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}