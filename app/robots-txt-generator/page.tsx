"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RobotsMode = "allow-all" | "block-all" | "custom";

function cleanLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePath(path: string) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

export default function RobotsTxtGeneratorPage() {
  const [mode, setMode] = useState<RobotsMode>("custom");
  const [userAgent, setUserAgent] = useState("*");
  const [allowPaths, setAllowPaths] = useState("/\n/tools");
  const [disallowPaths, setDisallowPaths] = useState("/admin\n/api/private");
  const [sitemapUrl, setSitemapUrl] = useState("https://toolmint.com/sitemap.xml");
  const [crawlDelay, setCrawlDelay] = useState("");
  const [hostUrl, setHostUrl] = useState("");

  const robotsText = useMemo(() => {
    const lines: string[] = [];

    lines.push(`User-agent: ${userAgent.trim() || "*"}`);

    if (mode === "allow-all") {
      lines.push("Allow: /");
    }

    if (mode === "block-all") {
      lines.push("Disallow: /");
    }

    if (mode === "custom") {
      const allows = cleanLines(allowPaths);
      const disallows = cleanLines(disallowPaths);

      if (!allows.length && !disallows.length) {
        lines.push("Allow: /");
      }

      allows.forEach((path) => {
        lines.push(`Allow: ${normalizePath(path)}`);
      });

      disallows.forEach((path) => {
        lines.push(`Disallow: ${normalizePath(path)}`);
      });
    }

    if (crawlDelay.trim()) {
      lines.push(`Crawl-delay: ${crawlDelay.trim()}`);
    }

    if (hostUrl.trim()) {
      lines.push(`Host: ${hostUrl.trim()}`);
    }

    if (sitemapUrl.trim()) {
      lines.push("");
      lines.push(`Sitemap: ${sitemapUrl.trim()}`);
    }

    return lines.join("\n");
  }, [
    mode,
    userAgent,
    allowPaths,
    disallowPaths,
    sitemapUrl,
    crawlDelay,
    hostUrl,
  ]);

  const lineCount = robotsText.split("\n").length;
  const isBlockingAll = mode === "block-all";

  async function copyRobots() {
    try {
      await navigator.clipboard.writeText(robotsText);
      alert("robots.txt copied successfully!");
    } catch {
      alert("Unable to copy robots.txt. Please try again.");
    }
  }

  function downloadRobots() {
    const blob = new Blob([robotsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "robots.txt";
    link.click();

    URL.revokeObjectURL(url);
  }

  function loadSample() {
    setMode("custom");
    setUserAgent("*");
    setAllowPaths("/\n/tools");
    setDisallowPaths("/admin\n/api/private\n/account");
    setSitemapUrl("https://toolmint.com/sitemap.xml");
    setCrawlDelay("");
    setHostUrl("");
  }

  function resetTool() {
    setMode("custom");
    setUserAgent("*");
    setAllowPaths("");
    setDisallowPaths("");
    setSitemapUrl("");
    setCrawlDelay("");
    setHostUrl("");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🤖 Robots.txt Generator"
          description="Create robots.txt files online with allow, disallow, sitemap, crawl delay and custom search engine crawler rules."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      ⚙️ Robots Rules
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Configure crawler access and generate a clean robots.txt
                      file.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    SEO file
                  </span>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">Mode</span>
                    <select
                      value={mode}
                      onChange={(event) => setMode(event.target.value as RobotsMode)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="custom">Custom rules</option>
                      <option value="allow-all">Allow all crawlers</option>
                      <option value="block-all">Block all crawlers</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      User-agent
                    </span>
                    <input
                      type="text"
                      value={userAgent}
                      onChange={(event) => setUserAgent(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                      placeholder="*"
                    />
                  </label>

                  {mode === "custom" ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-slate-300">
                          Allow paths
                        </span>
                        <textarea
                          value={allowPaths}
                          onChange={(event) => setAllowPaths(event.target.value)}
                          className="min-h-[150px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                          placeholder="/&#10;/tools"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-slate-300">
                          Disallow paths
                        </span>
                        <textarea
                          value={disallowPaths}
                          onChange={(event) =>
                            setDisallowPaths(event.target.value)
                          }
                          className="min-h-[150px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                          placeholder="/admin&#10;/private"
                        />
                      </label>
                    </div>
                  ) : null}

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Sitemap URL
                    </span>
                    <input
                      type="url"
                      value={sitemapUrl}
                      onChange={(event) => setSitemapUrl(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      placeholder="https://example.com/sitemap.xml"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Crawl delay
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={crawlDelay}
                        onChange={(event) => setCrawlDelay(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Host URL
                      </span>
                      <input
                        type="url"
                        value={hostUrl}
                        onChange={(event) => setHostUrl(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                        placeholder="Optional"
                      />
                    </label>
                  </div>

                  {isBlockingAll ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                      ⚠️ Block all mode can prevent search engines from crawling
                      your website. Use it carefully.
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={copyRobots}>📋 Copy robots.txt</Button>

                    <button
                      type="button"
                      onClick={downloadRobots}
                      className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download File
                    </button>

                    <button
                      type="button"
                      onClick={loadSample}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🧪 Sample
                    </button>

                    <button
                      type="button"
                      onClick={resetTool}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Generated robots.txt
                </h2>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {lineCount}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">Lines</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {mode === "custom" ? "Custom" : mode === "allow-all" ? "Allow" : "Block"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">Mode</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {sitemapUrl.trim() ? "Yes" : "No"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">Sitemap</div>
                  </div>
                </div>

                <textarea
                  value={robotsText}
                  readOnly
                  className="min-h-[430px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-blue-200 outline-none"
                />

                <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                  Place this file at your website root, for example:
                  https://example.com/robots.txt
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is robots.txt?
                </h2>
                <p className="text-slate-300">
                  robots.txt is a file that gives crawling instructions to search
                  engine bots. It can allow or disallow crawler access to paths
                  and can point bots to your sitemap.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 SEO Tips
                </h2>
                <p className="text-slate-300">
                  Do not block important pages that should rank in search. Add
                  your sitemap URL and test robots.txt changes carefully before
                  publishing them.
                </p>
              </div>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}