"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type InputMode = "url" | "html";
type TagDefinition = {
  id: string;
  label: string;
  group: "Basic metadata" | "Open Graph" | "Twitter / X";
  selector: "meta-name" | "meta-property" | "title" | "canonical";
  key: string;
};
type TagFinding = TagDefinition & { values: string[] };
type HreflangEntry = { language: string; url: string };
type AuditResult = {
  findings: TagFinding[];
  hreflang: HreflangEntry[];
  htmlLanguage: string;
  charset: string;
  sourceUrl: string;
  httpStatus: number | null;
  bodyTruncated: boolean;
};
type FetchResult = {
  html?: unknown;
  sourceUrl?: unknown;
  status?: unknown;
  bodyTruncated?: unknown;
  error?: unknown;
};

const tagDefinitions: TagDefinition[] = [
  { id: "title", label: "HTML title", group: "Basic metadata", selector: "title", key: "title" },
  { id: "description", label: "Meta description", group: "Basic metadata", selector: "meta-name", key: "description" },
  { id: "robots", label: "Robots directives", group: "Basic metadata", selector: "meta-name", key: "robots" },
  { id: "googlebot", label: "Googlebot directives", group: "Basic metadata", selector: "meta-name", key: "googlebot" },
  { id: "viewport", label: "Viewport", group: "Basic metadata", selector: "meta-name", key: "viewport" },
  { id: "author", label: "Author", group: "Basic metadata", selector: "meta-name", key: "author" },
  { id: "theme-color", label: "Theme color", group: "Basic metadata", selector: "meta-name", key: "theme-color" },
  { id: "canonical", label: "Canonical URL", group: "Basic metadata", selector: "canonical", key: "canonical" },
  { id: "og-title", label: "og:title", group: "Open Graph", selector: "meta-property", key: "og:title" },
  { id: "og-description", label: "og:description", group: "Open Graph", selector: "meta-property", key: "og:description" },
  { id: "og-type", label: "og:type", group: "Open Graph", selector: "meta-property", key: "og:type" },
  { id: "og-url", label: "og:url", group: "Open Graph", selector: "meta-property", key: "og:url" },
  { id: "og-image", label: "og:image", group: "Open Graph", selector: "meta-property", key: "og:image" },
  { id: "og-image-alt", label: "og:image:alt", group: "Open Graph", selector: "meta-property", key: "og:image:alt" },
  { id: "twitter-card", label: "twitter:card", group: "Twitter / X", selector: "meta-name", key: "twitter:card" },
  { id: "twitter-title", label: "twitter:title", group: "Twitter / X", selector: "meta-name", key: "twitter:title" },
  { id: "twitter-description", label: "twitter:description", group: "Twitter / X", selector: "meta-name", key: "twitter:description" },
  { id: "twitter-image", label: "twitter:image", group: "Twitter / X", selector: "meta-name", key: "twitter:image" },
];

const sampleHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ToolMint Meta Tags Checker Sample</title>
    <meta name="description" content="Inspect common page metadata using this sample HTML." />
    <meta name="robots" content="index,follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="https://example.com/meta-tags-checker" />
    <link rel="alternate" hreflang="en" href="https://example.com/en/page" />
    <meta property="og:title" content="ToolMint Metadata Sample" />
    <meta property="og:description" content="A sample Open Graph description." />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://example.com/meta-tags-checker" />
    <meta property="og:image" content="https://example.com/share-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="ToolMint Metadata Sample" />
    <meta name="twitter:description" content="A sample social description." />
    <meta name="twitter:image" content="https://example.com/share-image.jpg" />
  </head>
  <body><h1>Metadata sample</h1></body>
</html>`;

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function collectValues(documentNode: Document, definition: TagDefinition) {
  if (definition.selector === "title") {
    return Array.from(documentNode.querySelectorAll("title"))
      .map((element) => normalize(element.textContent || ""));
  }

  if (definition.selector === "canonical") {
    return Array.from(documentNode.querySelectorAll('link[rel~="canonical"]'))
      .map((element) => normalize(element.getAttribute("href") || ""));
  }

  const attribute = definition.selector === "meta-property" ? "property" : "name";
  return Array.from(documentNode.querySelectorAll("meta"))
    .filter((element) => element.getAttribute(attribute)?.trim().toLowerCase() === definition.key)
    .map((element) => normalize(element.getAttribute("content") || ""));
}

function analyzeHtml(html: string, sourceUrl = "", httpStatus: number | null = null, bodyTruncated = false): AuditResult {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const findings = tagDefinitions.map((definition) => ({
    ...definition,
    values: collectValues(parsed, definition),
  }));
  const hreflang = Array.from(parsed.querySelectorAll('link[rel~="alternate"][hreflang]'))
    .map((element) => ({
      language: normalize(element.getAttribute("hreflang") || ""),
      url: normalize(element.getAttribute("href") || ""),
    }))
    .filter((entry) => entry.language || entry.url);

  return {
    findings,
    hreflang,
    htmlLanguage: normalize(parsed.documentElement.getAttribute("lang") || ""),
    charset: normalize(parsed.querySelector("meta[charset]")?.getAttribute("charset") || ""),
    sourceUrl,
    httpStatus,
    bodyTruncated,
  };
}

function findingState(finding: TagFinding) {
  if (finding.values.length > 1) return "Duplicate";
  if (finding.values.length === 1 && !finding.values[0]) return "Empty";
  if (finding.values.length === 1) return "Found";
  return "Missing";
}

function makeReport(result: AuditResult) {
  const found = result.findings.filter((finding) => finding.values.length > 0).length;
  const missing = result.findings.length - found;
  const duplicate = result.findings.filter((finding) => finding.values.length > 1).length;
  const lines = [
    "ToolMint Meta Tags Check",
    `Source: ${result.sourceUrl || "Pasted HTML"}`,
    result.httpStatus === null ? "" : `HTTP status: ${result.httpStatus}`,
    `HTML language: ${result.htmlLanguage || "Not found"}`,
    `Character encoding: ${result.charset || "Not declared"}`,
    `Fields found: ${found}/${result.findings.length}`,
    `Fields missing: ${missing}`,
    `Duplicate fields: ${duplicate}`,
    "",
    ...result.findings.flatMap((finding) => [
      `${finding.label} [${findingState(finding)}]`,
      ...(finding.values.length ? finding.values.map((value) => `  ${value || "(empty)"}`) : ["  Not found"]),
    ]),
    "",
    "Hreflang alternates:",
    ...(result.hreflang.length
      ? result.hreflang.map((entry) => `  ${entry.language}: ${entry.url || "(no URL)"}`)
      : ["  Not found"]),
    result.bodyTruncated ? "Note: fetched HTML was truncated at the response limit; findings cover received source only." : "",
    "This report lists metadata present in the supplied HTML. It is not a search ranking score or a live crawler/indexing verdict.",
  ].filter(Boolean);
  return lines.join("\n");
}

function countState(result: AuditResult, state: string) {
  return result.findings.filter((finding) => findingState(finding) === state).length;
}

const groups: TagFinding["group"][] = ["Basic metadata", "Open Graph", "Twitter / X"];

export default function MetaTagsCheckerPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const report = useMemo(() => (result ? makeReport(result) : ""), [result]);

  function analyzePastedHtml() {
    if (!html.trim()) {
      setError("Paste the page HTML first, or load the sample to try the checker.");
      setResult(null);
      return;
    }
    setError("");
    setNotice("");
    setResult(analyzeHtml(html));
  }

  async function fetchUrl() {
    if (!url.trim()) {
      setError("Enter a public webpage URL to inspect.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    setResult(null);
    try {
      const response = await fetch(`/api/meta-tags-checker?url=${encodeURIComponent(url.trim())}`);
      const payload = (await response.json()) as FetchResult;
      if (!response.ok || typeof payload.html !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to inspect this webpage.");
      }
      setResult(analyzeHtml(
        payload.html,
        typeof payload.sourceUrl === "string" ? payload.sourceUrl : url.trim(),
        typeof payload.status === "number" ? payload.status : null,
        payload.bodyTruncated === true,
      ));
      setNotice("Results describe the fetched HTML source. The target page's JavaScript is not executed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to fetch this webpage.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setMode("html");
    setHtml(sampleHtml);
    setResult(null);
    setError("");
    setNotice("");
  }

  function clearAll() {
    setUrl("");
    setHtml("");
    setResult(null);
    setError("");
    setNotice("");
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setNotice("Metadata report copied.");
    } catch {
      setError("Could not copy the report. Check your browser clipboard permissions.");
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🏷️ Meta Tags Checker"
          description="Inspect common SEO and social metadata, canonical and hreflang links from a public webpage or pasted HTML."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Inspect page metadata</h2>
                <p className="mt-2 text-slate-300">Fetch a public page or paste source HTML to review its metadata fields.</p>
              </div>

              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Metadata input method">
                {(["url", "html"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => { setMode(value); setResult(null); setError(""); setNotice(""); }}
                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition ${mode === value ? "border-blue-500 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"}`}
                  >
                    {value === "url" ? "Public URL" : "Paste HTML"}
                  </button>
                ))}
              </div>

              {mode === "url" ? (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">Public webpage URL</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void fetchUrl(); }}
                    placeholder="https://example.com/page"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">Public HTTP/HTTPS pages only. Private and local network targets are blocked.</span>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">HTML source</span>
                  <textarea
                    value={html}
                    onChange={(event) => setHtml(event.target.value)}
                    placeholder={'Paste the page source containing <head> metadata'}
                    className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">Pasted HTML is parsed in your browser; it is not sent to the URL-fetch endpoint.</span>
                </label>
              )}

              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">{notice}</p>}

              <div className="flex flex-wrap gap-3">
                {mode === "url" ? (
                  <Button onClick={fetchUrl} disabled={loading}>{loading ? "Fetching page..." : "Fetch & Check Tags"}</Button>
                ) : (
                  <Button onClick={analyzePastedHtml}>Analyze HTML</Button>
                )}
                <Button onClick={loadSample} variant="secondary">Load Sample</Button>
                <Button onClick={clearAll} variant="secondary">Clear</Button>
              </div>
              <p className="text-sm leading-6 text-slate-400">URL mode reads a bounded public HTML response and does not run the target page&apos;s JavaScript. Some sites block automated requests.</p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Metadata report</h2>
                <p className="mt-2 text-slate-300" aria-live="polite">{result ? "Inspection complete" : "Choose an input method and run an inspection."}</p>
              </div>

              {!result ? (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">Metadata findings will appear here.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Fields found", countState(result, "Found") + countState(result, "Duplicate") + countState(result, "Empty")],
                      ["Missing", countState(result, "Missing")],
                      ["Duplicates", countState(result, "Duplicate")],
                      ["HTTP status", result.httpStatus ?? "Local HTML"],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 break-words text-xl font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {result.sourceUrl && <p className="break-all rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Source: {result.sourceUrl}</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">HTML language: <span className="font-semibold text-white">{result.htmlLanguage || "Not declared"}</span></p>
                    <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Character encoding: <span className="font-semibold text-white">{result.charset || "Not declared"}</span></p>
                  </div>

                  {groups.map((group) => (
                    <section key={group} aria-labelledby={`meta-group-${group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                      <h3 id={`meta-group-${group.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="mb-3 text-lg font-bold text-white">{group}</h3>
                      <div className="space-y-2">
                        {result.findings.filter((finding) => finding.group === group).map((finding) => {
                          const state = findingState(finding);
                          const stateStyle = state === "Found" ? "text-emerald-300" : state === "Duplicate" ? "text-amber-300" : state === "Empty" ? "text-orange-300" : "text-slate-400";
                          return (
                            <div key={finding.id} className="grid gap-1 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:grid-cols-[minmax(110px,0.34fr)_minmax(0,1fr)] sm:gap-4">
                              <div className="flex items-start justify-between gap-3 sm:block">
                                <p className="font-semibold text-slate-200">{finding.label}</p>
                                <p className={`shrink-0 text-xs font-semibold sm:mt-1 ${stateStyle}`}>{state}{finding.values.length > 1 ? ` (${finding.values.length})` : ""}</p>
                              </div>
                              <div className="min-w-0 space-y-1">
                                {finding.values.length ? finding.values.map((value, index) => (
                                  <p key={`${finding.id}-${index}`} className="break-all text-sm text-slate-300">{value || <span className="italic text-orange-200">(empty value)</span>}</p>
                                )) : <p className="text-sm text-slate-500">Not present in supplied HTML</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  <section aria-labelledby="hreflang-title">
                    <h3 id="hreflang-title" className="mb-3 text-lg font-bold text-white">Hreflang alternates</h3>
                    {result.hreflang.length ? (
                      <div className="space-y-2">
                        {result.hreflang.map((entry, index) => (
                          <div key={`${entry.language}-${entry.url}-${index}`} className="grid gap-1 rounded-lg border border-slate-700 bg-slate-900 p-3 sm:grid-cols-[120px_1fr] sm:gap-4">
                            <span className="font-semibold text-slate-200">{entry.language || "Language missing"}</span>
                            <span className="break-all text-sm text-slate-300">{entry.url || "URL missing"}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="rounded-lg bg-slate-900 p-3 text-sm text-slate-400">No hreflang alternate links found.</p>}
                  </section>

                  {result.bodyTruncated && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">The fetched HTML exceeded the response limit. Findings only describe the received portion; tags after the cutoff may be missing from this report.</p>}
                  <Button onClick={copyReport} variant="secondary">Copy Report</Button>
                </>
              )}
            </div>
          </ToolCard>
        </div>

        <section className="mt-10 space-y-8 border-t border-slate-800 pt-8" aria-labelledby="meta-tags-guide">
          <div>
            <h2 id="meta-tags-guide" className="text-2xl font-bold text-white">Meta Tags Checker: Inspect Page Metadata</h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-300">Use the checker to review common metadata present in a public page&apos;s fetched HTML or in source HTML you provide. It groups basic page metadata, canonical and crawler directives, Open Graph properties, Twitter/X fields and hreflang alternate links, and points out fields that are missing, empty or repeated.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-white">What the report checks</h3>
              <p className="mt-3 leading-7 text-slate-300">The report includes the title element, description, robots and Googlebot directives, viewport, author, theme color, canonical URL, common Open Graph tags, Twitter/X card tags, declared HTML language and hreflang alternates. Values are shown as found in the supplied source.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Missing does not equal a ranking penalty</h3>
              <p className="mt-3 leading-7 text-slate-300">The fields have different purposes and are not all required on every page. A missing social-sharing field is not automatically a search issue; robots and canonical values need context. This tool reports presence and duplicates but does not compute a ranking score or decide whether a page is indexed.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Fetched source versus rendered page</h3>
              <p className="mt-3 leading-7 text-slate-300">URL mode inspects a size-limited public HTML response and does not execute page JavaScript. Some sites reject automated requests, and tags inserted after page load may not appear. Pasted HTML is parsed locally in the browser and is not uploaded.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Related SEO tools</h3>
              <p className="mt-3 leading-7 text-slate-300">Inspect one title with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/title-tag-checker">Title Tag Checker</Link>, review canonical links with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/canonical-url-checker">Canonical URL Checker</Link>, or preview social metadata with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/open-graph-preview-generator">Open Graph Preview Generator</Link>.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
