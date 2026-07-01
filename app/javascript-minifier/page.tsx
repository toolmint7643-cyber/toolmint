"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleJavaScript = `function calculateTotal(items) {
  // Calculate cart total
  const total = items.reduce((sum, item) => sum + item.price, 0);

  if (total > 1000) {
    return total * 0.9;
  }

  return total;
}

const cart = [
  { name: "Tool", price: 500 },
  { name: "Pro", price: 700 }
];

console.log(calculateTotal(cart));`;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function removeJsComments(code: string) {
  let output = "";
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < code.length; index += 1) {
    const current = code[index];
    const next = code[index + 1];
    const previous = code[index - 1];

    if (inLineComment) {
      if (current === "\n") {
        inLineComment = false;
        output += current;
      }
      continue;
    }

    if (inBlockComment) {
      if (current === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate && current === "/" && next === "/") {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate && current === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (current === "'" && !inDouble && !inTemplate && previous !== "\\") {
      inSingle = !inSingle;
    } else if (current === '"' && !inSingle && !inTemplate && previous !== "\\") {
      inDouble = !inDouble;
    } else if (current === "`" && !inSingle && !inDouble && previous !== "\\") {
      inTemplate = !inTemplate;
    }

    output += current;
  }

  return output;
}

function minifyJavaScript(code: string) {
  return removeJsComments(code)
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:+\-*/%=<>[\]])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function validateJavaScript(code: string) {
  if (!code.trim()) {
    return {
      valid: false,
      message: "Please enter JavaScript to minify.",
    };
  }

  try {
    new Function(code);
    return {
      valid: true,
      message: "JavaScript syntax looks valid.",
    };
  } catch (error) {
    return {
      valid: false,
      message:
        error instanceof Error
          ? error.message
          : "JavaScript syntax may contain an error.",
    };
  }
}

function analyzeJavaScript(code: string, minified: string) {
  const originalSize = new TextEncoder().encode(code).length;
  const minifiedSize = new TextEncoder().encode(minified).length;
  const savedBytes = Math.max(originalSize - minifiedSize, 0);
  const reduction = originalSize ? (savedBytes / originalSize) * 100 : 0;

  return {
    originalSize,
    minifiedSize,
    savedBytes,
    reduction,
    lines: code ? code.split("\n").length : 0,
  };
}

export default function JavaScriptMinifierPage() {
  const [input, setInput] = useState(sampleJavaScript);

  const output = useMemo(() => minifyJavaScript(input), [input]);
  const validation = useMemo(() => validateJavaScript(input), [input]);
  const stats = useMemo(() => analyzeJavaScript(input, output), [input, output]);

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
      label: "Function",
      value: `function greet(name) {
  if (!name) {
    return "Hello";
  }

  return "Hello, " + name;
}

console.log(greet("ToolMint"));`,
    },
    {
      label: "Array Map",
      value: `const tools = ["JSON", "CSS", "JavaScript"];

const slugs = tools.map((tool) => {
  return tool.toLowerCase();
});

console.log(slugs);`,
    },
    {
      label: "Fetch API",
      value: `async function loadTools() {
  const res = await fetch("/api/tools");
  const data = await res.json();

  return data.filter((item) => item.active);
}`,
    },
    {
      label: "Class",
      value: `class Calculator {
  constructor(value) {
    this.value = value;
  }

  add(number) {
    this.value += number;
    return this;
  }
}`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🗜️ JavaScript Minifier"
          description="Minify JavaScript online, compress JS code, remove comments, reduce file size and copy compact JavaScript instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ JavaScript Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste JavaScript code here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
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
                    onClick={() => setInput(sampleJavaScript)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample JS
                  </button>

                  <Button onClick={() => copyText("JavaScript input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Minified JavaScript
                </h2>

                <div
                  className={`rounded-2xl border p-5 text-center ${
                    validation.valid
                      ? "border-green-700 bg-green-950/30"
                      : "border-red-700 bg-red-950/30"
                  }`}
                >
                  <div
                    className={`text-4xl font-extrabold ${
                      validation.valid ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {validation.valid ? "JS Minified" : "Check JS"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <pre className="mt-5 min-h-[300px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Minified JavaScript will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("Minified JavaScript", output)}>
                    📋 Copy Minified JS
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Original", formatBytes(stats.originalSize), "📥"],
                ["Minified", formatBytes(stats.minifiedSize), "📤"],
                ["Saved", formatBytes(stats.savedBytes), "💾"],
                ["Reduction", `${stats.reduction.toFixed(1)}%`, "📉"],
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
                ⚡ Quick JavaScript Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This JavaScript Minifier removes comments and extra whitespace for
              quick compression. For complex production bundles, review the output
              or use a dedicated build minifier like Terser, SWC or esbuild.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is JavaScript Minification?
                </h2>
                <p className="text-slate-300">
                  JavaScript minification removes comments, extra spaces and line
                  breaks to make JS code smaller. It helps reduce file size and
                  improve delivery for websites and apps.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to minify JavaScript online, compress JS snippets,
                  remove comments, reduce code size and prepare compact scripts
                  for testing or small projects.
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