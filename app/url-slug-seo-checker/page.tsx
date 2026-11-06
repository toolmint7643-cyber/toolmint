"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type Finding = { kind: "review" | "info"; title: string; detail: string };
type Segment = {
  number: number;
  raw: string;
  decoded: string;
  words: number;
  length: number;
  findings: Finding[];
};
type UrlResult = {
  input: string;
  valid: boolean;
  origin: string;
  pathname: string;
  query: string;
  fragment: string;
  segments: Segment[];
  findings: Finding[];
  error: string;
};

const sampleInput = [
  "https://www.example.com/Guides/URL_slug--best-practices?ref=campaign#section",
  "/free-online-image-compressor",
].join("\n");

function wordCount(value: string) {
  return value.match(/[\p{L}\p{N}]+/gu)?.length || 0;
}

function analyzeSegment(raw: string, number: number): Segment {
  let decoded = raw;
  const findings: Finding[] = [];

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    findings.push({
      kind: "review",
      title: "Malformed percent encoding",
      detail: "This path segment contains a percent sign that is not followed by a valid encoded byte sequence.",
    });
  }

  if (/[A-Z]/.test(decoded)) {
    findings.push({
      kind: "review",
      title: "Uppercase letters present",
      detail: "URL paths can be case-sensitive. Use a consistent case convention; changing a live URL may require a redirect and canonical review.",
    });
  }
  if (decoded.includes("_")) {
    findings.push({
      kind: "review",
      title: "Underscore used as a word separator",
      detail: "When separating words, Google recommends hyphens instead of underscores.",
    });
  }
  if (/\s/.test(decoded)) {
    findings.push({
      kind: "review",
      title: "Space in the segment",
      detail: "Spaces are commonly percent-encoded in URLs. If they separate words, a hyphenated segment is easier to read.",
    });
  }
  if (/-{2,}/.test(decoded)) {
    findings.push({
      kind: "review",
      title: "Repeated hyphens",
      detail: "Review whether consecutive separators are intentional and readable.",
    });
  }
  if (/^-|-$/.test(decoded)) {
    findings.push({
      kind: "review",
      title: "Leading or trailing hyphen",
      detail: "Check for accidental separator characters at the edge of this segment.",
    });
  }
  if (/[^\x00-\x7F]/.test(raw)) {
    findings.push({
      kind: "info",
      title: "Non-ASCII characters in input",
      detail: "Percent-encode non-ASCII characters when placing this text in a URL.",
    });
  }

  if (!findings.length) {
    findings.push({
      kind: "info",
      title: "No checked formatting patterns found",
      detail: "This is not a ranking verdict or a guarantee that the URL is unique, live, or indexed.",
    });
  }

  return {
    number,
    raw,
    decoded,
    words: wordCount(decoded),
    length: Array.from(decoded).length,
    findings,
  };
}

function analyzeLine(input: string): UrlResult {
  const value = input.trim();
  if (!value) {
    return { input, valid: false, origin: "", pathname: "", query: "", fragment: "", segments: [], findings: [], error: "Empty input." };
  }

  let origin = "";
  let pathname = "";
  let query = "";
  let fragment = "";

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only HTTP and HTTPS URLs can be inspected.");
      }
      origin = parsed.origin;
      pathname = parsed.pathname || "/";
      query = parsed.search;
      fragment = parsed.hash;
    } catch (caught) {
      return {
        input: value, valid: false, origin: "", pathname: "", query: "", fragment: "", segments: [], findings: [],
        error: caught instanceof Error ? caught.message : "Enter a valid HTTP/HTTPS URL or a path.",
      };
    }
  } else {
    if (value.includes("://")) {
      return { input: value, valid: false, origin: "", pathname: "", query: "", fragment: "", segments: [], findings: [], error: "Use a complete HTTP/HTTPS URL, or enter a path/slug without a protocol." };
    }
    const hashIndex = value.indexOf("#");
    const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    fragment = hashIndex >= 0 ? value.slice(hashIndex) : "";
    const queryIndex = beforeHash.indexOf("?");
    pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
    if (!pathname.startsWith("/")) pathname = "/" + pathname;
    if (!pathname) pathname = "/";
  }

  const findings: Finding[] = [];
  const internalPath = pathname.replace(/^\/+|\/+$/g, "");
  if (/\/{2,}/.test(internalPath)) {
    findings.push({
      kind: "review",
      title: "Repeated slash in path",
      detail: "Check whether consecutive slashes are intentional; servers may treat alternate paths differently.",
    });
  }
  if (query) {
    const count = new URLSearchParams(query.slice(1)).size;
    findings.push({
      kind: "info",
      title: "Query string present",
      detail: count + " parameter(s) detected. Keep parameters that change the page's content or function; review unnecessary alternatives.",
    });
  }
  if (fragment) {
    findings.push({
      kind: "info",
      title: "Fragment excluded from path checks",
      detail: "The part after # is a client-side fragment and is not included in the path segments shown here.",
    });
  }

  const rawSegments = pathname.split("/").filter(Boolean);
  const segments = rawSegments.map((segment, index) => analyzeSegment(segment, index + 1));
  if (!segments.length) {
    findings.push({
      kind: "info",
      title: "Root path",
      detail: "This URL has no path slug after the domain.",
    });
  }

  return { input: value, valid: true, origin, pathname, query, fragment, segments, findings, error: "" };
}

function makeReport(results: UrlResult[]) {
  const lines = [
    "ToolMint URL Slug SEO Check",
    "Inputs inspected: " + results.length,
    "Path segments: " + results.reduce((sum, item) => sum + item.segments.length, 0),
    "",
    ...results.flatMap((item, itemIndex) => [
      (itemIndex + 1) + ". " + item.input,
      item.valid ? "Path: " + item.pathname : "Error: " + item.error,
      ...item.findings.map((finding) => finding.kind.toUpperCase() + ": " + finding.title + " - " + finding.detail),
      ...item.segments.flatMap((segment) => [
        "  Segment " + segment.number + ": " + segment.decoded + " (" + segment.length + " characters, " + segment.words + " word(s))",
        ...segment.findings.map((finding) => "    " + finding.kind.toUpperCase() + ": " + finding.title + " - " + finding.detail),
      ]),
      "",
    ]),
    "This report checks URL text patterns only. It does not test HTTP status, redirects, canonicalization, indexing, keyword demand, or rankings.",
  ];
  return lines.join("\n");
}

function findingStyle(kind: Finding["kind"]) {
  return kind === "review"
    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
    : "border-slate-700 bg-slate-900 text-slate-300";
}

export default function UrlSlugSeoCheckerPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<UrlResult[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const report = useMemo(() => results ? makeReport(results) : "", [results]);
  const segmentCount = results?.reduce((sum, item) => sum + item.segments.length, 0) || 0;
  const reviewCount = results?.reduce((sum, item) => {
    const pathReviews = item.findings.filter((finding) => finding.kind === "review").length;
    const segmentReviews = item.segments.reduce((count, segment) => count + segment.findings.filter((finding) => finding.kind === "review").length, 0);
    return sum + pathReviews + segmentReviews;
  }, 0) || 0;

  function checkInput() {
    const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) {
      setError("Enter a URL, path or slug to inspect.");
      setResults(null);
      return;
    }
    if (lines.length > 50) {
      setError("Check up to 50 URLs or paths per run.");
      setResults(null);
      return;
    }
    setResults(lines.map(analyzeLine));
    setError("");
    setNotice("Checked locally in your browser. No URL was fetched.");
  }

  function loadSample() {
    setInput(sampleInput);
    setResults(null);
    setError("");
    setNotice("");
  }

  function clearAll() {
    setInput("");
    setResults(null);
    setError("");
    setNotice("");
  }

  async function copyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setNotice("Report copied.");
    } catch {
      setError("Could not copy the report. Check your browser clipboard permissions.");
    }
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "url-slug-seo-report.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔗 URL Slug SEO Checker"
          description="Review URL paths and slugs for readability, separators, casing and encoding patterns. No ranking score or length threshold."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Check URL paths</h2>
                <p className="mt-2 text-slate-300">Enter up to 50 full URLs, paths or slugs, one per line.</p>
              </div>
              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">URLs or paths</span>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={"https://example.com/guides/simple-url-path\n/blog/post-title\nproduct-name"}
                  className="min-h-64 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                  spellCheck={false}
                />
                <span className="mt-2 block text-sm text-slate-400">Accepts HTTP/HTTPS URLs or relative paths. The checker does not fetch them.</span>
              </label>
              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">{notice}</p>}
              <div className="flex flex-wrap gap-3">
                <Button onClick={checkInput}>Check URL Slugs</Button>
                <Button onClick={loadSample} variant="secondary">Load Sample</Button>
                <Button onClick={clearAll} variant="secondary">Clear</Button>
              </div>
              <p className="text-sm leading-6 text-slate-400">Existing URLs can be case-sensitive. Before changing a live URL, plan redirects and canonical updates to avoid breaking links.</p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Slug review</h2>
                  <p className="mt-2 text-slate-300" aria-live="polite">{results ? results.length + " input(s) checked" : "Enter URL paths and run a check."}</p>
                </div>
                {results && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={copyReport}>Copy Report</Button><Button variant="secondary" onClick={downloadReport}>Download TXT</Button></div>}
              </div>

              {!results ? (
                <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">Path observations will appear here.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[["Inputs", results.length], ["Path segments", segmentCount], ["Review items", reviewCount]].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 break-words text-xl font-bold text-white">{value}</p></div>
                    ))}
                  </div>
                  <div className="max-h-[38rem] space-y-4 overflow-y-auto pr-1">
                    {results.map((item, index) => (
                      <section key={index} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-label={"URL result " + (index + 1)}>
                        <div className="min-w-0">
                          <p className="break-all font-semibold text-white">{item.input}</p>
                          {item.valid ? <p className="mt-1 break-all text-sm text-slate-400">{item.origin}{item.pathname}</p> : <p className="mt-1 text-sm text-red-200">{item.error}</p>}
                        </div>
                        {item.findings.map((finding, findingIndex) => <div key={finding.title + findingIndex} className={"rounded-lg border p-3 " + findingStyle(finding.kind)}><p className="font-semibold">{finding.title}</p><p className="mt-1 text-sm opacity-90">{finding.detail}</p></div>)}
                        {item.segments.map((segment) => (
                          <div key={segment.number} className="space-y-2 rounded-lg border border-slate-700 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="min-w-0 break-all font-mono font-semibold text-cyan-200">{segment.decoded}</p>
                              <p className="shrink-0 text-xs text-slate-400">{segment.length} chars · {segment.words} word(s)</p>
                            </div>
                            <p className="break-all text-xs text-slate-500">Path segment {segment.number}: {segment.raw}</p>
                            {segment.findings.map((finding, findingIndex) => <div key={finding.title + findingIndex} className={"rounded-lg border p-3 " + findingStyle(finding.kind)}><p className="font-semibold">{finding.title}</p><p className="mt-1 text-sm opacity-90">{finding.detail}</p></div>)}
                          </div>
                        ))}
                      </section>
                    ))}
                  </div>
                  <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">These are observable URL-format notes, not a ranking grade. There is no universal ideal slug length, and this tool cannot determine whether a URL is live, canonical, indexed or receiving search traffic.</p>
                </>
              )}
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="text-xl font-bold text-white">Readable URL conventions</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
              <li>Prefer simple, descriptive words that make sense to your audience.</li>
              <li>Use hyphens between words when appropriate; Google recommends them over underscores.</li>
              <li>Keep casing consistent because URL paths can be case-sensitive.</li>
              <li>Review unnecessary query parameters, but keep those needed by the page.</li>
            </ul>
            <a className="mt-4 inline-block font-semibold text-cyan-200 underline" href="https://developers.google.com/search/docs/crawling-indexing/url-structure" target="_blank" rel="noreferrer">Google URL structure guidance</a>
          </ToolCard>
          <ToolCard>
            <h2 className="text-xl font-bold text-white">Use with the slug generator</h2>
            <p className="mt-3 leading-7 text-slate-300">This checker reviews existing URL text; it does not rename pages or verify server behavior. To create a new slug from a title or phrase, use the <Link href="/slug-generator" className="font-semibold text-cyan-200 underline">Slug Generator</Link>.</p>
            <p className="mt-3 leading-7 text-slate-300">For a page crawl that checks links and HTTP responses, use the <Link href="/broken-link-checker" className="font-semibold text-cyan-200 underline">Broken Link Checker</Link>.</p>
          </ToolCard>
        </div>
      </main>
      <Footer />
    </>
  );
}
