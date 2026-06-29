"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import TextArea from "@/components/TextArea";

type CaseType =
  | "uppercase"
  | "lowercase"
  | "title"
  | "sentence"
  | "capitalized"
  | "alternating"
  | "inverse"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "slug";

function toWords(text: string) {
  return text
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function capitalizeWord(word: string) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function toTitleCase(text: string) {
  return text
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toSentenceCase(text: string) {
  return text
    .toLowerCase()
    .replace(/(^\s*\w|[.!?]\s*\w)/g, (character) =>
      character.toUpperCase()
    );
}

function toCapitalizedCase(text: string) {
  return text
    .split(/\s+/)
    .map((word) => capitalizeWord(word))
    .join(" ");
}

function toAlternatingCase(text: string) {
  let index = 0;

  return text
    .split("")
    .map((character) => {
      if (!/[a-zA-Z]/.test(character)) return character;

      const converted =
        index % 2 === 0
          ? character.toLowerCase()
          : character.toUpperCase();

      index++;
      return converted;
    })
    .join("");
}

function toInverseCase(text: string) {
  return text
    .split("")
    .map((character) => {
      if (character === character.toUpperCase()) {
        return character.toLowerCase();
      }

      return character.toUpperCase();
    })
    .join("");
}

function toCamelCase(text: string) {
  const words = toWords(text);

  return words
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : capitalizeWord(word)
    )
    .join("");
}

function toPascalCase(text: string) {
  return toWords(text).map((word) => capitalizeWord(word)).join("");
}

function toSnakeCase(text: string) {
  return toWords(text)
    .map((word) => word.toLowerCase())
    .join("_");
}

function toKebabCase(text: string) {
  return toWords(text)
    .map((word) => word.toLowerCase())
    .join("-");
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function convertText(text: string, caseType: CaseType) {
  switch (caseType) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "title":
      return toTitleCase(text);
    case "sentence":
      return toSentenceCase(text);
    case "capitalized":
      return toCapitalizedCase(text);
    case "alternating":
      return toAlternatingCase(text);
    case "inverse":
      return toInverseCase(text);
    case "camel":
      return toCamelCase(text);
    case "pascal":
      return toPascalCase(text);
    case "snake":
      return toSnakeCase(text);
    case "kebab":
      return toKebabCase(text);
    case "slug":
      return toSlug(text);
    default:
      return text;
  }
}

export default function CaseConverterPage() {
  const [input, setInput] = useState("");
  const [caseType, setCaseType] = useState<CaseType>("uppercase");

  const output = useMemo(() => {
    return convertText(input, caseType);
  }, [input, caseType]);

  const stats = useMemo(() => {
    const words = input.trim()
      ? input.trim().split(/\s+/).filter(Boolean).length
      : 0;

    return {
      words,
      characters: input.length,
      convertedCharacters: output.length,
    };
  }, [input, output]);

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      alert("Converted text copied successfully!");
    } catch {
      alert("Unable to copy converted text. Please try again.");
    }
  };

  const copyInput = async () => {
    if (!input) return;

    try {
      await navigator.clipboard.writeText(input);
      alert("Input text copied successfully!");
    } catch {
      alert("Unable to copy input text. Please try again.");
    }
  };

  const useOutputAsInput = () => {
    setInput(output);
  };

  const clearText = () => {
    setInput("");
  };

  const caseOptions: { label: string; value: CaseType; example: string }[] = [
    { label: "UPPERCASE", value: "uppercase", example: "HELLO WORLD" },
    { label: "lowercase", value: "lowercase", example: "hello world" },
    { label: "Title Case", value: "title", example: "Hello World" },
    { label: "Sentence case", value: "sentence", example: "Hello world." },
    { label: "Capitalized Case", value: "capitalized", example: "Hello World" },
    { label: "aLtErNaTiNg", value: "alternating", example: "hElLo WoRlD" },
    { label: "iNVERSE cASE", value: "inverse", example: "hELLO wORLD" },
    { label: "camelCase", value: "camel", example: "helloWorld" },
    { label: "PascalCase", value: "pascal", example: "HelloWorld" },
    { label: "snake_case", value: "snake", example: "hello_world" },
    { label: "kebab-case", value: "kebab", example: "hello-world" },
    { label: "slug-case", value: "slug", example: "hello-world" },
  ];

  const statCards = [
    { label: "Words", value: stats.words, icon: "📝" },
    { label: "Input Characters", value: stats.characters, icon: "🔤" },
    {
      label: "Output Characters",
      value: stats.convertedCharacters,
      icon: "✨",
    },
    { label: "Case Formats", value: caseOptions.length, icon: "⚙️" },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔠 Case Converter"
          description="Convert text to uppercase, lowercase, title case, sentence case, camelCase, snake_case, kebab-case and more."
        />

        <ToolCard>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-xl font-bold">📝 Input Text</h2>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or paste your text here..."
              />
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">⚙️ Choose Case Format</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {caseOptions.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setCaseType(item.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      caseType === item.value
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                    }`}
                  >
                    <span className="block font-bold">{item.label}</span>
                    <span className="mt-1 block text-sm opacity-80">
                      {item.example}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">✨ Converted Output</h2>
              <TextArea
                value={output}
                placeholder="Converted text will appear here..."
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button onClick={copyOutput}>📋 Copy Output</Button>
              <Button onClick={copyInput}>🧾 Copy Input</Button>
              <Button onClick={useOutputAsInput}>🔁 Use Output</Button>
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
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}