"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import robotsParser from "robots-parser";

type InputMode = "fetch" | "paste" | "upload";
type FetchPayload = {
  sourceUrl?: string;
  finalUrl?: string;
  status?: number;
  statusText?: string;
  text?: string;
  error?: string;
};
type RuleSummary = {
  userAgents: string[];
  allow: number;
  disallow: number;
  sitemap: string[];
  crawlDelay: string[];
  unknown: number;
  warnings: string[];
};

const MAX_TEXT_BYTES = 512 * 1024;
const ROBOTS_SAMPLE = `User-agent: *
Disallow: /private/
Allow: /private/public.html
Disallow: /*.pdf$
Sitemap: https://example.com/sitemap.xml

User-agent: Googlebot
Disallow: /preview/`;
const USER_AGENT_OPTIONS = [
  { label: "All crawlers (*)", value: "*" },
  { label: "Googlebot", value: "Googlebot" },
  { label: "Googlebot-Image", value: "Googlebot-Image" },
  { label: "Google-Extended", value: "Google-Extended" },
  { label: "Bingbot", value: "Bingbot" },
  { label: "Custom product token", value: "custom" },
];

function summarizeRules(text: string): RuleSummary {
  const summary: RuleSummary = {
    userAgents: [], allow: 0, disallow: 0, sitemap: [], crawlDelay: [], unknown: 0, warnings: [],
  };
  let groupHasRules = false;
  const known = new Set(["user-agent", "allow", "disallow", "sitemap", "crawl-delay", "host"]);

  if (!text.trim()) summary.warnings.push("The robots.txt file is empty and contains no directives.");

  text.replace(/^\uFEFF/, "").split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.split("#", 1)[0].trim();
    if (!line) return;
    const separator = line.indexOf(":");
    if (separator < 1) {
      summary.warnings.push(`Line ${index + 1} has no directive separator (:).`);
      return;
    }

    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!known.has(key)) summary.unknown += 1;

    if (key === "user-agent") {
      if (!value) summary.warnings.push(`Line ${index + 1} has an empty User-agent value.`);
      if (groupHasRules) groupHasRules = false;
      if (value && !summary.userAgents.some((agent) => agent.toLowerCase() === value.toLowerCase())) {
        summary.userAgents.push(value);
      }
      return;
    }

    if ((key === "allow" || key === "disallow") && !summary.userAgents.length) {
      summary.warnings.push(`Line ${index + 1} has a ${key} rule before any User-agent directive.`);
    }
    if (key === "allow" && value) { summary.allow += 1; groupHasRules = true; }
    if (key === "disallow" && value) { summary.disallow += 1; groupHasRules = true; }
    if (key === "disallow" && !value) {
      summary.warnings.push(`Line ${index + 1} has an empty Disallow value; it does not block a path.`);
    }
    if (key === "sitemap") {
      try {
        const sitemapUrl = new URL(value);
        if (sitemapUrl.protocol === "http:" || sitemapUrl.protocol === "https:") summary.sitemap.push(value);
        else summary.warnings.push(`Line ${index + 1} has a Sitemap URL that is not HTTP or HTTPS.`);
      } catch {
        summary.warnings.push(`Line ${index + 1} has an invalid Sitemap URL.`);
      }
    }
    if (key === "crawl-delay") {
      if (value && Number.isFinite(Number(value)) && Number(value) >= 0) summary.crawlDelay.push(value);
      else summary.warnings.push(`Line ${index + 1} has a non-numeric Crawl-delay value.`);
    }
  });

  if (summary.unknown) {
    summary.warnings.push(`${summary.unknown} unrecognized directive(s) were found. They may be extensions; this is not by itself proof the file is invalid.`);
  }
  return summary;
}

function normalizeSiteUrl(value: string) {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Use an HTTP or HTTPS site URL.");
  return parsed;
}

function getTargetUrl(value: string, siteUrl: URL) {
  const target = value.trim();
  if (!target) throw new Error("Enter a page URL or path to test.");
  let parsed: URL;
  try {
    parsed = new URL(target, siteUrl.origin);
  } catch {
    throw new Error("Enter a valid page URL or path.");
  }
  if (parsed.origin !== siteUrl.origin) throw new Error("The test URL must use the same origin as the robots.txt file.");
  return parsed;
}

function downloadReport(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function readFile(file: File) {
  if (!/\.(txt)$/i.test(file.name) && file.type !== "text/plain") {
    throw new Error("Choose a plain-text .txt robots file.");
  }
  if (file.size > MAX_TEXT_BYTES) throw new Error("The file exceeds the 512 KiB limit.");
  return file.text();
}

export default function RobotsTxtTesterPage() {
  const [mode, setMode] = useState<InputMode>("fetch");
  const [siteInput, setSiteInput] = useState("https://example.com");
  const [sourceInput, setSourceInput] = useState("");
  const [robotsText, setRobotsText] = useState("");
  const [targetInput, setTargetInput] = useState("/");
  const [agent, setAgent] = useState("*");
  const [customAgent, setCustomAgent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [tested, setTested] = useState(false);
  const [fileName, setFileName] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const summary = useMemo(() => summarizeRules(robotsText), [robotsText]);
  const activeAgent = agent === "custom" ? customAgent.trim() : agent;
  const decision = useMemo(() => {
    if (!tested || (!robotsText && !fileName) || !activeAgent) return null;
    if (httpStatus !== null && (httpStatus < 200 || httpStatus >= 300)) return null;
    try {
      const site = normalizeSiteUrl(siteInput);
      const target = getTargetUrl(targetInput, site);
      const parser = robotsParser(new URL("/robots.txt", site.origin).toString(), robotsText);
      const allowed = parser.isAllowed(target.toString(), activeAgent);
      const lineNumber = parser.getMatchingLineNumber(target.toString(), activeAgent);
      const matchingLine = lineNumber > 0 ? robotsText.split(/\r?\n/)[lineNumber - 1]?.trim() || "" : "";
      const crawlDelay = parser.getCrawlDelay(activeAgent);
      return { allowed, target, lineNumber, matchingLine, crawlDelay, error: "" };
    } catch (decisionError) {
      return {
        allowed: undefined,
        target: null,
        lineNumber: -1,
        matchingLine: "",
        crawlDelay: undefined,
        error: decisionError instanceof Error ? decisionError.message : "Unable to evaluate this URL.",
      };
    }
  }, [activeAgent, fileName, httpStatus, robotsText, siteInput, targetInput, tested]);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  }

  function resetAnalysis(keepText = false) {
    setTested(false);
    setError("");
    setResultMessage("");
    setHttpStatus(null);
    setSourceUrl("");
    if (!keepText) {
      setRobotsText("");
      setFileName("");
    }
  }

  function setLoadedText(text: string, label: string, fetchedStatus: number | null = null, url = "") {
    if (new TextEncoder().encode(text).byteLength > MAX_TEXT_BYTES) {
      setError("The robots.txt content exceeds the 512 KiB limit.");
      return;
    }
    setRobotsText(text);
    setFileName(label);
    setSourceUrl(url);
    setHttpStatus(fetchedStatus);
    setTested(true);
    setError("");
    setResultMessage("Robots rules loaded. Test a URL path against the selected crawler.");
  }

  async function fetchRobots() {
    setError("");
    setResultMessage("");
    setTested(false);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const site = normalizeSiteUrl(sourceInput);
      setSiteInput(site.origin);
      const response = await fetch(`/api/robots-txt-tester?url=${encodeURIComponent(site.origin)}`, { signal: controller.signal });
      const payload = await response.json() as FetchPayload;
      if (!response.ok || payload.status === undefined) throw new Error(payload.error || "Unable to fetch robots.txt.");
      if (payload.status >= 200 && payload.status < 300) {
        setLoadedText(payload.text || "", "Fetched robots.txt", payload.status, payload.finalUrl || payload.sourceUrl || "");
        showNotice("robots.txt fetched successfully.");
      } else {
        setRobotsText("");
        setFileName("robots.txt unavailable");
        setSourceUrl(payload.finalUrl || payload.sourceUrl || "");
        setHttpStatus(payload.status);
        setTested(true);
        setResultMessage(`The server returned HTTP ${payload.status}${payload.statusText ? ` ${payload.statusText}` : ""}. No rules were parsed.`);
      }
    } catch (fetchError) {
      if (controller.signal.aborted) setResultMessage("Fetch cancelled.");
      else setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch robots.txt.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function testRules() {
    setError("");
    setResultMessage("");
    try {
      if (httpStatus !== null && (httpStatus < 200 || httpStatus >= 300)) {
        throw new Error("The fetched robots.txt response was unavailable, so there are no rules to test.");
      }
      if (!robotsText.trim() && !fileName) throw new Error("Paste or fetch robots.txt content before testing.");
      if (!activeAgent) throw new Error("Enter a crawler product token.");
      if (new TextEncoder().encode(robotsText).byteLength > MAX_TEXT_BYTES) throw new Error("The robots.txt content exceeds the 512 KiB limit.");
      normalizeSiteUrl(siteInput);
      getTargetUrl(targetInput, normalizeSiteUrl(siteInput));
      setTested(true);
      setError("");
      setResultMessage("Rules evaluated locally in your browser.");
    } catch (testError) {
      setTested(false);
      setError(testError instanceof Error ? testError.message : "Unable to test these rules.");
    }
  }

  async function loadFile(file?: File) {
    if (!file) return;
    try {
      const text = await readFile(file);
      setLoadedText(text, file.name);
      if (fileRef.current) fileRef.current.value = "";
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Unable to read this file.");
    }
  }

  function loadSample() {
    setMode("paste");
    setSiteInput("https://example.com");
    setSourceInput("https://example.com");
    setTargetInput("/private/public.html");
    setAgent("*");
    setCustomAgent("");
    setLoadedText(ROBOTS_SAMPLE, "Built-in sample");
    showNotice("Sample robots.txt loaded.");
  }

  function resetAll() {
    abortRef.current?.abort();
    setMode("fetch");
    setSiteInput("https://example.com");
    setSourceInput("");
    setTargetInput("/");
    setAgent("*");
    setCustomAgent("");
    setRobotsText("");
    setFileName("");
    setSourceUrl("");
    setHttpStatus(null);
    setTested(false);
    setLoading(false);
    setError("");
    setNotice("");
    setResultMessage("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const report = useMemo(() => {
    const lines = [
      "ToolMint Robots.txt Tester report",
      `Source: ${sourceUrl || fileName || "Pasted robots.txt"}`,
      `HTTP status: ${httpStatus ?? "Not fetched"}`,
      `Crawler product token: ${activeAgent || "Not selected"}`,
      `Test URL: ${decision?.target?.toString() || targetInput}`,
      `Decision: ${decision?.allowed === true ? "Allowed" : decision?.allowed === false ? "Disallowed" : "Not evaluated"}`,
      `Matching rule: ${decision?.matchingLine || "No matching rule"}`,
      `Matching line: ${decision && decision.lineNumber > 0 ? decision.lineNumber : "None"}`,
      `User-agent groups/tokens: ${summary.userAgents.join(", ") || "None"}`,
      `Allow rules: ${summary.allow}`,
      `Non-empty Disallow rules: ${summary.disallow}`,
      `Sitemaps: ${summary.sitemap.join(", ") || "None"}`,
      `Parser crawl delay: ${decision?.crawlDelay ?? "Not specified"}`,
      `Notes: ${summary.warnings.join(" | ") || "None"}`,
      "robots.txt is a crawler request, not access control. Crawlers may apply their own behavior.",
    ];
    return lines.join("\n");
  }, [activeAgent, decision, fileName, httpStatus, sourceUrl, summary, targetInput]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report);
      showNotice("Report copied.");
    } catch {
      setError("Clipboard access was blocked. Use Download report instead.");
    }
  }

  const tabs: { id: InputMode; label: string }[] = [
    { id: "fetch", label: "Fetch robots.txt" },
    { id: "paste", label: "Paste text" },
    { id: "upload", label: "Upload file" },
  ];

  return (
    <>
      <Header />
      {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-emerald-950 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-xl">{notice}</div>}
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageTitle
            title="🤖 Robots.txt Tester"
            description="Test whether a URL path is allowed or disallowed for a crawler product token, inspect the matching rule and review sitemap directives. Fetch a public robots.txt file or analyze text locally."
          />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <ToolCard>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Robots.txt Source</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Robots.txt source method">
                  {tabs.map((tab) => (
                    <button key={tab.id} type="button" aria-pressed={mode === tab.id} onClick={() => { setMode(tab.id); resetAnalysis(false); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${mode === tab.id ? "border-blue-400 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-blue-400"}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "fetch" && (
                <div>
                  <label htmlFor="robots-site-fetch" className="mb-2 block font-semibold text-slate-200">Public website URL</label>
                  <input id="robots-site-fetch" type="url" inputMode="url" value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !loading) void fetchRobots(); }} placeholder="https://example.com" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                  <p className="mt-2 text-sm text-slate-400">The tool requests the website&apos;s root <code>/robots.txt</code>. This protected endpoint blocks local and private network addresses.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!loading ? <Button onClick={() => void fetchRobots()}>Fetch robots.txt</Button> : <Button variant="danger" onClick={() => abortRef.current?.abort()}>Cancel fetch</Button>}
                    <Button variant="secondary" onClick={loadSample} disabled={loading}>Load sample</Button>
                    <Button variant="secondary" onClick={resetAll} disabled={loading}>Reset</Button>
                  </div>
                </div>
              )}

              {mode === "paste" && (
                <div>
                  <label htmlFor="robots-source-text" className="mb-2 block font-semibold text-slate-200">robots.txt content</label>
                  <textarea id="robots-source-text" value={robotsText} onChange={(event) => { setRobotsText(event.target.value); setFileName("Pasted robots.txt"); setSourceUrl(""); setHttpStatus(null); setTested(false); }} placeholder={'User-agent: *\nDisallow: /private/\nAllow: /private/public.html\nSitemap: https://example.com/sitemap.xml'} className="min-h-64 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" spellCheck={false} />
                  <label htmlFor="robots-site-paste" className="mb-2 mt-4 block font-semibold text-slate-200">Site URL for matching rules</label>
                  <input id="robots-site-paste" type="url" value={siteInput} onChange={(event) => { setSiteInput(event.target.value); setTested(false); }} placeholder="https://example.com" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={testRules}>Test rules</Button>
                    <Button variant="secondary" onClick={loadSample}>Load sample</Button>
                    <Button variant="secondary" onClick={resetAll}>Reset</Button>
                  </div>
                </div>
              )}

              {mode === "upload" && (
                <div>
                  <label htmlFor="robots-file" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0]); }} className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500/60 bg-slate-950 px-5 text-center transition hover:border-blue-300 hover:bg-slate-900">
                    <span className="text-4xl" aria-hidden="true">📄</span>
                    <span className="mt-3 text-lg font-bold">Drop a robots.txt file or choose file</span>
                    <span className="mt-1 text-sm text-slate-400">Plain-text .txt file, up to 512 KiB. Parsed in your browser.</span>
                    <input ref={fileRef} id="robots-file" type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} />
                  </label>
                  {fileName && <p className="mt-3 break-all text-sm text-slate-300">Loaded: {fileName}</p>}
                  <label htmlFor="robots-site-upload" className="mb-2 mt-4 block font-semibold text-slate-200">Site URL for matching rules</label>
                  <input id="robots-site-upload" type="url" value={siteInput} onChange={(event) => { setSiteInput(event.target.value); setTested(false); }} placeholder="https://example.com" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
                  <div className="mt-4 flex flex-wrap gap-3"><Button onClick={testRules}>Test rules</Button><Button variant="secondary" onClick={resetAll}>Reset</Button></div>
                </div>
              )}

              {loading && <p role="status" className="mt-4 text-sm font-semibold text-blue-200">Fetching the root robots.txt file…</p>}
              {resultMessage && <p role="status" className="mt-4 rounded-lg border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-blue-100">{resultMessage}</p>}
              {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
              {sourceUrl && <p className="mt-3 break-all text-xs text-slate-500">Fetched URL: {sourceUrl}</p>}
            </ToolCard>

            <div className="space-y-6">
              <ToolCard>
                <h2 className="text-2xl font-bold">URL Rule Test</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">The selected product token is compared with the rules in the loaded file. This is a local parser result, not a live Google/Bing crawl decision.</p>
                <label htmlFor="robots-agent" className="mb-2 mt-5 block font-semibold text-slate-200">Crawler product token</label>
                <select id="robots-agent" value={agent} onChange={(event) => { setAgent(event.target.value); setTested(false); }} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500">
                  {USER_AGENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {agent === "custom" && <input aria-label="Custom crawler product token" value={customAgent} onChange={(event) => { setCustomAgent(event.target.value); setTested(false); }} placeholder="ExampleBot" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500" />}
                <label htmlFor="robots-target" className="mb-2 mt-4 block font-semibold text-slate-200">Page URL or path</label>
                <input id="robots-target" value={targetInput} onChange={(event) => { setTargetInput(event.target.value); setTested(false); }} onKeyDown={(event) => { if (event.key === "Enter") testRules(); }} placeholder="/private/report.pdf" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500" />
                <div className="mt-4 flex flex-wrap gap-3"><Button onClick={testRules} disabled={(!robotsText.trim() && !fileName) || (httpStatus !== null && (httpStatus < 200 || httpStatus >= 300))}>Test URL</Button><Button variant="secondary" onClick={() => { setTargetInput("/"); setTested(false); }}>Test homepage</Button></div>

                {decision && !decision.error && decision.allowed !== undefined && (
                  <div className={`mt-5 rounded-xl border p-4 ${decision.allowed ? "border-emerald-400/30 bg-emerald-400/10" : "border-rose-400/30 bg-rose-400/10"}`}>
                    <p className={`text-lg font-bold ${decision.allowed ? "text-emerald-200" : "text-rose-200"}`}>{decision.allowed ? "Allowed" : "Disallowed"}</p>
                    <p className="mt-1 break-all text-sm text-slate-200">{decision.target?.toString()}</p>
                    <p className="mt-3 text-sm text-slate-300">{decision.lineNumber > 0 ? <>Matched line {decision.lineNumber}: <code className="break-all text-white">{decision.matchingLine}</code></> : "No matching Allow/Disallow rule was found; the parser returns allowed by default."}</p>
                    {decision.crawlDelay !== undefined && <p className="mt-2 text-sm text-slate-300">Parser-reported crawl delay for this token: {decision.crawlDelay} seconds.</p>}
                  </div>
                )}
                {decision?.error && <p role="alert" className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{decision.error}</p>}
                {tested && httpStatus !== null && (httpStatus < 200 || httpStatus >= 300) && (
                  <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                    <strong>HTTP {httpStatus}: robots.txt unavailable.</strong>{" "}
                    {httpStatus >= 500
                      ? "RFC 9309 says crawlers should assume complete disallow while a server error makes the file unreachable. Crawler implementations can vary."
                      : "RFC 9309 classifies 4xx responses as unavailable; crawlers may access resources, but this is not a positive configuration check."}
                  </div>
                )}
              </ToolCard>

              <ToolCard>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-2xl font-bold">File Summary</h2><p className="mt-1 text-sm text-slate-400">{fileName || "No robots.txt loaded"}{httpStatus !== null ? ` · HTTP ${httpStatus}` : ""}</p></div>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">{new TextEncoder().encode(robotsText).byteLength.toLocaleString()} bytes</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="User-agent tokens" value={summary.userAgents.length} />
                  <Stat label="Allow rules" value={summary.allow} />
                  <Stat label="Disallow rules" value={summary.disallow} />
                  <Stat label="Sitemap entries" value={summary.sitemap.length} />
                  <Stat label="Unknown directives" value={summary.unknown} />
                  <Stat label="Notes" value={summary.warnings.length} />
                </div>
                {summary.sitemap.length > 0 && <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3"><h3 className="font-semibold text-slate-200">Sitemap directives</h3><ul className="mt-2 space-y-1 text-sm text-cyan-200">{summary.sitemap.map((url) => <li key={url} className="break-all">{url}</li>)}</ul></div>}
                {summary.warnings.length > 0 && <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/5 p-3"><h3 className="font-semibold text-amber-100">Review notes</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-5 text-amber-100/80">{summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
                <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => void copyReport()}>Copy report</Button><Button variant="secondary" onClick={() => downloadReport("robots-txt-test-report.txt", report)}>Download report</Button></div>
              </ToolCard>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ToolCard><h2 className="mb-2 text-xl font-bold">🔎 How to use the result</h2><p className="text-sm leading-6 text-slate-300">The tool reports which Allow or Disallow rule the selected product token matches in the supplied file. Path matching is case-sensitive. A matching Allow rule can override a less-specific Disallow rule; the parser applies its own RFC-oriented matching behavior.</p></ToolCard>
            <ToolCard><h2 className="mb-2 text-xl font-bold">⚠️ Important limitation</h2><p className="text-sm leading-6 text-slate-300">robots.txt is a crawler request, not access control. It does not protect private pages, guarantee indexing, or prove what a search engine has crawled. Crawlers may interpret extensions differently or ignore the file.</p></ToolCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-3"><p className="text-xs leading-5 text-slate-400">{label}</p><p className="mt-1 break-words text-2xl font-bold text-white">{value}</p></div>;
}
