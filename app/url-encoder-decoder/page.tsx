"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ActionMode = "encode" | "decode";
type UrlMode = "full_url" | "component";

const quickExamples = [
  {
    label: "Search URL",
    value: "https://example.com/search?q=hello world&city=New York",
  },
  {
    label: "Query String",
    value: "name=John Doe&city=Hyderabad&email=test@example.com",
  },
  {
    label: "Special Text",
    value: "hello world! price=100% & category=tools",
  },
  {
    label: "Encoded URL",
    value: "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%2520world",
  },
];

const commonCharacters = [
  { character: "Space", encoded: "%20" },
  { character: "!", encoded: "%21" },
  { character: "#", encoded: "%23" },
  { character: "$", encoded: "%24" },
  { character: "&", encoded: "%26" },
  { character: "+", encoded: "%2B" },
  { character: "/", encoded: "%2F" },
  { character: ":", encoded: "%3A" },
  { character: "?", encoded: "%3F" },
  { character: "=", encoded: "%3D" },
  { character: "@", encoded: "%40" },
];

function processUrlValue(value: string, actionMode: ActionMode, urlMode: UrlMode) {
  if (!value.trim()) {
    return {
      output: "",
      error: "",
    };
  }

  try {
    if (actionMode === "encode") {
      return {
        output:
          urlMode === "full_url"
            ? encodeURI(value)
            : encodeURIComponent(value),
        error: "",
      };
    }

    return {
      output:
        urlMode === "full_url"
          ? decodeURI(value)
          : decodeURIComponent(value),
      error: "",
    };
  } catch {
    return {
      output: "",
      error:
        "Invalid encoded URL. Please check percent signs and encoded characters.",
    };
  }
}

export default function UrlEncoderDecoderPage() {
  const [input, setInput] = useState(
    "https://example.com/search?q=hello world&city=New York"
  );
  const [actionMode, setActionMode] = useState<ActionMode>("encode");
  const [urlMode, setUrlMode] = useState<UrlMode>("full_url");

  const result = useMemo(
    () => processUrlValue(input, actionMode, urlMode),
    [input, actionMode, urlMode]
  );

  const stats = useMemo(() => {
    return {
      inputLength: input.length,
      outputLength: result.output.length,
      mode: actionMode === "encode" ? "Encoding" : "Decoding",
    };
  }, [input, result.output, actionMode]);

  const copyResult = async () => {
    if (!result.output) {
      alert("Nothing to copy. Please enter a URL or text first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(result.output);
      alert("URL result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const useOutputAsInput = () => {
    if (!result.output) return;
    setInput(result.output);
    setActionMode(actionMode === "encode" ? "decode" : "encode");
  };

  const resetTool = () => {
    setInput("https://example.com/search?q=hello world&city=New York");
    setActionMode("encode");
    setUrlMode("full_url");
  };

  const clearText = () => {
    setInput("");
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔗 URL Encoder / Decoder"
          description="Encode and decode URLs, query strings, URL components, spaces and special characters instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-xl font-bold">⚙️ Select Action</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActionMode("encode")}
                  className={`rounded-xl border p-4 text-left transition ${
                    actionMode === "encode"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Encode URL</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Convert spaces and special characters into URL-safe format.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionMode("decode")}
                  className={`rounded-xl border p-4 text-left transition ${
                    actionMode === "decode"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Decode URL</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Convert encoded URL text back into readable format.
                  </span>
                </button>
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">🧩 Encoding Type</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrlMode("full_url")}
                  className={`rounded-xl border p-4 text-left transition ${
                    urlMode === "full_url"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Full URL</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Best for complete links like https://example.com/search?q=test.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setUrlMode("component")}
                  className={`rounded-xl border p-4 text-left transition ${
                    urlMode === "component"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">URL Component</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Best for query values, parameters and special text.
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Input URL or Text
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste your URL, query string or encoded text here..."
                  className="min-h-[260px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={clearText}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Output Result
                </h2>

                <div className="min-h-[260px] rounded-xl border border-blue-700 bg-blue-950/30 p-4">
                  {result.error ? (
                    <p className="text-red-300">{result.error}</p>
                  ) : result.output ? (
                    <p className="break-words text-blue-200">{result.output}</p>
                  ) : (
                    <p className="text-slate-400">
                      Your encoded or decoded result will appear here.
                    </p>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={copyResult}>📋 Copy Result</Button>

                  <button
                    type="button"
                    onClick={useOutputAsInput}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔁 Use Output
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📥</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.inputLength}
                </div>
                <div className="mt-2 text-slate-400">Input Characters</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📤</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.outputLength}
                </div>
                <div className="mt-2 text-slate-400">Output Characters</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">⚙️</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.mode}
                </div>
                <div className="mt-2 text-slate-400">Current Mode</div>
              </div>
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
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    <span className="block">{example.label}</span>
                    <span className="mt-1 block truncate text-sm font-normal text-slate-400">
                      {example.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📊 Common Encoded Characters
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {commonCharacters.map((item) => (
                  <div
                    key={item.encoded}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center"
                  >
                    <div className="font-bold text-slate-200">
                      {item.character}
                    </div>
                    <div className="mt-2 text-xl font-extrabold text-blue-400">
                      {item.encoded}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is URL Encoding?
                </h2>
                <p className="text-slate-300">
                  URL encoding converts spaces and special characters into a safe
                  percent encoded format. For example, a space becomes %20 so the
                  URL can work correctly in browsers, APIs and query strings.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 URL vs Component Encoding
                </h2>
                <p className="text-slate-300">
                  Full URL mode keeps useful URL characters readable. Component
                  mode encodes almost every special character, which is best for
                  query values, parameters and form data.
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