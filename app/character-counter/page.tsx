"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import TextArea from "@/components/TextArea";

export default function CharacterCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const characters = text.length;
    const charactersWithoutSpaces = text.replace(/\s/g, "").length;
    const spaces = (text.match(/\s/g) || []).length;
    const letters = (text.match(/[a-zA-Z]/g) || []).length;
    const numbers = (text.match(/[0-9]/g) || []).length;
    const specialCharacters = (
      text.match(/[^a-zA-Z0-9\s]/g) || []
    ).length;
    const words = text.trim()
      ? text.trim().split(/\s+/).filter(Boolean).length
      : 0;
    const lines = text ? text.split("\n").length : 0;

    return {
      characters,
      charactersWithoutSpaces,
      spaces,
      letters,
      numbers,
      specialCharacters,
      words,
      lines,
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
    { label: "Total Characters", value: stats.characters, icon: "🔤" },
    {
      label: "Without Spaces",
      value: stats.charactersWithoutSpaces,
      icon: "✨",
    },
    { label: "Spaces", value: stats.spaces, icon: "⬜" },
    { label: "Letters", value: stats.letters, icon: "🔡" },
    { label: "Numbers", value: stats.numbers, icon: "🔢" },
    {
      label: "Special Characters",
      value: stats.specialCharacters,
      icon: "⚡",
    },
    { label: "Words", value: stats.words, icon: "📝" },
    { label: "Lines", value: stats.lines, icon: "📏" },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔤 Character Counter"
          description="Count characters, letters, numbers, spaces, words and lines instantly."
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
                📊 Character Summary
              </h2>

              <div className="space-y-3 text-slate-300">
                <p>
                  Your text contains{" "}
                  <span className="font-bold text-white">
                    {stats.characters}
                  </span>{" "}
                  total characters.
                </p>

                <p>
                  Without spaces, it contains{" "}
                  <span className="font-bold text-white">
                    {stats.charactersWithoutSpaces}
                  </span>{" "}
                  characters.
                </p>

                <p>
                  It includes{" "}
                  <span className="font-bold text-white">{stats.letters}</span>{" "}
                  letters,{" "}
                  <span className="font-bold text-white">{stats.numbers}</span>{" "}
                  numbers and{" "}
                  <span className="font-bold text-white">
                    {stats.specialCharacters}
                  </span>{" "}
                  special characters.
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