"use client";

import { useState } from "react";

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

      setOutput(
        JSON.stringify(parsed, null, 2)
      );

      setError("");
    } catch {
      setOutput("");
      setError("❌ Invalid JSON");
    }
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  const copyOutput = async () => {
    if (!output) return;

    await navigator.clipboard.writeText(output);

    alert("Copied Successfully");
  };

  return (<>
  <Header />

  <main className="min-h-screen bg-slate-950 text-white py-10 px-4">

    <div className="max-w-6xl mx-auto">

      <PageTitle
        title="JSON Formatter"
        description="Validate JSON syntax and format valid JSON with readable indentation. Copy the formatted result directly from your browser."
      />

      <ToolCard>

        <div className="grid md:grid-cols-2 gap-6">

          <div>

            <h2 className="text-xl font-semibold mb-3">
              Input JSON
            </h2>

            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JSON here..."
            />

          </div>

          <div>

            <h2 className="text-xl font-semibold mb-3">
              Formatted JSON
            </h2>

            <TextArea
              value={output}
              readOnly
            />

          </div>

        </div>

        {error && (

          <p className="text-red-500 mt-5 font-semibold">

            {error}

          </p>

        )}

        <div className="flex flex-wrap gap-4 mt-8"><Button onClick={formatJson}>
  Format JSON
</Button>

<Button onClick={clearAll}>
  Clear
</Button>

<Button onClick={copyOutput}>
  Copy
</Button>

        </div>

      </ToolCard>

      <section className="mt-10 grid gap-6 border-t border-slate-800 pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black text-white">When to format JSON</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Formatting adds consistent indentation and line breaks so nested
            objects and arrays are easier to inspect, review and debug. Paste a
            JSON value, choose Format JSON, then copy the readable result into a
            code editor, API client or configuration file. The formatter parses
            and serializes the value in this browser; it does not validate an API
            schema or confirm that a particular application accepts the data.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Common JSON syntax errors</h2>
          <p className="mt-3 leading-7 text-slate-300">
            JSON requires double quotes around property names and string values,
            commas between entries, and no trailing comma after the final item.
            Comments are not part of standard JSON. If formatting fails, check
            the reported syntax, quotation marks, brackets and braces near the
            location of the error. Formatting changes whitespace for readability;
            keep a copy of the source when its original layout matters.
          </p>
        </div>
      </section>

    </div>

  </main>

  <Footer />
</>

  );
}
