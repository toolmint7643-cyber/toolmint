"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputMode = "format" | "minify";

const sampleHtml = `<div class="card"><header><h1>ToolMint</h1><p>Free developer tools</p></header><main><a href="https://toolmint.com">Visit site</a><img src="/logo.png" alt="ToolMint logo"><ul><li>Fast</li><li>Free</li><li>Mobile friendly</li></ul></main></div>`;

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function getTagName(token: string) {
  const match = token.match(/^<\/?\s*([a-zA-Z0-9-]+)/);
  return match ? match[1].toLowerCase() : "";
}

function tokenizeHtml(html: string) {
  return html
    .replace(/>\s*</g, "><")
    .match(/<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[^>]+>|[^<]+/gi) || [];
}

function formatHtml(html: string, indentSize: number) {
  if (!html.trim()) return "";

  const tokens = tokenizeHtml(html);
  let indent = 0;
  const lines: string[] = [];
  const indentText = " ".repeat(indentSize);

  tokens.forEach((rawToken) => {
    const token = rawToken.trim();

    if (!token) return;

    const isClosingTag = /^<\//.test(token);
    const isOpeningTag = /^<[^/!][^>]*>$/.test(token);
    const isComment = /^<!--/.test(token);
    const isDoctype = /^<!DOCTYPE/i.test(token);
    const isSelfClosing = /\/>$/.test(token);
    const tagName = getTagName(token);
    const isVoid = voidTags.has(tagName);

    if (isClosingTag) {
      indent = Math.max(indent - 1, 0);
    }

    lines.push(`${indentText.repeat(indent)}${token}`);

    if (
      isOpeningTag &&
      !isClosingTag &&
      !isSelfClosing &&
      !isVoid &&
      !isComment &&
      !isDoctype
    ) {
      indent += 1;
    }
  });

  return lines.join("\n");
}

function minifyHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function analyzeHtml(html: string) {
  const tags = html.match(/<\/?[a-zA-Z][^>]*>/g) || [];
  const links = html.match(/<a\s+[^>]*href=/gi) || [];
  const images = html.match(/<img\s+[^>]*>/gi) || [];
  const comments = html.match(/<!--[\s\S]*?-->/g) || [];

  return {
    tags: tags.length,
    links: links.length,
    images: images.length,
    comments: comments.length,
    size: new TextEncoder().encode(html).length,
  };
}

function validateHtml(html: string) {
  if (!html.trim()) {
    return {
      valid: false,
      message: "Please enter HTML to format.",
    };
  }

  if (typeof DOMParser === "undefined") {
    return {
      valid: true,
      message: "HTML formatted. Browser validation is not available.",
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const parserError = parsed.querySelector("parsererror");

  if (parserError) {
    return {
      valid: false,
      message: "Browser parser found an HTML parsing issue.",
    };
  }

  return {
    valid: true,
    message: "HTML parsed successfully in the browser.",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function HtmlFormatterPage() {
  const [input, setInput] = useState(sampleHtml);
  const [outputMode, setOutputMode] = useState<OutputMode>("format");
  const [indentSize, setIndentSize] = useState(2);

  const output = useMemo(() => {
    return outputMode === "format"
      ? formatHtml(input, indentSize)
      : minifyHtml(input);
  }, [input, outputMode, indentSize]);

  const stats = useMemo(() => analyzeHtml(input), [input]);
  const validation = useMemo(() => validateHtml(input), [input]);

  const copyText = async (label: string, value: string) => {
    if (!value) {
      alert(`Nothing to copy from ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied successfully!`);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  };

  const quickExamples = [
    {
      label: "Landing Section",
      value: `<section><h1>Build Faster</h1><p>Create tools online.</p><a href="/tools">Explore tools</a></section>`,
    },
    {
      label: "HTML List",
      value: `<ul><li>JSON Validator</li><li>HTML Formatter</li><li>Regex Tester</li></ul>`,
    },
    {
      label: "Form HTML",
      value: `<form><label>Email</label><input type="email" placeholder="you@example.com"><button>Subscribe</button></form>`,
    },
    {
      label: "Table HTML",
      value: `<table><tr><th>Tool</th><th>Status</th></tr><tr><td>HTML Formatter</td><td>Done</td></tr></table>`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧩 HTML Formatter"
          description="Format HTML online, beautify HTML code, minify HTML, fix indentation and inspect tags, links and images instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ HTML Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste HTML code here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setInput(sampleHtml)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample HTML
                  </button>

                  <Button onClick={() => copyText("HTML input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ HTML Output
                </h2>

                <div
                  className={`rounded-2xl border p-5 text-center ${
                    validation.valid
                      ? "border-green-700 bg-green-950/30"
                      : "border-red-700 bg-red-950/30"
                  }`}
                >
                  <div
                    className={`text-4xl font-extrabold ${
                      validation.valid ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {validation.valid ? "HTML Ready" : "Check HTML"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutputMode("format")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "format"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Format
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputMode("minify")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "minify"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Minify
                  </button>

                  <select
                    value={indentSize}
                    onChange={(event) => setIndentSize(Number(event.target.value))}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value={2}>2 Spaces</option>
                    <option value={4}>4 Spaces</option>
                  </select>
                </div>

                <pre className="mt-5 min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Formatted or minified HTML will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("HTML output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Tags", stats.tags, "🏷️"],
                ["Links", stats.links, "🔗"],
                ["Images", stats.images, "🖼️"],
                ["Comments", stats.comments, "💬"],
                ["Size", formatBytes(stats.size), "📏"],
              ].map(([label, value, icon]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="mb-2 text-3xl">{icon}</div>
                  <div className="break-words text-3xl font-extrabold text-blue-400">
                    {value}
                  </div>
                  <div className="mt-2 text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick HTML Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This HTML Formatter is designed for quick beautifying and minifying.
              For complex templates with embedded frameworks, always review the
              output before using it in production.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is HTML Formatting?
                </h2>
                <p className="text-slate-300">
                  HTML formatting adds indentation and line breaks to make HTML
                  code easier to read, edit and debug. It helps developers inspect
                  nested tags and page structure quickly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format HTML online, beautify HTML code, minify
                  HTML, inspect links and images, clean snippets and prepare code
                  for websites or emails.
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