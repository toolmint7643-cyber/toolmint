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

        <section className="mt-10 grid gap-6 border-t border-slate-800 pt-8 md:grid-cols-2">
          <article aria-labelledby="base64-how-to" className="md:col-span-2">
            <h2 id="base64-how-to" className="text-2xl font-black text-white">Encode and decode Base64 text</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Paste plain text and choose Encode to create its Base64 representation.
              To reverse the process, paste a valid Base64 value and choose Decode.
              The tool converts text through UTF-8, so common non-English characters
              can be handled as text rather than being restricted to basic ASCII.
            </p>
            <p className="mt-3 leading-7 text-slate-300">
              Base64 is commonly used when text needs a predictable ASCII representation
              for a data field or text-based format. It is an encoding, not a compression
              method, so the encoded string is usually longer than the original text.
              This page handles UTF-8 text; it is not a file-to-Base64 converter. For
              binary files, use a tool designed for file input and confirm the receiving
              system expects the same Base64 format.
            </p>
          </article>
          <article aria-labelledby="base64-security">
            <h2 id="base64-security" className="text-2xl font-black text-white">Base64 is not encryption</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Base64 changes how bytes are represented; it does not hide or protect
              the content. Anyone can decode it. Do not use this encoder to secure
              passwords, tokens or private data, and avoid pasting secrets into
              tools unless you have confirmed the handling policy you need. Decoding
              only succeeds when the input is valid Base64 that represents UTF-8 text.
            </p>
          </article>
        </section>

      </main>

      <Footer />
    </>
  );
}
