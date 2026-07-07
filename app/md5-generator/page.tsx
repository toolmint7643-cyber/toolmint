"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type InputMode = "text" | "file";

const sampleText = "ToolMint MD5 Generator";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function leftRotate(value: number, amount: number) {
  return (value << amount) | (value >>> (32 - amount));
}

function toHexLittleEndian(value: number) {
  let output = "";

  for (let i = 0; i < 4; i += 1) {
    output += ((value >>> (i * 8)) & 255).toString(16).padStart(2, "0");
  }

  return output;
}

function md5Bytes(input: Uint8Array) {
  const shiftAmounts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32)
  );

  const originalLength = input.length;
  const bitLength = originalLength * 8;
  const paddedLength = (((originalLength + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);

  padded.set(input);
  padded[originalLength] = 128;

  for (let i = 0; i < 8; i += 1) {
    padded[paddedLength - 8 + i] = Math.floor(bitLength / 2 ** (8 * i)) & 255;
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = new Array<number>(16);

    for (let i = 0; i < 16; i += 1) {
      const start = offset + i * 4;
      words[i] =
        padded[start] |
        (padded[start + 1] << 8) |
        (padded[start + 2] << 16) |
        (padded[start + 3] << 24);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i += 1) {
      let f = 0;
      let g = 0;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b =
        (b +
          leftRotate(
            (a + f + constants[i] + words[g]) >>> 0,
            shiftAmounts[i]
          )) >>>
        0;
      a = temp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return (
    toHexLittleEndian(a0) +
    toHexLittleEndian(b0) +
    toHexLittleEndian(c0) +
    toHexLittleEndian(d0)
  );
}

function md5FromText(text: string) {
  return md5Bytes(new TextEncoder().encode(text));
}

async function md5FromFile(file: File) {
  const buffer = await file.arrayBuffer();
  return md5Bytes(new Uint8Array(buffer));
}

export default function Md5GeneratorPage() {
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState("");
  const [uppercase, setUppercase] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const finalHash = uppercase ? hash.toUpperCase() : hash.toLowerCase();

  const inputSummary = useMemo(() => {
    if (inputMode === "text") {
      return text.trim()
        ? `${text.length.toLocaleString()} characters`
        : "No text entered";
    }

    return file ? `${file.name} • ${formatBytes(file.size)}` : "No file selected";
  }, [inputMode, text, file]);

  async function generateHash() {
    setError("");
    setIsGenerating(true);

    try {
      if (inputMode === "text") {
        if (!text) {
          alert("Please enter text first.");
          return;
        }

        setHash(md5FromText(text));
        return;
      }

      if (!file) {
        alert("Please upload a file first.");
        return;
      }

      const nextHash = await md5FromFile(file);
      setHash(nextHash);
    } catch {
      setError("Unable to generate MD5 hash. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setHash("");

    if (!selectedFile) return;

    setFile(selectedFile);
    event.target.value = "";
  }

  async function copyHash() {
    if (!finalHash) {
      alert("Please generate a hash first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(finalHash);
      alert("MD5 hash copied successfully!");
    } catch {
      alert("Unable to copy hash. Please try again.");
    }
  }

  async function copyResult() {
    if (!finalHash) {
      alert("Please generate a hash first.");
      return;
    }

    const resultText = `MD5 Generator Result

Input Mode: ${inputMode}
Input: ${inputSummary}
Output Case: ${uppercase ? "Uppercase" : "Lowercase"}
MD5 Hash:
${finalHash}`;

    try {
      await navigator.clipboard.writeText(resultText);
      alert("MD5 result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  function downloadHash() {
    if (!finalHash) {
      alert("Please generate a hash first.");
      return;
    }

    const content = `MD5 Generator Result

Input Mode: ${inputMode}
Input: ${inputSummary}
Output Case: ${uppercase ? "Uppercase" : "Lowercase"}

MD5 Hash:
${finalHash}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "md5-hash.txt";
    link.click();

    URL.revokeObjectURL(url);
  }

  function loadSample() {
    setInputMode("text");
    setText(sampleText);
    setFile(null);
    setHash("");
    setError("");
  }

  function resetTool() {
    setInputMode("text");
    setText("");
    setFile(null);
    setHash("");
    setUppercase(false);
    setIsGenerating(false);
    setError("");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🔑 MD5 Generator"
          description="Generate real MD5 hashes from text or files online in your browser with copy and download options."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      ✍️ Input
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Enter text or upload a file to generate its MD5 hash.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    Real MD5
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("text");
                      setHash("");
                      setError("");
                    }}
                    className={`rounded-xl border p-4 font-bold transition ${
                      inputMode === "text"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    📝 Text
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInputMode("file");
                      setHash("");
                      setError("");
                    }}
                    className={`rounded-xl border p-4 font-bold transition ${
                      inputMode === "file"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    📄 File
                  </button>
                </div>

                {inputMode === "text" ? (
                  <textarea
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value);
                      setHash("");
                    }}
                    placeholder="Enter text to generate MD5 hash..."
                    className="min-h-[280px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  />
                ) : (
                  <label className="flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <span className="text-5xl">📄</span>
                    <span className="mt-3 text-lg font-bold text-white">
                      Click to upload file
                    </span>
                    <span className="mt-1 text-sm text-slate-400">
                      Generate MD5 hash for any file type.
                    </span>

                    {file ? (
                      <span className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200">
                        {file.name} • {formatBytes(file.size)}
                      </span>
                    ) : null}
                  </label>
                )}

                <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={uppercase}
                    onChange={(event) => setUppercase(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Show hash in uppercase
                </label>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={generateHash}>
                    {isGenerating ? "⏳ Generating..." : "⚡ Generate MD5"}
                  </Button>

                  <button
                    type="button"
                    onClick={loadSample}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧪 Sample
                  </button>

                  <button
                    type="button"
                    onClick={copyResult}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    📊 Copy Result
                  </button>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ MD5 Hash
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    {inputSummary}
                  </p>

                  <textarea
                    value={finalHash}
                    readOnly
                    placeholder="Generated MD5 hash will appear here..."
                    className="mt-4 min-h-[150px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-blue-200 outline-none placeholder:text-slate-500"
                  />
                </div>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={copyHash}
                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                  >
                    📋 Copy Hash
                  </button>

                  <button
                    type="button"
                    onClick={downloadHash}
                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                  >
                    ⬇️ Download TXT
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                  MD5 is not recommended for passwords or secure cryptographic
                  protection. Use SHA-256 for stronger security workflows.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Text and files are hashed inside your browser.
              This tool does not upload your input to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is MD5?
                </h2>
                <p className="text-slate-300">
                  MD5 is a legacy hash algorithm that creates a 128-bit hash from
                  text or files. It is commonly used for checksums, file
                  fingerprints, duplicate checks and older system integrations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use MD5 for quick file checksums, legacy API checks, duplicate
                  detection and simple fingerprints. Avoid MD5 for password
                  storage, signatures or security-critical verification.
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