"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleText = `ToolMint

Word Counter

Character Counter


Line Counter

Remove Empty Lines


Text Cleaner`;

function cleanEmptyLines(
  text: string,
  trimLines: boolean,
  collapseBlankLines: boolean
) {
  const lines = text.length ? text.split(/\r\n|\r|\n/) : [];
  const processedLines = trimLines ? lines.map((line) => line.trim()) : lines;
  const emptyLines = processedLines.filter((line) => line.trim() === "").length;

  let outputLines: string[];

  if (collapseBlankLines) {
    outputLines = [];
    let previousEmpty = false;

    processedLines.forEach((line) => {
      const isEmpty = line.trim() === "";

      if (isEmpty && previousEmpty) {
        return;
      }

      outputLines.push(line);
      previousEmpty = isEmpty;
    });
  } else {
    outputLines = processedLines.filter((line) => line.trim() !== "");
  }

  return {
    output: outputLines.join("\n"),
    totalLines: lines.length,
    emptyLines,
    finalLines: outputLines.length,
    removedLines: collapseBlankLines
      ? Math.max(lines.length - outputLines.length, 0)
      : emptyLines,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    characters: text.length,
  };
}

export default function RemoveEmptyLinesPage() {
  const [text, setText] = useState(sampleText);
  const [trimLines, setTrimLines] = useState(false);
  const [collapseBlankLines, setCollapseBlankLines] = useState(false);

  const result = useMemo(
    () => cleanEmptyLines(text, trimLines, collapseBlankLines),
    [text, trimLines, collapseBlankLines]
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
      label: "Tool List",
      value: sampleText,
    },
    {
      label: "Paragraph Text",
      value: `First paragraph has text.


Second paragraph after blank lines.



Third paragraph here.`,
    },
    {
      label: "Code Lines",
      value: `function hello() {

  console.log("Hello");


  return true;
}`,
    },
    {
      label: "CSV-like Text",
      value: `name,email

Nabeel,hello@example.com

ToolMint,support@example.com


Admin,admin@example.com`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧹 Remove Empty Lines"
          description="Remove empty lines online, delete blank lines, clean whitespace-only lines and format text lists instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Input Text
                </h2>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste text with empty lines here..."
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
                      checked={trimLines}
                      onChange={(event) => setTrimLines(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Trim spaces from each line
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={collapseBlankLines}
                      onChange={(event) =>
                        setCollapseBlankLines(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    Collapse multiple blank lines instead of removing all
                  </label>
                </div>

                <pre className="mt-5 min-h-[250px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {result.output || "Cleaned text will appear here."}
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
                ["Empty Lines", result.emptyLines, "⬜"],
                ["Removed", result.removedLines, "🧹"],
                ["Final Lines", result.finalLines, "✅"],
                ["Words", result.words, "📝"],
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
              This tool removes blank and whitespace-only lines. Use collapse mode
              when you want to keep paragraph spacing but reduce multiple empty
              lines to a single blank line.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is an Empty Line Remover?
                </h2>
                <p className="text-slate-300">
                  An empty line remover cleans text by deleting blank lines and
                  whitespace-only lines. It is useful for lists, code snippets,
                  CSV-like content, copied notes and documents.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to remove empty lines online, clean text lists,
                  delete blank lines from code, compact paragraphs and prepare
                  cleaner text for editing or publishing.
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