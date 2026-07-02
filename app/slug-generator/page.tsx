"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Separator = "-" | "_";

const sampleText = "How to Build Free Developer Tools with ToolMint";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

function generateSlug(
  text: string,
  separator: Separator,
  lowercase: boolean,
  removeStopWords: boolean
) {
  let value = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  if (lowercase) {
    value = value.toLowerCase();
  }

  let words = value
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (removeStopWords) {
    words = words.filter((word) => !stopWords.has(word.toLowerCase()));
  }

  return words.join(separator);
}

function analyzeSlug(input: string, slug: string) {
  return {
    inputCharacters: input.length,
    slugCharacters: slug.length,
    words: slug ? slug.split(/[-_]/).filter(Boolean).length : 0,
    separators: (slug.match(/[-_]/g) || []).length,
  };
}

export default function SlugGeneratorPage() {
  const [input, setInput] = useState(sampleText);
  const [separator, setSeparator] = useState<Separator>("-");
  const [lowercase, setLowercase] = useState(true);
  const [removeStopWords, setRemoveStopWords] = useState(false);

  const slug = useMemo(
    () => generateSlug(input, separator, lowercase, removeStopWords),
    [input, separator, lowercase, removeStopWords]
  );

  const stats = useMemo(() => analyzeSlug(input, slug), [input, slug]);

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
      label: "Blog Title",
      value: "10 Best Free Developer Tools for 2026",
    },
    {
      label: "Product Page",
      value: "Premium Wireless Mouse - Black Edition",
    },
    {
      label: "Tool Page",
      value: "URL Encoder / Decoder Online Tool",
    },
    {
      label: "Long Heading",
      value: "How to Format JSON and Validate API Responses Online",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔗 Slug Generator"
          description="Generate SEO-friendly URL slugs online from titles, headings, product names and blog post ideas instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Enter Title or Text
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Enter title, heading, product name or text..."
                  className="min-h-[260px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
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
                    onClick={() => setInput(sampleText)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample
                  </button>

                  <Button onClick={() => copyText("Input text", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Generated Slug
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">SEO URL Slug</p>

                  <div className="mt-3 break-all text-3xl font-extrabold text-blue-300">
                    {slug || "your-slug-will-appear-here"}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSeparator("-")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      separator === "-"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Hyphen -
                  </button>

                  <button
                    type="button"
                    onClick={() => setSeparator("_")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      separator === "_"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Underscore _
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={lowercase}
                      onChange={(event) => setLowercase(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Convert to lowercase
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={removeStopWords}
                      onChange={(event) =>
                        setRemoveStopWords(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    Remove common stop words
                  </label>
                </div>

                <div className="mt-4">
                  <Button onClick={() => copyText("Slug", slug)}>
                    📋 Copy Slug
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["Input Characters", stats.inputCharacters, "🔤"],
                ["Slug Length", stats.slugCharacters, "📏"],
                ["Slug Words", stats.words, "📝"],
                ["Separators", stats.separators, "🔗"],
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
                ⚡ Quick Slug Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    <span className="block">{example.label}</span>
                    <span className="mt-1 block text-sm font-normal text-slate-400">
                      {example.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              For SEO-friendly URLs, keep slugs short, readable, lowercase and
              separated with hyphens. Avoid special characters, long sentences and
              unnecessary stop words when possible.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a URL Slug?
                </h2>
                <p className="text-slate-300">
                  A URL slug is the readable part of a web address, usually based
                  on a page title or keyword. Good slugs help users and search
                  engines understand page content.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to generate SEO slugs for blog posts, product
                  pages, landing pages, documentation, categories and online tool
                  pages.
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