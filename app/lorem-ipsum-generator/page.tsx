"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type GenerateMode = "paragraphs" | "sentences" | "words";

const loremWords = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "sed",
  "do",
  "eiusmod",
  "tempor",
  "incididunt",
  "ut",
  "labore",
  "et",
  "dolore",
  "magna",
  "aliqua",
  "enim",
  "ad",
  "minim",
  "veniam",
  "quis",
  "nostrud",
  "exercitation",
  "ullamco",
  "laboris",
  "nisi",
  "aliquip",
  "ex",
  "ea",
  "commodo",
  "consequat",
  "duis",
  "aute",
  "irure",
  "reprehenderit",
  "voluptate",
  "velit",
  "esse",
  "cillum",
  "fugiat",
  "nulla",
  "pariatur",
];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildSentence(startIndex: number, minWords = 8, maxWords = 16) {
  const length = minWords + (startIndex % (maxWords - minWords + 1));
  const words = Array.from({ length }, (_, index) => {
    return loremWords[(startIndex + index) % loremWords.length];
  });

  return `${capitalize(words.join(" "))}.`;
}

function generateLorem(
  mode: GenerateMode,
  count: number,
  startWithLorem: boolean
) {
  const safeCount = Math.max(1, Math.min(count, 100));

  if (mode === "words") {
    const words = Array.from({ length: safeCount }, (_, index) => {
      return loremWords[index % loremWords.length];
    });

    if (startWithLorem && words.length >= 2) {
      words[0] = "lorem";
      words[1] = "ipsum";
    }

    return words.join(" ");
  }

  if (mode === "sentences") {
    return Array.from({ length: safeCount }, (_, index) => {
      if (index === 0 && startWithLorem) {
        return `Lorem ipsum ${buildSentence(2).toLowerCase()}`;
      }

      return buildSentence(index * 7);
    }).join(" ");
  }

  return Array.from({ length: safeCount }, (_, paragraphIndex) => {
    const sentenceCount = 4 + (paragraphIndex % 3);

    return Array.from({ length: sentenceCount }, (_, sentenceIndex) => {
      if (paragraphIndex === 0 && sentenceIndex === 0 && startWithLorem) {
        return `Lorem ipsum ${buildSentence(2).toLowerCase()}`;
      }

      return buildSentence(paragraphIndex * 11 + sentenceIndex * 5);
    }).join(" ");
  }).join("\n\n");
}

function analyzeText(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const sentences = text.match(/[^.!?]+[.!?]/g) || [];
  const paragraphs = text
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim().length > 0);

  return {
    words: words.length,
    characters: text.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
  };
}

export default function LoremIpsumGeneratorPage() {
  const [mode, setMode] = useState<GenerateMode>("paragraphs");
  const [count, setCount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);

  const output = useMemo(
    () => generateLorem(mode, count, startWithLorem),
    [mode, count, startWithLorem]
  );

  const stats = useMemo(() => analyzeText(output), [output]);

  const copyText = async () => {
    if (!output) {
      alert("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      alert("Lorem ipsum text copied successfully!");
    } catch {
      alert("Unable to copy text. Please try again.");
    }
  };

  const presets = [
    { label: "1 Paragraph", mode: "paragraphs" as GenerateMode, count: 1 },
    { label: "3 Paragraphs", mode: "paragraphs" as GenerateMode, count: 3 },
    { label: "5 Sentences", mode: "sentences" as GenerateMode, count: 5 },
    { label: "50 Words", mode: "words" as GenerateMode, count: 50 },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📝 Lorem Ipsum Generator"
          description="Generate lorem ipsum dummy text online for designs, websites, mockups, layouts, blogs and content placeholders instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚙️ Generator Settings
                </h2>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    ["paragraphs", "Paragraphs", "Generate full placeholder paragraphs."],
                    ["sentences", "Sentences", "Generate sentence-based dummy text."],
                    ["words", "Words", "Generate a specific number of words."],
                  ].map(([key, label, description]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key as GenerateMode)}
                      className={`rounded-xl border p-4 text-left transition ${
                        mode === key
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500"
                      }`}
                    >
                      <span className="block font-bold">{label}</span>
                      <span className="mt-1 block text-sm opacity-80">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-slate-300">
                    Count ({mode})
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={startWithLorem}
                    onChange={(event) => setStartWithLorem(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Start with “Lorem ipsum”
                </label>

                <div className="mt-5">
                  <Button onClick={copyText}>📋 Copy Generated Text</Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Generated Text
                </h2>

                <pre className="min-h-[430px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm leading-7 text-blue-100">
                  {output}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Words", stats.words, "📝"],
                ["Characters", stats.characters, "🔤"],
                ["Sentences", stats.sentences, "📄"],
                ["Paragraphs", stats.paragraphs, "📚"],
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
                ⚡ Quick Presets
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMode(preset.mode);
                      setCount(preset.count);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Lorem ipsum is placeholder text used for layouts and mockups. It
              helps test spacing, typography and content flow before final copy is
              ready.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Lorem Ipsum?
                </h2>
                <p className="text-slate-300">
                  Lorem ipsum is dummy placeholder text used by designers,
                  developers and content teams to preview layouts without relying
                  on final written content.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to generate placeholder text for websites,
                  wireframes, UI mockups, blog layouts, landing pages, templates
                  and design previews.
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