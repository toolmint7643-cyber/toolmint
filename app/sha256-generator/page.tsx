"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type InputMode = "text" | "file";

const sampleText = "ToolMint SHA256 Generator";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256FromText(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return arrayBufferToHex(hashBuffer);
}

async function sha256FromFile(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

  return arrayBufferToHex(hashBuffer);
}

export default function Sha256GeneratorPage() {
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

        const nextHash = await sha256FromText(text);
        setHash(nextHash);
        return;
      }

      if (!file) {
        alert("Please upload a file first.");
        return;
      }

      const nextHash = await sha256FromFile(file);
      setHash(nextHash);
    } catch {
      setError("Unable to generate SHA-256 hash. Please try again.");
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
      alert("SHA-256 hash copied successfully!");
    } catch {
      alert("Unable to copy hash. Please try again.");
    }
  }

  async function copyResult() {
    if (!finalHash) {
      alert("Please generate a hash first.");
      return;
    }

    const resultText = `SHA256 Generator Result

Input Mode: ${inputMode}
Input: ${inputSummary}
Output Case: ${uppercase ? "Uppercase" : "Lowercase"}
SHA-256 Hash:
${finalHash}`;

    try {
      await navigator.clipboard.writeText(resultText);
      alert("SHA-256 result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  function downloadHash() {
    if (!finalHash) {
      alert("Please generate a hash first.");
      return;
    }

    const content = `SHA256 Generator Result

Input Mode: ${inputMode}
Input: ${inputSummary}
Output Case: ${uppercase ? "Uppercase" : "Lowercase"}

SHA-256 Hash:
${finalHash}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "sha256-hash.txt";
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
          title="🔐 SHA256 Generator"
          description="Generate real SHA-256 hashes from text or files online in your browser using the Web Crypto API."
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
                      Enter text or upload a file to generate its SHA-256 hash.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    Real SHA-256
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
                    placeholder="Enter text to generate SHA-256 hash..."
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
                      Generate SHA-256 hash for any file type.
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
                    {isGenerating ? "⏳ Generating..." : "⚡ Generate SHA-256"}
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
                  ✅ SHA-256 Hash
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    {inputSummary}
                  </p>

                  <textarea
                    value={finalHash}
                    readOnly
                    placeholder="Generated SHA-256 hash will appear here..."
                    className="mt-4 min-h-[180px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-blue-200 outline-none placeholder:text-slate-500"
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
                  SHA-256 is a one-way cryptographic hash. It cannot be decoded
                  back to the original text or file.
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
                  📌 What is SHA-256?
                </h2>
                <p className="text-slate-300">
                  SHA-256 is a secure hash algorithm that creates a fixed-length
                  256-bit hash from text or files. It is commonly used for file
                  verification, checksums, blockchain, signatures and security
                  workflows.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use SHA-256 to verify downloads, compare file integrity, create
                  checksums, hash API payloads and generate secure fingerprints
                  for text or files.
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