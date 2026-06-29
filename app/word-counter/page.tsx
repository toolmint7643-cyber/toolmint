"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import TextArea from "@/components/TextArea";

function countSyllableLikeWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmedText = text.trim();

    const words = trimmedText ? trimmedText.split(/\s+/).filter(Boolean) : [];
    const characters = text.length;
    const charactersWithoutSpaces = text.replace(/\s/g, "").length;
    const sentences = trimmedText
      ? trimmedText.split(/[.!?]+/).filter((item) => item.trim().length > 0)
          .length
      : 0;
    const paragraphs = trimmedText
      ? trimmedText.split(/\n+/).filter((item) => item.trim().length > 0).length
      : 0;
    const lines = text ? text.split("\n").length : 0;
    const readingTime = Math.max(1, Math.ceil(words.length / 200));
    const speakingTime = Math.max(1, Math.ceil(words.length / 130));

    return {
      words: words.length,
      characters,
      charactersWithoutSpaces,
      sentences,
      paragraphs,
      lines,
      readingTime,
      speakingTime,
      keywordCount: countSyllableLikeWords(text),
    };
  }, [text]);

  const clearText = () => {
    setText("");
  };

  const copyText = async () => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      alert("Text copied successfully!");
    } catch {
      alert("Unable to copy text. Please try again.");
    }
  };

  const statCards = [
    { label: "Words", value: stats.words, icon: "📝" },
    { label: "Characters", value: stats.characters, icon: "🔤" },
    {
      label: "Without Spaces",
      value: stats.charactersWithoutSpaces,
      icon: "✨",
    },
    { label: "Sentences", value: stats.sentences, icon: "📌" },
    { label: "Paragraphs", value: stats.paragraphs, icon: "📄" },
    { label: "Lines", value: stats.lines, icon: "📏" },
    { label: "Reading Time", value: `${stats.readingTime} min`, icon: "📖" },
    { label: "Speaking Time", value: `${stats.speakingTime} min`, icon: "🎙️" },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📝 Word Counter"
          description="Count words, characters, sentences, paragraphs, lines and reading time instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={copyText}>📋 Copy Text</Button>
              <Button onClick={clearText}>🔄 Clear Text</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>

                  <div className="text-3xl font-extrabold text-blue-400">
                    {item.value}
                  </div>

                  <div className="mt-2 text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold mb-4">
                📊 Writing Summary
              </h2>

              <div className="space-y-3 text-slate-300">
                <p>
                  Your text contains{" "}
                  <span className="font-bold text-white">{stats.words}</span>{" "}
                  words and{" "}
                  <span className="font-bold text-white">
                    {stats.characters}
                  </span>{" "}
                  characters.
                </p>

                <p>
                  Estimated reading time is{" "}
                  <span className="font-bold text-white">
                    {stats.readingTime} minute
                    {stats.readingTime > 1 ? "s" : ""}
                  </span>
                  .
                </p>

                <p>
                  Estimated speaking time is{" "}
                  <span className="font-bold text-white">
                    {stats.speakingTime} minute
                    {stats.speakingTime > 1 ? "s" : ""}
                  </span>
                  .
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