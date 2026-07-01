"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleCss = `.tool-card {
  /* Card background */
  background: #0f172a;
  color: white;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 24px;
}

.tool-card h2 {
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 12px;
}

.tool-card:hover {
  border-color: #3b82f6;
}

@media (max-width: 768px) {
  .tool-card {
    padding: 16px;
  }
}`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function minifyCss(input: string, removeComments: boolean) {
  let output = input;

  if (removeComments) {
    output = output.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  return output
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function analyzeCss(input: string, output: string) {
  const originalSize = new TextEncoder().encode(input).length;
  const minifiedSize = new TextEncoder().encode(output).length;
  const savedBytes = Math.max(originalSize - minifiedSize, 0);
  const reduction = originalSize ? (savedBytes / originalSize) * 100 : 0;

  return {
    originalSize,
    minifiedSize,
    savedBytes,
    reduction,
    comments: (input.match(/\/\*[\s\S]*?\*\//g) || []).length,
    selectors: (input.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{]+(?=\{)/g) || []).length,
  };
}

function validateCss(input: string) {
  if (!input.trim()) {
    return {
      valid: false,
      message: "Please enter CSS to minify.",
    };
  }

  const openBraces = (input.match(/{/g) || []).length;
  const closeBraces = (input.match(/}/g) || []).length;

  if (openBraces !== closeBraces) {
    return {
      valid: false,
      message: "CSS may have unmatched braces. Please check { and }.",
    };
  }

  return {
    valid: true,
    message: "CSS is ready for minification.",
  };
}

export default function CssMinifierPage() {
  const [input, setInput] = useState(sampleCss);
  const [removeComments, setRemoveComments] = useState(true);

  const output = useMemo(
    () => minifyCss(input, removeComments),
    [input, removeComments]
  );

  const stats = useMemo(() => analyzeCss(input, output), [input, output]);
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
      value: `.button {
  background: #2563eb;
  color: #fff;
  padding: 12px 18px;
  border-radius: 10px;
}

.button:hover {
  background: #1d4ed8;
}`,
    },
    {
      label: "Card CSS",
      value: `.card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
}`,
    },
    {
      label: "Responsive CSS",
      value: `.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}`,
    },
    {
      label: "Form CSS",
      value: `.input {
  width: 100%;
  border: 1px solid #cbd5e1;
  padding: 12px;
  border-radius: 8px;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
}`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🗜️ CSS Minifier"
          description="Minify CSS online, compress CSS code, remove comments, reduce stylesheet size and copy compact CSS instantly."
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

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={removeComments}
                    onChange={(event) => setRemoveComments(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Remove CSS comments
                </label>

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
                  ✅ Minified CSS
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
                    {validation.valid ? "CSS Minified" : "Check CSS"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <pre className="mt-5 min-h-[300px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Minified CSS will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Minified CSS", output)}>
                    📋 Copy Minified CSS
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Original", formatBytes(stats.originalSize), "📥"],
                ["Minified", formatBytes(stats.minifiedSize), "📤"],
                ["Saved", formatBytes(stats.savedBytes), "💾"],
                ["Reduction", `${stats.reduction.toFixed(1)}%`, "📉"],
                ["Comments", stats.comments, "💬"],
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
              This CSS Minifier removes comments and extra whitespace for quick
              compression. For complex production stylesheets, review the output
              before using it in production.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is CSS Minification?
                </h2>
                <p className="text-slate-300">
                  CSS minification removes comments, spaces and line breaks from
                  CSS code. It helps reduce stylesheet size and makes CSS more
                  compact for websites and apps.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to minify CSS online, compress CSS snippets,
                  remove CSS comments, reduce stylesheet size and prepare compact
                  styles for web pages.
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