"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleLeft = `ToolMint is a free online tools website.
It includes text tools.
It includes developer tools.
It is mobile friendly.
Build fast and stay useful.`;

const sampleRight = `ToolMint is a free online tools website.
It includes text tools.
It includes calculator tools.
It is mobile-friendly.
Build fast and stay useful.`;

type DiffStatus = "same" | "changed" | "removed" | "added";

function normalizeLine(line: string, ignoreCase: boolean, ignoreWhitespace: boolean) {
  let value = line;

  if (ignoreWhitespace) {
    value = value.replace(/\s+/g, " ").trim();
  }

  if (ignoreCase) {
    value = value.toLowerCase();
  }

  return value;
}

function compareTexts(
  leftText: string,
  rightText: string,
  ignoreCase: boolean,
  ignoreWhitespace: boolean
) {
  const leftLines = leftText.length ? leftText.split(/\r\n|\r|\n/) : [];
  const rightLines = rightText.length ? rightText.split(/\r\n|\r|\n/) : [];
  const maxLines = Math.max(leftLines.length, rightLines.length);

  const rows = Array.from({ length: maxLines }, (_, index) => {
    const left = leftLines[index] ?? "";
    const right = rightLines[index] ?? "";
    const hasLeft = index < leftLines.length;
    const hasRight = index < rightLines.length;

    let status: DiffStatus = "same";

    if (hasLeft && !hasRight) {
      status = "removed";
    } else if (!hasLeft && hasRight) {
      status = "added";
    } else if (
      normalizeLine(left, ignoreCase, ignoreWhitespace) !==
      normalizeLine(right, ignoreCase, ignoreWhitespace)
    ) {
      status = "changed";
    }

    return {
      line: index + 1,
      left,
      right,
      status,
    };
  });

  return {
    rows,
    totalLines: maxLines,
    same: rows.filter((row) => row.status === "same").length,
    changed: rows.filter((row) => row.status === "changed").length,
    added: rows.filter((row) => row.status === "added").length,
    removed: rows.filter((row) => row.status === "removed").length,
  };
}

export default function TextComparePage() {
  const [leftText, setLeftText] = useState(sampleLeft);
  const [rightText, setRightText] = useState(sampleRight);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);

  const result = useMemo(
    () => compareTexts(leftText, rightText, ignoreCase, ignoreWhitespace),
    [leftText, rightText, ignoreCase, ignoreWhitespace]
  );

  const copySummary = async () => {
    const summary = `Text Compare Summary

Total Lines: ${result.totalLines}
Unchanged Lines: ${result.same}
Changed Lines: ${result.changed}
Added Lines: ${result.added}
Removed Lines: ${result.removed}`;

    try {
      await navigator.clipboard.writeText(summary);
      alert("Text comparison summary copied successfully!");
    } catch {
      alert("Unable to copy summary. Please try again.");
    }
  };

  const resetTool = () => {
    setLeftText(sampleLeft);
    setRightText(sampleRight);
    setIgnoreCase(false);
    setIgnoreWhitespace(false);
  };

  const clearTool = () => {
    setLeftText("");
    setRightText("");
  };

  const statusClass: Record<DiffStatus, string> = {
    same: "border-slate-700 bg-slate-800 text-slate-300",
    changed: "border-yellow-700 bg-yellow-950/30 text-yellow-100",
    removed: "border-red-700 bg-red-950/30 text-red-100",
    added: "border-green-700 bg-green-950/30 text-green-100",
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🆚 Text Compare"
          description="Compare text online, check differences line by line, find added, removed and changed lines instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Original Text
                </h2>

                <textarea
                  value={leftText}
                  onChange={(event) => setLeftText(event.target.value)}
                  placeholder="Paste original text here..."
                  className="min-h-[320px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  📝 Changed Text
                </h2>

                <textarea
                  value={rightText}
                  onChange={(event) => setRightText(event.target.value)}
                  placeholder="Paste changed text here..."
                  className="min-h-[320px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚙️ Compare Options
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={ignoreCase}
                    onChange={(event) => setIgnoreCase(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Ignore case
                </label>

                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={ignoreWhitespace}
                    onChange={(event) => setIgnoreWhitespace(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Ignore whitespace
                </label>

                <button
                  type="button"
                  onClick={clearTool}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  🧹 Clear
                </button>

                <button
                  type="button"
                  onClick={resetTool}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  🔄 Sample
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Total Lines", result.totalLines, "📏"],
                ["Same", result.same, "✅"],
                ["Changed", result.changed, "🟡"],
                ["Added", result.added, "➕"],
                ["Removed", result.removed, "➖"],
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
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-white">
                  🔍 Line-by-Line Difference
                </h2>

                <Button onClick={copySummary}>📋 Copy Summary</Button>
              </div>

              <div className="space-y-3">
                {result.rows.map((row) => (
                  <div
                    key={row.line}
                    className={`rounded-xl border p-4 ${statusClass[row.status]}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="rounded-lg bg-slate-950/60 px-3 py-1 text-sm font-bold">
                        Line {row.line}
                      </span>
                      <span className="rounded-lg bg-slate-950/60 px-3 py-1 text-sm font-bold capitalize">
                        {row.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <pre className="min-h-[70px] whitespace-pre-wrap break-all rounded-lg bg-slate-950/50 p-3 text-sm">
                        {row.left || "(empty)"}
                      </pre>

                      <pre className="min-h-[70px] whitespace-pre-wrap break-all rounded-lg bg-slate-950/50 p-3 text-sm">
                        {row.right || "(empty)"}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This Text Compare tool checks differences line by line. It is useful
              for comparing drafts, lists, notes, code snippets and copied text.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Text Compare?
                </h2>
                <p className="text-slate-300">
                  Text Compare helps you find differences between two pieces of
                  text. It highlights unchanged, changed, added and removed lines
                  so you can review edits quickly.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to compare text online, check document changes,
                  review code snippets, compare lists and find edited lines in
                  drafts or notes.
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