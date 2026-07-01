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
  "tools": ["JSON Validator", "JSON Formatter", "JWT Decoder"],
  "active": true,
  "count": 19
}`;

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

function analyzeJson(value: unknown) {
  let objects = 0;
  let arrays = 0;
  let keys = 0;
  let strings = 0;
  let numbers = 0;
  let booleans = 0;
  let nulls = 0;

  function walk(item: unknown) {
    if (Array.isArray(item)) {
      arrays += 1;
      item.forEach(walk);
      return;
    }

    if (item && typeof item === "object") {
      objects += 1;
      const entries = Object.entries(item as Record<string, unknown>);
      keys += entries.length;
      entries.forEach(([, child]) => walk(child));
      return;
    }

    if (typeof item === "string") strings += 1;
    else if (typeof item === "number") numbers += 1;
    else if (typeof item === "boolean") booleans += 1;
    else if (item === null) nulls += 1;
  }

  walk(value);
  return { objects, arrays, keys, strings, numbers, booleans, nulls };
}

function validateJson(input: string) {
  if (!input.trim()) {
    return {
      valid: false,
      formatted: "",
      minified: "",
      error: "Please enter JSON to validate.",
      location: null as ReturnType<typeof getErrorLocation>,
      stats: analyzeJson(null),
    };
  }

  try {
    const parsed = JSON.parse(input);

    return {
      valid: true,
      formatted: JSON.stringify(parsed, null, 2),
      minified: JSON.stringify(parsed),
      error: "",
      location: null as ReturnType<typeof getErrorLocation>,
      stats: analyzeJson(parsed),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid JSON syntax.";

    return {
      valid: false,
      formatted: "",
      minified: "",
      error: message,
      location: getErrorLocation(input, message),
      stats: analyzeJson(null),
    };
  }
}

export default function JsonValidatorPage() {
  const [input, setInput] = useState(sampleJson);
  const [outputMode, setOutputMode] = useState<"formatted" | "minified">(
    "formatted"
  );

  const result = useMemo(() => validateJson(input), [input]);
  const output =
    outputMode === "formatted" ? result.formatted : result.minified;

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
      value: `{"status":"success","data":{"id":101,"name":"Nabeel Khan","active":true}}`,
    },
    {
      label: "Array JSON",
      value: `[
  { "id": 1, "name": "Word Counter" },
  { "id": 2, "name": "JSON Validator" }
]`,
    },
    {
      label: "Invalid JSON",
      value: `{
  "name": "ToolMint",
  "active": true,
}`,
    },
    {
      label: "Nested JSON",
      value: `{
  "user": {
    "profile": {
      "name": "ToolMint",
      "role": "developer"
    }
  }
}`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="✅ JSON Validator"
          description="Validate JSON online, check JSON syntax errors, format JSON, minify JSON and inspect objects, arrays and keys instantly."
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
                  placeholder="Paste your JSON here..."
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
                    onClick={() => {
                      setInput(sampleJson);
                      setOutputMode("formatted");
                    }}
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
                  {result.valid ? "✅ Valid JSON" : "❌ JSON Status"}
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
                    {result.valid ? "Valid JSON" : "Invalid JSON"}
                  </div>

                  <p className="mt-3 text-slate-300">
                    {result.valid
                      ? "Your JSON syntax is correct and ready to use."
                      : result.error}
                  </p>

                  {result.location ? (
                    <p className="mt-2 text-sm text-yellow-200">
                      Error near line {result.location.line}, column{" "}
                      {result.location.column}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutputMode("formatted")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "formatted"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Format JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputMode("minified")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "minified"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Minify JSON
                  </button>
                </div>

                <pre className="mt-5 min-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Formatted or minified JSON will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("JSON output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Objects", result.stats.objects, "📦"],
                ["Arrays", result.stats.arrays, "🧾"],
                ["Keys", result.stats.keys, "🔑"],
                ["Size", `${new TextEncoder().encode(input).length} B`, "📏"],
              ].map(([label, value, icon]) => (
                <div
                  key={String(label)}
                  className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
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
              This JSON Validator checks syntax in your browser. It does not send
              your JSON to any server, so it is useful for validating API
              responses, config files and sample payloads locally.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is JSON Validation?
                </h2>
                <p className="text-slate-300">
                  JSON validation checks whether your JSON has correct syntax,
                  including quotes, commas, brackets, arrays and objects.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to validate JSON online, format JSON, minify JSON,
                  debug API responses and inspect nested data structures quickly.
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