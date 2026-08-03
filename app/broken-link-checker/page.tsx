"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type LinkKind = "http" | "internal" | "external" | "hash" | "mailto" | "tel" | "javascript" | "empty" | "other";

type LinkItem = {
  href: string;
  text: string;
  absoluteUrl: string;
  kind: LinkKind;
  index: number;
};

type LinkStatus = {
  url: string;
  status: number;
  statusText: string;
  type: "good" | "broken" | "unknown";
  finalUrl: string;
};

const sampleHtml = `<main>
  <h1>ToolMint SEO Tools</h1>
  <a href="/">Home</a>
  <a href="/json-formatter">JSON Formatter</a>
  <a href="/missing-page">Missing Page</a>
  <a href="https://nextjs.org">Next.js</a>
  <a href="https://example.com/not-found-page">Broken example</a>
  <a href="#features">Features</a>
  <a href="mailto:hello@example.com">Email us</a>
  <a href="tel:+919999999999">Call us</a>
  <a href="javascript:void(0)">Unsafe JS link</a>
  <a href="">Empty link</a>
  <section id="features">Features section</section>
</main>`;

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

  if (!textarea) {
    return value;
  }

  textarea.innerHTML = value;
  return textarea.value;
}

function getBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://example.com";
  }
}

function makeAbsoluteUrl(href: string, sourceUrl: string) {
  if (!href.trim()) {
    return "";
  }

  if (/^(mailto:|tel:|sms:|javascript:|#)/i.test(href)) {
    return href;
  }

  try {
    return new URL(href, sourceUrl || "https://example.com").toString();
  } catch {
    return href;
  }
}

function getLinkKind(href: string, absoluteUrl: string, sourceUrl: string): LinkKind {
  const cleanHref = href.trim();

  if (!cleanHref) return "empty";
  if (cleanHref.startsWith("#")) return "hash";
  if (/^mailto:/i.test(cleanHref)) return "mailto";
  if (/^tel:/i.test(cleanHref)) return "tel";
  if (/^javascript:/i.test(cleanHref)) return "javascript";

  if (/^https?:\/\//i.test(absoluteUrl)) {
    try {
      const source = new URL(sourceUrl || "https://example.com");
      const target = new URL(absoluteUrl);
      return source.hostname === target.hostname ? "internal" : "external";
    } catch {
      return "http";
    }
  }

  return "other";
}

function extractLinks(html: string, sourceUrl: string): LinkItem[] {
  const links: LinkItem[] = [];
  const regex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[0];
    const href = decodeHtml(getAttribute(tag, "href")).trim();
    const text = decodeHtml(stripTags(match[1] || ""));
    const absoluteUrl = makeAbsoluteUrl(href, sourceUrl);
    const kind = getLinkKind(href, absoluteUrl, sourceUrl);

    links.push({
      href,
      text,
      absoluteUrl,
      kind,
      index,
    });

    index += 1;
  }

  return links;
}

function htmlHasAnchor(html: string, hashHref: string) {
  const id = hashHref.replace(/^#/, "").trim();

  if (!id) {
    return false;
  }

  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const idRegex = new RegExp(`\\sid\\s*=\\s*["']${escapedId}["']`, "i");
  const nameRegex = new RegExp(`\\sname\\s*=\\s*["']${escapedId}["']`, "i");

  return idRegex.test(html) || nameRegex.test(html);
}

function validateEmailLink(href: string) {
  const email = href.replace(/^mailto:/i, "").split("?")[0].trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateTelLink(href: string) {
  const phone = href.replace(/^tel:/i, "").replace(/[()\s-]/g, "").trim();
  return /^\+?[0-9]{7,15}$/.test(phone);
}

function getLocalStatus(link: LinkItem, html: string): LinkStatus | null {
  if (link.kind === "hash") {
    const found = htmlHasAnchor(html, link.href);

    return {
      url: link.absoluteUrl,
      status: found ? 200 : 404,
      statusText: found ? "Hash target found" : "Hash target missing",
      type: found ? "good" : "broken",
      finalUrl: link.absoluteUrl,
    };
  }

  if (link.kind === "mailto") {
    const valid = validateEmailLink(link.href);

    return {
      url: link.absoluteUrl,
      status: valid ? 200 : 400,
      statusText: valid ? "Valid email link" : "Invalid email link",
      type: valid ? "good" : "broken",
      finalUrl: link.absoluteUrl,
    };
  }

  if (link.kind === "tel") {
    const valid = validateTelLink(link.href);

    return {
      url: link.absoluteUrl,
      status: valid ? 200 : 400,
      statusText: valid ? "Valid phone link" : "Invalid phone link",
      type: valid ? "good" : "broken",
      finalUrl: link.absoluteUrl,
    };
  }

  if (link.kind === "javascript") {
    return {
      url: link.absoluteUrl,
      status: 400,
      statusText: "Unsafe JavaScript link",
      type: "broken",
      finalUrl: link.absoluteUrl,
    };
  }

  if (link.kind === "empty") {
    return {
      url: link.absoluteUrl || "(empty href)",
      status: 400,
      statusText: "Empty href",
      type: "broken",
      finalUrl: link.absoluteUrl,
    };
  }

  if (link.kind === "other") {
    return {
      url: link.absoluteUrl,
      status: 0,
      statusText: "Unsupported link type",
      type: "unknown",
      finalUrl: link.absoluteUrl,
    };
  }

  return null;
}

function getStatusStyle(type?: LinkStatus["type"]) {
  if (type === "good") {
    return {
      label: "Good",
      color: "text-emerald-300",
      bg: "border-emerald-500/30 bg-emerald-500/10",
    };
  }

  if (type === "broken") {
    return {
      label: "Broken",
      color: "text-red-300",
      bg: "border-red-500/30 bg-red-500/10",
    };
  }

  return {
    label: "Unknown",
    color: "text-yellow-300",
    bg: "border-yellow-500/30 bg-yellow-500/10",
  };
}

function shorten(value: string, length = 110) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length).trim()}...`;
}

export default function BrokenLinkCheckerPage() {
  const [mode, setMode] = useState<"url" | "html">("html");
  const [url, setUrl] = useState("https://toolmint.com");
  const [sourceUrl, setSourceUrl] = useState("https://toolmint.com");
  const [html, setHtml] = useState(sampleHtml);
  const [loadingHtml, setLoadingHtml] = useState(false);
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [error, setError] = useState("");
  const [statuses, setStatuses] = useState<Record<string, LinkStatus>>({});

  const links = useMemo(() => extractLinks(html, sourceUrl), [html, sourceUrl]);

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();

    links.forEach((link) => {
      const key = link.absoluteUrl || link.href || `empty-${link.index}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [links]);

  const summary = useMemo(() => {
    const checkedStatuses = Object.values(statuses);

    return {
      total: links.length,
      checked: checkedStatuses.length,
      internal: links.filter((link) => link.kind === "internal").length,
      external: links.filter((link) => link.kind === "external").length,
      special: links.filter(
        (link) =>
          link.kind === "hash" ||
          link.kind === "mailto" ||
          link.kind === "tel" ||
          link.kind === "javascript" ||
          link.kind === "empty" ||
          link.kind === "other"
      ).length,
      good: checkedStatuses.filter((status) => status.type === "good").length,
      broken: checkedStatuses.filter((status) => status.type === "broken").length,
      unknown: checkedStatuses.filter((status) => status.type === "unknown").length,
    };
  }, [links, statuses]);

  const report = `Broken Link Checker Report

Source: ${mode === "url" ? sourceUrl || url : "Manual HTML"}
Total links: ${summary.total}
Checked links: ${summary.checked}
Internal links: ${summary.internal}
External links: ${summary.external}
Special/local links: ${summary.special}
Duplicate links: ${duplicateCount}

Checked status:
Good: ${summary.good}
Broken: ${summary.broken}
Unknown: ${summary.unknown}

Links:
${links
  .map((link) => {
    const key = link.absoluteUrl || link.href || `empty-${link.index}`;
    const status = statuses[key];

    return `${link.index + 1}. ${link.absoluteUrl || link.href || "(empty)"}
   Text: ${link.text || "(no text)"}
   Type: ${link.kind}
   Status: ${status ? `${status.status || "Unknown"} ${status.statusText}` : "Not checked yet"}`;
  })
  .join("\n\n")}`;

  const fetchHtml = async () => {
    if (!url.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoadingHtml(true);
    setError("");
    setStatuses({});

    try {
      const response = await fetch(
        `/api/broken-link-checker?url=${encodeURIComponent(url.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch this page.");
        return;
      }

      setHtml(data.html || "");
      setSourceUrl(data.sourceUrl || url.trim());
      setMode("url");
      alert("Page HTML fetched!");
    } catch {
      setError("Something went wrong while fetching this URL.");
    } finally {
      setLoadingHtml(false);
    }
  };

  const checkLinks = async () => {
    if (links.length === 0) {
      alert("No links found.");
      return;
    }

    setCheckingLinks(true);
    setError("");

    const nextStatuses: Record<string, LinkStatus> = {};

    for (const link of links) {
      const key = link.absoluteUrl || link.href || `empty-${link.index}`;
      const localStatus = getLocalStatus(link, html);

      if (localStatus) {
        nextStatuses[key] = localStatus;
        setStatuses({ ...nextStatuses });
        continue;
      }

      try {
        const response = await fetch(
          `/api/check-link-status?url=${encodeURIComponent(link.absoluteUrl)}`
        );
        const data = await response.json();

        nextStatuses[key] = data as LinkStatus;
        setStatuses({ ...nextStatuses });
      } catch {
        nextStatuses[key] = {
          url: link.absoluteUrl,
          status: 0,
          statusText: "Check failed",
          type: "unknown",
          finalUrl: link.absoluteUrl,
        };
        setStatuses({ ...nextStatuses });
      }
    }

    setCheckingLinks(false);
    alert("All links checked!");
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Broken link report copied!");
  };

  const loadSample = () => {
    setMode("html");
    setUrl("https://toolmint.com");
    setSourceUrl("https://toolmint.com");
    setHtml(sampleHtml);
    setStatuses({});
    setError("");
  };

  const resetTool = () => {
    setMode("html");
    setUrl("");
    setSourceUrl("");
    setHtml("");
    setStatuses({});
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔗 Broken Link Checker"
          description="Find broken links, internal links, external links, hash links, email links, phone links and unsafe JavaScript links from a URL or HTML."
        />

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Check Page Links
                </h2>
                <p className="text-slate-300">
                  Fetch a page URL or paste HTML manually, then check every
                  extracted link.
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
                    {loadingHtml ? "⏳ Fetching" : "🚀 Fetch Page Links"}
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
                    setSourceUrl(getBaseUrl(url));
                    setStatuses({});
                  }}
                  className="min-h-[360px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none transition focus:border-blue-500"
                  placeholder='<a href="https://example.com">Example</a>'
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={checkLinks}>
                  {checkingLinks ? "⏳ Checking" : "✅ Check All Links"}
                </Button>
                <Button onClick={copyReport}>📋 Copy Report</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>

              <p className="text-sm text-slate-400">
                This tool checks HTTP links with backend requests and validates
                hash, email, phone, JavaScript and empty links locally.
              </p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 Link Summary
                </h2>
                <p className="text-slate-300">
                  Review extracted links, checked status and broken link count.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Total Links</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {summary.total}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Checked</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {summary.checked}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Good</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {summary.good}
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-slate-300">Broken</p>
                  <p className="mt-1 text-3xl font-bold text-red-300">
                    {summary.broken}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">Internal</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">
                    {summary.internal}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">External</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">
                    {summary.external}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">Special</p>
                  <p className="mt-1 text-2xl font-bold text-slate-100">
                    {summary.special}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  summary.broken > 0
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                }`}
              >
                <h3
                  className={`mb-2 text-xl font-bold ${
                    summary.broken > 0 ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {summary.broken > 0
                    ? "⚠️ Broken Links Found"
                    : "✅ No Broken Links Found"}
                </h3>
                <p className="text-slate-200">
                  Unknown links usually mean the website blocked automated
                  requests or timed out.
                </p>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">🧾 Link Results</h2>

          {links.length === 0 ? (
            <ToolCard>
              <p className="text-slate-400">No links found yet.</p>
            </ToolCard>
          ) : (
            links.map((link) => {
              const key = link.absoluteUrl || link.href || `empty-${link.index}`;
              const status = statuses[key];
              const style = getStatusStyle(status?.type);

              return (
                <div
                  key={`${link.index}-${link.absoluteUrl}-${link.text}`}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-lg border px-3 py-1 text-sm font-bold ${style.bg} ${style.color}`}
                        >
                          {status ? style.label : "Pending"}
                        </span>
                        <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-sm font-bold text-slate-300">
                          {link.kind}
                        </span>
                        {status && (
                          <span className="text-sm text-slate-400">
                            HTTP {status.status || "Unknown"} {status.statusText}
                          </span>
                        )}
                      </div>

                      <p className="mb-2 break-words text-slate-300">
                        <span className="font-bold text-slate-100">URL:</span>{" "}
                        {shorten(link.absoluteUrl || link.href || "(empty)", 180)}
                      </p>

                      <p className="break-words text-slate-300">
                        <span className="font-bold text-slate-100">Text:</span>{" "}
                        {link.text || "(no anchor text)"}
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
              Broken links can hurt user experience and SEO quality, especially
              on important pages, guides and landing pages.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Fix 404 links, update redirected links, avoid empty href values
              and replace unsafe JavaScript links with real buttons where
              possible.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Some websites block automated HTTP checks, so unknown status does
              not always mean the link is broken.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}