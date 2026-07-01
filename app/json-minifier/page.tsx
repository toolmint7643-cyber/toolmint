"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleJson = `{
  "name": "ToolMint",
  "type": "Developer Tools Website",
  "features": {
    "fast": true,
    "free": true,
    "mobileFriendly": true
  },
  "tools": [
    "JSON Minifier",
    "JSON Validator",
    "JSON Formatter"
  ],
  "count": 23
}`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getErrorLocation(input: string, message: string) {
  const match = message.match(/position\s+(\d+)/i);
  if (!match) return null;

  const position = Number(match[1]);
  const beforeError = input.slice(0, position);
  const lines = beforeError.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function minifyJson(input: string) {
  const originalSize = new TextEncoder().encode(input).length;

  if (!input.trim()) {
    return {
      valid: false,
      output: "",
      originalSize,
      minifiedSize: 0,
      savedBytes: 0,
      compression: 0,
      error: "Please enter JSON to minify.",
      location: null as ReturnType<typeof getErrorLocation>,
    };
  }

  try {
    const parsed = JSON.parse(input);
    const output = JSON.stringify(parsed);
    const minifiedSize = new TextEncoder().encode(output).length;
    const savedBytes = Math.max(originalSize - minifiedSize, 0);
    const compression = originalSize ? (savedBytes / originalSize) * 100 : 0;

    return {
      valid: true,
      output,
      originalSize,
      minifiedSize,
      savedBytes,
      compression,
      error: "",
      location: null as ReturnType<typeof getErrorLocation>,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid JSON syntax.";

    return {
      valid: false,
      output: "",
      originalSize,
      minifiedSize: 0,
      savedBytes: 0,
      compression: 0,
      error: message,
      location: getErrorLocation(input, message),
    };
  }
}

export default function JsonMinifierPage() {
  const [input, setInput] = useState(sampleJson);

  const result = useMemo(() => minifyJson(input), [input]);

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
      label: "API Response",
      value: `{
  "status": "success",
  "data": {
    "id": 101,
    "name": "ToolMint",
    "active": true
  }
}`,
    },
    {
      label: "Array JSON",
      value: `[
  {
    "id": 1,
    "name": "Word Counter"
  },
  {
    "id": 2,
    "name": "JSON Minifier"
  }
]`,
    },
    {
      label: "Config JSON",
      value: `{
  "theme": "dark",
  "language": "en",
  "seo": {
    "enabled": true,
    "index": true
  }
}`,
    },
    {
      label: "Invalid JSON",
      value: `{
  "name": "ToolMint",
  "active": true,
}`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🗜️ JSON Minifier"
          description="Minify JSON online, compress JSON, remove whitespace and reduce JSON size instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ JSON Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste formatted JSON here..."
                  className="min-h-[360px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
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
                    onClick={() => setInput(sampleJson)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample JSON
                  </button>

                  <Button onClick={() => copyText("JSON input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  {result.valid ? "✅ Minified JSON" : "❌ JSON Status"}
                </h2>

                <div
                  className={`rounded-2xl border p-5 text-center ${
                    result.valid
                      ? "border-green-700 bg-green-950/30"
                      : "border-red-700 bg-red-950/30"
                  }`}
                >
                  <div
                    className={`text-4xl font-extrabold ${
                      result.valid ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {result.valid ? "JSON Minified" : "Invalid JSON"}
                  </div>

                  <p className="mt-3 text-slate-300">
                    {result.valid
                      ? "Whitespace removed successfully."
                      : result.error}
                  </p>

                  {result.location ? (
                    <p className="mt-2 text-sm text-yellow-200">
                      Error near line {result.location.line}, column{" "}
                      {result.location.column}
                    </p>
                  ) : null}
                </div>

                <pre className="mt-5 min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {result.output || "Minified JSON will appear here."}
                </pre>

                <div className="mt-4">
                  <Button
                    onClick={() => copyText("Minified JSON", result.output)}
                  >
                    📋 Copy Minified JSON
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📥</div>
                <div className="break-words text-3xl font-extrabold text-blue-400">
                  {formatBytes(result.originalSize)}
                </div>
                <div className="mt-2 text-slate-400">Original Size</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📤</div>
                <div className="break-words text-3xl font-extrabold text-blue-400">
                  {formatBytes(result.minifiedSize)}
                </div>
                <div className="mt-2 text-slate-400">Minified Size</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">💾</div>
                <div className="break-words text-3xl font-extrabold text-blue-400">
                  {formatBytes(result.savedBytes)}
                </div>
                <div className="mt-2 text-slate-400">Saved</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📉</div>
                <div className="break-words text-3xl font-extrabold text-blue-400">
                  {result.compression.toFixed(1)}%
                </div>
                <div className="mt-2 text-slate-400">Reduction</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Examples
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
              This JSON Minifier removes whitespace, line breaks and indentation
              from valid JSON. It does not change your JSON data or key values.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is JSON Minification?
                </h2>
                <p className="text-slate-300">
                  JSON minification removes extra spaces, newlines and
                  indentation from JSON data. It makes JSON smaller and easier to
                  send in APIs, config files and web applications.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to minify JSON online, compress JSON payloads,
                  remove JSON whitespace, reduce response size and prepare compact
                  JSON for apps or APIs.
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