"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type SitemapEntry = { url: string; lastmod: string };
type SitemapResult = { entries: SitemapEntry[]; kind: "urlset" | "sitemapindex" };
type CrawlStatus = "complete" | "partial" | "failed" | "not-scanned";
type CrawlResult = {
  url: string;
  status: CrawlStatus;
  statusCode?: number;
  inboundLinks: number;
  referringPages: number;
  error?: string;
};
type JsonResponse = {
  xml?: string;
  finalUrl?: string;
  html?: string;
  statusCode?: number;
  truncated?: boolean;
  error?: string;
};
type FetchedPage = {
  url: string;
  finalUrl: string;
  html: string;
  status: "complete" | "partial";
  statusCode?: number;
  error?: string;
};

const MAX_XML_BYTES = 1_000_000;
const MAX_SITEMAP_URLS = 20_000;
const MAX_CHILD_SITEMAPS = 5;
const MAX_CONCURRENT_PAGES = 3;

function readChildText(element: Element, name: string) {
  return Array.from(element.children).find((child) => child.localName.toLowerCase() === name)?.textContent?.trim() || "";
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizedHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function pageKey(value: string, base?: string) {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${normalizedHost(url.hostname)}${path}`;
  } catch {
    return "";
  }
}

function parseSitemap(xml: string): SitemapResult {
  if (!xml.trim()) throw new Error("Paste or fetch a sitemap XML file first.");
  if (new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) {
    throw new Error("Sitemap XML exceeds the 1 MB processing limit.");
  }
  if (/<!DOCTYPE\b/i.test(xml)) throw new Error("DOCTYPE declarations are not supported in sitemaps.");

  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) {
    throw new Error("This XML is malformed. Check the sitemap file and try again.");
  }

  const kind = document.documentElement.localName.toLowerCase();
  if (kind !== "urlset" && kind !== "sitemapindex") {
    throw new Error("Expected a standard <urlset> sitemap or <sitemapindex>.");
  }

  const itemName = kind === "urlset" ? "url" : "sitemap";
  const entries = Array.from(document.documentElement.children)
    .filter((element) => element.localName.toLowerCase() === itemName)
    .map((element) => ({
      url: readChildText(element, "loc"),
      lastmod: readChildText(element, "lastmod"),
    }))
    .filter((entry) => entry.url);

  if (!entries.length) throw new Error("No <loc> URLs were found in this sitemap.");
  if (kind === "urlset" && entries.length > MAX_SITEMAP_URLS) {
    throw new Error(`This sitemap has more than ${MAX_SITEMAP_URLS.toLocaleString()} URLs; use a smaller sitemap.`);
  }
  return { entries, kind };
}

function uniquePages(entries: SitemapEntry[], siteHost: string) {
  const seen = new Set<string>();
  const pages: SitemapEntry[] = [];
  for (const entry of entries) {
    if (!isHttpUrl(entry.url)) continue;
    let parsed: URL;
    try {
      parsed = new URL(entry.url);
    } catch {
      continue;
    }
    if (normalizedHost(parsed.hostname) !== normalizedHost(siteHost)) continue;
    const key = pageKey(parsed.toString());
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pages.push({ ...entry, url: parsed.toString() });
    if (pages.length >= MAX_SITEMAP_URLS) break;
  }
  return pages;
}

function chooseSample<T>(items: T[], limit: number) {
  if (items.length <= limit) return items;
  if (limit <= 1) return [items[0]];
  return Array.from({ length: limit }, (_, index) =>
    items[Math.round((index * (items.length - 1)) / (limit - 1))]
  );
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function getJson(url: string, signal: AbortSignal): Promise<JsonResponse> {
  const response = await fetch(url, { signal });
  const data = await response.json() as JsonResponse;
  if (!response.ok) throw new Error(data.error || `Request failed with HTTP ${response.status}.`);
  return data;
}

function countInternalTargets(html: string, pageUrl: string, siteHost: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const sourceKey = pageKey(pageUrl);
  const targets = new Map<string, number>();

  for (const anchor of Array.from(document.querySelectorAll("a[href]"))) {
    const rawHref = anchor.getAttribute("href")?.trim();
    if (!rawHref || /^(mailto:|tel:|javascript:|data:)/i.test(rawHref)) continue;
    try {
      const target = new URL(rawHref, pageUrl);
      if (target.protocol !== "http:" && target.protocol !== "https:") continue;
      if (normalizedHost(target.hostname) !== normalizedHost(siteHost)) continue;
      const key = pageKey(target.toString());
      if (!key || key === sourceKey) continue;
      targets.set(key, (targets.get(key) || 0) + 1);
    } catch {
      // Ignore malformed or unsupported href values.
    }
  }
  return { sourceKey, targets };
}

export default function InternalLinkCounterPage() {
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sitemapXml, setSitemapXml] = useState("");
  const [pageLimit, setPageLimit] = useState(20);
  const [pages, setPages] = useState<SitemapEntry[]>([]);
  const [siteHost, setSiteHost] = useState("");
  const [rows, setRows] = useState<CrawlResult[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [loadingSitemap, setLoadingSitemap] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [progress, setProgress] = useState("");
  const [sort, setSort] = useState<"orphans" | "links">("orphans");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sample = useMemo(() => chooseSample(pages, pageLimit), [pages, pageLimit]);
  const displayedRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => !needle || row.url.toLowerCase().includes(needle));
    return [...filtered].sort((a, b) => {
      if (sort === "links") return b.inboundLinks - a.inboundLinks || a.url.localeCompare(b.url);
      const aOrphan = a.status !== "failed" && a.inboundLinks === 0;
      const bOrphan = b.status !== "failed" && b.inboundLinks === 0;
      return Number(bOrphan) - Number(aOrphan) || a.inboundLinks - b.inboundLinks || a.url.localeCompare(b.url);
    });
  }, [query, rows, sort]);

  const completedRows = rows.filter((row) => row.status === "complete" || row.status === "partial");
  const failedCount = rows.filter((row) => row.status === "failed").length;
  const notScannedCount = rows.filter((row) => row.status === "not-scanned").length;
  const partialCount = rows.filter((row) => row.status === "partial").length;
  const orphanCount = completedRows.filter((row) => row.inboundLinks === 0).length;
  const totalInbound = rows.reduce((total, row) => total + row.inboundLinks, 0);

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function fetchSitemapDocument(target: string, signal: AbortSignal) {
    const data = await getJson(`/api/sitemap-url-extractor?url=${encodeURIComponent(target)}`, signal);
    if (!data.xml) throw new Error("The sitemap response did not contain XML.");
    return { xml: data.xml, finalUrl: data.finalUrl || target };
  }

  async function loadSitemap() {
    setError("");
    setRows([]);
    setPages([]);
    setProgress("");
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setLoadingSitemap(true);

    try {
      let xml = sitemapXml;
      let sourceUrl = "";
      if (mode === "url") {
        if (!isHttpUrl(sitemapUrl.trim())) throw new Error("Enter a valid public HTTP or HTTPS sitemap URL.");
        const fetched = await fetchSitemapDocument(sitemapUrl.trim(), controller.signal);
        xml = fetched.xml;
        sourceUrl = fetched.finalUrl;
        setSitemapXml(xml);
      }

      const parsed = parseSitemap(xml);
      let rootHost = "";
      if (mode === "url") rootHost = new URL(sourceUrl).hostname;
      else {
        const firstPage = parsed.entries.find((entry) => isHttpUrl(entry.url));
        if (!firstPage) throw new Error("The pasted sitemap has no valid HTTP or HTTPS page URLs.");
        rootHost = new URL(firstPage.url).hostname;
      }

      let pageEntries: SitemapEntry[] = [];
      let indexNote = "";
      if (parsed.kind === "urlset") {
        pageEntries = parsed.entries;
      } else {
        if (mode !== "url") throw new Error("Paste a page sitemap (<urlset>), or use Fetch sitemap URL to expand an index.");
        const childEntries = parsed.entries.filter((entry) => isHttpUrl(entry.url));
        const selectedChildren = childEntries.filter((entry) => {
          try { return normalizedHost(new URL(entry.url).hostname) === normalizedHost(rootHost); }
          catch { return false; }
        }).slice(0, MAX_CHILD_SITEMAPS);
        const collected: SitemapEntry[] = [];
        let skippedNested = 0;
        let failedChildren = 0;
        for (const [index, child] of selectedChildren.entries()) {
          if (controller.signal.aborted) throw new DOMException("Cancelled", "AbortError");
          setProgress(`Fetching child sitemap ${index + 1} of ${selectedChildren.length}...`);
          try {
            const fetched = await fetchSitemapDocument(child.url, controller.signal);
            if (normalizedHost(new URL(fetched.finalUrl).hostname) !== normalizedHost(rootHost)) {
              failedChildren += 1;
              continue;
            }
            const childParsed = parseSitemap(fetched.xml);
            if (childParsed.kind === "urlset") collected.push(...childParsed.entries);
            else skippedNested += 1;
          } catch (childError) {
            if (controller.signal.aborted) throw childError;
            failedChildren += 1;
          }
        }
        pageEntries = collected.slice(0, MAX_SITEMAP_URLS);
        if (!pageEntries.length) throw new Error("No page sitemaps could be expanded. Check that the index and its child sitemaps are public and on the same host.");
        const indexNotes = [];
        if (childEntries.length > MAX_CHILD_SITEMAPS) indexNotes.push(`Only the first ${MAX_CHILD_SITEMAPS} same-host child sitemaps were attempted`);
        if (skippedNested) indexNotes.push(`${skippedNested} nested sitemap index(es) were not expanded`);
        if (failedChildren) indexNotes.push(`${failedChildren} child sitemap(s) could not be fetched`);
        if (indexNotes.length) indexNote = ` ${indexNotes.join("; ")}.`;
      }

      const unique = uniquePages(pageEntries, rootHost);
      if (!unique.length) throw new Error("No valid same-host page URLs were found in this sitemap.");
      setPages(unique);
      setSiteHost(rootHost);
      setProgress(`Loaded ${unique.length.toLocaleString()} unique same-host page URLs. The selected crawl size is a deterministic sample spread across this list.${indexNote}`);
      announce(`Loaded ${unique.length.toLocaleString()} sitemap URLs.`);
    } catch (loadError) {
      if (controller.signal.aborted) setProgress("Sitemap loading cancelled.");
      else setError(loadError instanceof Error ? loadError.message : "Unable to read this sitemap.");
    } finally {
      setLoadingSitemap(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function analyzePages() {
    if (!sample.length || !siteHost) {
      setError("Load a valid sitemap before analyzing internal links.");
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setCrawling(true);
    setError("");
    setRows([]);
    setProgress("Starting bounded page sample...");
    const pageResults: Array<FetchedPage | { url: string; status: "failed"; error: string; statusCode?: number } | undefined> = new Array(sample.length);
    let nextIndex = 0;
    let completed = 0;

    const worker = async () => {
      while (!controller.signal.aborted) {
        const index = nextIndex++;
        if (index >= sample.length) return;
        const page = sample[index];
        try {
          const endpoint = `/api/internal-link-counter?site=${encodeURIComponent(`https://${siteHost}`)}&url=${encodeURIComponent(page.url)}`;
          const result = await getJson(endpoint, controller.signal);
          if (!result.html || !result.finalUrl) throw new Error(result.error || "No readable HTML was returned.");
          pageResults[index] = {
            url: page.url,
            finalUrl: result.finalUrl,
            html: result.html,
            status: result.truncated ? "partial" : "complete",
            statusCode: result.statusCode,
            error: result.truncated ? "Only the first 300 KB of HTML was inspected." : undefined,
          };
        } catch (pageError) {
          if (controller.signal.aborted) return;
          pageResults[index] = {
            url: page.url,
            status: "failed",
            error: pageError instanceof Error ? pageError.message : "Fetch failed.",
          };
        } finally {
          completed += 1;
          setProgress(`Fetched ${completed} of ${sample.length} sampled pages...`);
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_PAGES, sample.length) }, () => worker()));
      if (controller.signal.aborted) setProgress(`Cancelled after ${completed} of ${sample.length} page requests.`);

      const incoming = new Map<string, { links: number; sources: Set<string> }>();
      for (const page of sample) incoming.set(pageKey(page.url), { links: 0, sources: new Set() });
      let linksOutsideSample = 0;

      for (const result of pageResults) {
        if (!result || !("html" in result)) continue;
        const { sourceKey, targets } = countInternalTargets(result.html, result.finalUrl, siteHost);
        for (const [targetKey, count] of targets) {
          const targetRecord = incoming.get(targetKey);
          if (targetRecord) {
            targetRecord.links += count;
            targetRecord.sources.add(sourceKey);
          } else {
            linksOutsideSample += count;
          }
        }
      }

      const crawlRows = sample.map((page, index): CrawlResult => {
        const result = pageResults[index];
        const values = incoming.get(pageKey(page.url));
        return {
          url: page.url,
          status: result?.status || "not-scanned",
          statusCode: result?.statusCode,
          inboundLinks: values?.links || 0,
          referringPages: values?.sources.size || 0,
          error: result?.error || (result ? undefined : "Not fetched because the scan was cancelled."),
        };
      });
      setRows(crawlRows);
      if (!controller.signal.aborted) {
        const failed = crawlRows.filter((row) => row.status === "failed").length;
        setProgress(`Analysis finished for ${crawlRows.length - failed} of ${sample.length} sampled pages. ${linksOutsideSample} internal link(s) pointed outside the selected sample and were not assigned to a row.`);
      }
    } catch (crawlError) {
      setError(crawlError instanceof Error ? crawlError.message : "Unable to analyze these pages.");
    } finally {
      setCrawling(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancelWork() {
    abortRef.current?.abort();
  }

  function reset() {
    cancelWork();
    setSitemapUrl("");
    setSitemapXml("");
    setPages([]);
    setRows([]);
    setSiteHost("");
    setError("");
    setNotice("");
    setProgress("");
    setQuery("");
    setLoadingSitemap(false);
    setCrawling(false);
  }

  function exportReport(format: "csv" | "txt") {
    if (!rows.length) return;
    const content = format === "csv"
      ? [
          ["Page URL", "Incoming links from sampled pages", "Distinct referring pages", "Fetch status", "HTTP status", "Note"].map(csvCell).join(","),
          ...rows.map((row) => [row.url, row.status === "failed" || row.status === "not-scanned" ? "" : row.inboundLinks, row.status === "failed" || row.status === "not-scanned" ? "" : row.referringPages, row.status, row.statusCode || "", row.error || ""].map(csvCell).join(",")),
        ].join("\r\n")
      : [
          "ToolMint Internal Link Counter report",
          `Site: ${siteHost}`,
          `Sitemap URLs: ${pages.length}`,
          `Sampled pages: ${sample.length}`,
          `Pages with no discovered incoming links in sample: ${orphanCount}`,
          `Incoming internal links between sampled pages: ${totalInbound}`,
          `Fetch failures: ${failedCount}; partial HTML responses: ${partialCount}`,
          "",
          ...rows.map((row) => `${row.url}\n  Inbound links: ${row.status === "failed" || row.status === "not-scanned" ? "not available" : row.inboundLinks}\n  Distinct referring pages: ${row.status === "failed" || row.status === "not-scanned" ? "not available" : row.referringPages}\n  Fetch: ${row.status}${row.statusCode ? ` (HTTP ${row.statusCode})` : ""}${row.error ? `\n  Note: ${row.error}` : ""}`),
          "",
          "Counts are limited to the selected sitemap sample and received raw HTML; pages outside the sample and JavaScript-rendered links are not included.",
        ].join("\n");
    downloadText(`toolmint-internal-link-counter.${format}`, format === "csv" ? `\uFEFF${content}` : content, format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8");
  }

  const busy = loadingSitemap || crawling;

  return (
    <>
      <Header />
      {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-lg border border-emerald-400/40 bg-emerald-950 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-xl">{notice}</div>}
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <PageTitle title="Internal Link Counter" description="Estimate page-to-page internal links from a bounded sample of URLs listed in your sitemap." />

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
            <ToolCard>
              <h2 className="mb-4 text-xl font-bold">Sitemap source</h2>
              <div className="mb-5 inline-flex rounded-lg border border-slate-700 p-1" role="tablist" aria-label="Sitemap input mode">
                <button type="button" role="tab" aria-selected={mode === "url"} onClick={() => setMode("url")} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === "url" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>Fetch sitemap URL</button>
                <button type="button" role="tab" aria-selected={mode === "paste"} onClick={() => setMode("paste")} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === "paste" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>Paste sitemap XML</button>
              </div>

              {mode === "url" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Public sitemap URL</span>
                  <input value={sitemapUrl} onChange={(event) => setSitemapUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadSitemap(); }} placeholder="https://www.example.com/sitemap.xml" type="url" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Sitemap XML (page sitemap)</span>
                  <textarea value={sitemapXml} onChange={(event) => setSitemapXml(event.target.value)} rows={7} spellCheck={false} placeholder={'<?xml version="1.0"?>\n<urlset>...</urlset>'} className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-white outline-none focus:border-blue-500" />
                </label>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => void loadSitemap()} disabled={busy}>{loadingSitemap ? "Loading sitemap..." : "Load sitemap URLs"}</Button>
                {busy && <Button onClick={cancelWork}>Cancel</Button>}
                <Button onClick={reset} disabled={busy}>Reset</Button>
                <Link href="/sitemap-url-extractor" className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Sitemap URL Extractor</Link>
              </div>

              {pages.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr]">
                  <div className="rounded-lg border border-slate-700 bg-slate-900 p-4"><p className="text-sm text-slate-400">Unique same-host URLs</p><p className="mt-1 text-2xl font-bold">{pages.length.toLocaleString()}</p></div>
                  <label className="rounded-lg border border-slate-700 bg-slate-900 p-4"><span className="text-sm text-slate-400">Pages to sample</span><select value={pageLimit} onChange={(event) => { setPageLimit(Number(event.target.value)); setRows([]); setProgress(""); }} className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white">{[10, 20, 50].map((count) => <option key={count} value={count}>{count} pages</option>)}</select></label>
                </div>
              )}
              {pages.length > 0 && <p className="mt-3 text-sm text-slate-400">A deterministic sample is spread across the sitemap URL list. Current run: {sample.length} pages. www and apex hosts are treated as aliases; other subdomains are excluded.</p>}
              {error && <p role="alert" className="mt-5 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</p>}
              {progress && <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">{progress}</p>}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-xl font-bold">Sample summary</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Sampled pages", rows.length || sample.length],
                  ["Pages fetched", completedRows.length],
                  ["Incoming links", totalInbound],
                  ["Zero-inlink candidates", orphanCount],
          ["Fetch failures", failedCount],
          ["Not scanned", notScannedCount],
                  ["Partial responses", partialCount],
                ].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3"><dt className="text-xs leading-5 text-slate-400">{label}</dt><dd className="mt-1 break-words text-xl font-bold">{value}</dd></div>)}
              </dl>
              <p className="mt-5 text-sm leading-6 text-slate-300">Inbound counts are calculated only between successfully fetched pages in this sample. A zero count is a review lead, not proof that a page is an orphan across the entire website.</p>
              {rows.length > 0 && <div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => exportReport("csv")}>Download CSV</Button><Button onClick={() => exportReport("txt")}>Download TXT</Button></div>}
            </ToolCard>
          </div>

          {pages.length > 0 && rows.length === 0 && <div className="mt-6"><Button onClick={() => void analyzePages()} disabled={busy}>{crawling ? "Analyzing pages..." : `Analyze ${sample.length} sampled pages`}</Button></div>}

          {rows.length > 0 && (
            <div className="mt-6"><ToolCard>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 className="text-xl font-bold">Sampled page results</h2><p className="mt-1 text-sm text-slate-400">Counts include links found in received HTML, with same-page links excluded.</p></div>
                <div className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_auto]">
                  <label><span className="mb-1 block text-xs text-slate-400">Filter URL</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sampled pages" className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                  <label><span className="mb-1 block text-xs text-slate-400">Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as "orphans" | "links")} className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="orphans">Fewest inlinks first</option><option value="links">Most inlinks first</option></select></label>
                </div>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-slate-700 text-slate-400"><th className="px-3 py-3 font-semibold">Sitemap page</th><th className="px-3 py-3 font-semibold">Incoming links</th><th className="px-3 py-3 font-semibold">Referring pages</th><th className="px-3 py-3 font-semibold">Fetch</th></tr></thead>
                  <tbody>{displayedRows.map((row) => <tr key={row.url} className="border-b border-slate-800 align-top"><td className="max-w-[560px] break-all px-3 py-3"><a href={row.url} target="_blank" rel="noreferrer" className="text-blue-300 hover:underline">{row.url}</a>{row.error && <p className="mt-1 text-xs text-amber-300">{row.error}</p>}</td><td className="px-3 py-3 font-semibold">{row.status === "failed" || row.status === "not-scanned" ? "-" : row.inboundLinks}</td><td className="px-3 py-3">{row.status === "failed" || row.status === "not-scanned" ? "-" : row.referringPages}</td><td className="px-3 py-3"><span className={`rounded-md border px-2 py-1 text-xs ${row.status === "complete" ? "border-emerald-500/40 text-emerald-300" : row.status === "partial" || row.status === "not-scanned" ? "border-amber-500/40 text-amber-300" : "border-red-500/40 text-red-300"}`}>{row.status}{row.statusCode ? ` · ${row.statusCode}` : ""}</span></td></tr>)}</tbody>
                </table>
                {!displayedRows.length && <p className="py-8 text-center text-sm text-slate-400">No sampled pages match this filter.</p>}
              </div>
            </ToolCard></div>
          )}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ToolCard><h2 className="mb-3 text-lg font-bold">How the count is made</h2><p className="text-sm leading-6 text-slate-300">ToolMint reads page URLs from a sitemap, samples 10, 20 or 50 URLs, then counts raw HTML anchor links that point between those sampled pages. Query strings and fragments are ignored when matching page paths; www and apex are treated as aliases.</p></ToolCard>
            <ToolCard><h2 className="mb-3 text-lg font-bold">Important limitations</h2><p className="text-sm leading-6 text-slate-300">The tool does not render JavaScript, crawl every page, inspect links outside the sample, or verify search-engine discovery. Confirm the site&apos;s robots policy and analyze only sites you are authorized to inspect. Public page HTML is requested through a protected endpoint; each response is limited to 300 KB and 6 seconds. Blocked, non-HTML, redirected-to-other-host, or unavailable pages may not be counted.</p></ToolCard>
          </div>
          <div className="mt-6"><ToolCard><h2 className="mb-3 text-lg font-bold">Improve internal discovery</h2><p className="text-sm leading-6 text-slate-300">Use zero-inlink candidates as a review queue, then confirm navigation and contextual links manually. Counts from a sample are directional: expand the sample size or crawl the site with a dedicated crawler before making site-wide conclusions. For individual page-level link checks, see the <Link className="text-blue-300 hover:underline" href="/broken-link-checker">Broken Link Checker</Link>.</p></ToolCard></div>
        </div>
      </main>
      <Footer />
    </>
  );
}
