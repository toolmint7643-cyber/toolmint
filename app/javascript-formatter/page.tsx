"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputMode = "format" | "minify";

const sampleJavaScript = `function calculateTotal(items){const total=items.reduce((sum,item)=>sum+item.price,0);if(total>1000){return total*0.9;}return total;}const cart=[{name:"Tool",price:500},{name:"Pro",price:700}];console.log(calculateTotal(cart));`;

function formatJavaScript(code: string, indentSize: number) {
  if (!code.trim()) return "";

  const indentText = " ".repeat(indentSize);
  let indent = 0;

  return code
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,])\s*/g, "$1")
    .replace(/;/g, ";\n")
    .replace(/{/g, "{\n")
    .replace(/}/g, "\n}\n")
    .replace(/,/g, ", ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("}")) {
        indent = Math.max(indent - 1, 0);
      }

      const formattedLine = `${indentText.repeat(indent)}${line}`;

      if (line.endsWith("{")) {
        indent += 1;
      }

      return formattedLine;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function minifyJavaScript(code: string) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:+\-*/%=<>[\]])\s*/g, "$1")
    .trim();
}

function validateJavaScript(code: string) {
  if (!code.trim()) {
    return {
      valid: false,
      message: "Please enter JavaScript to format.",
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

function analyzeJavaScript(code: string) {
  const functions =
    code.match(/\bfunction\b|\([^)]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>/g) || [];
  const variables = code.match(/\b(const|let|var)\s+[a-zA-Z_$][\w$]*/g) || [];
  const imports = code.match(/\bimport\s+.*?from\s+['"][^'"]+['"]/g) || [];
  const comments =
    code.match(/\/\/.*$/gm) || code.match(/\/\*[\s\S]*?\*\//g) || [];

  return {
    functions: functions.length,
    variables: variables.length,
    imports: imports.length,
    comments: comments.length,
    size: new TextEncoder().encode(code).length,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function JavaScriptFormatterPage() {
  const [input, setInput] = useState(sampleJavaScript);
  const [outputMode, setOutputMode] = useState<OutputMode>("format");
  const [indentSize, setIndentSize] = useState(2);

  const output = useMemo(() => {
    return outputMode === "format"
      ? formatJavaScript(input, indentSize)
      : minifyJavaScript(input);
  }, [input, outputMode, indentSize]);

  const validation = useMemo(() => validateJavaScript(input), [input]);
  const stats = useMemo(() => analyzeJavaScript(input), [input]);

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
      value: `function greet(name){if(!name){return "Hello";}return "Hello, "+name;}console.log(greet("ToolMint"));`,
    },
    {
      label: "Array Map",
      value: `const tools=["JSON","CSS","JavaScript"];const slugs=tools.map(tool=>tool.toLowerCase());console.log(slugs);`,
    },
    {
      label: "Fetch API",
      value: `async function loadTools(){const res=await fetch("/api/tools");const data=await res.json();return data.filter(item=>item.active);}`,
    },
    {
      label: "Class",
      value: `class Calculator{constructor(value){this.value=value;}add(number){this.value+=number;return this;}}const calc=new Calculator(10).add(5);`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🟨 JavaScript Formatter"
          description="Format JavaScript online, beautify JS code, minify JavaScript, check syntax and inspect functions, variables and imports instantly."
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
                  ✅ JavaScript Output
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
                    {validation.valid ? "JS Ready" : "Check JS"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutputMode("format")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "format"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Format
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputMode("minify")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "minify"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Minify
                  </button>

                  <select
                    value={indentSize}
                    onChange={(event) => setIndentSize(Number(event.target.value))}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value={2}>2 Spaces</option>
                    <option value={4}>4 Spaces</option>
                  </select>
                </div>

                <pre className="mt-5 min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Formatted or minified JavaScript will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("JavaScript output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Functions", stats.functions, "⚙️"],
                ["Variables", stats.variables, "📦"],
                ["Imports", stats.imports, "📥"],
                ["Comments", stats.comments, "💬"],
                ["Size", formatBytes(stats.size), "📏"],
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
              This JavaScript Formatter is designed for quick beautifying and
              minifying. For complex JavaScript, JSX or TypeScript, review the
              output before using it in production.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is JavaScript Formatting?
                </h2>
                <p className="text-slate-300">
                  JavaScript formatting adds indentation, line breaks and spacing
                  to make JS code easier to read, edit and debug. It helps
                  developers understand functions, variables and code blocks.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format JavaScript online, beautify JS code,
                  minify JavaScript, check syntax, clean snippets and prepare
                  readable code for websites or apps.
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