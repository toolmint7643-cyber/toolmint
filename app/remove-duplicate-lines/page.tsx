"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleText = `apple
banana
orange
apple
grape
banana
Mango
mango
orange
watermelon`;

function removeDuplicateLines(
  text: string,
  caseSensitive: boolean,
  trimWhitespace: boolean,
  sortOutput: boolean
) {
  const lines = text.length ? text.split(/\r\n|\r|\n/) : [];
  const seen = new Set<string>();
  const uniqueLines: string[] = [];
  const duplicateLines: string[] = [];

  lines.forEach((line) => {
    const displayLine = trimWhitespace ? line.trim() : line;
    const compareLine = caseSensitive
      ? displayLine
      : displayLine.toLowerCase();

    if (seen.has(compareLine)) {
      duplicateLines.push(displayLine);
      return;
    }

    seen.add(compareLine);
    uniqueLines.push(displayLine);
  });

  const outputLines = sortOutput
    ? [...uniqueLines].sort((a, b) => a.localeCompare(b))
    : uniqueLines;

  return {
    output: outputLines.join("\n"),
    totalLines: lines.length,
    uniqueLines: uniqueLines.length,
    duplicateLines: duplicateLines.length,
    emptyLines: lines.filter((line) => line.trim() === "").length,
    removedLines: duplicateLines,
  };
}

export default function RemoveDuplicateLinesPage() {
  const [text, setText] = useState(sampleText);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [sortOutput, setSortOutput] = useState(false);

  const result = useMemo(
    () => removeDuplicateLines(text, caseSensitive, trimWhitespace, sortOutput),
    [text, caseSensitive, trimWhitespace, sortOutput]
  );

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
      label: "Fruit List",
      value: sampleText,
    },
    {
      label: "Email List",
      value: `hello@example.com
support@toolmint.com
hello@example.com
admin@example.com
support@toolmint.com`,
    },
    {
      label: "Keyword List",
      value: `json formatter
json validator
word counter
json formatter
line counter
word counter`,
    },
    {
      label: "ID List",
      value: `TM-1001
TM-1002
TM-1001
TM-1003
TM-1002
TM-1004`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧹 Remove Duplicate Lines"
          description="Remove duplicate lines online, clean repeated text, deduplicate lists, emails, keywords and IDs instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Input Lines
                </h2>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste lines, emails, keywords, IDs or text list here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setText("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setText(sampleText)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample
                  </button>

                  <Button onClick={() => copyText("Input text", text)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Cleaned Output
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(event) => setCaseSensitive(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Case sensitive
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={trimWhitespace}
                      onChange={(event) => setTrimWhitespace(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Trim whitespace
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={sortOutput}
                      onChange={(event) => setSortOutput(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Sort output alphabetically
                  </label>
                </div>

                <pre className="mt-5 min-h-[250px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {result.output || "Cleaned unique lines will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Cleaned output", result.output)}>
                    📋 Copy Cleaned Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Total Lines", result.totalLines, "📏"],
                ["Unique Lines", result.uniqueLines, "✅"],
                ["Duplicates", result.duplicateLines, "♻️"],
                ["Empty Lines", result.emptyLines, "⬜"],
                [
                  "Removed",
                  `${result.totalLines ? Math.round((result.duplicateLines / result.totalLines) * 100) : 0}%`,
                  "📉",
                ],
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
                ⚡ Quick Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setText(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            {result.removedLines.length ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  🧾 Removed Duplicate Lines
                </h2>

                <pre className="max-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-yellow-200">
                  {result.removedLines.join("\n")}
                </pre>
              </div>
            ) : null}

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This tool keeps the first occurrence of each line and removes later
              duplicates. Use case sensitivity and trim options depending on how
              strict your duplicate matching should be.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Duplicate Line Remover?
                </h2>
                <p className="text-slate-300">
                  A duplicate line remover cleans repeated lines from text while
                  keeping unique entries. It is useful for lists, emails, keywords,
                  IDs, logs and copied data.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to remove duplicate lines online, clean email
                  lists, deduplicate keywords, remove repeated IDs and organize
                  text lists quickly.
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