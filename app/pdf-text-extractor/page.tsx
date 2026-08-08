"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const MAX_FILES = 10;
const MAX_TOTAL_PAGES = 100;

type OutputMode = "clean" | "pages";
type SelectionMode = "all" | "selected";
type FileStatus = "Reading" | "Ready" | "Extracting" | "Completed" | "Error";

type TextContentItem = {
  str?: string;
  hasEOL?: boolean;
};

type ExtractedPage = {
  pageNumber: number;
  text: string;
  hasText: boolean;
  characterCount: number;
  message?: string;
};

type UploadedPdf = {
  id: string;
  file: File;
  buffer: ArrayBuffer;
  pageCount: number;
  status: FileStatus;
  error: string;
  pagesWithText: number;
  pagesWithoutText: number;
  extractedPages: ExtractedPage[];
};

type FileTextResult = {
  id: string;
  fileName: string;
  text: string;
  pagesWithText: number;
  pagesWithoutText: number;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function safeFileBaseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-") || "document";
}

function cleanExtractedText(text: string) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string) {
  return text.trim().match(/\S+/g)?.length || 0;
}

function countLines(text: string) {
  if (!text.trim()) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

function pageTextFromItems(items: TextContentItem[]) {
  const parts: string[] = [];

  for (const item of items) {
    const value = typeof item.str === "string" ? item.str : "";
    if (!value.trim()) continue;
    parts.push(value);
    parts.push(item.hasEOL ? "\n" : " ");
  }

  return cleanExtractedText(parts.join(""));
}

function parsePageRange(input: string, pageCount: number) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { pages: [] as number[], error: "Enter a page range like 1-3,7,10." };
  }

  const selected = new Set<number>();
  const parts = trimmed.split(",");

  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (!part) {
      return { pages: [] as number[], error: "Page range contains an empty value." };
    }

    if (part.includes("-")) {
      const rangeParts = part.split("-").map((value) => value.trim());

      if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      if (start <= 0 || end <= 0) {
        return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      }

      if (start > end) {
        return { pages: [] as number[], error: `Range start cannot be greater than end: ${part}` };
      }

      if (end > pageCount) {
        return { pages: [] as number[], error: `Page ${end} is beyond total pages (${pageCount}).` };
      }

      for (let page = start; page <= end; page += 1) {
        selected.add(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) {
        return { pages: [] as number[], error: `Invalid page number: ${part}` };
      }

      if (page <= 0) {
        return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      }

      if (page > pageCount) {
        return { pages: [] as number[], error: `Page ${page} is beyond total pages (${pageCount}).` };
      }

      selected.add(page);
    }
  }

  return { pages: Array.from(selected).sort((a, b) => a - b), error: "" };
}

function buildFileText(file: UploadedPdf, outputMode: OutputMode) {
  if (outputMode === "clean") {
    return cleanExtractedText(
      file.extractedPages
        .filter((page) => page.hasText)
        .map((page) => page.text)
        .join("\n\n")
    );
  }

  return [
    `=== ${file.file.name} ===`,
    "",
    ...file.extractedPages.map((page) => {
      const body = page.hasText
        ? page.text
        : page.message || "No extractable text found. This page may be scanned/image-only and requires OCR.";

      return `--- Page ${page.pageNumber} ---\n\n${body}`;
    }),
  ].join("\n\n");
}

function buildCombinedText(files: UploadedPdf[], outputMode: OutputMode) {
  return cleanExtractedText(
    files
      .filter((file) => file.extractedPages.length > 0)
      .map((file) => buildFileText(file, outputMode))
      .join("\n\n")
  );
}

function friendlyPdfError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is password-protected or encrypted and cannot be processed by the browser-based text extractor.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("missing")) {
    return "Unable to read this PDF. It may be corrupt, unsupported or not a valid PDF file.";
  }

  if (message.includes("worker")) {
    return "PDF worker failed to load. Please make sure public/pdf.worker.min.mjs exists and refresh the page.";
  }

  return "Unable to process this PDF. It may be encrypted, corrupt, unsupported or too large for this browser.";
}

async function getPdfPageCount(file: File, buffer: ArrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    useWorkerFetch: false,
  });

  const pdf = await loadingTask.promise;
  return pdf.numPages;
}

export default function PdfTextExtractorPage() {
  const [files, setFiles] = useState<UploadedPdf[]>([]);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("all");
  const [pageRange, setPageRange] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("pages");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Upload one or more PDFs to extract embedded text.");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");

  const totalPages = useMemo(() => files.reduce((sum, file) => sum + file.pageCount, 0), [files]);

  const combinedText = useMemo(() => buildCombinedText(files, outputMode), [files, outputMode]);

  const fileTextResults: FileTextResult[] = useMemo(
    () =>
      files.map((file) => ({
        id: file.id,
        fileName: file.file.name,
        text: buildFileText(file, outputMode),
        pagesWithText: file.pagesWithText,
        pagesWithoutText: file.pagesWithoutText,
      })),
    [files, outputMode]
  );

  const stats = useMemo(
    () => ({
      filesProcessed: files.filter((file) => file.status === "Completed").length,
      totalPages,
      pagesWithText: files.reduce((sum, file) => sum + file.pagesWithText, 0),
      pagesWithoutText: files.reduce((sum, file) => sum + file.pagesWithoutText, 0),
      characters: combinedText.length,
      words: countWords(combinedText),
      lines: countLines(combinedText),
    }),
    [combinedText, files, totalPages]
  );

  const searchMatches = useMemo(() => {
    const query = search.trim();
    if (!query || !combinedText) return 0;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return combinedText.match(new RegExp(escaped, "gi"))?.length || 0;
  }, [combinedText, search]);

  const showCopied = (message: string) => {
    setCopied(message);
    window.setTimeout(() => setCopied(""), 1600);
  };

  const updateFile = (id: string, changes: Partial<UploadedPdf>) => {
    setFiles((current) =>
      current.map((file) => (file.id === id ? { ...file, ...changes } : file))
    );
  };

  const addFiles = async (incomingFiles: FileList | File[]) => {
    const selected = Array.from(incomingFiles);

    if (!selected.length) return;

    setError("");
    setStatus("Reading uploaded PDF files...");

    const currentCount = files.length;

    if (currentCount + selected.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} PDF files allowed at a time.`);
      return;
    }

    const nonPdf = selected.find(
      (file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
    );

    if (nonPdf) {
      setError(`Please upload PDF files only. Invalid file: ${nonPdf.name}`);
      return;
    }

    setLoading(true);

    try {
      const newFiles: UploadedPdf[] = [];

      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        setStatus(`Reading PDF ${index + 1} of ${selected.length}: ${file.name}`);

        const buffer = await file.arrayBuffer();
        const pageCount = await getPdfPageCount(file, buffer);

        if (!pageCount) {
          newFiles.push({
            id: `${file.name}-${file.lastModified}-${Math.random()}`,
            file,
            buffer,
            pageCount: 0,
            status: "Error",
            error: "This PDF has no pages.",
            pagesWithText: 0,
            pagesWithoutText: 0,
            extractedPages: [],
          });
          continue;
        }

        newFiles.push({
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          buffer,
          pageCount,
          status: "Ready",
          error: "",
          pagesWithText: 0,
          pagesWithoutText: 0,
          extractedPages: [],
        });
      }

      const nextTotalPages =
        files.reduce((sum, file) => sum + file.pageCount, 0) +
        newFiles.reduce((sum, file) => sum + file.pageCount, 0);

      if (nextTotalPages > MAX_TOTAL_PAGES) {
        setError(
          `Maximum ${MAX_TOTAL_PAGES} pages allowed at a time. Please upload fewer pages or process files separately.`
        );
        return;
      }

      setFiles((current) => [...current, ...newFiles]);
      setStatus(`${newFiles.length} PDF file(s) loaded. Total pages: ${nextTotalPages}.`);
    } catch (uploadError) {
      setError(friendlyPdfError(uploadError));
      setStatus("Unable to read uploaded PDF files.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
    setStatus("PDF removed.");
  };

  const clearAll = () => {
    setFiles([]);
    setSearch("");
    setCopied("");
    setError("");
    setStatus("Upload one or more PDFs to extract embedded text.");
  };

  const setQuickRange = (type: "first" | "first5" | "last" | "all") => {
    const firstReadyFile = files.find((file) => file.pageCount > 0);
    const pageCount = firstReadyFile?.pageCount || 1;

    setSelectionMode("selected");

    if (type === "first") setPageRange("1");
    if (type === "first5") setPageRange(`1-${Math.min(5, pageCount)}`);
    if (type === "last") setPageRange(String(pageCount));
    if (type === "all") {
      setSelectionMode("all");
      setPageRange("");
    }
  };

  const getPagesForFile = (file: UploadedPdf) => {
    if (selectionMode === "all") {
      return {
        pages: Array.from({ length: file.pageCount }, (_, index) => index + 1),
        error: "",
      };
    }

    return parsePageRange(pageRange, file.pageCount);
  };

  const extractText = async () => {
    if (!files.length) {
      setError("Upload at least one PDF file first.");
      return;
    }

    if (files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} PDF files allowed at a time.`);
      return;
    }

    if (totalPages > MAX_TOTAL_PAGES) {
      setError(
        `Maximum ${MAX_TOTAL_PAGES} pages allowed at a time. Please upload fewer pages or process files separately.`
      );
      return;
    }

    if (selectionMode === "selected" && !pageRange.trim()) {
      setError("Enter a page range like 1-3,7,10.");
      return;
    }

    setLoading(true);
    setError("");
    setCopied("");
    setStatus("Starting text extraction...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        const pageSelection = getPagesForFile(file);

        if (pageSelection.error) {
          updateFile(file.id, {
            status: "Error",
            error: `${file.file.name}: ${pageSelection.error}`,
            extractedPages: [],
            pagesWithText: 0,
            pagesWithoutText: 0,
          });
          continue;
        }

        updateFile(file.id, {
          status: "Extracting",
          error: "",
          extractedPages: [],
          pagesWithText: 0,
          pagesWithoutText: 0,
        });

        setStatus(`Extracting PDF ${fileIndex + 1} of ${files.length}: ${file.file.name}`);

        try {
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(file.buffer.slice(0)),
            useWorkerFetch: false,
          });

          const pdf = await loadingTask.promise;
          const extractedPages: ExtractedPage[] = [];

          for (let pageIndex = 0; pageIndex < pageSelection.pages.length; pageIndex += 1) {
            const pageNumber = pageSelection.pages[pageIndex];

            setStatus(
              `Extracting PDF ${fileIndex + 1} of ${files.length} - Page ${pageIndex + 1} of ${pageSelection.pages.length}`
            );

            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const items = content.items as TextContentItem[];
            const text = pageTextFromItems(items);

            if (text.trim()) {
              extractedPages.push({
                pageNumber,
                text,
                hasText: true,
                characterCount: text.length,
              });
            } else {
              extractedPages.push({
                pageNumber,
                text: "",
                hasText: false,
                characterCount: 0,
                message:
                  "No extractable text found. This page may be scanned/image-only and requires OCR.",
              });
            }

            await new Promise((resolve) => window.setTimeout(resolve, 0));
          }

          const pagesWithText = extractedPages.filter((page) => page.hasText).length;
          const pagesWithoutText = extractedPages.length - pagesWithText;

          updateFile(file.id, {
            status: "Completed",
            extractedPages,
            pagesWithText,
            pagesWithoutText,
            error: pagesWithText
              ? ""
              : "No extractable text found. OCR is required for this document.",
          });
        } catch (fileError) {
          updateFile(file.id, {
            status: "Error",
            error: friendlyPdfError(fileError),
            extractedPages: [],
            pagesWithText: 0,
            pagesWithoutText: 0,
          });
        }
      }

      setStatus("Completed.");
    } catch (extractError) {
      setError(friendlyPdfError(extractError));
      setStatus("Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, message: string) => {
    try {
      if (!text.trim()) {
        setError("There is no extracted text to copy.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setError("");
      showCopied(message);
    } catch {
      setError("Clipboard copy failed. Please copy the text manually.");
    }
  };

  const downloadText = (text: string, filename: string) => {
    try {
      if (!text.trim()) {
        setError("There is no extracted text to download.");
        return;
      }

      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.click();

      URL.revokeObjectURL(url);
      setError("");
      setStatus("TXT file downloaded.");
    } catch {
      setError("Unable to download TXT file.");
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Text Extractor"
          description="Extract embedded text from PDF files directly in your browser. No upload required. OCR is not included for scanned pages."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Upload PDFs</h2>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-900 focus-within:border-blue-400"
              >
                <span className="text-4xl font-bold text-blue-300">PDF</span>
                <span className="mt-3 text-lg font-bold">Drop PDFs here or choose files</span>
                <span className="mt-1 text-sm text-slate-300">
                  Maximum {MAX_FILES} files and {MAX_TOTAL_PAGES} total pages. Files stay in your browser.
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleFileInput}
                  className="sr-only"
                />
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button onClick={extractText}>Extract Text</Button>
                <Button onClick={clearAll} variant="secondary">Clear All</Button>
              </div>

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}

              {copied && (
                <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">
                  {copied}
                </p>
              )}

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300" aria-live="polite">
                {loading ? "Working..." : status}
              </p>
            </ToolCard>

            {files.length > 0 && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">File List</h2>

                <div className="space-y-4">
                  {files.map((file, index) => (
                    <div key={file.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-blue-300">File {index + 1}</p>
                          <p className="break-all text-lg font-bold text-white">{file.file.name}</p>
                          <p className="mt-1 text-sm text-slate-300">
                            {formatBytes(file.file.size)} - {file.pageCount} page(s)
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 font-bold text-red-200 transition hover:bg-red-900/60"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-800 p-3">
                          <p className="text-xs text-slate-400">Status</p>
                          <p className="font-bold text-white">{file.status}</p>
                        </div>
                        <div className="rounded-xl bg-slate-800 p-3">
                          <p className="text-xs text-slate-400">Pages with text</p>
                          <p className="font-bold text-emerald-300">{file.pagesWithText}</p>
                        </div>
                        <div className="rounded-xl bg-slate-800 p-3">
                          <p className="text-xs text-slate-400">Pages requiring OCR</p>
                          <p className="font-bold text-amber-300">{file.pagesWithoutText}</p>
                        </div>
                      </div>

                      {file.error && (
                        <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">
                          {file.error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Extraction Settings</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode("all")}
                  className={`rounded-xl border p-4 text-left font-bold transition ${
                    selectionMode === "all"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  All Pages
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionMode("selected")}
                  className={`rounded-xl border p-4 text-left font-bold transition ${
                    selectionMode === "selected"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  Selected Pages
                </button>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Page range</span>
                <input
                  value={pageRange}
                  onChange={(event) => {
                    setSelectionMode("selected");
                    setPageRange(event.target.value);
                  }}
                  disabled={selectionMode === "all"}
                  placeholder="Example: 1-3,7,10"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <span className="mt-2 block text-xs text-slate-400">
                  Selected pages apply separately to each uploaded PDF.
                </span>
              </label>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <button type="button" onClick={() => setQuickRange("first")} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-white hover:bg-slate-700">
                  First Page
                </button>
                <button type="button" onClick={() => setQuickRange("first5")} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-white hover:bg-slate-700">
                  First 5
                </button>
                <button type="button" onClick={() => setQuickRange("last")} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-white hover:bg-slate-700">
                  Last Page
                </button>
                <button type="button" onClick={() => setQuickRange("all")} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-white hover:bg-slate-700">
                  All Pages
                </button>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Output mode</span>
                <select
                  value={outputMode}
                  onChange={(event) => setOutputMode(event.target.value as OutputMode)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                >
                  <option value="pages">Page-separated output</option>
                  <option value="clean">Clean text</option>
                </select>
              </label>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Search Extracted Text</h2>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                disabled={!combinedText}
                placeholder="Search extracted text..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-sm text-slate-300">
                  Matches: <span className="font-bold text-white">{searchMatches}</span>
                </p>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Summary</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Files processed</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">{stats.filesProcessed}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Total pages</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">{stats.totalPages}</p>
                </div>

                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4">
                  <p className="text-sm text-amber-200">Pages requiring OCR</p>
                  <p className="mt-2 text-2xl font-bold text-amber-300">{stats.pagesWithoutText}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">Characters</p>
                  <p className="mt-2 text-xl font-bold text-white">{stats.characters}</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">Words</p>
                  <p className="mt-2 text-xl font-bold text-white">{stats.words}</p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="text-sm text-slate-300">Lines</p>
                  <p className="mt-2 text-xl font-bold text-white">{stats.lines}</p>
                </div>
              </div>

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                Pages with text: {stats.pagesWithText} - Pages requiring OCR: {stats.pagesWithoutText}
              </p>
            </ToolCard>

            <ToolCard>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-white">Combined Output</h2>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => copyText(combinedText, "Copied all text.")}
                    disabled={!combinedText}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy All Text
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadText(combinedText, "toolmint-extracted-text.txt")}
                    disabled={!combinedText}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Download Combined TXT
                  </button>
                </div>
              </div>

              {combinedText ? (
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-7 text-slate-100">
                  {combinedText}
                </pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                  Extracted text will appear here.
                </div>
              )}
            </ToolCard>

            {fileTextResults.some((file) => file.text.trim()) && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">File Results</h2>

                <div className="space-y-4">
                  {fileTextResults.map((file) => (
                    <div key={file.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="break-all text-lg font-bold text-white">{file.fileName}</h3>
                          <p className="mt-1 text-sm text-slate-300">
                            Pages with text: {file.pagesWithText} - Pages requiring OCR: {file.pagesWithoutText}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => copyText(file.text, "Copied file text.")}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500"
                          >
                            Copy File
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadText(file.text, `${safeFileBaseName(file.fileName)}.txt`)}
                            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                          >
                            Download TXT
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ToolCard>
            )}

            {files.some((file) => file.extractedPages.length > 0) && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Page Results</h2>

                <div className="space-y-5">
                  {files.map((file) =>
                    file.extractedPages.length > 0 ? (
                      <div key={file.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                        <h3 className="break-all text-lg font-bold text-white">{file.file.name}</h3>

                        <div className="mt-4 space-y-3">
                          {file.extractedPages.map((page) => (
                            <div
                              key={`${file.id}-${page.pageNumber}`}
                              className={`rounded-xl border p-4 ${
                                page.hasText
                                  ? "border-slate-700 bg-slate-900"
                                  : "border-amber-500/40 bg-amber-950/30"
                              }`}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-bold text-white">Page {page.pageNumber}</p>
                                  <p className="text-sm text-slate-300">
                                    Characters: {page.characterCount} - Status:{" "}
                                    {page.hasText ? "Text found" : "No extractable text"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => copyText(page.text, `Copied page ${page.pageNumber} text.`)}
                                  disabled={!page.hasText}
                                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Copy Page
                                </button>
                              </div>

                              {page.hasText ? (
                                <p className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                  {page.text}
                                </p>
                              ) : (
                                <p className="mt-3 text-sm font-semibold text-amber-200">
                                  {page.message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Privacy</h2>
              <p className="text-slate-300">
                Your PDF files are processed locally in your browser. They are not uploaded to our server or any external PDF processing service.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Known Limitations</h2>
              <p className="text-slate-300">
                This tool extracts embedded PDF text only. Scanned/image-only pages require OCR. Some complex PDF layouts may not extract in the same visual order. Password-protected, encrypted or very large PDFs may not be supported. OCR is not included in this tool.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}