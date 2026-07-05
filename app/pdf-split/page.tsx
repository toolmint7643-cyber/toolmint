"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type SplitMode = "range" | "custom" | "every-page";

type SplitResult = {
  name: string;
  url: string;
  size: number;
  pages: number;
  bytes: Uint8Array;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "") || "split-pdf";
}

function parsePageSelection(input: string, pageCount: number) {
  const pages = new Set<number>();
  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startRaw, endRaw] = part.split("-").map((value) => value.trim());
      const start = Number(startRaw);
      const end = Number(endRaw);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 1 ||
        end < 1 ||
        start > end ||
        end > pageCount
      ) {
        throw new Error("Invalid page range.");
      }

      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page) || page < 1 || page > pageCount) {
        throw new Error("Invalid page number.");
      }

      pages.add(page - 1);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function bytesToBlob(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);

  return new Blob([arrayBuffer], { type: "application/pdf" });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export default function PdfSplitPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState<SplitMode>("range");
  const [rangeStart, setRangeStart] = useState("1");
  const [rangeEnd, setRangeEnd] = useState("1");
  const [customPages, setCustomPages] = useState("1,3,5-7");
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState("");

  const totalOutputSize = useMemo(() => {
    return results.reduce((total, item) => total + item.size, 0);
  }, [results]);

  const selectedPagesLabel = useMemo(() => {
    if (!pdfFile) return "No PDF selected";

    if (splitMode === "range") {
      return `${rangeStart}-${rangeEnd}`;
    }

    if (splitMode === "custom") {
      return customPages || "Custom pages";
    }

    return `Every page (${pageCount} PDFs)`;
  }, [pdfFile, splitMode, rangeStart, rangeEnd, customPages, pageCount]);

  const largePdfWarning =
    pageCount >= 50 || (pdfFile?.size || 0) > 20 * 1024 * 1024;

  function clearResults() {
    results.forEach((item) => URL.revokeObjectURL(item.url));
    setResults([]);
  }

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    clearResults();

    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("Please upload a PDF file only.");
      return;
    }

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const count = pdf.getPageCount();

      setPdfFile(file);
      setPageCount(count);
      setRangeStart("1");
      setRangeEnd(String(count));
      setCustomPages(count >= 3 ? "1,3" : "1");
    } catch {
      setPdfFile(null);
      setPageCount(0);
      setError(
        "Unable to read this PDF. It may be encrypted, password protected or damaged."
      );
    }

    event.target.value = "";
  }

  async function splitPdf() {
    if (!pdfFile || pageCount === 0) {
      alert("Please upload a readable PDF first.");
      return;
    }

    if (splitMode === "every-page" && pageCount > 100) {
      const confirmed = window.confirm(
        "This PDF has more than 100 pages. Splitting every page may take time. Continue?"
      );

      if (!confirmed) return;
    }

    setError("");
    setIsSplitting(true);
    clearResults();

    try {
      const sourceBytes = await pdfFile.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes, {
        ignoreEncryption: true,
      });

      const baseName = getBaseName(pdfFile.name);

      if (splitMode === "every-page") {
        const nextResults: SplitResult[] = [];

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [pageIndex]);
          newPdf.addPage(copiedPage);

          const bytes = await newPdf.save();
          const blob = bytesToBlob(bytes);
          const url = URL.createObjectURL(blob);

          nextResults.push({
            name: `${baseName}-page-${pageIndex + 1}.pdf`,
            url,
            size: blob.size,
            pages: 1,
            bytes,
          });
        }

        setResults(nextResults);
        return;
      }

      let selectedPageIndexes: number[] = [];

      if (splitMode === "range") {
        const start = Number(rangeStart);
        const end = Number(rangeEnd);

        if (
          !Number.isInteger(start) ||
          !Number.isInteger(end) ||
          start < 1 ||
          end < 1 ||
          start > end ||
          end > pageCount
        ) {
          throw new Error("Please enter a valid page range.");
        }

        selectedPageIndexes = Array.from(
          { length: end - start + 1 },
          (_, index) => start - 1 + index
        );
      }

      if (splitMode === "custom") {
        selectedPageIndexes = parsePageSelection(customPages, pageCount);

        if (!selectedPageIndexes.length) {
          throw new Error("Please enter at least one page.");
        }
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(sourcePdf, selectedPageIndexes);

      copiedPages.forEach((page) => {
        newPdf.addPage(page);
      });

      const bytes = await newPdf.save();
      const blob = bytesToBlob(bytes);
      const url = URL.createObjectURL(blob);

      setResults([
        {
          name:
            splitMode === "range"
              ? `${baseName}-pages-${rangeStart}-${rangeEnd}.pdf`
              : `${baseName}-selected-pages.pdf`,
          url,
          size: blob.size,
          pages: selectedPageIndexes.length,
          bytes,
        },
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "PDF split failed. Please try again."
      );
    } finally {
      setIsSplitting(false);
    }
  }

  async function downloadZip() {
    if (!results.length) {
      alert("Please split a PDF first.");
      return;
    }

    setIsZipping(true);

    try {
      const zip = new JSZip();

      results.forEach((item) => {
        zip.file(item.name, item.bytes);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const fileName = `${getBaseName(pdfFile?.name || "split-pdf")}-split-files.zip`;

      downloadBlob(blob, fileName);
    } catch {
      alert("Unable to create ZIP file. Please try individual downloads.");
    } finally {
      setIsZipping(false);
    }
  }

  function resetTool() {
    clearResults();
    setPdfFile(null);
    setPageCount(0);
    setSplitMode("range");
    setRangeStart("1");
    setRangeEnd("1");
    setCustomPages("1,3,5-7");
    setIsSplitting(false);
    setIsZipping(false);
    setError("");
  }

  async function copyResult() {
    if (!results.length) {
      alert("Please split a PDF first.");
      return;
    }

    const text = `PDF Split Result

Input File: ${pdfFile?.name || "PDF"}
Total Pages: ${pageCount}
Split Mode: ${splitMode}
Selected Pages: ${selectedPagesLabel}
Output Files: ${results.length}
Output Size: ${formatBytes(totalOutputSize)}
ZIP Download: ${results.length > 1 ? "Available" : "Not needed"}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("PDF split result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="✂️ PDF Split"
          description="Split PDF files online in your browser, extract page ranges, custom pages or every page as separate PDF files with ZIP download."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload PDF
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Select one PDF file and choose how you want to split it.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {pdfFile ? `${pageCount} pages` : "Upload PDF"}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">📄</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload PDF
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports one PDF file at a time.
                  </span>
                </label>

                {pdfFile ? (
                  <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="break-words font-bold text-white">
                      {pdfFile.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatBytes(pdfFile.size)} • {pageCount} pages
                    </p>
                  </div>
                ) : null}

                {largePdfWarning ? (
                  <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                    Large PDF detected. Splitting may take longer on mobile
                    devices, especially in every-page mode.
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ⚙️ Split Settings
                </h2>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Split mode
                    </span>
                    <select
                      value={splitMode}
                      onChange={(event) =>
                        setSplitMode(event.target.value as SplitMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="range">Extract page range</option>
                      <option value="custom">Extract custom pages</option>
                      <option value="every-page">
                        Split every page separately
                      </option>
                    </select>
                  </label>

                  {splitMode === "range" ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-slate-300">
                          Start page
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={pageCount || 1}
                          value={rangeStart}
                          onChange={(event) => setRangeStart(event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-slate-300">
                          End page
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={pageCount || 1}
                          value={rangeEnd}
                          onChange={(event) => setRangeEnd(event.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>
                  ) : null}

                  {splitMode === "custom" ? (
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Custom pages
                      </span>
                      <input
                        type="text"
                        value={customPages}
                        onChange={(event) => setCustomPages(event.target.value)}
                        placeholder="Example: 1,3,5-7"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Use comma separated pages and ranges, like 1,3,5-7.
                      </p>
                    </label>
                  ) : null}

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                      Selected pages
                    </p>
                    <p className="mt-2 break-words text-2xl font-extrabold text-blue-300">
                      {selectedPagesLabel}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={splitPdf}>
                      {isSplitting ? "⏳ Splitting..." : "⚡ Split PDF"}
                    </Button>

                    <button
                      type="button"
                      onClick={resetTool}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                    >
                      🔄 Reset
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={copyResult}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    📋 Copy Result
                  </button>

                  {results.length > 1 ? (
                    <button
                      type="button"
                      onClick={downloadZip}
                      className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                    >
                      {isZipping ? "⏳ Creating ZIP..." : "📦 Download All as ZIP"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ Split Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {pageCount}
                  </div>
                  <div className="mt-1 text-slate-400">Input Pages</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {results.length}
                  </div>
                  <div className="mt-1 text-slate-400">Output Files</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {formatBytes(totalOutputSize)}
                  </div>
                  <div className="mt-1 text-slate-400">Output Size</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {splitMode === "every-page"
                      ? `${pageCount} PDFs`
                      : selectedPagesLabel}
                  </div>
                  <div className="mt-1 text-slate-400">Mode Output</div>
                </div>
              </div>

              {results.length ? (
                <div className="mt-6 space-y-3">
                  {results.map((item) => (
                    <div
                      key={item.url}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="break-words font-bold text-white">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.pages} pages • {formatBytes(item.size)}
                        </p>
                      </div>

                      <a
                        href={item.url}
                        download={item.name}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-center font-bold text-white transition hover:bg-blue-500"
                      >
                        ⬇️ Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload a PDF and split it to see downloadable results here.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Password-protected, encrypted or damaged PDFs may fail to load.
              Very large PDFs may take longer on mobile devices.
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your PDF is split inside your browser. This tool
              does not upload your PDF to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a PDF Split Tool?
                </h2>
                <p className="text-slate-300">
                  A PDF split tool extracts pages from a PDF file. You can create
                  a new PDF from a page range, selected pages or split every page
                  into a separate PDF file.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Split Tips
                </h2>
                <p className="text-slate-300">
                  Use page range for chapters, custom pages for selected forms
                  and every-page mode when you need each page as a separate PDF
                  document. Use ZIP download when many output files are created.
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