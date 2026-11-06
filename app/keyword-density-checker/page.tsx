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

A keyword density checker helps writers count how often a target phrase appears in a piece of content. You can use a keyword frequency report to review wording before publishing an article, product page or landing page.

Write useful, clear content for people first. Describe the page accurately, use relevant terms naturally, and avoid repeating a phrase just to influence search rankings.`;

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

const wordPattern = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;

function getWords(value: string) {
  return value.toLocaleLowerCase().match(wordPattern) ?? [];
}

function countPhrase(words: string[], phraseWords: string[]) {
  if (phraseWords.length === 0 || words.length === 0) {
    return 0;
  }

  let count = 0;

  for (let index = 0; index <= words.length - phraseWords.length; index += 1) {
    const matches = phraseWords.every(
      (word, phraseIndex) => words[index + phraseIndex] === word,
    );

    if (matches) {
      count += 1;
    }
  }

  return count;
}

function getTopPhrases(
  words: string[],
  size: number,
  totalWords: number,
  ignoreStopWords: boolean,
) {
  const phraseMap = new Map<string, number>();

  for (let index = 0; index <= words.length - size; index += 1) {
    const phraseWords = words.slice(index, index + size);

    if (
      ignoreStopWords &&
      phraseWords.some((word) => stopWords.has(word))
    ) {
      continue;
    }

    const phrase = phraseWords.join(" ");
    phraseMap.set(phrase, (phraseMap.get(phrase) ?? 0) + 1);
  }

  return Array.from(phraseMap.entries())
    .map(([keyword, count]) => ({
      keyword,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    }))
    .filter((item) => item.count > 1)
    .sort(
      (first, second) =>
        second.count - first.count ||
        first.keyword.localeCompare(second.keyword),
    )
    .slice(0, 10);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export default function KeywordDensityCheckerPage() {
  const [text, setText] = useState(sampleText);
  const [targetKeyword, setTargetKeyword] = useState("keyword density");
  const [ignoreStopWords, setIgnoreStopWords] = useState(true);

  const analysis = useMemo(() => {
    const allWords = getWords(text);
    const targetWords = getWords(targetKeyword);
    const targetCount = countPhrase(allWords, targetWords);
    const targetDensity =
      allWords.length > 0 ? (targetCount / allWords.length) * 100 : 0;

    return {
      wordCount: allWords.length,
      characterCount: Array.from(text).length,
      targetCount,
      targetDensity,
      hasTarget: targetWords.length > 0,
      oneWordKeywords: getTopPhrases(
        allWords,
        1,
        allWords.length,
        ignoreStopWords,
      ),
      twoWordKeywords: getTopPhrases(
        allWords,
        2,
        allWords.length,
        ignoreStopWords,
      ),
      threeWordKeywords: getTopPhrases(
        allWords,
        3,
        allWords.length,
        ignoreStopWords,
      ),
    };
  }, [text, targetKeyword, ignoreStopWords]);

  const targetStatus = !analysis.hasTarget
    ? "Enter a target phrase to count its occurrences."
    : analysis.targetCount === 0
      ? "No exact phrase match found in the content."
      : "Exact phrase occurrences counted.";

  const report = `Keyword Frequency Report

Target phrase: ${targetKeyword || "Not set"}
Word count: ${analysis.wordCount}
Character count: ${analysis.characterCount}
Target phrase occurrences: ${analysis.hasTarget ? analysis.targetCount : "Not calculated"}
Target phrase frequency: ${analysis.hasTarget ? formatPercent(analysis.targetDensity) : "Not calculated"}

Frequency formula: exact phrase occurrences / total word count x 100.
This is a frequency calculation, not a Google ranking score or recommended density.

Top single words:
${
  analysis.oneWordKeywords.length
    ? analysis.oneWordKeywords
        .map(
          (item) =>
            `${item.keyword}: ${item.count} (${formatPercent(item.density)})`,
        )
        .join("\n")
    : "No repeated words found."
}

Top 2-word phrases:
${
  analysis.twoWordKeywords.length
    ? analysis.twoWordKeywords
        .map(
          (item) =>
            `${item.keyword}: ${item.count} (${formatPercent(item.density)})`,
        )
        .join("\n")
    : "No repeated phrases found."
}

Top 3-word phrases:
${
  analysis.threeWordKeywords.length
    ? analysis.threeWordKeywords
        .map(
          (item) =>
            `${item.keyword}: ${item.count} (${formatPercent(item.density)})`,
        )
        .join("\n")
    : "No repeated phrases found."
}`;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      window.alert("Keyword frequency report copied.");
    } catch {
      window.alert("Could not copy the report. Please check clipboard permissions.");
    }
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
        <p className="text-slate-400">No repeated phrases found yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.keyword}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3"
            >
              <span className="min-w-0 break-words font-semibold text-slate-100">
                {item.keyword}
              </span>
              <span
                className="rounded-lg bg-blue-500/10 px-3 py-1 text-sm font-bold text-blue-300"
                title="Number of occurrences"
              >
                {item.count}
              </span>
              <span
                className="rounded-lg bg-slate-700 px-3 py-1 text-sm font-bold text-slate-200"
                title="Occurrences divided by the document's total word count"
              >
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
          description="Count exact keyword and phrase occurrences, review repeated terms, and calculate their share of the text."
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ✍️ Content Input
                </h2>
                <p className="text-slate-300">
                  Paste an article, product description or landing page copy.
                  Your analysis updates as you type.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Target Keyword or Phrase
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

              <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={ignoreStopWords}
                  onChange={(event) => setIgnoreStopWords(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>
                  Ignore common English stop words in phrase lists
                  <span className="mt-1 block text-sm font-normal text-slate-400">
                    This affects the repeated-word and phrase tables only. It
                    does not change the target phrase count.
                  </span>
                </span>
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
                  📈 Frequency Summary
                </h2>
                <p className="text-slate-300">
                  Counts describe this text only; they are not a search ranking
                  prediction.
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
                  <p className="text-sm text-slate-300">
                    Characters, including spaces
                  </p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {analysis.characterCount}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-600 bg-slate-800 p-4">
                  <p className="text-sm text-slate-300">Phrase Occurrences</p>
                  <p className="mt-1 text-3xl font-bold text-slate-100">
                    {analysis.hasTarget ? analysis.targetCount : "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-600 bg-slate-800 p-4">
                  <p className="text-sm text-slate-300">Phrase Frequency</p>
                  <p className="mt-1 text-3xl font-bold text-slate-100">
                    {analysis.hasTarget
                      ? formatPercent(analysis.targetDensity)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <p className="text-lg font-bold text-white">{targetStatus}</p>
                <p className="mt-2 text-slate-300">
                  Frequency formula: exact phrase occurrences divided by total
                  word count, multiplied by 100. No universal percentage is
                  presented as an ideal or ranking target.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  🎯 Target Phrase
                </h3>
                <p className="break-words text-slate-200">
                  {targetKeyword || "No target phrase entered"}
                </p>
              </div>
            </div>
          </ToolCard>
        </div>

        <section
          className="mt-8"
          aria-labelledby="repeated-phrases-heading"
        >
          <h2
            id="repeated-phrases-heading"
            className="mb-5 text-2xl font-bold text-white"
          >
            Repeated Words and Phrases
          </h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {renderKeywordTable(
              "🔤 Top Single Words",
              analysis.oneWordKeywords,
            )}
            {renderKeywordTable(
              "🔗 Top 2-Word Phrases",
              analysis.twoWordKeywords,
            )}
            {renderKeywordTable(
              "🧩 Top 3-Word Phrases",
              analysis.threeWordKeywords,
            )}
          </div>
        </section>

        <section className="mt-10 space-y-5" aria-labelledby="guide-heading">
          <div>
            <h2
              id="guide-heading"
              className="mb-2 text-2xl font-bold text-white"
            >
              Keyword Frequency Checker: How to Use It
            </h2>
            <p className="max-w-4xl text-slate-300">
              Review how often a phrase appears in your draft, find repeated
              terms, and inspect the text before you publish. The result is a
              count and a simple calculation, not a Google SEO score.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ToolCard>
              <h3 className="mb-3 text-xl font-bold text-white">
                How the calculation works
              </h3>
              <p className="text-slate-300">
                The checker converts text to lowercase, tokenizes letters and
                numbers, and counts exact consecutive matches for your target
                phrase. It calculates phrase frequency as occurrences divided
                by total word count, multiplied by 100. Punctuation separates
                tokens, so punctuation differences and sentence boundaries are
                not treated as phrase boundaries.
              </p>
            </ToolCard>

            <ToolCard>
              <h3 className="mb-3 text-xl font-bold text-white">
                Steps to analyze a draft
              </h3>
              <ol className="list-inside list-decimal space-y-2 text-slate-300">
                <li>Enter a target word or phrase.</li>
                <li>Paste the text you want to review.</li>
                <li>Check its occurrence count and calculated frequency.</li>
                <li>
                  Review repeated one-, two- and three-word phrases for wording
                  that may sound unnatural.
                </li>
                <li>Copy the report if you need to keep the results.</li>
              </ol>
            </ToolCard>

            <ToolCard>
              <h3 className="mb-3 text-xl font-bold text-white">
                What the results do not tell you
              </h3>
              <p className="text-slate-300">
                This tool does not fetch a live web page, measure search volume
                or competition, check Google rankings, or predict indexing. It
                analyzes only the text pasted into the editor. A frequency
                percentage by itself cannot determine whether content is
                useful or will rank.
              </p>
            </ToolCard>

            <ToolCard>
              <h3 className="mb-3 text-xl font-bold text-white">
                Language and matching notes
              </h3>
              <p className="text-slate-300">
                Tokenization supports Unicode letters and numbers. The optional
                stop-word list contains common English words and only affects
                the repeated-phrase tables. Languages that do not normally
                separate words with spaces may not be segmented into linguistic
                words accurately. Matching is case-insensitive and based on
                consecutive tokens after punctuation is treated as a separator.
              </p>
            </ToolCard>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Review for Readers
            </h2>
            <p className="text-slate-300">
              Use the counts to spot repetition, then read the draft aloud.
              Keep terms where they help explain the topic; revise wording that
              feels forced or distracts from the reader’s task.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              There is no universal keyword-frequency percentage that
              guarantees better search rankings. This checker provides text
              analysis only; it does not replace audience research or a full
              SEO review.
            </p>
          </ToolCard>
        </section>
      </main>

      <Footer />
    </>
  );
}