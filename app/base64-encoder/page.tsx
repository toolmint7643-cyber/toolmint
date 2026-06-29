"use client";

import { useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import TextArea from "@/components/TextArea";
import Button from "@/components/Button";

export default function Base64EncoderPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

const encodeText = () => {
  try {
    setOutput(btoa(input));
  } catch {
    alert("Unable to encode the text.");
  }
};

const decodeText = () => {
  try {
    setOutput(atob(input));
  } catch {
    alert("Invalid Base64 text.");
  }
};

const copyOutput = async () => {
  if (!output) return;

  await navigator.clipboard.writeText(output);
  alert("✅ Copied");
};

const clearAll = () => {
  setInput("");
  setOutput("");
}; 

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="Base64 Encoder / Decoder"
          description="Encode and decode Base64 instantly."
        />

        <ToolCard>

          <div className="space-y-6">

            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your text..."
            />

            <TextArea
              value={output}
              readOnly
              placeholder="Result..."
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

              <Button onClick={encodeText}>
                    Encode
             </Button>


             <Button onClick={decodeText}>
                    Decode
             </Button>

              <Button
                onClick={copyOutput}
                variant="success"
>
                        Copy
                </Button>

                <Button
                    onClick={clearAll}
                    variant="danger"
>
                  Clear
            </Button>

            </div>

          </div>

        </ToolCard>

      </main>

      <Footer />
    </>
  );
}