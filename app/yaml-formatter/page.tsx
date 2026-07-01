"use client";

import { useMemo, useState } from "react";
import { parseDocument } from "yaml";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleYaml = `name: ToolMint
type: Developer Tools Website
features:
  fast: true
  free: true
  mobileFriendly: true
tools:
  - JSON Validator
  - XML Formatter
  - YAML Formatter
seo:
  enabled: true
  keywords:
    - yaml formatter
    - yaml validator
    - yaml to json`;

function analyzeYaml(input: string) {
  const lines = input ? input.split("\n").length : 0;
  const keys = input.match(/^\s*[A-Za-z0-9_-]+\s:/gm) || [];
  const lists = input.match(/^\s*-\s+/gm) || [];
  const comments = input.match(/^\s*#/gm) || [];

  return {
    lines,
    keys: keys.length,
    lists: lists.length,
    comments: comments.length,
    size: new TextEncoder().encode(input).length,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function processYaml(input: string) {
  if (!input.trim()) {
    return {
      valid: false,
      formatted: "",
      json: "",
      error: "Please enter YAML to format.",
    };
  }

  try {
    const document = parseDocument(input, {
      prettyErrors: true,
    });

    if (document.errors.length) {
      return {
        valid: false,
        formatted: "",
        json: "",
        error: document.errors[0].message,
      };
    }

    const value = document.toJSON();
    const formatted = document.toString({
      indent: 2,
      lineWidth: 0,
    });

    return {
      valid: true,
      formatted,
      json: JSON.stringify(value, null, 2),
      error: "",
    };
  } catch (error) {
    return {
      valid: false,
      formatted: "",
      json: "",
      error:
        error instanceof Error ? error.message : "Unable to parse YAML input.",
    };
  }
}

export default function YamlFormatterPage() {
  const [input, setInput] = useState(sampleYaml);
  const [outputMode, setOutputMode] = useState<"yaml" | "json">("yaml");

  const result = useMemo(() => processYaml(input), [input]);
  const stats = useMemo(() => analyzeYaml(input), [input]);

  const output = outputMode === "yaml" ? result.formatted : result.json;

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
      label: "GitHub Action",
      value: `name: CI
on:
  push:
    branches:
      - main
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm run build`,
    },
    {
      label: "Docker Compose",
      value: `version: "3.9"
services:
  app:
    image: node:20
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development`,
    },
    {
      label: "App Config",
      value: `app:
  name: ToolMint
  theme: dark
  features:
    search: true
    categories: true
    adsenseReady: false`,
    },
    {
      label: "Invalid YAML",
      value: `name: ToolMint
tools:
  - JSON
   - YAML`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧾 YAML Formatter"
          description="Format YAML online, validate YAML syntax, convert YAML to JSON and inspect keys, lists, comments and file size instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ YAML Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste YAML code here..."
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
                    onClick={() => setInput(sampleYaml)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample YAML
                  </button>

                  <Button onClick={() => copyText("YAML input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ YAML Output
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
                    {result.valid ? "Valid YAML" : "Invalid YAML"}
                  </div>

                  <p className="mt-3 max-h-24 overflow-auto text-slate-300">
                    {result.valid
                      ? "YAML syntax is valid and ready."
                      : result.error}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutputMode("yaml")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "yaml"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Format YAML
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputMode("json")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "json"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    YAML to JSON
                  </button>
                </div>

                <pre className="mt-5 min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Formatted YAML or JSON will appear here."}
                </pre>

                <div className="mt-4">
                  <Button
                    onClick={() =>
                      copyText(outputMode === "yaml" ? "Formatted YAML" : "JSON output", output)
                    }
                  >
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Lines", stats.lines, "📏"],
                ["Keys", stats.keys, "🔑"],
                ["Lists", stats.lists, "🧾"],
                ["Comments", stats.comments, "💬"],
                ["Size", formatBytes(stats.size), "📦"],
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
                ⚡ Quick YAML Examples
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
              YAML is indentation-sensitive. This tool uses a real YAML parser to
              validate and format YAML, but always review config files before
              using them in production systems.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is YAML Formatting?
                </h2>
                <p className="text-slate-300">
                  YAML formatting makes indentation-sensitive config files easier
                  to read and debug. YAML is commonly used in GitHub Actions,
                  Docker Compose, Kubernetes, CI/CD and app configuration files.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format YAML online, validate YAML syntax,
                  convert YAML to JSON, inspect config files and debug indentation
                  errors quickly.
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