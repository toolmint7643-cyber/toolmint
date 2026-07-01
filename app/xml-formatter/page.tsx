"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputMode = "format" | "minify";

const sampleXml = `<catalog><tool id="1"><name>XML Formatter</name><category>Developer</category><free>true</free></tool><tool id="2"><name>JSON Validator</name><category>Developer</category><free>true</free></tool></catalog>`;

function tokenizeXml(xml: string) {
  return xml
    .replace(/>\s*</g, "><")
    .match(/<!--[\s\S]*?-->|<\?xml[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[^>]+>|[^<]+/g) || [];
}

function getTagName(token: string) {
  const match = token.match(/^<\/?\s*([a-zA-Z0-9:_-]+)/);
  return match ? match[1] : "";
}

function formatXml(xml: string, indentSize: number) {
  if (!xml.trim()) return "";

  const tokens = tokenizeXml(xml);
  const indentText = " ".repeat(indentSize);
  let indent = 0;
  const lines: string[] = [];

  tokens.forEach((rawToken) => {
    const token = rawToken.trim();
    if (!token) return;

    const isClosing = /^<\//.test(token);
    const isOpening = /^<[^/!?][^>]*>$/.test(token);
    const isSelfClosing = /\/>$/.test(token);
    const isDeclaration = /^<\?xml/i.test(token);
    const isComment = /^<!--/.test(token);
    const isCdata = /^<!\[CDATA\[/i.test(token);

    if (isClosing) {
      indent = Math.max(indent - 1, 0);
    }

    lines.push(`${indentText.repeat(indent)}${token}`);

    if (
      isOpening &&
      !isClosing &&
      !isSelfClosing &&
      !isDeclaration &&
      !isComment &&
      !isCdata
    ) {
      indent += 1;
    }
  });

  return lines.join("\n");
}

function minifyXml(xml: string, removeComments: boolean) {
  let output = xml;

  if (removeComments) {
    output = output.replace(/<!--[\s\S]*?-->/g, "");
  }

  return output.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}

function validateXml(xml: string) {
  if (!xml.trim()) {
    return {
      valid: false,
      message: "Please enter XML to format.",
    };
  }

  if (typeof DOMParser === "undefined") {
    return {
      valid: true,
      message: "XML formatted. Browser validation is not available.",
    };
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(xml, "application/xml");
  const parserError = parsed.querySelector("parsererror");

  if (parserError) {
    return {
      valid: false,
      message: parserError.textContent?.trim() || "Invalid XML syntax.",
    };
  }

  return {
    valid: true,
    message: "XML syntax looks valid.",
  };
}

function analyzeXml(xml: string) {
  const tags = xml.match(/<\/?[a-zA-Z0-9:_-]+[^>]*>/g) || [];
  const attributes = xml.match(/\s[a-zA-Z_:][\w:.-]*\s*=/g) || [];
  const comments = xml.match(/<!--[\s\S]*?-->/g) || [];
  const cdata = xml.match(/<!\[CDATA\[[\s\S]*?\]\]>/g) || [];

  return {
    tags: tags.length,
    attributes: attributes.length,
    comments: comments.length,
    cdata: cdata.length,
    size: new TextEncoder().encode(xml).length,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function XmlFormatterPage() {
  const [input, setInput] = useState(sampleXml);
  const [outputMode, setOutputMode] = useState<OutputMode>("format");
  const [indentSize, setIndentSize] = useState(2);
  const [removeComments, setRemoveComments] = useState(false);

  const output = useMemo(() => {
    return outputMode === "format"
      ? formatXml(input, indentSize)
      : minifyXml(input, removeComments);
  }, [input, outputMode, indentSize, removeComments]);

  const validation = useMemo(() => validateXml(input), [input]);
  const stats = useMemo(() => analyzeXml(input), [input]);

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
      label: "RSS Item",
      value: `<rss><channel><title>ToolMint</title><item><title>XML Formatter</title><link>https://toolmint.com/xml-formatter</link></item></channel></rss>`,
    },
    {
      label: "API XML",
      value: `<response><status>success</status><data><user id="101"><name>Nabeel</name><active>true</active></user></data></response>`,
    },
    {
      label: "Config XML",
      value: `<config><app name="ToolMint"><theme>dark</theme><language>en</language></app></config>`,
    },
    {
      label: "Invalid XML",
      value: `<catalog><tool><name>XML Formatter</name></tool`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧾 XML Formatter"
          description="Format XML online, beautify XML, minify XML, validate XML syntax and inspect tags, attributes and comments instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ XML Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste XML code here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={removeComments}
                    onChange={(event) => setRemoveComments(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Remove XML comments while minifying
                </label>

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
                    onClick={() => setInput(sampleXml)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample XML
                  </button>

                  <Button onClick={() => copyText("XML input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ XML Output
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
                    {validation.valid ? "XML Ready" : "Check XML"}
                  </div>

                  <p className="mt-3 max-h-24 overflow-auto text-slate-300">
                    {validation.message}
                  </p>
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
                  {output || "Formatted or minified XML will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("XML output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Tags", stats.tags, "🏷️"],
                ["Attributes", stats.attributes, "🔑"],
                ["Comments", stats.comments, "💬"],
                ["CDATA", stats.cdata, "📦"],
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
                ⚡ Quick XML Examples
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
              This XML Formatter uses the browser XML parser for basic validation.
              XML must be well-formed, with properly closed tags and valid nesting.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is XML Formatting?
                </h2>
                <p className="text-slate-300">
                  XML formatting adds indentation and line breaks to make XML
                  easier to read, debug and review. It helps inspect nested tags,
                  attributes, feeds, configs and API responses.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format XML online, beautify XML, minify XML,
                  validate XML syntax and clean RSS feeds, sitemap files, config
                  files or XML API responses.
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