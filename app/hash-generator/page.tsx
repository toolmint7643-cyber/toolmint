"use client";

import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ShaAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
type HashItem = { label: string; value: string };

const shaAlgorithms: ShaAlgorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

const quickExamples = [
  { label: "Simple Text", value: "hello world" },
  { label: "Email", value: "test@example.com" },
  { label: "Password Example", value: "MyStrongPassword123!" },
  { label: "JSON", value: '{"name":"ToolMint","type":"developer tool"}' },
];

function rotateLeft(value: number, shift: number) {
  return (value << shift) | (value >>> (32 - shift));
}

function toHexLittleEndian(value: number) {
  let output = "";

  for (let index = 0; index < 4; index += 1) {
    output += ((value >>> (index * 8)) & 255).toString(16).padStart(2, "0");
  }

  return output;
}

function realMd5(input: string) {
  const bytes = Array.from(new TextEncoder().encode(input));
  const originalBitLength = bytes.length * 8;

  bytes.push(128);

  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }

  for (let index = 0; index < 8; index += 1) {
    bytes.push(Math.floor(originalBitLength / 2 ** (8 * index)) & 255);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32)
  );

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const start = offset + index * 4;
      return (
        bytes[start] |
        (bytes[start + 1] << 8) |
        (bytes[start + 2] << 16) |
        (bytes[start + 3] << 24)
      );
    });

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f = 0;
      let g = 0;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const temp = d;
      d = c;
      c = b;
      b =
        (b +
          rotateLeft(
            (a + f + constants[index] + words[g]) >>> 0,
            shifts[index]
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

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function shaHashText(value: string, algorithm: ShaAlgorithm) {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  return bufferToHex(hashBuffer);
}

async function hmacHash(value: string, secret: string, algorithm: ShaAlgorithm) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return bufferToHex(signature);
}

async function shaHashFile(file: File, algorithm: ShaAlgorithm) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return bufferToHex(hashBuffer);
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function HashGeneratorPage() {
  const [input, setInput] = useState("hello world");
  const [uppercase, setUppercase] = useState(false);
  const [hashes, setHashes] = useState<HashItem[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [fileHashes, setFileHashes] = useState<HashItem[]>([]);
  const [isFileHashing, setIsFileHashing] = useState(false);

  const [hmacMessage, setHmacMessage] = useState("hello world");
  const [hmacSecret, setHmacSecret] = useState("secret-key");
  const [hmacHashes, setHmacHashes] = useState<HashItem[]>([]);

  const [compareHash, setCompareHash] = useState("");

  const displayValue = (value: string) => (uppercase ? value.toUpperCase() : value);

  const stats = useMemo(() => {
    return {
      characters: input.length,
      bytes: new TextEncoder().encode(input).length,
      words: input.trim() ? input.trim().split(/\s+/).length : 0,
    };
  }, [input]);

  useEffect(() => {
    let active = true;

    async function generateHashes() {
      const shaResults = await Promise.all(
        shaAlgorithms.map(async (algorithm) => ({
          label: algorithm,
          value: input ? await shaHashText(input, algorithm) : "",
        }))
      );

      if (active) {
        setHashes([{ label: "MD5", value: input ? realMd5(input) : "" }, ...shaResults]);
      }
    }

    generateHashes();

    return () => {
      active = false;
    };
  }, [input]);

  useEffect(() => {
    let active = true;

    async function generateHmac() {
      if (!hmacMessage || !hmacSecret) {
        setHmacHashes([]);
        return;
      }

      const results = await Promise.all(
        (["SHA-256", "SHA-384", "SHA-512"] as ShaAlgorithm[]).map(
          async (algorithm) => ({
            label: `HMAC ${algorithm}`,
            value: await hmacHash(hmacMessage, hmacSecret, algorithm),
          })
        )
      );

      if (active) setHmacHashes(results);
    }

    generateHmac();

    return () => {
      active = false;
    };
  }, [hmacMessage, hmacSecret]);

  const selectedGeneratedHash = hashes.find((item) => item.label === "SHA-256")?.value || "";
  const compareMatches =
    compareHash.trim() &&
    selectedGeneratedHash &&
    compareHash.trim().toLowerCase() === selectedGeneratedHash.toLowerCase();

  const copyText = async (label: string, value: string) => {
    if (!value) {
      alert(`Nothing to copy from ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(displayValue(value));
      alert(`${label} copied successfully!`);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  };

  const copyAllHashes = async () => {
    const text = hashes
      .filter((item) => item.value)
      .map((item) => `${item.label}: ${displayValue(item.value)}`)
      .join("\n");

    if (!text) {
      alert("Nothing to copy. Please enter text first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      alert("All hashes copied successfully!");
    } catch {
      alert("Unable to copy. Please try again.");
    }
  };

  const handleFileChange = async (selectedFile: File | null) => {
    setFile(selectedFile);
    setFileHashes([]);

    if (!selectedFile) return;

    setIsFileHashing(true);

    try {
      const results = await Promise.all(
        (["SHA-256", "SHA-512"] as ShaAlgorithm[]).map(async (algorithm) => ({
          label: algorithm,
          value: await shaHashFile(selectedFile, algorithm),
        }))
      );

      setFileHashes(results);
    } finally {
      setIsFileHashing(false);
    }
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔐 Hash Generator"
          description="Generate MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes online for text, files, checksums and HMAC signatures."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">✍️ Text Hash</h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Enter text, password, JSON, string or checksum source..."
                  className="min-h-[260px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
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
                    onClick={() => setInput("hello world")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => setUppercase((value) => !value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {uppercase ? "abc Lowercase" : "ABC Uppercase"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-bold text-white">✅ Generated Hashes</h2>
                  <Button onClick={copyAllHashes}>📋 Copy All</Button>
                </div>

                <div className="space-y-3">
                  {hashes.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="font-bold text-white">{item.label}</h3>
                        <button
                          type="button"
                          onClick={() => copyText(item.label, item.value)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          Copy
                        </button>
                      </div>

                      <p className="break-all rounded-lg bg-slate-900 p-3 font-mono text-sm text-blue-300">
                        {item.value ? displayValue(item.value) : "Enter text to generate hash."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">🔤</div>
                <div className="text-3xl font-extrabold text-blue-400">{stats.characters}</div>
                <div className="mt-2 text-slate-400">Characters</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📦</div>
                <div className="text-3xl font-extrabold text-blue-400">{stats.bytes}</div>
                <div className="mt-2 text-slate-400">Bytes</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📝</div>
                <div className="text-3xl font-extrabold text-blue-400">{stats.words}</div>
                <div className="mt-2 text-slate-400">Words</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">⚡ Quick Examples</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    <span className="block">{example.label}</span>
                    <span className="mt-1 block truncate text-sm font-normal text-slate-400">
                      {example.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">📁 File Checksum</h2>

              <input
                type="file"
                onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200 outline-none focus:border-blue-500"
              />

              {file ? (
                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-300">
                  <p>
                    <span className="font-bold text-white">File:</span> {file.name}
                  </p>
                  <p>
                    <span className="font-bold text-white">Size:</span>{" "}
                    {formatFileSize(file.size)}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {isFileHashing ? (
                  <p className="text-blue-300">Generating file checksums...</p>
                ) : (
                  fileHashes.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="font-bold text-white">File {item.label}</h3>
                        <button
                          type="button"
                          onClick={() => copyText(`File ${item.label}`, item.value)}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          Copy
                        </button>
                      </div>

                      <p className="break-all rounded-lg bg-slate-900 p-3 font-mono text-sm text-blue-300">
                        {displayValue(item.value)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">🔑 HMAC Generator</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-slate-300">Message</span>
                  <textarea
                    value={hmacMessage}
                    onChange={(event) => setHmacMessage(event.target.value)}
                    className="min-h-[140px] w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Secret Key</span>
                  <textarea
                    value={hmacSecret}
                    onChange={(event) => setHmacSecret(event.target.value)}
                    className="min-h-[140px] w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-3">
                {hmacHashes.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="font-bold text-white">{item.label}</h3>
                      <button
                        type="button"
                        onClick={() => copyText(item.label, item.value)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>

                    <p className="break-all rounded-lg bg-slate-900 p-3 font-mono text-sm text-blue-300">
                      {displayValue(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">✅ Compare SHA-256 Hash</h2>

              <textarea
                value={compareHash}
                onChange={(event) => setCompareHash(event.target.value)}
                placeholder="Paste expected SHA-256 hash here..."
                className="min-h-[110px] w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
              />

              <div
                className={`mt-4 rounded-2xl border p-5 text-center ${
                  compareHash.trim()
                    ? compareMatches
                      ? "border-green-700 bg-green-950/30 text-green-200"
                      : "border-red-700 bg-red-950/30 text-red-200"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {compareHash.trim()
                  ? compareMatches
                    ? "Match: expected hash equals generated SHA-256."
                    : "Not Match: expected hash is different from generated SHA-256."
                  : "Paste a SHA-256 hash to compare it with the generated result."}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              MD5 and SHA-1 are included for legacy checksums and compatibility.
              For modern security, prefer SHA-256 or SHA-512. Hashes are one-way
              fingerprints, not encryption.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">📌 What is a Hash?</h2>
                <p className="text-slate-300">
                  A hash converts text, files or data into a fixed fingerprint.
                  Developers use hashes for checksums, file integrity, signatures
                  and comparing data without storing the original value.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">🔍 Common Uses</h2>
                <p className="text-slate-300">
                  Use this tool to generate MD5 checksums, SHA-256 hashes,
                  SHA-512 hashes, file checksums, HMAC signatures and compare
                  expected hashes while debugging APIs or downloads.
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