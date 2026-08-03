"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type KeywordItem = {
  keyword: string;
  count: number;
  density: number;
};

const sampleText = `ToolMint is a free online tools website for developers, students, creators and website owners. ToolMint provides useful developer tools, SEO tools, text tools, image tools, PDF tools and calculator tools.

A keyword density checker helps writers analyze content and understand how often a keyword appears inside a page. SEO writers can use keyword density to avoid keyword stuffing and keep content natural.

For best SEO results, write helpful content for users first. Use your main keyword naturally in the title, headings, introduction and important sections.`;

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
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "were",
  "will",
  "with",
  "you",
  "your",
  "we",
  "our",
  "their",
  "they",
  "can",
  "use",
  "using",
  "into",
  "inside",
  "how",
  "what",
  "when",
  "where",
  "why",
  "who",
  "which",
  "about",
  "after",
  "before",
  "than",
  "then",
  "also",
  "more",
  "most",
]);

function cleanText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(value: string, ignoreStopWords: boolean) {
  const words = cleanText(value)
    .split(" ")
    .map((word) => word.trim())
    .filter(Boolean);

  if (!ignoreStopWords) {
    return words;
  }

  return words.filter((word) => !stopWords.has(word));
}

function countPhrase(words: string[], phraseWords: string[]) {
  if (phraseWords.length === 0 || words.length === 0) {
    return 0;
  }

  let count = 0;

  for (let index = 0; index <= words.length - phraseWords.length; index += 1) {
    const slice = words.slice(index, index + phraseWords.length);

    if (slice.join(" ") === phraseWords.join(" ")) {
      count += 1;
    }
  }

  return count;
}

function getTopPhrases(words: string[], size: number, totalWords: number) {
  const phraseMap = new Map<string, number>();

  for (let index = 0; index <= words.length - size; index += 1) {
    const phrase = words.slice(index, index + size).join(" ");

    if (!phrase.trim()) {
      continue;
    }

    phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
  }

  return Array.from(phraseMap.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    }))
    .filter((item) => item.count > 1)
    .sort((first, second) => second.count - first.count)
    .slice(0, 10);
}

function getDensityStatus(density: number) {
  if (density === 0) {
    return {
      label: "Not Found",
      color: "text-slate-300",
      bg: "border-slate-600 bg-slate-800",
    };
  }

  if (density < 0.5) {
    return {
      label: "Low",
      color: "text-yellow-300",
      bg: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  if (density <= 2.5) {
    return {
      label: "Good",
      color: "text-emerald-300",
      bg: "border-emerald-500/30 bg-emerald-500/10",
    };
  }

  if (density <= 4) {
    return {
      label: "High",
      color: "text-orange-300",
      bg: "border-orange-500/30 bg-orange-500/10",
    };
  }

  return {
    label: "Stuffing Risk",
    color: "text-red-300",
    bg: "border-red-500/30 bg-red-500/10",
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function KeywordDensityCheckerPage() {
  const [text, setText] = useState(sampleText);
  const [targetKeyword, setTargetKeyword] = useState("keyword density");
  const [ignoreStopWords, setIgnoreStopWords] = useState(true);

  const analysis = useMemo(() => {
    const allWords = getWords(text, false);
    const filteredWords = getWords(text, ignoreStopWords);
    const targetWords = getWords(targetKeyword, false);

    const targetCount = countPhrase(allWords, targetWords);
    const targetDensity =
      allWords.length > 0 ? (targetCount / allWords.length) * 100 : 0;

    return {
      allWords,
      filteredWords,
      wordCount: allWords.length,
      filteredWordCount: filteredWords.length,
      characterCount: text.length,
      targetCount,
      targetDensity,
      oneWordKeywords: getTopPhrases(filteredWords, 1, allWords.length),
      twoWordKeywords: getTopPhrases(filteredWords, 2, allWords.length),
      threeWordKeywords: getTopPhrases(filteredWords, 3, allWords.length),
    };
  }, [text, targetKeyword, ignoreStopWords]);

  const targetStatus = getDensityStatus(analysis.targetDensity);

  const report = `Keyword Density Report

Target keyword: ${targetKeyword || "Not set"}
Word count: ${analysis.wordCount}
Character count: ${analysis.characterCount}
Target keyword count: ${analysis.targetCount}
Target keyword density: ${formatPercent(analysis.targetDensity)}
Status: ${targetStatus.label}

Top single-word keywords:
${analysis.oneWordKeywords
  .map((item) => `${item.keyword}: ${item.count} (${formatPercent(item.density)})`)
  .join("\n")}

Top 2-word phrases:
${analysis.twoWordKeywords
  .map((item) => `${item.keyword}: ${item.count} (${formatPercent(item.density)})`)
  .join("\n")}

Top 3-word phrases:
${analysis.threeWordKeywords
  .map((item) => `${item.keyword}: ${item.count} (${formatPercent(item.density)})`)
  .join("\n")}`;

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("Keyword density report copied!");
  };

  const loadSample = () => {
    setText(sampleText);
    setTargetKeyword("keyword density");
    setIgnoreStopWords(true);
  };

  const resetTool = () => {
    setText("");
    setTargetKeyword("");
    setIgnoreStopWords(true);
  };

  const renderKeywordTable = (title: string, items: KeywordItem[]) => (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <h3 className="mb-4 text-xl font-bold text-white">{title}</h3>

      {items.length === 0 ? (
        <p className="text-slate-400">No repeated keywords found yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.keyword}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3"
            >
              <span className="min-w-0 break-words font-semibold text-slate-100">
                {item.keyword}
              </span>
              <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300">
                {item.count}
              </span>
              <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                {formatPercent(item.density)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="📊 Keyword Density Checker"
          description="Analyze keyword frequency, keyword density, repeated words and SEO phrase usage in your content."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ✍️ Content Input
                </h2>
                <p className="text-slate-300">
                  Paste your article, landing page copy or SEO content to check
                  keyword usage.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Target Keyword
                </span>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(event) => setTargetKeyword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Example: keyword density"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Content
                </span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-[360px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Paste your content here..."
                />
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={ignoreStopWords}
                  onChange={(event) => setIgnoreStopWords(event.target.checked)}
                  className="h-4 w-4"
                />
                Ignore common stop words in top keywords
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={copyReport}>📋 Copy Report</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📈 SEO Summary
                </h2>
                <p className="text-slate-300">
                  Check whether your target keyword usage looks natural.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Words</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {analysis.wordCount}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Characters</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {analysis.characterCount}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Keyword Count</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {analysis.targetCount}
                  </p>
                </div>

                <div className={`rounded-xl border p-4 ${targetStatus.bg}`}>
                  <p className="text-sm text-slate-300">Keyword Density</p>
                  <p className={`mt-1 text-3xl font-bold ${targetStatus.color}`}>
                    {formatPercent(analysis.targetDensity)}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border p-5 ${targetStatus.bg}`}>
                <p className={`text-2xl font-bold ${targetStatus.color}`}>
                  {targetStatus.label}
                </p>
                <p className="mt-2 text-slate-300">
                  A natural keyword density is usually around 0.5% to 2.5%.
                  Focus on helpful content first, not repeating the keyword too
                  many times.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  🎯 Target Keyword
                </h3>
                <p className="break-words text-slate-200">
                  {targetKeyword || "No target keyword entered"}
                </p>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {renderKeywordTable("🔤 Top Single Words", analysis.oneWordKeywords)}
          {renderKeywordTable("🔗 Top 2-Word Phrases", analysis.twoWordKeywords)}
          {renderKeywordTable("🧩 Top 3-Word Phrases", analysis.threeWordKeywords)}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Use keyword density analysis before publishing articles, product
              pages and landing pages to keep content balanced.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Use your main keyword naturally in the title, introduction,
              headings and useful sections instead of repeating it everywhere.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This tool checks content frequency only. It does not show Google
              ranking, keyword volume or search difficulty.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}