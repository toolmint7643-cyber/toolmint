"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import { PDFDocument } from "pdf-lib";

type OriginalMetadata = {
  fileName: string;
  fileSize: number;
  pageCount: number;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modificationDate: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(value: Date | undefined) {
  return value ? value.toLocaleString() : "Not found";
}

function cleanValue(value: string | undefined) {
  return value?.trim() || "Not found";
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function PdfMetadataRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<OriginalMetadata | null>(null);
  const [outputSize, setOutputSize] = useState(0);
  const [sanitizeDates, setSanitizeDates] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const foundFields = useMemo(() => {
    if (!metadata) return 0;

    return [
      metadata.title,
      metadata.author,
      metadata.subject,
      metadata.keywords,
      metadata.creator,
      metadata.producer,
      metadata.creationDate,
      metadata.modificationDate,
    ].filter((value) => value && value !== "Not found").length;
  }, [metadata]);

  const readPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setFile(selectedFile);
    setOutputSize(0);
    setLoading(true);
    setStatus("Reading PDF metadata...");
    setError("");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      setMetadata({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        pageCount: pdfDoc.getPageCount(),
        title: cleanValue(pdfDoc.getTitle()),
        author: cleanValue(pdfDoc.getAuthor()),
        subject: cleanValue(pdfDoc.getSubject()),
        keywords: cleanValue(pdfDoc.getKeywords()),
        creator: cleanValue(pdfDoc.getCreator()),
        producer: cleanValue(pdfDoc.getProducer()),
        creationDate: formatDate(pdfDoc.getCreationDate()),
        modificationDate: formatDate(pdfDoc.getModificationDate()),
      });

      setStatus("PDF loaded. Ready to clean metadata.");
      alert("PDF loaded!");
    } catch {
      setFile(null);
      setMetadata(null);
      setStatus("");
      setError("Unable to read this PDF. Password-protected PDFs may fail.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const removeMetadata = async () => {
    if (!file) {
      alert("Please upload a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Removing PDF metadata...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const now = new Date();

      pdfDoc.setTitle("");
      pdfDoc.setAuthor("");
      pdfDoc.setSubject("");
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator("");
      pdfDoc.setProducer("");

      if (sanitizeDates) {
        pdfDoc.setCreationDate(now);
        pdfDoc.setModificationDate(now);
      }

      const outputBytes = await pdfDoc.save();

      setOutputSize(outputBytes.length);
      setStatus("Metadata cleaned and PDF downloaded.");

      downloadPdf(
        outputBytes,
        `${file.name.replace(/\.pdf$/i, "") || "document"}-metadata-removed.pdf`
      );

      alert("Clean PDF downloaded!");
    } catch {
      setStatus("");
      setError("Unable to remove metadata from this PDF.");
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    const summary = `PDF Metadata Remover Summary

File: ${metadata?.fileName || "No PDF selected"}
Original size: ${metadata ? formatBytes(metadata.fileSize) : "0 B"}
Output size: ${formatBytes(outputSize)}
Pages: ${metadata?.pageCount || 0}
Metadata fields found: ${foundFields}
Dates sanitized: ${sanitizeDates ? "Yes" : "No"}

Original metadata:
Title: ${metadata?.title || "Not found"}
Author: ${metadata?.author || "Not found"}
Subject: ${metadata?.subject || "Not found"}
Keywords: ${metadata?.keywords || "Not found"}
Creator: ${metadata?.creator || "Not found"}
Producer: ${metadata?.producer || "Not found"}
Creation Date: ${metadata?.creationDate || "Not found"}
Modification Date: ${metadata?.modificationDate || "Not found"}`;

    await navigator.clipboard.writeText(summary);
    alert("Metadata remover summary copied!");
  };

  const resetTool = () => {
    setFile(null);
    setMetadata(null);
    setOutputSize(0);
    setSanitizeDates(true);
    setLoading(false);
    setStatus("");
    setError("");
  };

  const metadataRows = [
    ["Title", metadata?.title || "Not found"],
    ["Author", metadata?.author || "Not found"],
    ["Subject", metadata?.subject || "Not found"],
    ["Keywords", metadata?.keywords || "Not found"],
    ["Creator", metadata?.creator || "Not found"],
    ["Producer", metadata?.producer || "Not found"],
    ["Creation Date", metadata?.creationDate || "Not found"],
    ["Modification Date", metadata?.modificationDate || "Not found"],
  ];

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🧹 PDF Metadata Remover"
          description="Remove basic PDF document metadata like title, author, subject, keywords, creator and producer directly in your browser."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Upload PDF
                </h2>
                <p className="text-slate-300">
                  Select a PDF file, review detected metadata and download a
                  cleaned copy.
                </p>
              </div>

              <label className="block rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-8 text-center transition hover:border-blue-500">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={readPdf}
                  disabled={loading}
                  className="hidden"
                />
                <span className="block text-4xl">📤</span>
                <span className="mt-3 block text-xl font-bold text-white">
                  Choose PDF File
                </span>
                <span className="mt-2 block text-slate-400">
                  PDF cleaning happens locally in your browser.
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={sanitizeDates}
                  onChange={(event) => setSanitizeDates(event.target.checked)}
                  className="h-4 w-4"
                />
                Reset creation and modification dates to current time
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                  ⚠️ {error}
                </div>
              )}

              {status && (
                <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-blue-200">
                  {loading ? "⏳" : "✅"} {status}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={removeMetadata}>
                  {loading ? "⏳ Cleaning" : "🧹 Remove Metadata"}
                </Button>
                <Button onClick={copySummary}>📋 Copy Summary</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 What Gets Removed
                </h3>
                <p className="text-slate-300">
                  This tool clears basic document information fields. It does
                  not guarantee removal of visible content, annotations, hidden
                  embedded files or every custom PDF property.
                </p>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 Cleaning Summary
                </h2>
                <p className="text-slate-300">
                  Review detected metadata and output file details.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Pages</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {metadata?.pageCount || 0}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Fields Found</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {foundFields}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Original Size</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {metadata ? formatBytes(metadata.fileSize) : "0 B"}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Output Size</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {formatBytes(outputSize)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📎 File Info
                </h3>
                <div className="space-y-2 text-slate-300">
                  <p className="break-words">
                    <span className="font-bold text-slate-100">Name:</span>{" "}
                    {metadata?.fileName || "No PDF selected"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Size:</span>{" "}
                    {metadata ? formatBytes(metadata.fileSize) : "0 B"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Dates:</span>{" "}
                    {sanitizeDates ? "Sanitize enabled" : "Keep existing dates"}
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8">
          <ToolCard>
            <h2 className="mb-5 text-2xl font-bold text-white">
              🧾 Original Metadata
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {metadataRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p
                    className={`break-words text-lg font-semibold ${
                      value === "Not found" ? "text-slate-500" : "text-slate-100"
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔒 Privacy Friendly
            </h2>
            <p className="text-slate-300">
              PDF metadata removal happens inside your browser. The file is not
              uploaded to a server by this tool.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Use
            </h2>
            <p className="text-slate-300">
              Use this before sharing PDFs publicly when you want to clear basic
              title, author and creator information.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This removes basic metadata only. For legal or high-security
              redaction, use a dedicated professional PDF redaction workflow.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}