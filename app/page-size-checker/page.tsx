"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type PageSizeResult = {
  sourceUrl: string;
  finalUrl: string;
  status: number;
  responseTime: number;
  contentType: string;
  contentEncoding: string;
  cacheControl: string;
  server: string;
  htmlBytes: number;
  transferSize: number;
  headerSize: number;
  totalEstimatedBytes: number;
  counts: {
    images: number;
    scripts: number;
    externalScripts: number;
    inlineScripts: number;
    stylesheets: number;
    inlineStyles: number;
    links: number;
    forms: number;
    iframes: number;
    videos: number;
    domElements: number;
  };
};

function formatBytes(bytes: number) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getRiskStatus(result: PageSizeResult | null) {
  if (!result) {
    return {
      label: "Not checked",
      score: 0,
      color: "text-slate-300",
      bg: "border-slate-700 bg-slate-900",
    };
  }

  let risk = 0;

  if (result.htmlBytes > 200 * 1024) risk += 20;
  if (result.htmlBytes > 500 * 1024) risk += 20;
  if (result.counts.scripts > 20) risk += 15;
  if (result.counts.stylesheets > 8) risk += 10;
  if (result.counts.images > 40) risk += 15;
  if (result.counts.iframes > 0) risk += 10;
  if (result.counts.domElements > 1500) risk += 15;
  if (result.responseTime > 1500) risk += 15;
  if (!result.contentEncoding) risk += 10;
  if (!result.cacheControl) risk += 5;

  const score = Math.max(0, 100 - risk);

  if (score >= 80) {
    return {
      label: "Low Risk",
      score,
      color: "text-emerald-300",
      bg: "border-emerald-500/30 bg-emerald-500/10",
    };
  }

  if (score >= 55) {
    return {
      label: "Medium Risk",
      score,
      color: "text-yellow-300",
      bg: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  return {
    label: "High Risk",
    score,
    color: "text-red-300",
    bg: "border-red-500/30 bg-red-500/10",
  };
}

function buildRecommendations(result: PageSizeResult | null) {
  if (!result) {
    return ["Enter a URL and run analysis to see recommendations."];
  }

  const tips: string[] = [];

  if (result.htmlBytes > 200 * 1024) {
    tips.push("HTML size is large. Remove unused markup, reduce server-rendered payload and simplify repeated sections.");
  }

  if (result.counts.scripts > 20) {
    tips.push("Script count is high. Remove unused JavaScript, split bundles and delay non-critical scripts.");
  }

  if (result.counts.stylesheets > 8) {
    tips.push("Stylesheet count is high. Combine or remove unused CSS where possible.");
  }

  if (result.counts.images > 40) {
    tips.push("Image count is high. Compress images, lazy-load below-the-fold images and use modern formats.");
  }

  if (result.counts.iframes > 0) {
    tips.push("Iframe usage can slow pages. Lazy-load embeds and avoid unnecessary third-party widgets.");
  }

  if (result.counts.domElements > 1500) {
    tips.push("DOM size is large. Reduce nested layouts, repeated cards and hidden duplicated content.");
  }

  if (result.responseTime > 1500) {
    tips.push("Server response time looks slow. Check hosting, caching, database calls and backend work.");
  }

  if (!result.contentEncoding) {
    tips.push("Compression header was not detected. Enable gzip or Brotli compression on the server.");
  }

  if (!result.cacheControl) {
    tips.push("Cache-Control header was not detected. Add caching rules for static and HTML responses.");
  }

  if (tips.length === 0) {
    tips.push("No major page size risks found from the fetched HTML and headers.");
  }

  return tips;
}

export default function PageSizeCheckerPage() {
  const [url, setUrl] = useState("https://toolmint.com");
  const [result, setResult] = useState<PageSizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const risk = useMemo(() => getRiskStatus(result), [result]);
  const recommendations = useMemo(() => buildRecommendations(result), [result]);

  const report = `Page Size Checker Report

URL: ${result?.sourceUrl || url}
Final URL: ${result?.finalUrl || "(not checked)"}
Status: ${result?.status || "(not checked)"}
Risk: ${risk.label}
Optimization Score: ${risk.score}%

HTML Size: ${result ? formatBytes(result.htmlBytes) : "0 B"}
Transfer Size: ${result ? formatBytes(result.transferSize) : "0 B"}
Header Size: ${result ? formatBytes(result.headerSize) : "0 B"}
Estimated Total: ${result ? formatBytes(result.totalEstimatedBytes) : "0 B"}
Response Time: ${result?.responseTime || 0} ms
Compression: ${result?.contentEncoding || "(not detected)"}
Cache-Control: ${result?.cacheControl || "(not detected)"}

Resources:
Images: ${result?.counts.images || 0}
Scripts: ${result?.counts.scripts || 0}
External Scripts: ${result?.counts.externalScripts || 0}
Inline Scripts: ${result?.counts.inlineScripts || 0}
Stylesheets: ${result?.counts.stylesheets || 0}
Inline Styles: ${result?.counts.inlineStyles || 0}
Links: ${result?.counts.links || 0}
Forms: ${result?.counts.forms || 0}
Iframes: ${result?.counts.iframes || 0}
Videos: ${result?.counts.videos || 0}
DOM Elements: ${result?.counts.domElements || 0}

Recommendations:
${recommendations.map((tip) => `- ${tip}`).join("\n")}`;

  const analyzePage = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `/api/page-size-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to analyze this page.");
        return;
      }

      setResult(data as PageSizeResult);
      alert("Page size analysis completed!");
    } catch {
      setError("Something went wrong while analyzing this URL.");
    } finally {
      setLoading(false);
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Page size report copied!");
  };

  const loadSample = () => {
    setUrl("https://toolmint.com");
    setResult(null);
    setError("");
  };

  const resetTool = () => {
    setUrl("");
    setResult(null);
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="📦 Page Size Checker"
          description="Analyze real page HTML size, transfer size, response time, resource counts, compression headers and performance risk."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Analyze Page Size
                </h2>
                <p className="text-slate-300">
                  Enter a public URL to fetch real HTML, headers and resource
                  counts for a practical performance check.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Page URL
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={analyzePage}>
                  {loading ? "⏳ Analyzing" : "🚀 Analyze"}
                </Button>
                <Button onClick={copyReport}>📋 Copy Report</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
              </div>

              <Button onClick={resetTool} variant="secondary">
                🔄 Reset
              </Button>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                  ⚠️ {error}
                </div>
              )}

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 What This Checks
                </h3>
                <p className="text-slate-300">
                  This tool checks fetched HTML, headers and resource references.
                  It does not run Lighthouse or measure real browser Core Web
                  Vitals.
                </p>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 Page Size Summary
                </h2>
                <p className="text-slate-300">
                  Review page weight, response time and optimization risk.
                </p>
              </div>

              <div className={`rounded-2xl border p-6 ${risk.bg}`}>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-300">
                  Optimization Score
                </p>
                <p className={`mt-2 text-6xl font-black ${risk.color}`}>
                  {risk.score}%
                </p>
                <p className={`mt-2 text-xl font-bold ${risk.color}`}>
                  {risk.label}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">HTML Size</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {result ? formatBytes(result.htmlBytes) : "0 B"}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Transfer Size</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {result ? formatBytes(result.transferSize) : "0 B"}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Response Time</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {result ? `${result.responseTime} ms` : "0 ms"}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">DOM Elements</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {result?.counts.domElements || 0}
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["🖼️ Images", result?.counts.images || 0],
            ["📜 Scripts", result?.counts.scripts || 0],
            ["🔌 External Scripts", result?.counts.externalScripts || 0],
            ["🎨 Stylesheets", result?.counts.stylesheets || 0],
            ["🧩 Inline Styles", result?.counts.inlineStyles || 0],
            ["🔗 Links", result?.counts.links || 0],
            ["📝 Forms", result?.counts.forms || 0],
            ["🪟 Iframes", result?.counts.iframes || 0],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <p className="text-sm text-slate-300">{label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="mb-4 text-xl font-bold text-white">
              🧾 Response Details
            </h2>

            <div className="space-y-3 text-slate-300">
              <p className="break-words">
                <span className="font-bold text-slate-100">Final URL:</span>{" "}
                {result?.finalUrl || "Not checked"}
              </p>
              <p>
                <span className="font-bold text-slate-100">Status:</span>{" "}
                {result?.status || "Not checked"}
              </p>
              <p>
                <span className="font-bold text-slate-100">Content Type:</span>{" "}
                {result?.contentType || "Not checked"}
              </p>
              <p>
                <span className="font-bold text-slate-100">Compression:</span>{" "}
                {result?.contentEncoding || "Not detected"}
              </p>
              <p className="break-words">
                <span className="font-bold text-slate-100">Cache-Control:</span>{" "}
                {result?.cacheControl || "Not detected"}
              </p>
              <p>
                <span className="font-bold text-slate-100">Server:</span>{" "}
                {result?.server || "Not detected"}
              </p>
            </div>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-4 text-xl font-bold text-white">
              ✅ Recommendations
            </h2>

            <ul className="space-y-3 text-slate-300">
              {recommendations.map((tip) => (
                <li key={tip} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  {tip}
                </li>
              ))}
            </ul>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Page size affects user experience and SEO. Heavy HTML, too many
              scripts and slow responses can make pages feel slower.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Keep HTML lean, compress responses, cache static assets, reduce
              scripts and lazy-load images or embeds when possible.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This is not a Lighthouse score. It analyzes real fetched HTML,
              headers and resource references for practical page size risks.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}