"use client";

import { useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import PageTitle from "@/components/PageTitle";
import TextArea from "@/components/TextArea";
import ToolCard from "@/components/ToolCard";

export default function JsonFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const formatJson = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
      setError("");
    } catch {
      setOutput("");
      setError(
        "Invalid JSON. Check quotation marks, commas, brackets and braces.",
      );
    }
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      window.alert("Formatted JSON copied.");
    } catch {
      window.alert("Could not copy the result. Check your browser clipboard permissions.");
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <PageTitle
            title="JSON Formatter"
            description="Format JSON online with readable indentation. Check JSON syntax and copy the formatted result directly from your browser."
          />

          <ToolCard>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="mb-3 text-xl font-semibold">Input JSON</h2>
                <TextArea
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setError("");
                  }}
                  placeholder='Paste JSON here, for example: {"name":"ToolMint"}'
                />
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold">Formatted JSON</h2>
                <TextArea value={output} readOnly />
              </div>
            </div>

            {error && (
              <p
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 font-semibold text-red-300"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={formatJson}>Format JSON</Button>
              <Button onClick={clearAll} variant="secondary">
                Clear
              </Button>
              <Button onClick={copyOutput} variant="secondary">
                Copy
              </Button>
            </div>
          </ToolCard>

          <section
            className="mt-10 space-y-8 border-t border-slate-800 pt-8"
            aria-labelledby="json-guide-title"
          >
            <div>
              <h2
                id="json-guide-title"
                className="text-2xl font-black text-white"
              >
                How to Format JSON Online
              </h2>
              <p className="mt-3 max-w-4xl leading-7 text-slate-300">
                JSON, or JavaScript Object Notation, is a text format commonly
                used to represent structured data. This free JSON formatter
                adds indentation and line breaks so nested objects and arrays
                are easier to read. Paste your JSON into the input, select
                Format JSON, review the result, then copy it where you need it.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Formatting and validation are different
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  This formatter parses the input using the browser’s JSON
                  parser. Valid JSON is then serialized with consistent
                  indentation. If the input cannot be parsed, the tool reports
                  a syntax error instead of producing formatted output.
                  Formatting checks JSON syntax, but it does not validate data
                  against an API schema, database model or application-specific
                  rules. For a syntax-focused workflow, you can also use the{" "}
                  <Link
                    className="font-bold text-blue-300 hover:text-blue-200"
                    href="/json-validator"
                  >
                    JSON Validator
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  Common JSON syntax errors
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  JSON property names and string values need double quotation
                  marks. Entries must be separated with commas, but the final
                  entry in an object or array must not have a trailing comma.
                  Standard JSON does not allow comments, single-quoted strings
                  or undefined values. Check that every opening brace,
                  bracket and quotation mark has a matching closing character.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  Pretty JSON and minified JSON
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  Formatted, or pretty-printed, JSON includes whitespace to
                  make the structure easier for people to inspect. Minified
                  JSON removes unnecessary whitespace to make the text more
                  compact; the underlying data should remain the same. Use the{" "}
                  <Link
                    className="font-bold text-blue-300 hover:text-blue-200"
                    href="/json-minifier"
                  >
                    JSON Minifier
                  </Link>{" "}
                  when you specifically need compact output.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">
                  Browser processing and data limits
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  The formatting action runs in your browser using JavaScript’s
                  built-in JSON parser; this page does not send the pasted
                  JSON to a formatting API. Do not treat that as a substitute
                  for reviewing your own environment or browser extensions.
                  Very large inputs may take longer to parse and display.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                Related data format tools
              </h3>
              <p className="mt-3 leading-7 text-slate-300">
                JSON is one of several formats used to store or exchange
                structured data. ToolMint also provides an{" "}
                <Link
                  className="font-bold text-blue-300 hover:text-blue-200"
                  href="/xml-formatter"
                >
                  XML Formatter
                </Link>{" "}
                and a{" "}
                <Link
                  className="font-bold text-blue-300 hover:text-blue-200"
                  href="/yaml-formatter"
                >
                  YAML Formatter
                </Link>
                . Choose the tool that matches the format of your source; JSON,
                XML and YAML have different syntax rules and are not
                interchangeable.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}