"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ImageItem = {
  src: string;
  alt: string;
  hasAltAttribute: boolean;
  index: number;
};

const sampleHtml = `<main>
  <h1>ToolMint Image Tools</h1>
  <img src="/images/image-compressor.png" alt="ToolMint image compressor tool interface" />
  <img src="/images/pdf-tools.png" alt="PDF tools" />
  <img src="/images/developer-tools.png" />
  <img src="/images/seo-tools.png" alt="" />
  <img src="/images/image-compressor-copy.png" alt="ToolMint image compressor tool interface" />
</main>`;

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

function extractImages(html: string): ImageItem[] {
  const images: ImageItem[] = [];
  const regex = /<img\b[^>]*>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const src = decodeHtml(getAttribute(tag, "src"));
    const hasAltAttribute = /\salt\s*=/i.test(tag);
    const alt = decodeHtml(getAttribute(tag, "alt")).trim();

    images.push({
      src,
      alt,
      hasAltAttribute,
      index,
    });

    index += 1;
  }

  return images;
}

function analyzeWarnings(images: ImageItem[]) {
  const warnings: string[] = [];
  const missingAlt = images.filter((image) => !image.hasAltAttribute);
  const emptyAlt = images.filter(
    (image) => image.hasAltAttribute && image.alt.length === 0
  );
  const longAlt = images.filter((image) => image.alt.length > 125);

  const altCounts = new Map<string, number>();

  images
    .map((image) => image.alt.toLowerCase())
    .filter(Boolean)
    .forEach((alt) => altCounts.set(alt, (altCounts.get(alt) || 0) + 1));

  const duplicateAltCount = Array.from(altCounts.values()).filter(
    (count) => count > 1
  ).length;

  if (images.length === 0) {
    warnings.push("No image tags found on this page.");
  }

  if (missingAlt.length > 0) {
    warnings.push(`${missingAlt.length} image tag is missing the alt attribute.`);
  }

  if (emptyAlt.length > 0) {
    warnings.push(`${emptyAlt.length} image has empty alt text.`);
  }

  if (longAlt.length > 0) {
    warnings.push(`${longAlt.length} image has alt text longer than 125 characters.`);
  }

  if (duplicateAltCount > 0) {
    warnings.push(`${duplicateAltCount} duplicate alt text value found.`);
  }

  return {
    warnings,
    missingAltCount: missingAlt.length,
    emptyAltCount: emptyAlt.length,
    longAltCount: longAlt.length,
    duplicateAltCount,
  };
}

function getAltStatus(image: ImageItem, duplicateAlts: Set<string>) {
  if (!image.hasAltAttribute) {
    return {
      label: "Missing Alt",
      color: "text-red-300",
      bg: "border-red-500/30 bg-red-500/10",
    };
  }

  if (!image.alt) {
    return {
      label: "Empty Alt",
      color: "text-yellow-300",
      bg: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  if (image.alt.length > 125) {
    return {
      label: "Too Long",
      color: "text-orange-300",
      bg: "border-orange-500/30 bg-orange-500/10",
    };
  }

  if (duplicateAlts.has(image.alt.toLowerCase())) {
    return {
      label: "Duplicate",
      color: "text-purple-300",
      bg: "border-purple-500/30 bg-purple-500/10",
    };
  }

  return {
    label: "Good",
    color: "text-emerald-300",
    bg: "border-emerald-500/30 bg-emerald-500/10",
  };
}

function shorten(value: string, length = 80) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}...`;
}

export default function AltTextCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com");
  const [html, setHtml] = useState(sampleHtml);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const images = useMemo(() => extractImages(html), [html]);

  const duplicateAlts = useMemo(() => {
    const counts = new Map<string, number>();

    images
      .map((image) => image.alt.toLowerCase())
      .filter(Boolean)
      .forEach((alt) => counts.set(alt, (counts.get(alt) || 0) + 1));

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([alt]) => alt)
    );
  }, [images]);

  const analysis = useMemo(() => analyzeWarnings(images), [images]);

  const goodAltCount = images.filter(
    (image) => getAltStatus(image, duplicateAlts).label === "Good"
  ).length;

  const score =
    images.length > 0 ? Math.round((goodAltCount / images.length) * 100) : 0;

  const report = `Alt Text Checker Report

Source: ${mode === "url" ? url : "Manual HTML"}
Total images: ${images.length}
Good alt text: ${goodAltCount}
Score: ${score}%

Warnings:
${
  analysis.warnings.length > 0
    ? analysis.warnings.map((warning) => `- ${warning}`).join("\n")
    : "- No major alt text issues found."
}

Images:
${images
  .map((image) => {
    const status = getAltStatus(image, duplicateAlts);
    return `${image.index + 1}. ${status.label}
   Src: ${image.src || "(missing src)"}
   Alt: ${image.alt || "(empty or missing)"}`;
  })
  .join("\n\n")}`;

  const fetchHtml = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/alt-text-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch images.");
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
    alert("Alt text report copied!");
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
          title="🖼️ Alt Text Checker"
          description="Check image alt text for SEO and accessibility issues including missing, empty, duplicate and long alt attributes."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Image Alt Text
                </h2>
                <p className="text-slate-300">
                  Fetch images from a URL or paste HTML manually to inspect alt
                  attributes.
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
                    {loading ? "⏳ Fetching" : "🚀 Fetch Images"}
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
                  placeholder='<img src="/image.png" alt="Helpful description" />'
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
                  📊 Alt Text Summary
                </h2>
                <p className="text-slate-300">
                  Review image alt quality, missing values and duplicate text.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Images</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {images.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Score</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {score}%
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-slate-300">Missing Alt</p>
                  <p className="mt-1 text-3xl font-bold text-red-300">
                    {analysis.missingAltCount}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Empty Alt</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {analysis.emptyAltCount}
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
                    ? "⚠️ Alt Text Warnings"
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
                    No major alt text issues found.
                  </p>
                )}
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">🧾 Image Alt Results</h2>

          {images.length === 0 ? (
            <ToolCard>
              <p className="text-slate-400">No image tags found yet.</p>
            </ToolCard>
          ) : (
            images.map((image) => {
              const status = getAltStatus(image, duplicateAlts);

              return (
                <div
                  key={`${image.index}-${image.src}-${image.alt}`}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-lg border px-3 py-1 text-sm font-bold ${status.bg} ${status.color}`}
                        >
                          {status.label}
                        </span>
                        <span className="text-sm text-slate-400">
                          Image #{image.index + 1}
                        </span>
                      </div>

                      <p className="mb-2 break-words text-slate-300">
                        <span className="font-bold text-slate-100">Src:</span>{" "}
                        {image.src || "(missing src)"}
                      </p>

                      <p className="break-words text-slate-300">
                        <span className="font-bold text-slate-100">Alt:</span>{" "}
                        {image.alt ? shorten(image.alt, 180) : "(empty or missing)"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Helpful alt text gives search engines more context about images
              and can improve image search visibility.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ♿ Accessibility
            </h2>
            <p className="text-slate-300">
              Screen readers use alt text to explain images to users who cannot
              see them, so meaningful images should have clear descriptions.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Decorative images can use empty alt text, but important content
              images should describe the image purpose clearly.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}