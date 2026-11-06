"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type InputMode = "url" | "html";
type HreflangRow = {
  index: number;
  language: string;
  href: string;
  resolvedUrl: string;
  absolute: boolean;
  codeFormat: "Expected format" | "Review format";
  inHead: boolean;
  duplicate: boolean;
  xDefault: boolean;
  selfReference: boolean | null;
  issues: string[];
};
type Inspection = {
  rows: HreflangRow[];
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

const sampleHtml = `<!doctype html>
<html lang="en">
  <head>
    <title>Localized page example</title>
    <link rel="alternate" hreflang="en-US" href="https://example.com/us/page" />
    <link rel="alternate" hreflang="en-GB" href="https://example.com/uk/page" />
    <link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/page" />
    <link rel="alternate" hreflang="x-default" href="https://example.com/language-selector" />
  </head>
  <body><h1>Localized page</h1></body>
</html>`;

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

function inspectHtml(html: string, sourceUrl = "", httpStatus: number | null = null, bodyTruncated = false): Inspection {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const source = normalizeUrl(sourceUrl);
  const links = Array.from(parsed.querySelectorAll('link[rel~="alternate"]'));
  const rawRows = links.map((link, index) => {
    const language = clean(link.getAttribute("hreflang") || "");
    const href = clean(link.getAttribute("href") || "");
    const xDefault = language.toLowerCase() === "x-default";
    const codeFormat = xDefault || /^[a-z]{2}(?:-[a-z]{2})?$/i.test(language)
      ? "Expected format" as const
      : "Review format" as const;
    let resolvedUrl = "";
    let absolute = false;

    if (href) {
      try {
        const parsedHref = new URL(href);
        absolute = true;
        if (parsedHref.protocol === "http:" || parsedHref.protocol === "https:") {
          resolvedUrl = parsedHref.href;
        }
      } catch {
        try {
          const base = parsed.querySelector("base[href]")?.getAttribute("href") || sourceUrl;
          if (base) resolvedUrl = new URL(href, base).href;
        } catch {
          resolvedUrl = "";
        }
      }
    }

    const issues: string[] = [];
    if (!language) issues.push("Missing hreflang value");
    else if (codeFormat === "Review format") issues.push("Review language-code format");
    if (!href) issues.push("Missing href URL");
    else if (!absolute) issues.push("Use a fully qualified absolute URL");
    else if (!resolvedUrl) issues.push("Only HTTP and HTTPS targets are supported");
    if (!parsed.head.contains(link)) issues.push("Link is outside the parsed head section");

    return {
      index,
      language,
      href,
      resolvedUrl,
      absolute,
      codeFormat,
      inHead: parsed.head.contains(link),
      duplicate: false,
      xDefault,
      selfReference: source && resolvedUrl ? normalizeUrl(resolvedUrl) === source : null,
      issues,
    } satisfies HreflangRow;
  });

  const counts = new Map<string, number>();
  for (const row of rawRows) {
    if (!row.language) continue;
    const key = row.language.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const rows = rawRows.map((row) => {
    const duplicate = Boolean(row.language && (counts.get(row.language.toLowerCase()) || 0) > 1);
    return {
      ...row,
      duplicate,
      issues: duplicate ? [...row.issues, "Duplicate language value"] : row.issues,
    };
  });

  return { rows, sourceUrl, httpStatus, bodyTruncated };
}

function makeReport(inspection: Inspection) {
  const duplicateCount = inspection.rows.filter((row) => row.duplicate).length;
  const issueCount = inspection.rows.filter((row) => row.issues.length > 0).length;
  const xDefaultCount = inspection.rows.filter((row) => row.xDefault).length;
  return [
    "ToolMint Hreflang Tag Check",
    `Source: ${inspection.sourceUrl || "Pasted HTML"}`,
    inspection.httpStatus === null ? "" : `HTTP status: ${inspection.httpStatus}`,
    `Hreflang links found: ${inspection.rows.length}`,
    `Entries to review: ${issueCount}`,
    `Duplicate language entries: ${duplicateCount}`,
    `x-default entries: ${xDefaultCount}`,
    "",
    ...inspection.rows.flatMap((row) => [
      `${row.language || "(missing language)"} [${row.issues.length ? row.issues.join("; ") : "No detected format issue"}]`,
      `  href: ${row.href || "(missing)"}`,
      row.resolvedUrl && row.resolvedUrl !== row.href ? `  resolved: ${row.resolvedUrl}` : "",
      row.selfReference === null ? "  current-page reference: not checked" : `  current-page reference: ${row.selfReference ? "matches inspected URL" : "does not match inspected URL"}`,
    ]),
    inspection.bodyTruncated ? "Fetched HTML was truncated; findings cover only the received source." : "",
    "The checker does not fetch alternate URLs, confirm their HTTP status, or verify reciprocal annotations across pages.",
  ].filter(Boolean).join("\n");
}

export default function HreflangTagCheckerPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const report = useMemo(() => inspection ? makeReport(inspection) : "", [inspection]);

  function analyzePastedHtml() {
    if (!html.trim()) {
      setInspection(null);
      setError("Paste HTML source first, or load the sample to test the checker.");
      return;
    }
    setError("");
    setNotice("");
    setInspection(inspectHtml(html));
  }

  async function fetchPage() {
    if (!url.trim()) {
      setInspection(null);
      setError("Enter a public webpage URL to inspect.");
      return;
    }
    setLoading(true);
    setInspection(null);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/hreflang-tag-checker?url=${encodeURIComponent(url.trim())}`);
      const payload = (await response.json()) as FetchResult;
      if (!response.ok || typeof payload.html !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to inspect this webpage.");
      }
      const sourceUrl = typeof payload.sourceUrl === "string" ? payload.sourceUrl : url.trim();
      setInspection(inspectHtml(
        payload.html,
        sourceUrl,
        typeof payload.status === "number" ? payload.status : null,
        payload.bodyTruncated === true,
      ));
      setNotice("Only the fetched source page was inspected. Alternate pages and reciprocal links were not fetched.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to fetch this webpage.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setMode("html");
    setHtml(sampleHtml);
    setInspection(null);
    setError("");
    setNotice("");
  }

  function clearAll() {
    setUrl("");
    setHtml("");
    setInspection(null);
    setError("");
    setNotice("");
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setNotice("Hreflang report copied.");
    } catch {
      setError("Could not copy the report. Check your browser clipboard permissions.");
    }
  }

  const duplicates = inspection?.rows.filter((row) => row.duplicate).length || 0;
  const reviewCount = inspection?.rows.filter((row) => row.issues.length > 0).length || 0;
  const xDefaultCount = inspection?.rows.filter((row) => row.xDefault).length || 0;
  const selfReference = inspection?.rows.some((row) => row.selfReference === true) || false;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🌐 Hreflang Tag Checker"
          description="Inspect language and regional alternate links from public HTML or pasted source, including duplicates, missing values and x-default."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Inspect alternate language links</h2>
                <p className="mt-2 text-slate-300">Check alternate-language hreflang link annotations on one page.</p>
              </div>

              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Hreflang input method">
                {(["url", "html"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => { setMode(value); setInspection(null); setError(""); setNotice(""); }}
                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition ${mode === value ? "border-blue-500 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"}`}
                  >
                    {value === "url" ? "Public URL" : "Paste HTML"}
                  </button>
                ))}
              </div>

              {mode === "url" ? (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">Public page URL</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") void fetchPage(); }}
                    placeholder="https://example.com/en/page"
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
                    placeholder={'Paste HTML containing <link rel="alternate" hreflang="..." href="...">'}
                    className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">Pasted HTML is parsed in your browser; it is not sent to the URL-fetch endpoint.</span>
                </label>
              )}

              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">{notice}</p>}

              <div className="flex flex-wrap gap-3">
                {mode === "url" ? (
                  <Button onClick={fetchPage} disabled={loading}>{loading ? "Fetching page..." : "Fetch & Check Hreflang"}</Button>
                ) : (
                  <Button onClick={analyzePastedHtml}>Analyze HTML</Button>
                )}
                <Button onClick={loadSample} variant="secondary">Load Sample</Button>
                <Button onClick={clearAll} variant="secondary">Clear</Button>
              </div>
              <p className="text-sm leading-6 text-slate-400">The URL mode reads a bounded HTML response and does not execute the target page&apos;s JavaScript. Some sites block automated requests.</p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Hreflang report</h2>
                <p className="mt-2 text-slate-300" aria-live="polite">{inspection ? `${inspection.rows.length} alternate link(s) inspected` : "Choose an input method and run an inspection."}</p>
              </div>

              {!inspection ? (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">Hreflang findings will appear here.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Links found", inspection.rows.length],
                      ["Needs review", reviewCount],
                      ["Duplicate entries", duplicates],
                      ["x-default", xDefaultCount],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="mt-1 break-words text-xl font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {inspection.sourceUrl && <p className="break-all rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Source: {inspection.sourceUrl}</p>}
                  {inspection.httpStatus !== null && <p className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">HTTP status: <span className="font-semibold text-white">{inspection.httpStatus}</span></p>}
                  {inspection.rows.length === 0 ? (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">No `link rel=&quot;alternate&quot;` entries were found in the supplied source.</p>
                  ) : (
                    <div className="space-y-3">
                      {inspection.rows.map((row) => (
                        <article key={row.index} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-bold text-white">{row.language || "(missing hreflang)"}</p>
                              <p className={`mt-1 text-sm font-semibold ${row.issues.length ? "text-amber-300" : "text-emerald-300"}`}>
                                {row.issues.length ? `${row.issues.length} item(s) to review` : row.selfReference ? "Format checks passed; points to inspected page" : "No detected format issue"}
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{row.xDefault ? "Fallback" : row.codeFormat}</span>
                          </div>
                          <p className="mt-3 break-all text-sm text-slate-300">href: {row.href || <span className="text-amber-200">Missing</span>}</p>
                          {row.resolvedUrl && row.resolvedUrl !== row.href && <p className="mt-1 break-all text-sm text-slate-400">Resolved link: {row.resolvedUrl}</p>}
                          <p className="mt-2 text-xs text-slate-400">
                            {row.selfReference === null ? "Self-reference: not checked for pasted source" : row.selfReference ? "Self-reference: matches the inspected page URL" : "Self-reference: does not match the inspected page URL"}
                          </p>
                          {row.issues.length > 0 && (
                            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-100">
                              {row.issues.map((issue) => <li key={issue}>{issue}</li>)}
                            </ul>
                          )}
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
                    {selfReference ? "A hreflang entry matches the inspected source URL. " : "Self-reference is not confirmed by this source. "}
                    Reciprocal links, identical alternate sets on other pages, and target HTTP status are not checked.
                  </div>
                  {inspection.bodyTruncated && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Fetched HTML exceeded the response limit. Findings only describe the received portion.</p>}
                  <Button onClick={copyReport} variant="secondary">Copy Report</Button>
                </>
              )}
            </div>
          </ToolCard>
        </div>

        <section className="mt-10 space-y-8 border-t border-slate-800 pt-8" aria-labelledby="hreflang-guide">
          <div>
            <h2 id="hreflang-guide" className="text-2xl font-bold text-white">Hreflang Tag Checker: Review Language and Region Alternates</h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-300">Hreflang annotations identify language or regional versions of related pages. This checker reads alternate links from one fetched or pasted HTML document, reviews their attributes and code format, identifies repeated language values, and reports an optional x-default fallback when present.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-white">Expected HTML pattern</h3>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-200">{`<link rel="alternate" hreflang="en-US" href="https://example.com/us/page" />\n<link rel="alternate" hreflang="fr-FR" href="https://example.com/fr/page" />\n<link rel="alternate" hreflang="x-default" href="https://example.com/language-selector" />`}</pre>
              <p className="mt-3 leading-7 text-slate-300">Google documents a two-letter language code with an optional two-letter region, and recommends fully qualified alternate URLs. This tool checks the displayed format, not membership against every official language/region code list.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Self-reference and reciprocity</h3>
              <p className="mt-3 leading-7 text-slate-300">A localized page should include the appropriate set of alternates, including itself, and related pages should reference one another consistently. This checker can compare one entry with the fetched source URL, but does not fetch every alternate page, so it cannot verify reciprocal links or matching sets.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">x-default is optional</h3>
              <p className="mt-3 leading-7 text-slate-300">The x-default value can point users without a matching language/region to a fallback page, such as a language selector. Its absence is reported as information, not automatically marked as an error.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Related SEO tools</h3>
              <p className="mt-3 leading-7 text-slate-300">Review broader metadata with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/meta-tags-checker">Meta Tags Checker</Link>, inspect canonical links with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/canonical-url-checker">Canonical URL Checker</Link>, or review page structure with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/on-page-seo-checker">On-Page SEO Checker</Link>.</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-400">Read Google Search Central&apos;s <a className="font-semibold text-blue-300 hover:text-blue-200" href="https://developers.google.com/search/docs/specialty/international/localized-versions" target="_blank" rel="noreferrer">localized versions guidance</a> for implementation requirements. This report is not a Google indexing or ranking verdict.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
