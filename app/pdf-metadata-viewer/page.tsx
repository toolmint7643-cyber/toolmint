"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import { PDFDocument } from "pdf-lib";

type Metadata = {
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
  if (!value) {
    return "Not found";
  }

  return value.toLocaleString();
}

function cleanValue(value: string | undefined) {
  return value?.trim() || "Not found";
}

export default function PdfMetadataViewerPage() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
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

  const report = `PDF Metadata Report

File: ${metadata?.fileName || "Not selected"}
File size: ${metadata ? formatBytes(metadata.fileSize) : "0 B"}
Pages: ${metadata?.pageCount || 0}

Title: ${metadata?.title || "Not found"}
Author: ${metadata?.author || "Not found"}
Subject: ${metadata?.subject || "Not found"}
Keywords: ${metadata?.keywords || "Not found"}
Creator: ${metadata?.creator || "Not found"}
Producer: ${metadata?.producer || "Not found"}
Creation Date: ${metadata?.creationDate || "Not found"}
Modification Date: ${metadata?.modificationDate || "Not found"}`;

  const readMetadata = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setStatus("Reading PDF metadata...");
    setError("");
    setMetadata(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const details: Metadata = {
        fileName: file.name,
        fileSize: file.size,
        pageCount: pdfDoc.getPageCount(),
        title: cleanValue(pdfDoc.getTitle()),
        author: cleanValue(pdfDoc.getAuthor()),
        subject: cleanValue(pdfDoc.getSubject()),
        keywords: cleanValue(pdfDoc.getKeywords()),
        creator: cleanValue(pdfDoc.getCreator()),
        producer: cleanValue(pdfDoc.getProducer()),
        creationDate: formatDate(pdfDoc.getCreationDate()),
        modificationDate: formatDate(pdfDoc.getModificationDate()),
      };

      setMetadata(details);
      setStatus("Metadata loaded successfully.");
      alert("PDF metadata loaded!");
    } catch {
      setError("Unable to read this PDF. Password-protected PDFs may fail.");
      setStatus("");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const copyReport = async () => {
    await navigator.clipboard.writeText(report);
    alert("PDF metadata report copied!");
  };

  const resetTool = () => {
    setMetadata(null);
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
          title="🧾 PDF Metadata Viewer"
          description="View PDF title, author, subject, keywords, creator, producer, dates, page count and file size directly in your browser."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Upload PDF
                </h2>
                <p className="text-slate-300">
                  Select a PDF file to inspect its metadata locally in your
                  browser.
                </p>
              </div>

              <label className="block rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-8 text-center transition hover:border-blue-500">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={readMetadata}
                  disabled={loading}
                  className="hidden"
                />
                <span className="block text-4xl">📤</span>
                <span className="mt-3 block text-xl font-bold text-white">
                  Choose PDF File
                </span>
                <span className="mt-2 block text-slate-400">
                  Metadata is read locally and the file is not uploaded.
                </span>
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

              <div className="grid gap-3 md:grid-cols-2">
                <Button onClick={copyReport}>📋 Copy Report</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 What This Reads
                </h3>
                <p className="text-slate-300">
                  This tool reads document information saved inside the PDF.
                  Some PDFs do not include metadata, so empty fields may show as
                  Not found.
                </p>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 Metadata Summary
                </h2>
                <p className="text-slate-300">
                  Review file details and detected metadata fields.
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
                  <p className="text-sm text-slate-300">File Size</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {metadata ? formatBytes(metadata.fileSize) : "0 B"}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Metadata Status</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {metadata ? "Loaded" : "Waiting"}
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
                    <span className="font-bold text-slate-100">Pages:</span>{" "}
                    {metadata?.pageCount || 0}
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8">
          <ToolCard>
            <h2 className="mb-5 text-2xl font-bold text-white">
              🧾 Metadata Details
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
              PDF metadata is read inside your browser. The file is not uploaded
              to a server by this tool.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Use
            </h2>
            <p className="text-slate-300">
              Use this tool to inspect document title, author, creator and dates
              before sharing or publishing PDFs.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This viewer reads metadata only. To remove or edit metadata, use a
              separate PDF metadata remover/editor tool.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}