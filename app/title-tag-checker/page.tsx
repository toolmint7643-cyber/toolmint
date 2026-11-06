"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type InputMode = "url" | "html" | "text";

type TitleAnalysis = {
  mode: InputMode;
  titles: string[];
  description: string;
  ogTitle: string;
  twitterTitle: string;
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
    <title>Free JSON Formatter Online | ToolMint</title>
    <meta name="description" content="Format JSON with readable indentation in your browser." />
    <meta property="og:title" content="Free JSON Formatter Online | ToolMint" />
    <meta name="twitter:title" content="Free JSON Formatter Online | ToolMint" />
  </head>
  <body>
    <h1>JSON Formatter</h1>
  </body>
</html>`;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getMetaContent(documentNode: Document, key: string, attribute: "name" | "property") {
  const meta = Array.from(documentNode.querySelectorAll("meta")).find(
    (element) => element.getAttribute(attribute)?.toLowerCase() === key,
  );
  return normalizeWhitespace(meta?.getAttribute("content") || "");
}

function parseHtml(
  html: string,
  mode: InputMode,
  sourceUrl = "",
  httpStatus: number | null = null,
  bodyTruncated = false,
): TitleAnalysis {
  const parsedDocument = new DOMParser().parseFromString(html, "text/html");
  const titles = Array.from(parsedDocument.querySelectorAll("title")).map((element) =>
    normalizeWhitespace(element.textContent || ""),
  );

  return {
    mode,
    titles,
    description: getMetaContent(parsedDocument, "description", "name"),
    ogTitle: getMetaContent(parsedDocument, "og:title", "property"),
    twitterTitle: getMetaContent(parsedDocument, "twitter:title", "name"),
    sourceUrl,
    httpStatus,
    bodyTruncated,
  };
}

function titleCharacterCount(value: string) {
  return Array.from(value).length;
}

export default function TitleTagCheckerPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [titleText, setTitleText] = useState("");
  const [analysis, setAnalysis] = useState<TitleAnalysis | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedTitle = useMemo(() => {
    if (!analysis) return "";
    return analysis.titles.find(Boolean) || "";
  }, [analysis]);

  const titleState = useMemo(() => {
    if (!analysis) return null;
    if (analysis.mode === "text") {
      return selectedTitle ? "Title text provided" : "No title text entered";
    }
    if (analysis.titles.length === 0) return "No title tag found";
    if (!analysis.titles.some(Boolean)) return "Title tag is empty";
    if (analysis.titles.length > 1) return "Multiple title tags found";
    return "One title tag found";
  }, [analysis, selectedTitle]);

  const report = useMemo(() => {
    if (!analysis) return "";
    const titleLine = selectedTitle || "No non-empty title text found";
    return [
      "ToolMint Title Tag Check",
      `Source: ${analysis.sourceUrl || (analysis.mode === "text" ? "Manual title text" : "Pasted HTML")}`,
      analysis.httpStatus === null ? "" : `HTTP status: ${analysis.httpStatus}`,
      `Title elements found: ${analysis.mode === "text" ? "Not applicable to manual text" : analysis.titles.length}`,
      `Title text: ${titleLine}`,
      `Title characters: ${selectedTitle ? titleCharacterCount(selectedTitle) : 0}`,
      `Meta description: ${analysis.description || "Not found"}`,
      `og:title: ${analysis.ogTitle || "Not found"}`,
      `twitter:title: ${analysis.twitterTitle || "Not found"}`,
      analysis.bodyTruncated ? "Note: fetched HTML response was truncated at the size limit." : "",
      "This check examines supplied text or fetched HTML source. It is not a Google ranking score or a rendered-browser inspection.",
    ]
      .filter(Boolean)
      .join("\n");
  }, [analysis, selectedTitle]);

  const analyzeHtml = () => {
    if (!html.trim()) {
      setError("Paste HTML source first, or load the sample to test the checker.");
      setAnalysis(null);
      return;
    }
    setError("");
    setNotice("");
    setAnalysis(parseHtml(html, "html"));
  };

  const fetchAndCheckUrl = async () => {
    if (!url.trim()) {
      setError("Enter a public webpage URL to check.");
      setAnalysis(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setNotice("");
    setAnalysis(null);

    try {
      const response = await fetch(
        `/api/title-tag-checker?url=${encodeURIComponent(url.trim())}`,
      );
      const result = (await response.json()) as FetchResult;

      if (!response.ok || typeof result.html !== "string") {
        const message =
          typeof result.error === "string"
            ? result.error
            : "Unable to inspect this webpage.";
        throw new Error(message);
      }

      const sourceUrl = typeof result.sourceUrl === "string" ? result.sourceUrl : url.trim();
      const status = typeof result.status === "number" ? result.status : null;
      const bodyTruncated = result.bodyTruncated === true;
      setAnalysis(parseHtml(result.html, "url", sourceUrl, status, bodyTruncated));
      setNotice(
        "The checker inspected the fetched HTML response. It does not run the target website's JavaScript.",
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to inspect this webpage. The site may block public requests.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeTitleText = () => {
    const cleanedTitle = normalizeWhitespace(titleText);
    if (!cleanedTitle) {
      setError("Enter title text to inspect its character count and preview.");
      setAnalysis(null);
      return;
    }

    setError("");
    setNotice("");
    setAnalysis({
      mode: "text",
      titles: [cleanedTitle],
      description: "",
      ogTitle: "",
      twitterTitle: "",
      sourceUrl: "",
      httpStatus: null,
      bodyTruncated: false,
    });
  };

  const loadSample = () => {
    setMode("html");
    setHtml(sampleHtml);
    setError("");
    setNotice("");
    setAnalysis(null);
  };

  const clearAll = () => {
    setUrl("");
    setHtml("");
    setTitleText("");
    setAnalysis(null);
    setError("");
    setNotice("");
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      window.alert("Title tag report copied.");
    } catch {
      window.alert("Could not copy the report. Check browser clipboard permissions.");
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🏷️ Title Tag Checker"
          description="Inspect a webpage title tag, compare social title metadata, or review title text before publishing."
        />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Check a page title</h2>
                <p className="mt-2 text-slate-300">
                  Choose a public URL, paste HTML source, or inspect a title string.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Title check input type">
                {([
                  ["url", "Public URL"],
                  ["html", "Paste HTML"],
                  ["text", "Title Text"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    onClick={() => {
                      setMode(value);
                      setError("");
                      setNotice("");
                    }}
                    className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      mode === value
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "url" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Public webpage URL
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void fetchAndCheckUrl();
                    }}
                    placeholder="https://example.com/page"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">
                    Public pages only. The request uses ToolMint&apos;s protected fetch endpoint; private and local network targets are blocked.
                  </span>
                </label>
              )}

              {mode === "html" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    HTML source
                  </span>
                  <textarea
                    value={html}
                    onChange={(event) => setHtml(event.target.value)}
                    placeholder={'Paste page source containing <title>...</title>'}
                    className="min-h-64 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">
                    Pasted HTML is analyzed in your browser and is not sent to the URL-fetch endpoint.
                  </span>
                </label>
              )}

              {mode === "text" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Title text
                  </span>
                  <input
                    type="text"
                    value={titleText}
                    onChange={(event) => setTitleText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") analyzeTitleText();
                    }}
                    placeholder="Enter a proposed page title"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                  <span className="mt-2 block text-sm text-slate-400">
                    This mode checks the supplied string only; it cannot confirm a title tag exists on a webpage.
                  </span>
                </label>
              )}

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">
                  {error}
                </p>
              )}

              {notice && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100" role="status">
                  {notice}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {mode === "url" && (
                  <Button onClick={fetchAndCheckUrl} disabled={isLoading}>
                    {isLoading ? "Fetching page..." : "Fetch & Check Title"}
                  </Button>
                )}
                {mode === "html" && (
                  <Button onClick={analyzeHtml}>Analyze HTML</Button>
                )}
                {mode === "text" && (
                  <Button onClick={analyzeTitleText}>Check Title Text</Button>
                )}
                <Button onClick={loadSample} variant="secondary">
                  Load Sample
                </Button>
                <Button onClick={clearAll} variant="secondary">
                  Clear
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Check Results</h2>
                <p className="mt-2 text-slate-300" aria-live="polite">
                  {titleState || "Choose an input and run a check to see results."}
                </p>
              </div>

              {analysis ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <p className="text-sm text-slate-400">
                        {analysis.mode === "text" ? "Supplied title characters" : "Title elements found"}
                      </p>
                      <p className="mt-1 text-3xl font-bold text-blue-300">
                        {analysis.mode === "text"
                          ? titleCharacterCount(selectedTitle)
                          : analysis.titles.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <p className="text-sm text-slate-400">HTTP response</p>
                      <p className="mt-1 text-2xl font-bold text-slate-100">
                        {analysis.httpStatus === null ? "Not applicable" : analysis.httpStatus}
                      </p>
                    </div>
                  </div>

                  {analysis.sourceUrl && (
                    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <p className="text-sm text-slate-400">Fetched page</p>
                      <p className="mt-1 break-all text-slate-100">{analysis.sourceUrl}</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5">
                    <p className="text-sm font-semibold text-blue-200">Title text</p>
                    <p className="mt-2 break-words text-xl font-bold text-white">
                      {selectedTitle || "No non-empty title text found"}
                    </p>
                    {selectedTitle && (
                      <p className="mt-2 text-sm text-blue-100">
                        {titleCharacterCount(selectedTitle)} characters
                      </p>
                    )}
                  </div>

                  {analysis.mode !== "text" && analysis.titles.length > 1 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <h3 className="font-semibold text-amber-100">All title elements</h3>
                      <ol className="mt-2 list-inside list-decimal space-y-2 text-amber-50">
                        {analysis.titles.map((item, index) => (
                          <li key={`${index}-${item}`} className="break-words">
                            {item || "(empty title element)"}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {analysis.mode !== "text" && (
                    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <h3 className="font-semibold text-white">Related title metadata</h3>
                      <p className="break-words text-sm text-slate-300">
                        <span className="font-semibold text-slate-100">Meta description:</span>{" "}
                        {analysis.description || "Not found in the supplied HTML."}
                      </p>
                      <p className="break-words text-sm text-slate-300">
                        <span className="font-semibold text-slate-100">og:title:</span>{" "}
                        {analysis.ogTitle || "Not found."}
                        {analysis.ogTitle && selectedTitle && (
                          <span className="text-slate-400">
                            {analysis.ogTitle === selectedTitle ? " (same text)" : " (different text)"}
                          </span>
                        )}
                      </p>
                      <p className="break-words text-sm text-slate-300">
                        <span className="font-semibold text-slate-100">twitter:title:</span>{" "}
                        {analysis.twitterTitle || "Not found."}
                        {analysis.twitterTitle && selectedTitle && (
                          <span className="text-slate-400">
                            {analysis.twitterTitle === selectedTitle ? " (same text)" : " (different text)"}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {analysis.bodyTruncated && (
                    <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                      The fetched HTML exceeded the response limit and was truncated. Results describe only the received source.
                    </p>
                  )}

                  <Button onClick={copyReport} variant="secondary">
                    Copy Report
                  </Button>
                </>
              ) : (
                <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">
                  Title-tag findings will appear here after analysis.
                </div>
              )}
            </div>
          </ToolCard>
        </div>

        <section className="mt-10 space-y-8 border-t border-slate-800 pt-8" aria-labelledby="title-tag-guide">
          <div>
            <h2 id="title-tag-guide" className="text-2xl font-bold text-white">
              Title Tag Checker: How to Inspect a Page Title
            </h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-300">
              An HTML title element names a document and can be used when search engines create a result title. Use this checker to inspect the title element in a fetched public HTML response or pasted source, review related social title fields, and count characters in proposed title text.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-white">Three ways to check a title</h3>
              <ol className="mt-3 list-inside list-decimal space-y-2 leading-7 text-slate-300">
                <li>Enter a public webpage URL and fetch its HTML response.</li>
                <li>Paste HTML source to analyze it locally in the browser.</li>
                <li>Enter a proposed title string to inspect its text and character count.</li>
                <li>Review title elements and compare any og:title or twitter:title values shown.</li>
              </ol>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Title length is not a pass/fail score</h3>
              <p className="mt-3 leading-7 text-slate-300">
                This checker reports the character count but does not label a title as universally ideal or too long based on a fixed threshold. Google can truncate title links to fit device width and may generate them from multiple page signals. Make the title descriptive, page-specific and useful to people who see it. Read Google&apos;s{" "}
                <a className="font-semibold text-blue-300 hover:text-blue-200" href="https://developers.google.com/search/docs/appearance/title-link" target="_blank" rel="noreferrer">title link guidance</a>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Title tag and social titles</h3>
              <p className="mt-3 leading-7 text-slate-300">
                The HTML title element, Open Graph og:title and Twitter/X twitter:title are separate metadata fields. They may contain the same text or different text. The tool reports what it finds; a difference is informational and is not automatically an error.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Source and fetch limitations</h3>
              <p className="mt-3 leading-7 text-slate-300">
                URL mode reads a bounded public HTML response and does not execute the target page&apos;s JavaScript. Some sites block automated requests, and a JavaScript-rendered title may not appear in the initial source. Pasted HTML and title text are processed in the browser; URL mode sends the requested public URL to ToolMint&apos;s protected fetch endpoint.
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Related SEO tools</h3>
            <p className="mt-3 leading-7 text-slate-300">
              Continue with the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/meta-description-generator">Meta Description Generator</Link> to draft a description, the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/google-serp-preview-generator">Google SERP Preview Generator</Link> to view an approximate snippet layout, or the <Link className="font-semibold text-blue-300 hover:text-blue-200" href="/open-graph-preview-generator">Open Graph Preview Generator</Link> to inspect social-sharing metadata.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
