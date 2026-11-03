"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type SitemapKind = "urlset" | "sitemapindex";
type SitemapEntry = { loc: string; lastmod: string; kind: "page" | "sitemap" };
type ParsedSitemap = { kind: SitemapKind; entries: SitemapEntry[] };
type FetchResponse = { xml?: string; finalUrl?: string; error?: string };

const MAX_XML_BYTES = 1_000_000;
const MAX_ENTRIES = 20_000;
const MAX_CHILD_SITEMAPS = 20;

function directChildText(element: Element, localName: string) {
  const child = Array.from(element.children).find(
    (item) => item.localName.toLowerCase() === localName
  );
  return child?.textContent?.trim() || "";
}

function parseSitemapXml(xml: string): ParsedSitemap {
  const source = xml.trim();
  if (!source) throw new Error("Add or fetch an XML sitemap first.");
  if (/^https?:\/\//i.test(source)) {
    throw new Error("You entered a sitemap URL, not XML. Switch to the Fetch sitemap URL tab, or open the URL and paste its raw XML here.");
  }
  if (new TextEncoder().encode(xml).byteLength > MAX_XML_BYTES) {
    throw new Error("The XML exceeds the 1 MB processing limit.");
  }
  if (/<!DOCTYPE\b/i.test(xml)) {
    throw new Error("DOCTYPE declarations are not supported. Use a standard XML sitemap file.");
  }

  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const detail = (parserError.textContent || "").replace(/\s+/g, " ").trim().slice(0, 220);
    throw new Error(
      detail
        ? `The XML could not be parsed: ${detail}`
        : "This XML is malformed. Check the sitemap file and try again."
    );
  }

  const root = document.documentElement;
  const rootName = root.localName.toLowerCase();
  if (rootName !== "urlset" && rootName !== "sitemapindex") {
    throw new Error("Expected a <urlset> page sitemap or <sitemapindex> XML document.");
  }

  const kind: SitemapKind = rootName;
  const entryName = kind === "urlset" ? "url" : "sitemap";
  const rowKind = kind === "urlset" ? "page" : "sitemap";
  const entries = Array.from(root.children)
    .filter((element) => element.localName.toLowerCase() === entryName)
    .map((element) => ({
      loc: directChildText(element, "loc"),
      lastmod: directChildText(element, "lastmod"),
      kind: rowKind as SitemapEntry["kind"],
    }))
    .filter((entry) => entry.loc);

  if (entries.length === 0) {
    throw new Error(`No <loc> entries were found in this ${kind === "urlset" ? "sitemap" : "sitemap index"}.`);
  }
  if (entries.length > MAX_ENTRIES) {
    throw new Error(`This file contains more than ${MAX_ENTRIES.toLocaleString()} entries. Use a smaller sitemap file.`);
  }

  return { kind, entries };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function uniqueEntries(entries: SitemapEntry[]) {
  const found = new Set<string>();
  return entries.filter((entry) => {
    if (found.has(entry.loc)) return false;
    found.add(entry.loc);
    return true;
  });
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function requestSitemap(url: string, signal?: AbortSignal) {
  const response = await fetch(`/api/sitemap-url-extractor?url=${encodeURIComponent(url)}`, { signal });
  const payload = await response.json() as FetchResponse;
  if (!response.ok || !payload.xml) {
    throw new Error(payload.error || "Unable to fetch this sitemap.");
  }
  return { xml: payload.xml, finalUrl: payload.finalUrl || url };
}

export default function SitemapUrlExtractorPage() {
  const [mode, setMode] = useState<"paste" | "upload" | "url">("paste");
  const [xml, setXml] = useState("");
  const [fetchUrl, setFetchUrl] = useState("");
  const [entries, setEntries] = useState<SitemapEntry[]>([]);
  const [kind, setKind] = useState<SitemapKind | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const unique = useMemo(() => uniqueEntries(entries), [entries]);
  const duplicates = entries.length - unique.length;
  const syntacticallyInvalid = unique.filter((entry) => !isHttpUrl(entry.loc)).length;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? unique.filter((entry) => `${entry.loc} ${entry.lastmod}`.toLowerCase().includes(needle)) : unique;
  }, [query, unique]);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 3200);
  }

  function setParsed(result: ParsedSitemap, label: string) {
    setEntries(result.entries);
    setKind(result.kind);
    setSourceLabel(label);
    setQuery("");
    setError("");
    setProgress("");
    showNotice(`Extracted ${result.entries.length.toLocaleString()} ${result.kind === "urlset" ? "page URL" : "child sitemap"} entries.`);
  }

  function parseCurrentXml() {
    try {
      setParsed(parseSitemapXml(xml), "Pasted XML");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Unable to parse this XML.");
      setEntries([]);
      setKind(null);
      setSourceLabel("");
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    if (!/\.(xml|txt)$/i.test(file.name)) {
      setError("Choose an .xml sitemap file (or a .txt file containing sitemap XML).");
      return;
    }
    if (file.size > MAX_XML_BYTES) {
      setError("This file exceeds the 1 MB processing limit.");
      return;
    }
    try {
      const content = await file.text();
      setXml(content);
      setParsed(parseSitemapXml(content), file.name);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to read this XML file.");
      setEntries([]);
      setKind(null);
      setSourceLabel("");
    }
  }

  async function fetchRootSitemap() {
    const requestedUrl = fetchUrl.trim();
    if (!isHttpUrl(requestedUrl)) {
      setError("Enter a valid public HTTP or HTTPS sitemap URL.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setProgress("Fetching sitemap XML...");
    setEntries([]);
    setKind(null);
    setSourceLabel("");
    try {
      const result = await requestSitemap(requestedUrl, controller.signal);
      setXml(result.xml);
      const parsed = parseSitemapXml(result.xml);
      setParsed(parsed, result.finalUrl);
    } catch (fetchError) {
      if (controller.signal.aborted) {
        setProgress("Fetch cancelled.");
      } else {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch this sitemap.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function fetchChildSitemaps() {
    if (kind !== "sitemapindex") return;
    const children = unique.filter((entry) => entry.kind === "sitemap" && isHttpUrl(entry.loc));
    if (!children.length) {
      setError("This sitemap index has no child sitemap URLs that can be fetched.");
      return;
    }

    const selectedChildren = children.slice(0, MAX_CHILD_SITEMAPS);
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    const pageEntries: SitemapEntry[] = [];
    const failures: string[] = [];
    let nestedIndexes = 0;

    for (const [index, child] of selectedChildren.entries()) {
      if (controller.signal.aborted) break;
      setProgress(`Fetching child sitemap ${index + 1} of ${selectedChildren.length}...`);
      try {
        const result = await requestSitemap(child.loc, controller.signal);
        const parsed = parseSitemapXml(result.xml);
        if (parsed.kind === "urlset") pageEntries.push(...parsed.entries);
        else nestedIndexes += 1;
      } catch {
        if (controller.signal.aborted) break;
        failures.push(child.loc);
      }
    }

    const limitedEntries = pageEntries.slice(0, MAX_ENTRIES);
    setEntries(limitedEntries);
    setKind("urlset");
    setSourceLabel(`Child sitemaps from ${sourceLabel || "sitemap index"}`);
    setQuery("");
    setLoading(false);
    abortRef.current = null;

    const parts = [`Extracted ${limitedEntries.length.toLocaleString()} page URLs.`];
    if (children.length > MAX_CHILD_SITEMAPS) parts.push(`Fetched the first ${MAX_CHILD_SITEMAPS} of ${children.length} child sitemaps.`);
    if (failures.length) parts.push(`${failures.length} child sitemap(s) could not be fetched.`);
    if (nestedIndexes) parts.push(`${nestedIndexes} nested index(es) were not expanded further.`);
    if (controller.signal.aborted) parts.push("The remaining fetches were cancelled.");
    setProgress(parts.join(" "));
    if (limitedEntries.length) showNotice(`Collected ${limitedEntries.length.toLocaleString()} page URL entries.`);
    if (failures.length && !limitedEntries.length) setError("No page URLs could be extracted. The child sitemaps may block requests or be unavailable.");
  }

  function cancelFetch() {
    abortRef.current?.abort();
  }

  function clearResults() {
    abortRef.current?.abort();
    setXml("");
    setFetchUrl("");
    setEntries([]);
    setKind(null);
    setQuery("");
    setError("");
    setProgress("");
    setSourceLabel("");
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function copyUrls() {
    if (!unique.length) return;
    try {
      await navigator.clipboard.writeText(unique.map((entry) => entry.loc).join("\n"));
      showNotice(`Copied ${unique.length.toLocaleString()} URLs.`);
    } catch {
      setError("Clipboard access was blocked by the browser. Download TXT or CSV instead.");
    }
  }

  function downloadUrls(format: "txt" | "csv") {
    if (!unique.length) return;
    const content = format === "txt"
      ? unique.map((entry) => entry.loc).join("\n")
      : ["URL,Last modified", ...unique.map((entry) => `${csvCell(entry.loc)},${csvCell(entry.lastmod)}`)].join("\n");
    downloadText(
      `sitemap-urls.${format}`,
      format === "csv" ? `\uFEFF${content}` : content,
      format === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8"
    );
  }

  const tabs = [
    { id: "paste", label: "Paste XML" },
    { id: "upload", label: "Upload XML" },
    { id: "url", label: "Fetch sitemap URL" },
  ] as const;

  return (
    <>
      <Header />
      {notice && (
        <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-emerald-950 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-xl">
          {notice}
        </div>
      )}
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageTitle
            title="🗺️ Sitemap URL Extractor"
            description="Extract page URLs and last-modified values from XML sitemaps. Paste XML, upload a file, or fetch a public sitemap URL, then copy or export the results."
          />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <ToolCard>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-white">Sitemap Source</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Sitemap input method">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={mode === tab.id}
                      onClick={() => { setMode(tab.id); setError(""); }}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${mode === tab.id ? "border-blue-400 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-blue-400"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "paste" && (
                <div>
                  <label htmlFor="sitemap-xml" className="mb-2 block font-semibold text-slate-200">XML sitemap content</label>
                  <textarea
                    id="sitemap-xml"
                    value={xml}
                    onChange={(event) => setXml(event.target.value)}
                    placeholder={'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://example.com/</loc></url>\n</urlset>'}
                    className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    spellCheck={false}
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button onClick={parseCurrentXml} disabled={loading}>Extract URLs</Button>
                    <Button variant="secondary" onClick={clearResults}>Reset</Button>
                  </div>
                </div>
              )}

              {mode === "upload" && (
                <div>
                  <label htmlFor="sitemap-file" className="flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500/60 bg-slate-950 px-5 text-center transition hover:border-blue-300 hover:bg-slate-900">
                    <span className="text-4xl" aria-hidden="true">📄</span>
                    <span className="mt-3 text-lg font-bold">Choose an XML sitemap</span>
                    <span className="mt-1 text-sm text-slate-400">XML or text file, up to 1 MB. Parsed locally in your browser.</span>
                    <input
                      ref={fileInputRef}
                      id="sitemap-file"
                      type="file"
                      accept=".xml,.txt,application/xml,text/xml,text/plain"
                      className="sr-only"
                      onChange={(event) => void handleFile(event.target.files?.[0])}
                    />
                  </label>
                  {sourceLabel && <p className="mt-3 text-sm text-slate-300">Selected: {sourceLabel}</p>}
                  <div className="mt-3"><Button variant="secondary" onClick={clearResults}>Reset</Button></div>
                </div>
              )}

              {mode === "url" && (
                <div>
                  <label htmlFor="sitemap-url" className="mb-2 block font-semibold text-slate-200">Public sitemap URL</label>
                  <input
                    id="sitemap-url"
                    type="url"
                    inputMode="url"
                    value={fetchUrl}
                    onChange={(event) => setFetchUrl(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter" && !loading) void fetchRootSitemap(); }}
                    placeholder="https://example.com/sitemap.xml"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <div className="mt-3 flex flex-wrap gap-3">
                    {!loading ? <Button onClick={() => void fetchRootSitemap()}>Fetch & Extract</Button> : <Button variant="danger" onClick={cancelFetch}>Cancel fetch</Button>}
                    <Button variant="secondary" onClick={clearResults}>Reset</Button>
                  </div>
                  <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm leading-6 text-amber-100/90">
                    URL mode asks ToolMint&apos;s protected fetch endpoint to retrieve the public XML (up to 1 MB). Pasted or uploaded XML is processed in your browser and is not uploaded.
                  </p>
                </div>
              )}

              {loading && <p role="status" className="mt-4 text-sm font-semibold text-blue-200">{progress}</p>}
              {!loading && progress && <p role="status" className="mt-4 text-sm text-slate-300">{progress}</p>}
              {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
            </ToolCard>

            <ToolCard>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Extraction Summary</h2>
                  {sourceLabel && <p className="mt-1 max-w-xl break-all text-sm text-slate-400">Source: {sourceLabel}</p>}
                </div>
                {kind && <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-200">{kind === "urlset" ? "Page URL sitemap" : "Sitemap index"}</span>}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Entries" value={entries.length} />
                <Stat label="Unique" value={unique.length} />
                <Stat label="Duplicates" value={duplicates} />
                <Stat label="Invalid URL syntax" value={syntacticallyInvalid} />
              </div>

              {kind === "sitemapindex" && (
                <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                  <h3 className="font-bold text-cyan-100">This is a sitemap index</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">It lists child sitemap files, not page URLs. Fetch up to {MAX_CHILD_SITEMAPS} listed sitemaps to collect their page URLs.</p>
                  <Button className="mt-3" onClick={() => void fetchChildSitemaps()} disabled={loading || !unique.length}>
                    Fetch child sitemaps ({Math.min(unique.length, MAX_CHILD_SITEMAPS)} max)
                  </Button>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={() => void copyUrls()} disabled={!unique.length}>Copy URLs</Button>
                <Button variant="secondary" onClick={() => downloadUrls("txt")} disabled={!unique.length}>Download TXT</Button>
                <Button variant="secondary" onClick={() => downloadUrls("csv")} disabled={!unique.length}>Download CSV</Button>
              </div>

              <div className="mt-5">
                <label htmlFor="url-filter" className="mb-2 block text-sm font-semibold text-slate-300">Filter extracted entries</label>
                <input
                  id="url-filter"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search URL or last modified date"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-slate-700">
                {filtered.length ? (
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="sticky top-0 bg-slate-950 text-slate-300">
                      <tr><th className="w-[65%] px-3 py-3 font-semibold">{kind === "sitemapindex" ? "Child sitemap URL" : "Page URL"}</th><th className="px-3 py-3 font-semibold">Last modified</th></tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 500).map((entry, index) => (
                        <tr key={`${entry.loc}-${index}`} className="border-t border-slate-800 align-top">
                          <td className="break-all px-3 py-3 text-blue-200">{entry.loc}</td>
                          <td className="break-words px-3 py-3 text-slate-400">{entry.lastmod || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-12 text-center text-sm text-slate-400">{entries.length ? "No entries match this filter." : "Extracted URLs and sitemap details will appear here."}</div>
                )}
                {filtered.length > 500 && <p className="border-t border-slate-800 px-3 py-3 text-xs text-slate-400">Showing first 500 of {filtered.length.toLocaleString()} matching entries. Exports include all unique entries.</p>}
              </div>
            </ToolCard>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <ToolCard>
              <h2 className="mb-2 text-lg font-bold text-white">🧭 What it extracts</h2>
              <p className="text-sm leading-6 text-slate-300">Reads standard XML <code>&lt;urlset&gt;</code> page sitemaps and <code>&lt;sitemapindex&gt;</code> indexes. Page URLs and optional <code>lastmod</code> values are shown; this tool does not test whether each URL is live or indexed.</p>
            </ToolCard>
            <ToolCard>
              <h2 className="mb-2 text-lg font-bold text-white">🔒 Fetch limits</h2>
              <p className="text-sm leading-6 text-slate-300">Local XML files are parsed in-browser. Public URL fetching blocks local/private network targets, limits each response to 1 MB, and caps child sitemap fetching at 20 files per action.</p>
            </ToolCard>
            <ToolCard>
              <h2 className="mb-2 text-lg font-bold text-white">🛠️ Related tool</h2>
              <p className="text-sm leading-6 text-slate-300">Need to create an XML sitemap from a list of pages instead? Use the existing <Link href="/sitemap-generator" className="font-semibold text-blue-300 underline decoration-blue-400/50 underline-offset-4 hover:text-blue-200">Sitemap Generator</Link>.</p>
            </ToolCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-700 bg-slate-950 p-3">
      <p className="text-xs leading-5 text-slate-400">{label}</p>
      <p className="mt-1 break-all text-2xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
}
