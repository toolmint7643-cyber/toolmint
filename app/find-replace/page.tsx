"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ReplaceMode = "all" | "first";

const sampleText = `ToolMint is a free online tools website.
ToolMint includes text tools, developer tools and calculator tools.
Use ToolMint to clean text, format code and calculate values quickly.`;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findAndReplace(
  text: string,
  findText: string,
  replaceText: string,
  caseSensitive: boolean,
  regexMode: boolean,
  replaceMode: ReplaceMode
) {
  if (!findText) {
    return {
      output: text,
      matches: 0,
      error: "",
    };
  }

  try {
    const flags = `${caseSensitive ? "" : "i"}${replaceMode === "all" ? "g" : ""}`;
    const pattern = regexMode ? findText : escapeRegex(findText);
    const regex = new RegExp(pattern, flags);
    const allRegex = new RegExp(pattern, `${caseSensitive ? "" : "i"}g`);
    const matches = text.match(allRegex)?.length || 0;

    return {
      output: text.replace(regex, replaceText),
      matches,
      error: "",
    };
  } catch (error) {
    return {
      output: text,
      matches: 0,
      error:
        error instanceof Error ? error.message : "Invalid find or regex pattern.",
    };
  }
}

function analyzeText(text: string) {
  const lines = text.length ? text.split(/\r\n|\r|\n/) : [];
  const words = text.trim() ? text.trim().split(/\s+/) : [];

  return {
    characters: text.length,
    words: words.length,
    lines: lines.length,
  };
}

export default function FindReplacePage() {
  const [text, setText] = useState(sampleText);
  const [findText, setFindText] = useState("ToolMint");
  const [replaceText, setReplaceText] = useState("ToolBox");
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [regexMode, setRegexMode] = useState(false);
  const [replaceMode, setReplaceMode] = useState<ReplaceMode>("all");

  const result = useMemo(
    () =>
      findAndReplace(
        text,
        findText,
        replaceText,
        caseSensitive,
        regexMode,
        replaceMode
      ),
    [text, findText, replaceText, caseSensitive, regexMode, replaceMode]
  );

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

  const quickExamples = [
    {
      label: "Brand Replace",
      text: sampleText,
      find: "ToolMint",
      replace: "ToolBox",
      regex: false,
    },
    {
      label: "Space to Hyphen",
      text: "free online text tools",
      find: " ",
      replace: "-",
      regex: false,
    },
    {
      label: "Remove Numbers",
      text: "Order 1001, Order 1002, Order 1003",
      find: "\\d+",
      replace: "",
      regex: true,
    },
    {
      label: "Hide Emails",
      text: "Contact hello@example.com or support@toolmint.com",
      find: "[\\w.-]+@[\\w.-]+\\.\\w+",
      replace: "[hidden-email]",
      regex: true,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔎 Find & Replace"
          description="Find and replace text online, replace words, remove patterns, use regex mode and copy cleaned text instantly."
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
                  placeholder="Paste text here..."
                  className="min-h-[360px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
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
                  ⚙️ Replace Settings
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">Find</span>
                    <input
                      value={findText}
                      onChange={(event) => setFindText(event.target.value)}
                      placeholder="Text or regex to find..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">Replace With</span>
                    <input
                      value={replaceText}
                      onChange={(event) => setReplaceText(event.target.value)}
                      placeholder="Replacement text..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReplaceMode("all")}
                      className={`rounded-xl border p-4 font-bold transition ${
                        replaceMode === "all"
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                      }`}
                    >
                      Replace All
                    </button>

                    <button
                      type="button"
                      onClick={() => setReplaceMode("first")}
                      className={`rounded-xl border p-4 font-bold transition ${
                        replaceMode === "first"
                          ? "border-blue-500 bg-blue-600 text-white"
                          : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                      }`}
                    >
                      Replace First
                    </button>
                  </div>

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
                      checked={regexMode}
                      onChange={(event) => setRegexMode(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Regex mode
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-white">
                  ✅ Output Preview
                </h2>

                <Button onClick={() => copyText("Replaced output", result.output)}>
                  📋 Copy Output
                </Button>
              </div>

              {result.error ? (
                <div className="mb-4 rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-100">
                  {result.error}
                </div>
              ) : null}

              <pre className="min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                {result.output || "Output will appear here."}
              </pre>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Matches", result.matches, "🎯"],
                ["Characters", stats.characters, "🔤"],
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
                    onClick={() => {
                      setText(example.text);
                      setFindText(example.find);
                      setReplaceText(example.replace);
                      setRegexMode(example.regex);
                      setReplaceMode("all");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Regex mode uses JavaScript regular expressions. If regex mode is
              enabled, special characters like dot, plus, brackets and question
              marks will be treated as regex syntax.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Find and Replace?
                </h2>
                <p className="text-slate-300">
                  Find and replace helps you search for words, phrases or patterns
                  in text and replace them with new content. It is useful for
                  editing lists, code snippets, articles and copied data.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to replace text online, remove numbers, hide
                  emails, update brand names, clean lists and apply regex-based
                  replacements quickly.
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