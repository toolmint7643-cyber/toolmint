"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleHtml = `<section class="hero">
  <!-- Main hero section -->
  <h1>ToolMint</h1>
  <p>Free developer and productivity tools.</p>

  <a href="/tools">
    Explore Tools
  </a>

  <img src="/logo.png" alt="ToolMint logo">
</section>`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function minifyHtml(input: string, removeComments: boolean) {
  let output = input;

  if (removeComments) {
    output = output.replace(/<!--[\s\S]*?-->/g, "");
  }

  return output
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\n+/g, "")
    .trim();
}

function analyzeHtml(input: string, output: string) {
  const originalSize = new TextEncoder().encode(input).length;
  const minifiedSize = new TextEncoder().encode(output).length;
  const savedBytes = Math.max(originalSize - minifiedSize, 0);
  const reduction = originalSize ? (savedBytes / originalSize) * 100 : 0;

  return {
    originalSize,
    minifiedSize,
    savedBytes,
    reduction,
    tags: (input.match(/<\/?[a-zA-Z][^>]*>/g) || []).length,
    comments: (input.match(/<!--[\s\S]*?-->/g) || []).length,
  };
}

function validateHtml(input: string) {
  if (!input.trim()) {
    return {
      valid: false,
      message: "Please enter HTML to minify.",
    };
  }

  const openTags = input.match(/<[a-zA-Z][^>/]*>/g) || [];
  const closeTags = input.match(/<\/[a-zA-Z][^>]*>/g) || [];

  return {
    valid: true,
    message:
      openTags.length || closeTags.length
        ? "HTML is ready for minification."
        : "HTML text found, but no clear tags were detected.",
  };
}

export default function HtmlMinifierPage() {
  const [input, setInput] = useState(sampleHtml);
  const [removeComments, setRemoveComments] = useState(true);

  const output = useMemo(
    () => minifyHtml(input, removeComments),
    [input, removeComments]
  );

  const stats = useMemo(() => analyzeHtml(input, output), [input, output]);
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
      value: `<section>
  <h1>Build Faster</h1>
  <p>Create tools online.</p>
  <a href="/tools">Explore tools</a>
</section>`,
    },
    {
      label: "HTML List",
      value: `<ul>
  <li>JSON Validator</li>
  <li>HTML Minifier</li>
  <li>Regex Tester</li>
</ul>`,
    },
    {
      label: "Form HTML",
      value: `<form>
  <label>Email</label>
  <input type="email" placeholder="you@example.com">
  <button>Subscribe</button>
</form>`,
    },
    {
      label: "Table HTML",
      value: `<table>
  <tr>
    <th>Tool</th>
    <th>Status</th>
  </tr>
  <tr>
    <td>HTML Minifier</td>
    <td>Done</td>
  </tr>
</table>`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🗜️ HTML Minifier"
          description="Minify HTML online, compress HTML code, remove comments, collapse whitespace and reduce HTML size instantly."
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

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={removeComments}
                    onChange={(event) => setRemoveComments(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Remove HTML comments
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
                  ✅ Minified HTML
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
                    {validation.valid ? "HTML Minified" : "Check HTML"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <pre className="mt-5 min-h-[300px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Minified HTML will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Minified HTML", output)}>
                    📋 Copy Minified HTML
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
              This HTML Minifier removes comments and whitespace for quick
              compression. For framework templates, emails or server-rendered
              code, review the output before using it in production.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is HTML Minification?
                </h2>
                <p className="text-slate-300">
                  HTML minification removes extra whitespace, line breaks and
                  comments from HTML code. It helps reduce page size and makes
                  markup more compact for websites and apps.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to minify HTML online, compress HTML snippets,
                  remove comments, reduce markup size and prepare compact HTML
                  for web pages, emails or templates.
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