"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleTitle = "ToolMint - Free Online Developer, SEO and Productivity Tools";
const sampleUrl = "https://toolmint.com/free-online-tools";
const sampleDescription =
  "Use free online developer, SEO, text, image, PDF and calculator tools. Fast, mobile-friendly and easy to use.";

function getStatus(length: number, goodMin: number, goodMax: number) {
  if (length < goodMin) {
    return {
      label: "Short",
      color: "text-yellow-300",
      bg: "bg-yellow-500/10 border-yellow-500/30",
    };
  }

  if (length > goodMax) {
    return {
      label: "Too Long",
      color: "text-red-300",
      bg: "bg-red-500/10 border-red-500/30",
    };
  }

  return {
    label: "Good",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  };
}

function cleanDisplayUrl(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export default function GoogleSerpPreviewGeneratorPage() {
  const [title, setTitle] = useState(sampleTitle);
  const [url, setUrl] = useState(sampleUrl);
  const [description, setDescription] = useState(sampleDescription);

  const titleStatus = useMemo(() => getStatus(title.length, 35, 60), [title]);
  const descriptionStatus = useMemo(
    () => getStatus(description.length, 120, 160),
    [description]
  );

  const desktopTitle = truncateText(title || "SEO title will appear here", 68);
  const desktopDescription = truncateText(
    description || "Meta description will appear here.",
    165
  );

  const mobileTitle = truncateText(title || "SEO title will appear here", 58);
  const mobileDescription = truncateText(
    description || "Meta description will appear here.",
    120
  );

  const displayUrl = cleanDisplayUrl(url || "https://example.com/page");

  const fullSnippet = `Title: ${title}
URL: ${url}
Meta Description: ${description}`;

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    alert(message);
  };

  const loadSample = () => {
    setTitle(sampleTitle);
    setUrl(sampleUrl);
    setDescription(sampleDescription);
  };

  const resetTool = () => {
    setTitle("");
    setUrl("");
    setDescription("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔍 Google SERP Preview Generator"
          description="Preview how your SEO title, URL and meta description may appear in Google search results on desktop and mobile."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ✍️ Search Snippet Details
                </h2>
                <p className="text-slate-300">
                  Write your SEO title and meta description, then check length
                  and preview before publishing.
                </p>
              </div>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-200">
                    SEO Title
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${titleStatus.bg} ${titleStatus.color}`}
                  >
                    {title.length} chars - {titleStatus.label}
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Enter SEO title"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Best range: 35-60 characters.
                </p>
              </label>

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

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-200">
                    Meta Description
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${descriptionStatus.bg} ${descriptionStatus.color}`}
                  >
                    {description.length} chars - {descriptionStatus.label}
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[160px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Enter meta description"
                />
                <p className="mt-2 text-sm text-slate-400">
                  Best range: 120-160 characters.
                </p>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => copyText(title, "SEO title copied!")}>
                  📋 Copy Title
                </Button>
                <Button
                  onClick={() =>
                    copyText(description, "Meta description copied!")
                  }
                >
                  📋 Copy Description
                </Button>
                <Button
                  onClick={() => copyText(fullSnippet, "Full snippet copied!")}
                >
                  🧩 Copy Snippet
                </Button>
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
                  👀 Google Preview
                </h2>
                <p className="text-slate-300">
                  This preview helps you optimize search appearance before
                  publishing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-white p-6 text-slate-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">
                    🔎
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {url ? new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "") : "example.com"}
                    </p>
                    <p className="truncate text-sm text-slate-600">
                      {displayUrl}
                    </p>
                  </div>
                </div>

                <h3 className="text-xl leading-snug text-[#1a0dab]">
                  {desktopTitle}
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#4d5156]">
                  {desktopDescription}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-white p-5 text-slate-900 sm:max-w-[430px]">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg">
                    📱
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      Mobile result
                    </p>
                    <p className="truncate text-xs text-slate-600">
                      {displayUrl}
                    </p>
                  </div>
                </div>

                <h3 className="text-lg leading-snug text-[#1a0dab]">
                  {mobileTitle}
                </h3>
                <p className="mt-1 text-sm leading-5 text-[#4d5156]">
                  {mobileDescription}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Title Length</p>
                  <p className={`mt-1 text-3xl font-bold ${titleStatus.color}`}>
                    {title.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">
                    Description Length
                  </p>
                  <p
                    className={`mt-1 text-3xl font-bold ${descriptionStatus.color}`}
                  >
                    {description.length}
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              📈 SEO Usage
            </h2>
            <p className="text-slate-300">
              Use this tool before publishing blog posts, landing pages and
              product pages to improve search result click-through rate.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Put the main keyword near the start of the title and write a clear
              description with a useful benefit or reason to click.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This tool does not fetch live Google rankings. It previews and
              optimizes how your search snippet may appear.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}