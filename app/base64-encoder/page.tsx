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
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    setOutput(btoa(binary));
  } catch {
    alert("Unable to encode the text.");
  }
};

const decodeText = () => {
  try {
    const binary = atob(input.trim());
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    setOutput(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    alert("Invalid Base64 or the decoded content is not valid UTF-8 text.");
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
          description="Encode Unicode text as UTF-8 Base64 or decode Base64 back to readable text in your browser."
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
