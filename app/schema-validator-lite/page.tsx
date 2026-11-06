"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type InputMode = "url" | "html" | "json";
type Level = "pass" | "warning" | "error";
type Finding = { level: Level; title: string; detail: string };
type NodeSummary = { type: string[]; id: string; path: string };
type BlockResult = {
  index: number;
  source: string;
  validJson: boolean;
  nodes: NodeSummary[];
  findings: Finding[];
  preview: string;
};
type AuditResult = {
  blocks: BlockResult[];
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
    <title>ToolMint example</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://example.com/#organization",
          "name": "Example Organization",
          "url": "https://example.com/"
        },
        {
          "@type": "WebSite",
          "@id": "https://example.com/#website",
          "url": "https://example.com/",
          "name": "Example Website",
          "publisher": { "@id": "https://example.com/#organization" }
        }
      ]
    }
    </script>
  </head>
  <body><h1>Example Website</h1></body>
</html>`;

const sampleJson = `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "A sample article",
  "author": {
    "@type": "Person",
    "name": "Example Author"
  }
}`;

function collectTypedNodes(value: unknown, path = "$", nodes: NodeSummary[] = []): NodeSummary[] {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTypedNodes(item, path + "[" + index + "]", nodes));
    return nodes;
  }
  if (!value || typeof value !== "object") return nodes;

  const record = value as Record<string, unknown>;
  const rawType = record["@type"];
  const types = Array.isArray(rawType)
    ? rawType.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : typeof rawType === "string" && rawType.trim()
      ? [rawType.trim()]
      : [];

  if (types.length) {
    nodes.push({
      type: types,
      id: typeof record["@id"] === "string" ? record["@id"].trim() : "",
      path,
    });
  }

  for (const [key, child] of Object.entries(record)) {
    if (key !== "@context" && child && typeof child === "object") {
      collectTypedNodes(child, path + "." + key, nodes);
    }
  }
  return nodes;
}

function getContexts(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const context = (value as Record<string, unknown>)["@context"];
  if (typeof context === "string") return [context];
  if (Array.isArray(context)) return context.filter((item): item is string => typeof item === "string");
  if (context && typeof context === "object") return ["Custom context object"];
  return [];
}

function syntaxLocation(error: unknown, source: string) {
  const message = error instanceof Error ? error.message : "Invalid JSON syntax.";
  const position = message.match(/position\s+(\d+)/i)?.[1];
  if (!position) return message;
  const offset = Number(position);
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  const column = offset - before.lastIndexOf("\n");
  return message + " (line " + line + ", column " + column + ")";
}

function analyzeBlock(raw: string, index: number, source: string): BlockResult {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {
        index, source, validJson: true, nodes: [],
        findings: [{ level: "error", title: "JSON-LD root is not an object or array", detail: "A JSON-LD document should have an object or array at its root." }],
        preview: JSON.stringify(parsed, null, 2),
      };
    }

    const contexts = getContexts(parsed);
    const nodes = collectTypedNodes(parsed);
    const findings: Finding[] = [
      { level: "pass", title: "JSON syntax is valid", detail: "The supplied block parses as JSON." },
    ];

    if (!contexts.length) {
      findings.push({ level: "warning", title: "Top-level @context was not found", detail: "Review the JSON-LD context. Contexts declared only on nested nodes may not be reported as top-level." });
    } else if (contexts.some((item) => /^https?:\/\/schema\.org\/?$/i.test(item))) {
      findings.push({ level: "pass", title: "Schema.org context found", detail: "A standard Schema.org context URL is present at the document root." });
    } else {
      findings.push({ level: "warning", title: "Custom or non-standard context", detail: "A context exists, but this checker does not resolve custom or remote context definitions." });
    }

    if (nodes.length) {
      findings.push({ level: "pass", title: nodes.length + " typed node" + (nodes.length === 1 ? "" : "s") + " detected", detail: "Objects with a non-empty @type value were found." });
    } else {
      findings.push({ level: "warning", title: "No typed schema nodes found", detail: "No object with a non-empty @type value was detected." });
    }

    const idCounts = new Map<string, number>();
    for (const node of nodes) {
      if (node.id) idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1);
    }
    const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
    if (duplicateIds.length) {
      findings.push({ level: "warning", title: "Repeated @id values", detail: duplicateIds.length + " identifier(s) occur more than once. Review whether this is intentional." });
    }

    return { index, source, validJson: true, nodes, findings, preview: JSON.stringify(parsed, null, 2) };
  } catch (error) {
    return {
      index, source, validJson: false, nodes: [],
      findings: [{ level: "error", title: "Invalid JSON syntax", detail: syntaxLocation(error, raw) }],
      preview: raw,
    };
  }
}

function extractJsonLd(html: string): string[] {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return Array.from(documentNode.querySelectorAll("script[type]"))
    .filter((script) => (script.getAttribute("type") || "").split(";")[0].trim().toLowerCase() === "application/ld+json")
    .map((script) => script.textContent || "")
    .filter((block) => block.trim());
}

function analyzeInput(input: string, mode: InputMode, sourceUrl = "", httpStatus: number | null = null, bodyTruncated = false): AuditResult {
  const sources = mode === "json" ? [input.trim()] : extractJsonLd(input);
  return {
    blocks: sources.map((block, index) => analyzeBlock(block, index + 1, mode === "json" ? "Pasted JSON-LD" : "JSON-LD script " + (index + 1))),
    sourceUrl,
    httpStatus,
    bodyTruncated,
  };
}

function levelStyle(level: Level) {
  if (level === "error") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (level === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
}

function makeReport(result: AuditResult) {
  const lines = [
    "ToolMint Schema Validator Lite report",
    "Source: " + (result.sourceUrl || result.blocks[0]?.source || "No source"),
    result.httpStatus === null ? "" : "HTTP status: " + result.httpStatus,
    "JSON-LD blocks: " + result.blocks.length,
    "JSON parse failures: " + result.blocks.filter((block) => !block.validJson).length,
    "Typed nodes: " + result.blocks.reduce((sum, block) => sum + block.nodes.length, 0),
    ...result.blocks.flatMap((block) => [
      "",
      "Block " + block.index + " (" + block.source + ")",
      ...block.findings.map((finding) => finding.level.toUpperCase() + ": " + finding.title + " - " + finding.detail),
      ...block.nodes.map((node) => "  @type " + node.type.join(", ") + " at " + node.path + (node.id ? "; @id " + node.id : "")),
    ]),
    result.bodyTruncated ? "Note: fetched HTML reached the response-size limit; checks cover only the received HTML." : "",
    "This is a limited local JSON-LD structure check. It does not validate all Schema.org vocabulary, Google rich-result requirements, page-content accuracy, or search eligibility.",
  ];
  return lines.filter(Boolean).join("\n");
}

export default function SchemaValidatorLitePage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const report = useMemo(() => result ? makeReport(result) : "", [result]);
  const blockCount = result?.blocks.length || 0;
  const parseErrors = result?.blocks.filter((block) => !block.validJson).length || 0;
  const typedNodes = result?.blocks.reduce((sum, block) => sum + block.nodes.length, 0) || 0;
  const warnings = result?.blocks.flatMap((block) => block.findings).filter((finding) => finding.level === "warning").length || 0;

  function runLocalCheck() {
    const input = mode === "json" ? json : html;
    if (!input.trim()) {
      setError(mode === "json" ? "Paste JSON-LD first, or load the sample." : "Paste page HTML first, or load the sample.");
      setResult(null);
      return;
    }
    const nextResult = analyzeInput(input, mode);
    if (mode !== "json" && !nextResult.blocks.length) {
      setError("No application/ld+json script was found in the supplied HTML.");
      setResult(null);
      return;
    }
    setError("");
    setNotice("Input was parsed locally in your browser.");
    setResult(nextResult);
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
      const response = await fetch("/api/schema-validator-lite?url=" + encodeURIComponent(url.trim()));
      const payload = await response.json() as FetchResult;
      if (!response.ok || typeof payload.html !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Unable to inspect this webpage.");
      }
      const nextResult = analyzeInput(
        payload.html,
        "html",
        typeof payload.sourceUrl === "string" ? payload.sourceUrl : url.trim(),
        typeof payload.status === "number" ? payload.status : null,
        payload.bodyTruncated === true,
      );
      if (!nextResult.blocks.length) {
        setError("No application/ld+json script was found in the fetched HTML source.");
        return;
      }
      setResult(nextResult);
      setNotice("Results describe fetched HTML source; the webpage's JavaScript is not executed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to inspect this webpage.");
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    if (mode === "json") setJson(sampleJson);
    else setHtml(sampleHtml);
    if (mode === "url") setMode("html");
    setResult(null);
    setError("");
    setNotice("");
  }

  function clearAll() {
    setUrl("");
    setHtml("");
    setJson("");
    setResult(null);
    setError("");
    setNotice("");
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      setNotice("Schema report copied.");
    } catch {
      setError("Could not copy the report. Check browser clipboard permissions.");
    }
  }

  function downloadReport() {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "schema-validator-report.txt";
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle title="🧩 Schema Validator Lite" description="Inspect JSON-LD syntax and basic structure from pasted data, HTML source or a public webpage." />
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Inspect structured data</h2>
                <p className="mt-2 text-slate-300">Check JSON-LD syntax, contexts, typed nodes and repeated identifiers.</p>
              </div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Schema input method">
                {(["url", "html", "json"] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={mode === value}
                    onClick={() => { setMode(value); setResult(null); setError(""); setNotice(""); }}
                    className={"min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition " + (mode === value ? "border-blue-500 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400")}>
                    {value === "url" ? "Public URL" : value === "html" ? "Paste HTML" : "JSON-LD"}
                  </button>
                ))}
              </div>
              {mode === "url" ? (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">Public webpage URL</span>
                  <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void fetchUrl(); }} placeholder="https://example.com/page" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500" />
                  <span className="mt-2 block text-sm text-slate-400">Public HTTP/HTTPS pages only. Private and local network targets are blocked.</span>
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">{mode === "html" ? "Page HTML source" : "JSON-LD source"}</span>
                  <textarea value={mode === "html" ? html : json}
                    onChange={(event) => mode === "html" ? setHtml(event.target.value) : setJson(event.target.value)}
                    placeholder={mode === "html" ? "Paste HTML containing application/ld+json scripts" : "Paste a JSON-LD object or array"}
                    className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white outline-none focus:border-blue-500" />
                  <span className="mt-2 block text-sm text-slate-400">Pasted content is parsed locally and is not sent to ToolMint.</span>
                </label>
              )}
              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">{notice}</p>}
              <div className="flex flex-wrap gap-3">
                {mode === "url" ? <Button onClick={fetchUrl} disabled={loading}>{loading ? "Fetching page..." : "Fetch & Validate"}</Button> : <Button onClick={runLocalCheck}>Validate JSON-LD</Button>}
                <Button onClick={loadSample} variant="secondary">Load Sample</Button>
                <Button onClick={clearAll} variant="secondary">Clear</Button>
              </div>
              <p className="text-sm leading-6 text-slate-400">URL mode inspects received HTML only; it does not execute JavaScript. Some sites block automated requests.</p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Validation report</h2>
                  <p className="mt-2 text-slate-300" aria-live="polite">{result ? blockCount + " JSON-LD block" + (blockCount === 1 ? "" : "s") + " inspected" : "Choose an input and run a check."}</p>
                </div>
                {result && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={copyReport}>Copy Report</Button><Button variant="secondary" onClick={downloadReport}>Download TXT</Button></div>}
              </div>
              {!result ? (
                <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">Schema findings will appear here.</div>
              ) : (
                <>
                  {result.sourceUrl && <p className="break-all rounded-xl bg-slate-900 p-3 text-sm text-slate-300">Source: {result.sourceUrl}{result.httpStatus ? " | HTTP " + result.httpStatus : ""}</p>}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["JSON-LD blocks", blockCount], ["Parse errors", parseErrors], ["Typed nodes", typedNodes], ["Review notes", warnings]].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 break-words text-xl font-bold text-white">{value}</p></div>
                    ))}
                  </div>
                  {result.blocks.map((block) => (
                    <section key={block.index} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-4" aria-label={"JSON-LD block " + block.index}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-white">{block.source}</h3>
                        <span className={"rounded-full border px-3 py-1 text-xs font-semibold " + (block.validJson ? "border-emerald-500/30 text-emerald-200" : "border-red-500/30 text-red-200")}>{block.validJson ? "JSON parsed" : "Parse failed"}</span>
                      </div>
                      {block.nodes.length > 0 && <div className="space-y-2"><p className="text-sm font-semibold text-slate-300">Detected types</p>{block.nodes.map((node, index) => <div key={node.path + "-" + index} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 p-3 text-sm"><span className="font-semibold text-cyan-200">{node.type.join(", ")}</span><span className="break-all text-slate-400">{node.id || node.path}</span></div>)}</div>}
                      <div className="space-y-2">{block.findings.map((finding, index) => <div key={finding.title + "-" + index} className={"rounded-lg border p-3 " + levelStyle(finding.level)}><p className="font-semibold">{finding.title}</p><p className="mt-1 text-sm opacity-90">{finding.detail}</p></div>)}</div>
                      <details className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer font-semibold text-slate-200">View parsed JSON</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">{block.preview}</pre></details>
                    </section>
                  ))}
                  {result.bodyTruncated && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">Fetched HTML reached the response-size limit. Only the received portion was inspected.</p>}
                  <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">This Lite check verifies JSON syntax and a few structural signals. It does not validate every Schema.org property/type, Google rich-result requirements, whether markup matches visible content, or eligibility for search enhancements.</p>
                </>
              )}
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="text-xl font-bold text-white">What this checker verifies</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
              <li>JSON-LD blocks parse as JSON objects or arrays.</li>
              <li>Whether a top-level context and typed nodes are present.</li>
              <li>Repeated non-empty @id values in the supplied markup.</li>
              <li>Each detected node&apos;s @type and location in the parsed data.</li>
            </ul>
          </ToolCard>
          <ToolCard>
            <h2 className="text-xl font-bold text-white">For Google rich-result testing</h2>
            <p className="mt-3 leading-7 text-slate-300">Google has feature-specific required fields and general content policies. Use the official Rich Results Test for Google-supported search enhancements, then inspect the deployed page in Search Console. Valid JSON alone does not establish eligibility or guarantee a rich result.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-cyan-200 hover:border-cyan-400" href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer">Google Rich Results Test</a>
              <a className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-cyan-200 hover:border-cyan-400" href="https://developers.google.com/search/docs/appearance/structured-data/sd-policies" target="_blank" rel="noreferrer">Google structured data policies</a>
            </div>
            <p className="mt-4 text-sm text-slate-400">Create JSON-LD with ToolMint&apos;s <Link href="/schema-markup-generator" className="font-semibold text-cyan-200 underline">Schema Markup Generator</Link>.</p>
          </ToolCard>
        </div>
      </main>
      <Footer />
    </>
  );
}
