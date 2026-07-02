"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ReverseMode =
  | "characters"
  | "words"
  | "lines"
  | "word_order"
  | "characters_each_word";

const sampleText = `ToolMint makes free online tools.
Reverse text, words and lines instantly.
Build fast and stay useful.`;

function reverseText(text: string, mode: ReverseMode) {
  if (mode === "characters") {
    return Array.from(text).reverse().join("");
  }

  if (mode === "words") {
    return text
      .split(/(\s+)/)
      .map((part) =>
        part.trim() ? Array.from(part).reverse().join("") : part
      )
      .join("");
  }

  if (mode === "lines") {
    return text.split(/\r\n|\r|\n/).reverse().join("\n");
  }

  if (mode === "word_order") {
    return text.trim() ? text.trim().split(/\s+/).reverse().join(" ") : "";
  }

  return text
    .split(/(\s+)/)
    .map((part) =>
      part.trim() ? Array.from(part).reverse().join("") : part
    )
    .join("");
}

function analyzeText(text: string) {
  const lines = text.length ? text.split(/\r\n|\r|\n/) : [];
  const words = text.trim() ? text.trim().split(/\s+/) : [];

  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    words: words.length,
    lines: lines.length,
  };
}

export default function TextReverserPage() {
  const [text, setText] = useState(sampleText);
  const [mode, setMode] = useState<ReverseMode>("characters");

  const output = useMemo(() => reverseText(text, mode), [text, mode]);
  const stats = useMemo(() => analyzeText(text), [text]);

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

  const modes: Array<{ key: ReverseMode; label: string; description: string }> = [
    {
      key: "characters",
      label: "Reverse Text",
      description: "Reverse the full text character by character.",
    },
    {
      key: "words",
      label: "Reverse Each Word",
      description: "Reverse letters inside every word.",
    },
    {
      key: "lines",
      label: "Reverse Lines",
      description: "Reverse the order of all lines.",
    },
    {
      key: "word_order",
      label: "Reverse Word Order",
      description: "Reverse the order of words in the text.",
    },
    {
      key: "characters_each_word",
      label: "Mirror Words",
      description: "Reverse characters in each word while keeping spaces.",
    },
  ];

  const quickExamples = [
    {
      label: "Short Sentence",
      value: "Hello ToolMint",
    },
    {
      label: "Multi Line",
      value: `Line one
Line two
Line three`,
    },
    {
      label: "Word Order",
      value: "one two three four five",
    },
    {
      label: "Palindrome Test",
      value: "madam racecar level",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔁 Text Reverser"
          description="Reverse text online, reverse characters, words, lines and word order instantly with a free text reverser tool."
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
                  placeholder="Paste or type text to reverse..."
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
                  ✅ Reversed Output
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {modes.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMode(item.key)}
                      className={`rounded-xl border p-4 text-left transition ${
                        mode === item.key
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500"
                      }`}
                    >
                      <span className="block font-bold">{item.label}</span>
                      <span className="mt-1 block text-sm opacity-80">
                        {item.description}
                      </span>
                    </button>
                  ))}
                </div>

                <pre className="mt-5 min-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Reversed text will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Reversed output", output)}>
                    📋 Copy Reversed Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Characters", stats.characters, "🔤"],
                ["No Spaces", stats.charactersNoSpaces, "🧮"],
                ["Words", stats.words, "📝"],
                ["Lines", stats.lines, "📏"],
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
              This Text Reverser can reverse full text, individual words, line
              order or word order. Formatting may change when reversing word order
              because extra spaces are normalized.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Text Reverser?
                </h2>
                <p className="text-slate-300">
                  A text reverser flips text, words or lines into reverse order.
                  It is useful for text experiments, formatting tasks, coding
                  practice, puzzles and quick content transformations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to reverse text online, reverse words, reverse
                  lines, flip word order, test palindromes and transform text
                  instantly.
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