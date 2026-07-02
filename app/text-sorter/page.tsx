"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type SortMode = "az" | "za" | "length_asc" | "length_desc";

const sampleText = `banana
apple
Orange
grape
watermelon
Mango
kiwi
apple
pineapple`;

function sortTextLines(
  text: string,
  sortMode: SortMode,
  caseSensitive: boolean,
  trimLines: boolean,
  removeEmptyLines: boolean,
  removeDuplicates: boolean
) {
  const originalLines = text.length ? text.split(/\r\n|\r|\n/) : [];
  let lines = trimLines ? originalLines.map((line) => line.trim()) : [...originalLines];

  const emptyLines = lines.filter((line) => line.trim() === "").length;

  if (removeEmptyLines) {
    lines = lines.filter((line) => line.trim() !== "");
  }

  let duplicatesRemoved = 0;

  if (removeDuplicates) {
    const seen = new Set<string>();

    lines = lines.filter((line) => {
      const key = caseSensitive ? line : line.toLowerCase();

      if (seen.has(key)) {
        duplicatesRemoved += 1;
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  const sortedLines = [...lines].sort((a, b) => {
    const first = caseSensitive ? a : a.toLowerCase();
    const second = caseSensitive ? b : b.toLowerCase();

    if (sortMode === "length_asc") {
      return a.length - b.length || first.localeCompare(second);
    }

    if (sortMode === "length_desc") {
      return b.length - a.length || first.localeCompare(second);
    }

    if (sortMode === "za") {
      return second.localeCompare(first);
    }

    return first.localeCompare(second);
  });

  return {
    output: sortedLines.join("\n"),
    totalLines: originalLines.length,
    sortedLines: sortedLines.length,
    emptyLines,
    duplicatesRemoved,
    longestLine:
      originalLines.length > 0
        ? Math.max(...originalLines.map((line) => line.length))
        : 0,
  };
}

export default function TextSorterPage() {
  const [text, setText] = useState(sampleText);
  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [trimLines, setTrimLines] = useState(true);
  const [removeEmptyLines, setRemoveEmptyLines] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);

  const result = useMemo(
    () =>
      sortTextLines(
        text,
        sortMode,
        caseSensitive,
        trimLines,
        removeEmptyLines,
        removeDuplicates
      ),
    [text, sortMode, caseSensitive, trimLines, removeEmptyLines, removeDuplicates]
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
      label: "Keyword List",
      value: `json formatter
word counter
text sorter
line counter
case converter
json validator`,
    },
    {
      label: "Email List",
      value: `support@toolmint.com
admin@example.com
hello@example.com
contact@toolmint.com`,
    },
    {
      label: "Mixed Length",
      value: `a
watermelon
cat
developer tools
tool
productivity`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔤 Text Sorter"
          description="Sort text lines online alphabetically, reverse order, by line length, remove empty lines and organize lists instantly."
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
                  placeholder="Paste lines, names, emails, keywords or IDs here..."
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
                  ✅ Sorted Output
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["az", "A to Z"],
                    ["za", "Z to A"],
                    ["length_asc", "Shortest First"],
                    ["length_desc", "Longest First"],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortMode(mode as SortMode)}
                      className={`rounded-xl border p-4 font-bold transition ${
                        sortMode === mode
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={caseSensitive}
                      onChange={(event) => setCaseSensitive(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Case sensitive sorting
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={trimLines}
                      onChange={(event) => setTrimLines(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Trim spaces from each line
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={removeEmptyLines}
                      onChange={(event) =>
                        setRemoveEmptyLines(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    Remove empty lines
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={removeDuplicates}
                      onChange={(event) =>
                        setRemoveDuplicates(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    Remove duplicate lines
                  </label>
                </div>

                <pre className="mt-5 min-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {result.output || "Sorted text will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Sorted output", result.output)}>
                    📋 Copy Sorted Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Total Lines", result.totalLines, "📏"],
                ["Sorted Lines", result.sortedLines, "✅"],
                ["Empty Lines", result.emptyLines, "⬜"],
                ["Duplicates", result.duplicatesRemoved, "♻️"],
                ["Longest", result.longestLine, "📐"],
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

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This Text Sorter sorts each line as a separate item. Use trim,
              empty-line removal and duplicate removal options to clean lists
              before sorting.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Text Sorter?
                </h2>
                <p className="text-slate-300">
                  A text sorter organizes lines of text alphabetically, in reverse
                  order or by line length. It is useful for names, keywords,
                  emails, IDs, lists and copied data.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to sort lines online, alphabetize lists, organize
                  keywords, sort email lists, remove duplicates and clean text
                  before publishing or exporting.
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