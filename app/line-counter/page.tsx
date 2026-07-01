"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleText = `ToolMint is a free online tools website.

It includes developer tools,
calculator tools,
text tools,
and productivity utilities.

Build fast.
Stay useful.
Keep it simple.`;

function analyzeText(text: string) {
  const lines = text.length ? text.split(/\r\n|\r|\n/) : [];
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const emptyLines = lines.filter((line) => line.trim().length === 0);
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0);

  return {
    totalLines: lines.length,
    nonEmptyLines: nonEmptyLines.length,
    emptyLines: emptyLines.length,
    words: words.length,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    paragraphs: paragraphs.length,
    longestLine:
      lines.length > 0
        ? Math.max(...lines.map((line) => line.length))
        : 0,
  };
}

export default function LineCounterPage() {
  const [text, setText] = useState(sampleText);

  const stats = useMemo(() => analyzeText(text), [text]);

  const copyText = async () => {
    if (!text) {
      alert("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("Text copied successfully!");
    } catch {
      alert("Unable to copy text. Please try again.");
    }
  };

  const quickExamples = [
    {
      label: "Short Text",
      value: `Line one
Line two
Line three`,
    },
    {
      label: "Code Lines",
      value: `function greet(name) {
  return "Hello " + name;
}

console.log(greet("ToolMint"));`,
    },
    {
      label: "List Text",
      value: `Word Counter
Character Counter
Line Counter
Case Converter`,
    },
    {
      label: "Paragraphs",
      value: `First paragraph has one line.

Second paragraph has
two lines.

Third paragraph is here.`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📏 Line Counter"
          description="Count lines online, including total lines, non-empty lines, empty lines, words, characters and paragraphs instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Enter Text
                </h2>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste or type text here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
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
                    🔄 Sample Text
                  </button>

                  <Button onClick={copyText}>📋 Copy Text</Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Line Count Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Total Lines</p>

                  <div className="mt-3 text-6xl font-extrabold text-blue-300">
                    {stats.totalLines}
                  </div>

                  <p className="mt-3 text-slate-300">
                    Includes empty and non-empty lines.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {stats.nonEmptyLines}
                    </div>
                    <div className="mt-1 text-slate-400">Non-empty Lines</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {stats.emptyLines}
                    </div>
                    <div className="mt-1 text-slate-400">Empty Lines</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {stats.words}
                    </div>
                    <div className="mt-1 text-slate-400">Words</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {stats.paragraphs}
                    </div>
                    <div className="mt-1 text-slate-400">Paragraphs</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Characters", stats.characters, "🔤"],
                ["No Spaces", stats.charactersNoSpaces, "🧮"],
                ["Longest Line", stats.longestLine, "📐"],
                ["Paragraphs", stats.paragraphs, "📝"],
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
                ⚡ Quick Text Examples
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
              This Line Counter counts every line break in your text. Empty lines,
              code lines and paragraph breaks are included in the total line count.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Line Counter?
                </h2>
                <p className="text-slate-300">
                  A line counter calculates how many lines are present in text,
                  code, lists, notes or documents. It can also show empty lines,
                  non-empty lines, words and characters.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to count lines online for code snippets, text
                  files, essays, lists, CSV-like content, logs, notes and
                  documentation.
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