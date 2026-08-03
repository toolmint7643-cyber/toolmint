"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type HeadingItem = {
  level: number;
  text: string;
  index: number;
};

const sampleHtml = `<main>
  <h1>Free Online Developer Tools</h1>
  <p>ToolMint provides useful tools for developers and creators.</p>

  <h2>Developer Tools</h2>
  <h3>JSON Formatter</h3>
  <h3>URL Encoder Decoder</h3>

  <h2>SEO Tools</h2>
  <h3>Meta Tag Generator</h3>
  <h4>Open Graph Tags</h4>

  <h2>Image and PDF Tools</h2>
</main>`;

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

  if (!textarea) {
    return value;
  }

  textarea.innerHTML = value;
  return textarea.value;
}

function extractHeadings(html: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const regex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const level = Number(match[1]);
    const rawText = match[2] || "";
    const text = decodeHtml(stripTags(rawText));

    headings.push({
      level,
      text,
      index,
    });

    index += 1;
  }

  return headings;
}

function analyzeWarnings(headings: HeadingItem[]) {
  const warnings: string[] = [];
  const h1Count = headings.filter((heading) => heading.level === 1).length;
  const emptyHeadings = headings.filter((heading) => !heading.text);

  if (headings.length === 0) {
    warnings.push("No heading tags found on this page.");
  }

  if (h1Count === 0) {
    warnings.push("No H1 found. Most pages should have one clear H1.");
  }

  if (h1Count > 1) {
    warnings.push(`Multiple H1 tags found (${h1Count}). Usually one main H1 is recommended.`);
  }

  if (emptyHeadings.length > 0) {
    warnings.push(`${emptyHeadings.length} empty heading tag found.`);
  }

  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1];
    const current = headings[index];

    if (current.level - previous.level > 1) {
      warnings.push(
        `Heading order jumps from H${previous.level} to H${current.level} near "${current.text || "empty heading"}".`
      );
    }
  }

  return warnings;
}

function getLevelColor(level: number) {
  const colors: Record<number, string> = {
    1: "border-blue-500/40 bg-blue-500/10 text-blue-300",
    2: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    3: "border-purple-500/40 bg-purple-500/10 text-purple-300",
    4: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    5: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    6: "border-red-500/40 bg-red-500/10 text-red-300",
  };

  return colors[level] || colors[6];
}

export default function HeadingTagCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com");
  const [html, setHtml] = useState(sampleHtml);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const headings = useMemo(() => extractHeadings(html), [html]);
  const warnings = useMemo(() => analyzeWarnings(headings), [headings]);

  const headingCounts = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map((level) => ({
      level,
      count: headings.filter((heading) => heading.level === level).length,
    }));
  }, [headings]);

  const report = `Heading Tag Checker Report

Source: ${mode === "url" ? url : "Manual HTML"}
Total headings: ${headings.length}
Warnings:
${warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join("\n") : "- No major heading issues found."}

Heading counts:
${headingCounts.map((item) => `H${item.level}: ${item.count}`).join("\n")}

Heading structure:
${headings
  .map((heading) => `${"  ".repeat(heading.level - 1)}H${heading.level}: ${heading.text || "(empty)"}`)
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
        `/api/heading-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch headings.");
        return;
      }

      setHtml(data.html || "");
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
    alert("Heading report copied!");
  };

  const loadSample = () => {
    setMode("html");
    setUrl("https://toolmint.com");
    setHtml(sampleHtml);
    setError("");
  };

  const resetTool = () => {
    setMode("html");
    setUrl("");
    setHtml("");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🏷️ Heading Tag Checker"
          description="Check H1 to H6 heading structure, heading order, empty headings and SEO heading issues from a URL or HTML."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Page Headings
                </h2>
                <p className="text-slate-300">
                  Fetch headings from a URL or paste HTML manually to analyze
                  page structure.
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
                    {loading ? "⏳ Fetching" : "🚀 Fetch Headings"}
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
                  placeholder="<h1>Your page title</h1>"
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
                  📊 Heading Summary
                </h2>
                <p className="text-slate-300">
                  Review heading count, H1 usage and heading hierarchy.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {headingCounts.map((item) => (
                  <div
                    key={item.level}
                    className={`rounded-xl border p-4 ${getLevelColor(item.level)}`}
                  >
                    <p className="text-sm text-slate-300">Heading</p>
                    <p className="mt-1 text-3xl font-bold">
                      H{item.level}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {item.count} found
                    </p>
                  </div>
                ))}
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
                    warnings.length > 0 ? "text-yellow-300" : "text-emerald-300"
                  }`}
                >
                  {warnings.length > 0 ? "⚠️ SEO Warnings" : "✅ Looks Good"}
                </h3>

                {warnings.length > 0 ? (
                  <ul className="space-y-2 text-slate-200">
                    {warnings.map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-200">
                    No major heading structure issues found.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-4 text-xl font-bold text-white">
                  🧱 Heading Structure
                </h3>

                {headings.length === 0 ? (
                  <p className="text-slate-400">No headings found yet.</p>
                ) : (
                  <div className="space-y-3">
                    {headings.map((heading) => (
                      <div
                        key={`${heading.level}-${heading.index}-${heading.text}`}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-3"
                        style={{ marginLeft: `${(heading.level - 1) * 18}px` }}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-lg border px-3 py-1 text-sm font-bold ${getLevelColor(heading.level)}`}
                          >
                            H{heading.level}
                          </span>
                          <span className="break-words text-slate-100">
                            {heading.text || "(empty heading)"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Heading tags help search engines and readers understand your page
              structure, topic flow and content hierarchy.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Use one clear H1, organize sections with H2, and use H3-H6 only
              when they support the page hierarchy naturally.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Some websites block server requests. If URL fetch fails, paste the
              page HTML manually and run the checker.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}