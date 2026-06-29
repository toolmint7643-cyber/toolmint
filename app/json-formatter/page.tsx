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
        description="Format, Validate, Beautify and Minify JSON instantly."
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

    </div>

  </main>

  <Footer />
</>

  );
}