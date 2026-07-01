"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RegexFlag = "g" | "i" | "m" | "s" | "u";

const sampleText = `Contact us at support@toolmint.com or admin@example.com.
Order IDs: TM-1024, TM-2048, TM-4096.
Phone: +91 98765 43210
Website: https://toolmint.com/tools`;

const quickExamples = [
  {
    label: "Email Address",
    pattern: "[\\w.-]+@[\\w.-]+\\.\\w+",
    flags: ["g", "i"] as RegexFlag[],
    text: sampleText,
  },
  {
    label: "Numbers",
    pattern: "\\d+",
    flags: ["g"] as RegexFlag[],
    text: sampleText,
  },
  {
    label: "URLs",
    pattern: "https?:\\/\\/[^\\s]+",
    flags: ["g", "i"] as RegexFlag[],
    text: sampleText,
  },
  {
    label: "Order IDs",
    pattern: "TM-(\\d+)",
    flags: ["g"] as RegexFlag[],
    text: sampleText,
  },
];

function buildFlags(flags: RegexFlag[]) {
  return flags.includes("g") ? flags.join("") : `g${flags.join("")}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getRegexResult(pattern: string, flags: RegexFlag[], text: string) {
  if (!pattern.trim()) {
    return {
      valid: false,
      error: "Please enter a regex pattern.",
      matches: [] as Array<{
        value: string;
        index: number;
        groups: string[];
      }>,
      highlighted: escapeHtml(text),
      regex: null as RegExp | null,
    };
  }

  try {
    const regex = new RegExp(pattern, buildFlags(flags));
    const matches: Array<{ value: string; index: number; groups: string[] }> = [];

    let highlighted = "";
    let lastIndex = 0;

    for (const match of text.matchAll(regex)) {
      const value = match[0];
      const index = match.index ?? 0;

      if (value === "") continue;

      matches.push({
        value,
        index,
        groups: match.slice(1),
      });

      highlighted += escapeHtml(text.slice(lastIndex, index));
      highlighted += `<mark class="rounded bg-yellow-400 px-1 text-slate-950">${escapeHtml(
        value
      )}</mark>`;
      lastIndex = index + value.length;
    }

    highlighted += escapeHtml(text.slice(lastIndex));

    return {
      valid: true,
      error: "",
      matches,
      highlighted,
      regex,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid regex pattern.",
      matches: [],
      highlighted: escapeHtml(text),
      regex: null,
    };
  }
}

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("[\\w.-]+@[\\w.-]+\\.\\w+");
  const [text, setText] = useState(sampleText);
  const [flags, setFlags] = useState<RegexFlag[]>(["g", "i"]);
  const [replaceValue, setReplaceValue] = useState("[hidden-email]");

  const result = useMemo(
    () => getRegexResult(pattern, flags, text),
    [pattern, flags, text]
  );

  const replacedText = useMemo(() => {
    if (!result.regex) return "";

    try {
      return text.replace(result.regex, replaceValue);
    } catch {
      return "";
    }
  }, [text, replaceValue, result.regex]);

  const toggleFlag = (flag: RegexFlag) => {
    setFlags((current) =>
      current.includes(flag)
        ? current.filter((item) => item !== flag)
        : [...current, flag]
    );
  };

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

  const copyMatches = () => {
    const value = result.matches.map((match) => match.value).join("\n");
    copyText("Regex matches", value);
  };

  const resetTool = () => {
    setPattern("[\\w.-]+@[\\w.-]+\\.\\w+");
    setText(sampleText);
    setFlags(["g", "i"]);
    setReplaceValue("[hidden-email]");
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔍 Regex Tester"
          description="Test regular expressions online, highlight regex matches, inspect capture groups and replace matched text instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Regex Pattern
                </h2>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Pattern</span>
                  <input
                    value={pattern}
                    onChange={(event) => setPattern(event.target.value)}
                    placeholder="Example: \\d+"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                  />
                </label>

                <div className="mt-4">
                  <h3 className="mb-3 font-bold text-white">Flags</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(["g", "i", "m", "s", "u"] as RegexFlag[]).map((flag) => (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggleFlag(flag)}
                        className={`rounded-xl border p-4 font-bold transition ${
                          flags.includes(flag)
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-500"
                        }`}
                      >
                        /{flag}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-slate-300">Test Text</span>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Paste text to test regex..."
                    className="min-h-[260px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Reset
                  </button>

                  <Button onClick={copyMatches}>📋 Copy Matches</Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  {result.valid ? "✅ Match Result" : "❌ Regex Status"}
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
                    {result.valid
                      ? `${result.matches.length} Matches`
                      : "Invalid Regex"}
                  </div>

                  <p className="mt-3 text-slate-300">
                    {result.valid
                      ? "Your regex pattern is valid and ready."
                      : result.error}
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <h3 className="mb-3 font-bold text-white">Highlighted Text</h3>

                  <div
                    className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-200"
                    dangerouslySetInnerHTML={{ __html: result.highlighted }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                🧾 Matches and Capture Groups
              </h2>

              {result.matches.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full min-w-[640px] text-left">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="p-4">#</th>
                        <th className="p-4">Match</th>
                        <th className="p-4">Index</th>
                        <th className="p-4">Groups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matches.map((match, index) => (
                        <tr
                          key={`${match.value}-${match.index}-${index}`}
                          className="border-t border-slate-700 bg-slate-900"
                        >
                          <td className="p-4 text-slate-300">{index + 1}</td>
                          <td className="break-all p-4 font-bold text-blue-400">
                            {match.value}
                          </td>
                          <td className="p-4 text-slate-300">{match.index}</td>
                          <td className="break-all p-4 text-slate-300">
                            {match.groups.length
                              ? match.groups.join(", ")
                              : "No groups"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-slate-300">
                  No matches found.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                🔁 Replace Matches
              </h2>

              <label className="block">
                <span className="mb-2 block text-slate-300">Replace With</span>
                <input
                  value={replaceValue}
                  onChange={(event) => setReplaceValue(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <pre className="mt-4 max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                {replacedText || "Replaced text will appear here."}
              </pre>

              <div className="mt-4">
                <Button onClick={() => copyText("Replaced text", replacedText)}>
                  📋 Copy Replaced Text
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Common Regex Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => {
                      setPattern(example.pattern);
                      setFlags(example.flags);
                      setText(example.text);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    <span className="block">{example.label}</span>
                    <span className="mt-1 block font-mono text-sm font-normal text-slate-400">
                      /{example.pattern}/{example.flags.join("")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This Regex Tester uses JavaScript regular expressions in your
              browser. Regex behavior may differ slightly in other programming
              languages.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Regex Tester?
                </h2>
                <p className="text-slate-300">
                  A regex tester helps you test regular expressions against text,
                  highlight matches, inspect capture groups and debug patterns
                  before using them in code.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to validate emails, find numbers, extract URLs,
                  test JavaScript regex patterns and replace matched text online.
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