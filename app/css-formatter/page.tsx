"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputMode = "format" | "minify";

const sampleCss = `.tool-card{background:#0f172a;color:white;border:1px solid #334155;border-radius:16px;padding:24px}.tool-card h2{font-size:24px;font-weight:800;margin-bottom:12px}.tool-card:hover{border-color:#3b82f6}@media (max-width:768px){.tool-card{padding:16px}.tool-card h2{font-size:20px}}`;

function formatCss(css: string, indentSize: number) {
  if (!css.trim()) return "";

  const indentText = " ".repeat(indentSize);
  let indent = 0;

  return css
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => `\n${comment}\n`)
    .replace(/\s*{\s*/g, " {\n")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\s*;\s*/g, ";\n")
    .replace(/\s*,\s*/g, ",\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line === "}") {
        indent = Math.max(indent - 1, 0);
      }

      const formattedLine = `${indentText.repeat(indent)}${line}`;

      if (line.endsWith("{")) {
        indent += 1;
      }

      return formattedLine;
    })
    .join("\n");
}

function minifyCss(css: string) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function analyzeCss(css: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = withoutComments.match(/[^{]+(?=\{)/g) || [];
  const properties = withoutComments.match(/[a-zA-Z-]+\s*:/g) || [];
  const mediaQueries = withoutComments.match(/@media\b/g) || [];
  const comments = css.match(/\/\*[\s\S]*?\*\//g) || [];

  return {
    selectors: selectors.length,
    properties: properties.length,
    mediaQueries: mediaQueries.length,
    comments: comments.length,
    size: new TextEncoder().encode(css).length,
  };
}

function validateCss(css: string) {
  if (!css.trim()) {
    return {
      valid: false,
      message: "Please enter CSS to format.",
    };
  }

  const openBraces = (css.match(/{/g) || []).length;
  const closeBraces = (css.match(/}/g) || []).length;

  if (openBraces !== closeBraces) {
    return {
      valid: false,
      message: "CSS may have unmatched braces. Please check { and }.",
    };
  }

  return {
    valid: true,
    message: "CSS looks ready for formatting.",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CssFormatterPage() {
  const [input, setInput] = useState(sampleCss);
  const [outputMode, setOutputMode] = useState<OutputMode>("format");
  const [indentSize, setIndentSize] = useState(2);

  const output = useMemo(() => {
    return outputMode === "format"
      ? formatCss(input, indentSize)
      : minifyCss(input);
  }, [input, outputMode, indentSize]);

  const stats = useMemo(() => analyzeCss(input), [input]);
  const validation = useMemo(() => validateCss(input), [input]);

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
      label: "Button CSS",
      value: `.button{background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px}.button:hover{background:#1d4ed8}`,
    },
    {
      label: "Card CSS",
      value: `.card{border:1px solid #ddd;border-radius:12px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.08)}.card h2{margin:0 0 12px}`,
    },
    {
      label: "Responsive CSS",
      value: `.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:768px){.grid{grid-template-columns:1fr}}`,
    },
    {
      label: "Form CSS",
      value: `.input{width:100%;border:1px solid #cbd5e1;padding:12px;border-radius:8px}.input:focus{outline:none;border-color:#3b82f6}`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🎨 CSS Formatter"
          description="Format CSS online, beautify CSS code, minify CSS, fix indentation and inspect selectors, properties and media queries instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ CSS Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste CSS code here..."
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
                    onClick={() => setInput(sampleCss)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample CSS
                  </button>

                  <Button onClick={() => copyText("CSS input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ CSS Output
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
                    {validation.valid ? "CSS Ready" : "Check CSS"}
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
                  {output || "Formatted or minified CSS will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("CSS output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Selectors", stats.selectors, "🎯"],
                ["Properties", stats.properties, "🧩"],
                ["Media", stats.mediaQueries, "📱"],
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
                ⚡ Quick CSS Examples
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
              This CSS Formatter is designed for quick beautifying and minifying.
              For complex CSS with advanced syntax, always review the output
              before using it in production.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is CSS Formatting?
                </h2>
                <p className="text-slate-300">
                  CSS formatting adds indentation, line breaks and spacing to make
                  stylesheets easier to read, edit and debug. It helps developers
                  inspect selectors, properties and responsive rules quickly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format CSS online, beautify CSS code, minify
                  CSS, compress stylesheets, clean snippets and prepare readable
                  code for websites or apps.
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