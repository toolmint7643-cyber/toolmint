"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type PdfItem = {
  id: string;
  file: File;
  pageCount: number | null;
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getPdfPageCount(file: File) {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdf.getPageCount();
}

export default function PdfMergePage() {
  const [pdfFiles, setPdfFiles] = useState<PdfItem[]>([]);
  const [mergedUrl, setMergedUrl] = useState("");
  const [mergedSize, setMergedSize] = useState(0);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState("");

  const totalSize = useMemo(() => {
    return pdfFiles.reduce((total, item) => total + item.file.size, 0);
  }, [pdfFiles]);

  const totalPages = useMemo(() => {
    return pdfFiles.reduce((total, item) => total + (item.pageCount || 0), 0);
  }, [pdfFiles]);

  const readyFiles = pdfFiles.filter((item) => !item.error);
  const hasInvalidFiles = pdfFiles.some((item) => item.error);

  function clearMergedResult() {
    if (mergedUrl) {
      URL.revokeObjectURL(mergedUrl);
    }

    setMergedUrl("");
    setMergedSize(0);
  }

  async function handleFilesUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    setError("");
    clearMergedResult();

    if (!files.length) return;

    const pdfOnly = files.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdfOnly.length) {
      setError("Please upload PDF files only.");
      return;
    }

    const loadedItems: PdfItem[] = await Promise.all(
      pdfOnly.map(async (file) => {
        try {
          const pageCount = await getPdfPageCount(file);

          return {
            id: createId(),
            file,
            pageCount,
          };
        } catch {
          return {
            id: createId(),
            file,
            pageCount: null,
            error:
              "Unable to read this PDF. It may be encrypted, password protected or damaged.",
          };
        }
      })
    );

    setPdfFiles((current) => [...current, ...loadedItems]);
    event.target.value = "";
  }

  function moveFile(index: number, direction: "up" | "down") {
    setPdfFiles((current) => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    clearMergedResult();
  }

  function removeFile(id: string) {
    setPdfFiles((current) => current.filter((item) => item.id !== id));
    clearMergedResult();
  }

  function resetTool() {
    clearMergedResult();
    setPdfFiles([]);
    setIsMerging(false);
    setError("");
  }

  async function mergePdfs() {
    if (readyFiles.length < 2) {
      alert("Please upload at least 2 readable PDF files.");
      return;
    }

    setError("");
    setIsMerging(true);
    clearMergedResult();

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of readyFiles) {
        const bytes = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(
          pdf,
          pdf.getPageIndices()
        );

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedBytes = await mergedPdf.save();
      const mergedArrayBuffer = new ArrayBuffer(mergedBytes.length);
      const mergedView = new Uint8Array(mergedArrayBuffer);
      mergedView.set(mergedBytes);

      const blob = new Blob([mergedArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      setMergedUrl(url);
      setMergedSize(blob.size);
    } catch {
      setError(
        "PDF merge failed. Please remove encrypted or damaged PDF files and try again."
      );
    } finally {
      setIsMerging(false);
    }
  }

  async function copyResult() {
    if (!mergedSize) {
      alert("Please merge PDF files first.");
      return;
    }

    const text = `PDF Merge Result

Files Merged: ${readyFiles.length}
Total Pages: ${totalPages}
Input Size: ${formatBytes(totalSize)}
Merged PDF Size: ${formatBytes(mergedSize)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("PDF merge result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="📎 PDF Merge"
          description="Merge multiple PDF files online in your browser, reorder documents, combine pages and download one merged PDF."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload PDF Files
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Select two or more PDF files. Arrange order before merging.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {pdfFiles.length ? `${pdfFiles.length} files` : "Upload PDFs"}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    onChange={handleFilesUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">📄</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload PDFs
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    You can select multiple PDF files at once.
                  </span>
                </label>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}

                {hasInvalidFiles ? (
                  <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                    Some PDFs could not be read. Remove invalid files before
                    merging for best results.
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Merge Summary
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {readyFiles.length}
                    </div>
                    <div className="mt-1 text-slate-400">Readable PDFs</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {totalPages}
                    </div>
                    <div className="mt-1 text-slate-400">Total Pages</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {formatBytes(totalSize)}
                    </div>
                    <div className="mt-1 text-slate-400">Input Size</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {mergedSize ? formatBytes(mergedSize) : "0 B"}
                    </div>
                    <div className="mt-1 text-slate-400">Merged Size</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={mergePdfs}>
                    {isMerging ? "⏳ Merging..." : "⚡ Merge PDFs"}
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
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  📋 Copy Result
                </button>

                {mergedUrl ? (
                  <a
                    href={mergedUrl}
                    download="merged-toolmint.pdf"
                    className="mt-3 block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                  >
                    ⬇️ Download Merged PDF
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                📚 PDF Order
              </h2>

              {pdfFiles.length ? (
                <div className="space-y-3">
                  {pdfFiles.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="break-words font-bold text-white">
                          {index + 1}. {item.file.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {formatBytes(item.file.size)} •{" "}
                          {item.pageCount ? `${item.pageCount} pages` : "Unreadable"}
                        </p>

                        {item.error ? (
                          <p className="mt-2 text-sm text-red-300">
                            {item.error}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moveFile(index, "up")}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          ↑ Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveFile(index, "down")}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          ↓ Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFile(item.id)}
                          className="rounded-lg border border-red-500/50 px-3 py-2 text-sm font-bold text-red-200 transition hover:border-red-400 hover:text-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload PDF files to arrange their order before merging.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Password-protected, encrypted or damaged PDFs may fail to load.
              Remove those files and try again.
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your PDF files are merged inside your browser.
              This tool does not upload your PDFs to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a PDF Merge Tool?
                </h2>
                <p className="text-slate-300">
                  A PDF merge tool combines multiple PDF files into one document.
                  It is useful for reports, invoices, forms, study notes, scanned
                  documents and office paperwork.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Merge Tips
                </h2>
                <p className="text-slate-300">
                  Upload PDFs in the order you want, then use the up and down
                  buttons to adjust document order before downloading the final
                  merged PDF.
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