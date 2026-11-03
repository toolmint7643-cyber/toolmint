"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
} from "docx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_EDITABLE_PAGES = 100;
const MAX_VISUAL_PAGES = 25;
const MAX_VISUAL_PIXELS = 18_000_000;

type OutputMode = "editable" | "visual";
type UploadStatus = "Reading" | "Ready" | "Error";
type ResultStatus = "Completed" | "Warning" | "Error";

type PdfFile = {
  id: string;
  file: File;
  buffer: ArrayBuffer | null;
  pageCount: number;
  range: string;
  status: UploadStatus;
  error: string;
};

type ConversionResult = {
  id: string;
  fileName: string;
  blob: Blob | null;
  size: number;
  sourcePages: number;
  pagesWithText: number;
  pagesWithoutText: number;
  previewText: string;
  previewUrl: string;
  mode: OutputMode;
  status: ResultStatus;
  message: string;
};

type ProgressState = {
  current: number;
  total: number;
  fileName: string;
  stage: string;
};

type PdfTextItem = {
  str?: string;
  hasEOL?: boolean;
};

type PdfHandle = {
  pdf: PDFDocumentProxy;
  destroy: () => Promise<void>;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2) + " " + units[index];
}

function safeBaseName(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

function parsePageRange(input: string, pageCount: number, maxPages = Number.POSITIVE_INFINITY) {
  const value = input.trim();
  if (!value) {
    if (pageCount > maxPages) {
      return { pages: [] as number[], error: "This mode allows up to " + maxPages + " selected pages per PDF. Enter a smaller page range." };
    }
    return { pages: Array.from({ length: pageCount }, (_, index) => index + 1), error: "" };
  }

  const selected = new Set<number>();
  for (const raw of value.split(",")) {
    const part = raw.trim();
    if (!part) return { pages: [] as number[], error: "The page range contains an empty item." };

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end < 1) return { pages: [] as number[], error: "Page numbers start at 1." };
      if (start > end) return { pages: [] as number[], error: "A range must start before it ends." };
      if (end > pageCount) return { pages: [] as number[], error: "Page " + end + " exceeds this PDF's " + pageCount + " pages." };
      for (let page = start; page <= end; page += 1) {
        selected.add(page);
        if (selected.size > maxPages) {
          return { pages: [] as number[], error: "This mode allows up to " + maxPages + " selected pages per PDF. Enter a smaller page range." };
        }
      }
      continue;
    }

    if (!/^\d+$/.test(part)) {
      return { pages: [] as number[], error: "Use page numbers and ranges, for example 1-3,7,10." };
    }
    const page = Number(part);
    if (page < 1) return { pages: [] as number[], error: "Page numbers start at 1." };
    if (page > pageCount) return { pages: [] as number[], error: "Page " + page + " exceeds this PDF's " + pageCount + " pages." };
    selected.add(page);
    if (selected.size > maxPages) {
      return { pages: [] as number[], error: "This mode allows up to " + maxPages + " selected pages per PDF. Enter a smaller page range." };
    }
  }

  return { pages: Array.from(selected).sort((a, b) => a - b), error: "" };
}

function cleanPdfText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractPageText(items: PdfTextItem[]) {
  let output = "";
  for (const item of items) {
    const text = typeof item.str === "string" ? item.str : "";
    if (text) output += text;
    output += item.hasEOL ? "\n" : " ";
  }
  return cleanPdfText(output);
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();
  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is password-protected or encrypted. Password bypass is not supported.";
  }
  if (message.includes("worker")) {
    return "The local PDF worker could not load. Confirm public/pdf.worker.min.mjs exists, then refresh.";
  }
  if (message.includes("memory") || message.includes("canvas") || message.includes("allocation")) {
    return "This page could not be rendered within the browser's available memory. Try fewer pages or a lower DPI.";
  }
  return "This PDF could not be read or converted. It may be invalid, damaged, encrypted, or too large for this browser.";
}

async function openPdf(buffer: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer.slice(0)),
    useWorkerFetch: false,
  });
  try {
    return { pdf: await loadingTask.promise, destroy: () => loadingTask.destroy() } satisfies PdfHandle;
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }
}

function makeTextDocument(
  fileName: string,
  pages: Array<{ pageNumber: number; text: string }>,
) {
  const children: Paragraph[] = [];
  pages.forEach((page, index) => {
    children.push(new Paragraph({
      text: "Page " + page.pageNumber,
      heading: HeadingLevel.HEADING_2,
      pageBreakBefore: index > 0,
    }));

    if (!page.text) {
      children.push(new Paragraph({
        text: "No selectable text was detected on this page. It may be scanned or image-only; OCR was not run.",
      }));
      return;
    }

    for (const line of page.text.split(/\n+/)) {
      const value = line.trim();
      if (value) children.push(new Paragraph({ text: value }));
    }
  });

  return new Document({
    creator: "ToolMint",
    title: fileName + " - extracted text",
    description: "Best-effort text extraction from a PDF using PDF.js.",
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      children,
    }],
  });
}

async function canvasToJpeg(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("The browser could not encode this page image.");
  return blob;
}

async function makeVisualDocument(
  fileName: string,
  pdf: PDFDocumentProxy,
  pageNumbers: number[],
  dpi: number,
  onPage: (pageNumber: number) => void,
  isCancelled: () => boolean,
  setRenderTask: (task: { cancel: () => void } | null) => void,
) {
  const children: Paragraph[] = [];
  let previewImage: Blob | null = null;
  for (let index = 0; index < pageNumbers.length; index += 1) {
    if (isCancelled()) throw new Error("Conversion cancelled.");
    const pageNumber = pageNumbers[index];
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const requestedScale = dpi / 72;
    const pixelScale = Math.min(
      requestedScale,
      Math.sqrt(MAX_VISUAL_PIXELS / (baseViewport.width * baseViewport.height)),
      9000 / baseViewport.width,
      11000 / baseViewport.height,
    );
    const viewport = page.getViewport({ scale: Math.max(0.25, pixelScale) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({ canvas, canvasContext: context, viewport });
    setRenderTask(renderTask);
    try {
      await renderTask.promise;
    } finally {
      setRenderTask(null);
    }
    if (isCancelled()) {
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      throw new Error("Conversion cancelled.");
    }

    const imageBlob = await canvasToJpeg(canvas);
    const data = new Uint8Array(await imageBlob.arrayBuffer());
    if (!previewImage) previewImage = imageBlob;
    const fit = Math.min(720 / canvas.width, 960 / canvas.height, 1);
    children.push(new Paragraph({
      pageBreakBefore: index > 0,
      alignment: "center",
      children: [new ImageRun({
        type: "jpg",
        data,
        transformation: {
          width: Math.max(1, Math.round(canvas.width * fit)),
          height: Math.max(1, Math.round(canvas.height * fit)),
        },
        altText: {
          title: "PDF page " + pageNumber,
          description: "Raster image of source PDF page " + pageNumber + ".",
        },
      })],
    }));
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
    onPage(pageNumber);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  return {
    document: new Document({
      creator: "ToolMint",
      title: fileName + " - visual PDF pages",
      description: "Raster page images rendered locally from a PDF.",
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      }],
    }),
    previewImage,
  };
}

export default function PdfToWordPage() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [mode, setMode] = useState<OutputMode>("editable");
  const [dpi, setDpi] = useState(110);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Choose one or more PDFs to get started.");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef(false);
  const activeRenderRef = useRef<{ cancel: () => void } | null>(null);
  const previewUrlsRef = useRef(new Set<string>());
  const limit = mode === "editable" ? MAX_EDITABLE_PAGES : MAX_VISUAL_PAGES;

  const selectedTotal = useMemo(() => files.reduce((total, item) => {
    if (item.status !== "Ready" || !item.buffer) return total;
    const parsed = parsePageRange(item.range, item.pageCount, limit);
    return total + (parsed.error ? 0 : parsed.pages.length);
  }, 0), [files, limit]);

  const completedResults = results.filter((result) => result.blob && result.status !== "Error");

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  function updateFile(id: string, patch: Partial<PdfFile>) {
    setFiles((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function clearResults() {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
    setResults([]);
  }

  async function addFiles(incoming: FileList | File[]) {
    if (busy || uploading) return;
    setError("");
    clearResults();
    const selected = Array.from(incoming);
    const available = Math.max(0, MAX_FILES - files.length);
    const accepted = selected.slice(0, available);
    if (selected.length > available) {
      setError("You can process up to " + MAX_FILES + " PDFs in one batch. Extra files were not added.");
    }
    if (!accepted.length) {
      if (!files.length) setError("Choose a PDF file to continue.");
      return;
    }

    const pending: PdfFile[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      buffer: null,
      pageCount: 0,
      range: "",
      status: "Reading",
      error: "",
    }));
    setFiles((current) => [...current, ...pending]);
    setStatus("Reading PDF page counts locally...");
    setUploading(true);

    try {
      for (const item of pending) {
        if (item.file.size > MAX_FILE_BYTES) {
          updateFile(item.id, {
            status: "Error",
            error: "File exceeds the 30 MB per-PDF limit.",
          });
          continue;
        }
        if (item.file.type !== "application/pdf" && !item.file.name.toLowerCase().endsWith(".pdf")) {
          updateFile(item.id, { status: "Error", error: "This file does not appear to be a PDF." });
          continue;
        }

        let pdfHandle: PdfHandle | null = null;
        try {
          const buffer = await item.file.arrayBuffer();
          pdfHandle = await openPdf(buffer);
          if (!pdfHandle.pdf.numPages) throw new Error("This PDF has no pages.");
          updateFile(item.id, {
            buffer,
            pageCount: pdfHandle.pdf.numPages,
            range: "",
            status: "Ready",
            error: "",
          });
        } catch (loadError) {
          updateFile(item.id, { status: "Error", error: friendlyError(loadError) });
        } finally {
          await pdfHandle?.destroy();
        }
      }
    } finally {
      setUploading(false);
    }
    setStatus("PDFs are ready. Select an output mode and convert.");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  }

  function removeFile(id: string) {
    if (busy || uploading) return;
    setFiles((current) => current.filter((item) => item.id !== id));
    const removedPreview = results.find((item) => item.id === id)?.previewUrl;
    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
      previewUrlsRef.current.delete(removedPreview);
    }
    setResults((current) => current.filter((item) => item.id !== id));
    setError("");
  }

  function clearAll() {
    if (busy || uploading) return;
    setFiles([]);
    clearResults();
    setProgress(null);
    setError("");
    setStatus("Choose one or more PDFs to get started.");
  }

  async function convertFile(
    item: PdfFile,
    pageNumbers: number[],
    onPage: (pageNumber: number) => void,
    onPacking: () => void,
  ) {
    if (!item.buffer) throw new Error("The PDF file is not ready.");
    const pdfHandle = await openPdf(item.buffer);
    const pdf = pdfHandle.pdf;
    try {
      let docxDocument: Document;
      let pagesWithText = 0;
      let pagesWithoutText = 0;
      let previewText = "";
      let previewImage: Blob | null = null;

      if (mode === "editable") {
        const extracted: Array<{ pageNumber: number; text: string }> = [];
        for (const pageNumber of pageNumbers) {
          if (cancelRef.current) throw new Error("Conversion cancelled.");
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const text = extractPageText(content.items as PdfTextItem[]);
          if (text) pagesWithText += 1;
          else pagesWithoutText += 1;
          extracted.push({ pageNumber, text });
          if (previewText.length < 1200 && text) {
            previewText += (previewText ? "\n\n" : "") + "Page " + pageNumber + "\n" + text;
          }
          page.cleanup();
          onPage(pageNumber);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
        docxDocument = makeTextDocument(item.file.name, extracted);
      } else {
        pagesWithText = 0;
        pagesWithoutText = pageNumbers.length;
        const visualOutput = await makeVisualDocument(
          item.file.name,
          pdf,
          pageNumbers,
          dpi,
          onPage,
          () => cancelRef.current,
          (task) => { activeRenderRef.current = task; },
        );
        docxDocument = visualOutput.document;
        previewImage = visualOutput.previewImage;
      }

      if (cancelRef.current) throw new Error("Conversion cancelled.");
      onPacking();
      const blob = await Packer.toBlob(docxDocument);
      return { blob, pagesWithText, pagesWithoutText, previewText, previewImage };
    } finally {
      activeRenderRef.current = null;
      await pdfHandle.destroy();
    }
  }

  async function convert() {
    if (busy || uploading) return;
    setError("");
    clearResults();
    cancelRef.current = false;

    const prepared = files.map((item) => {
      const parsed = item.status === "Ready"
        ? parsePageRange(item.range, item.pageCount, limit)
        : { pages: [] as number[], error: item.error || "PDF is not ready." };
      return { item, ...parsed };
    });
    const valid = prepared.filter((entry) => entry.item.status === "Ready" && entry.item.buffer && !entry.error && entry.pages.length);
    const invalid = prepared.filter((entry) => entry.item.status === "Ready" && entry.error);
    const totalPages = valid.reduce((total, entry) => total + entry.pages.length, 0);

    if (!valid.length) {
      setError(invalid[0]?.error || "Add a valid PDF and select at least one page.");
      return;
    }
    if (totalPages > limit) {
      setError("This mode supports up to " + limit + " selected pages per batch. Currently selected: " + totalPages + ".");
      return;
    }

    const nextResults: ConversionResult[] = invalid.map(({ item, error: rangeError }) => ({
      id: item.id,
      fileName: item.file.name,
      blob: null,
      size: 0,
      sourcePages: 0,
      pagesWithText: 0,
      pagesWithoutText: 0,
      previewText: "",
      previewUrl: "",
      mode,
      status: "Error",
      message: rangeError,
    }));
    let currentPage = 0;
    setBusy(true);
    setProgress({
      current: 0,
      total: totalPages,
      fileName: "",
      stage: "Preparing browser-side conversion...",
    });

    for (const entry of valid) {
      if (cancelRef.current) break;
      setProgress({
        current: currentPage,
        total: totalPages,
        fileName: entry.item.file.name,
        stage: mode === "editable" ? "Extracting selectable text" : "Rendering page images",
      });
      try {
        const outcome = await convertFile(entry.item, entry.pages, () => {
          currentPage += 1;
          setProgress({
            current: currentPage,
            total: totalPages,
            fileName: entry.item.file.name,
            stage: mode === "editable" ? "Extracting selectable text" : "Rendering page images",
          });
        }, () => {
          setProgress({
            current: currentPage,
            total: totalPages,
            fileName: entry.item.file.name,
            stage: "Packaging DOCX file",
          });
        });
        const hasNoText = mode === "editable" && outcome.pagesWithText === 0;
        const previewUrl = outcome.previewImage ? URL.createObjectURL(outcome.previewImage) : "";
        if (previewUrl) previewUrlsRef.current.add(previewUrl);
        nextResults.push({
          id: entry.item.id,
          fileName: safeBaseName(entry.item.file.name) + "-converted.docx",
          blob: outcome.blob,
          size: outcome.blob.size,
          sourcePages: entry.pages.length,
          pagesWithText: outcome.pagesWithText,
          pagesWithoutText: outcome.pagesWithoutText,
          previewText: outcome.previewText,
          previewUrl,
          mode,
          status: hasNoText ? "Warning" : "Completed",
          message: hasNoText
            ? "No selectable text was found. The DOCX contains per-page notices; OCR was not performed."
            : mode === "visual"
              ? "Contains page images. Text is not editable as document text."
              : outcome.pagesWithoutText
                ? outcome.pagesWithoutText + " page(s) had no selectable text and are marked in the DOCX."
                : "Text was extracted with best-effort reading order; complex layout may differ from the PDF.",
        });
      } catch (conversionError) {
        if (cancelRef.current || (conversionError instanceof Error && conversionError.message === "Conversion cancelled.")) {
          break;
        }
        nextResults.push({
          id: entry.item.id,
          fileName: entry.item.file.name,
          blob: null,
          size: 0,
          sourcePages: entry.pages.length,
          pagesWithText: 0,
          pagesWithoutText: 0,
          previewText: "",
          previewUrl: "",
          mode,
          status: "Error",
          message: friendlyError(conversionError),
        });
      }
    }

    setResults(nextResults);
    setBusy(false);
    setProgress(null);
    if (cancelRef.current) {
      setStatus("Conversion cancelled. Any completed files are still available below.");
    } else {
      const successCount = nextResults.filter((item) => item.blob).length;
      setStatus(successCount + " of " + valid.length + " PDF(s) converted. Review each result before downloading.");
    }
  }

  function cancelConversion() {
    cancelRef.current = true;
    activeRenderRef.current?.cancel();
    setStatus("Cancellation requested. The current page operation is being stopped.");
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadAll() {
    if (!completedResults.length) return;
    if (completedResults.length === 1) {
      const only = completedResults[0];
      if (only.blob) downloadBlob(only.blob, only.fileName);
      return;
    }
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      completedResults.forEach((result) => {
        if (result.blob) zip.file(result.fileName, result.blob);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, "toolmint-pdf-to-word-documents.zip");
    } catch {
      setError("Could not create the ZIP. Download the completed DOCX files individually.");
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-900 px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <PageTitle
            title="PDF to Word Converter"
            description="Convert PDF to DOCX online in your browser. Choose editable text extraction or image-based pages, select page ranges, and process multiple PDFs without uploading them."
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <ToolCard>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Upload PDF files</h2>
                  <p className="mt-2 text-slate-300">Up to {MAX_FILES} files, {formatBytes(MAX_FILE_BYTES)} each.</p>
                </div>
                {files.length > 0 && (
                  <Button onClick={clearAll} disabled={busy || uploading}>Clear all</Button>
                )}
              </div>

              <div
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={"mt-5 rounded-xl border-2 border-dashed p-8 text-center transition " +
                  (dragging ? "border-blue-400 bg-blue-500/10" : "border-slate-600 bg-slate-900/70")}
              >
                <div className="text-4xl" aria-hidden="true">📄</div>
                <p className="mt-3 text-lg font-semibold">Drop PDFs here or choose files</p>
                <p className="mt-2 text-sm text-slate-300">Files are read and processed locally in this browser. Nothing is uploaded.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  onChange={handleFileChange}
                  className="sr-only"
                  aria-label="Choose PDF files"
                />
                <div className="mt-5">
                  <Button onClick={() => fileInputRef.current?.click()} disabled={busy || uploading || files.length >= MAX_FILES}>
                    {uploading ? "Reading PDFs..." : "Choose PDF files"}
                  </Button>
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-5 space-y-3">
                  {files.map((item) => {
                    const parsed = item.status === "Ready" ? parsePageRange(item.range, item.pageCount, limit) : null;
                    return (
                      <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all font-semibold">{item.file.name}</p>
                            <p className="mt-1 text-sm text-slate-300">
                              {formatBytes(item.file.size)} · {item.status === "Reading" ? "Reading page count..." : item.pageCount ? item.pageCount + " pages" : item.status}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            disabled={busy || uploading}
                            aria-label={"Remove " + item.file.name}
                            title="Remove PDF"
                            className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                          >Remove</button>
                        </div>
                        {item.status === "Ready" && (
                          <label className="mt-4 block">
                            <span className="mb-2 block text-sm font-medium text-slate-200">Pages (blank means all)</span>
                            <input
                              value={item.range}
                              onChange={(event) => {
                                updateFile(item.id, { range: event.target.value });
                                clearResults();
                              }}
                              placeholder={"1-" + item.pageCount + " or 1-3,7"}
                              disabled={busy || uploading}
                              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white outline-none focus:border-blue-500"
                            />
                            {parsed?.error && <span className="mt-1 block text-sm text-rose-300">{parsed.error}</span>}
                          </label>
                        )}
                        {item.error && <p className="mt-3 text-sm text-rose-300">{item.error}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {error && <p role="alert" className="mt-4 rounded-lg border border-rose-700 bg-rose-950/60 p-3 text-rose-200">{error}</p>}
              <p role="status" aria-live="polite" className="mt-4 rounded-lg bg-slate-900 p-3 text-sm text-slate-200">{status}</p>
            </ToolCard>

            <ToolCard>
              <h2 className="text-2xl font-bold">Conversion settings</h2>
              <p className="mt-2 text-sm text-slate-300">Choose how the DOCX should represent the PDF pages.</p>

              <fieldset className="mt-5 space-y-3">
                <legend className="mb-2 font-semibold">Output mode</legend>
                <label className={"block cursor-pointer rounded-xl border p-4 " + (mode === "editable" ? "border-blue-500 bg-blue-950/30" : "border-slate-700 bg-slate-900/60")}>
                  <span className="flex items-center gap-3 font-semibold">
                    <input type="radio" name="output-mode" checked={mode === "editable"} onChange={() => { setMode("editable"); clearResults(); }} disabled={busy} />
                    Editable text DOCX
                  </span>
                  <span className="mt-2 block pl-7 text-sm text-slate-300">Extract selectable PDF text into Word paragraphs. Reading order and complex layouts may differ.</span>
                </label>
                <label className={"block cursor-pointer rounded-xl border p-4 " + (mode === "visual" ? "border-blue-500 bg-blue-950/30" : "border-slate-700 bg-slate-900/60")}>
                  <span className="flex items-center gap-3 font-semibold">
                    <input type="radio" name="output-mode" checked={mode === "visual"} onChange={() => { setMode("visual"); clearResults(); }} disabled={busy} />
                    Visual pages DOCX
                  </span>
                  <span className="mt-2 block pl-7 text-sm text-slate-300">Each PDF page becomes a page image. Appearance is retained more closely, but the page text is not editable.</span>
                </label>
              </fieldset>

              {mode === "visual" && (
                <label className="mt-5 block">
                  <span className="flex justify-between gap-3 font-medium">
                    <span>Render resolution</span><span>{dpi} DPI</span>
                  </span>
                  <input
                    type="range"
                    min="72"
                    max="180"
                    step="1"
                    value={dpi}
                    onChange={(event) => setDpi(Number(event.target.value))}
                    disabled={busy}
                    className="mt-3 w-full accent-blue-500"
                  />
                  <span className="mt-1 block text-xs text-slate-400">Higher DPI uses more memory and creates larger DOCX files. Per-page pixel limits are applied.</span>
                </label>
              )}

              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <div className="flex justify-between gap-3"><span>Selected pages</span><strong>{selectedTotal}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>Batch limit for this mode</span><strong>{limit}</strong></div>
                <div className="mt-2 flex justify-between gap-3"><span>PDF files</span><strong>{files.length} / {MAX_FILES}</strong></div>
              </div>

              {progress && (
                <div className="mt-5" aria-live="polite">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{progress.stage}{progress.fileName ? ": " + progress.fileName : ""}</span>
                    <span>{progress.current} / {progress.total} pages</span>
                  </div>
                  <progress className="mt-2 h-3 w-full accent-blue-500" max={progress.total || 1} value={progress.current} aria-label="PDF conversion progress" />
                  <Button onClick={cancelConversion} className="mt-3" disabled={!busy}>Cancel</Button>
                </div>
              )}

              <div className="mt-6">
                <Button onClick={convert} disabled={busy || files.length === 0 || selectedTotal === 0}>
                  {busy ? "Converting..." : "Convert to DOCX"}
                </Button>
              </div>
            </ToolCard>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ToolCard>
              <h2 className="text-xl font-bold">Results</h2>
              {results.length === 0 ? (
                <p className="mt-3 text-slate-300">Converted documents and per-file messages will appear here.</p>
              ) : (
                <>
                  {completedResults.length > 1 && (
                    <div className="mt-4"><Button onClick={() => void downloadAll()}>Download all as ZIP</Button></div>
                  )}
                  <ul className="mt-4 space-y-3">
                    {results.map((result) => (
                      <li key={result.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-all font-semibold">{result.fileName}</p>
                            <p className="mt-1 text-sm text-slate-300">
                              {result.blob ? formatBytes(result.size) + " · " + result.sourcePages + " page(s)" : "Not converted"}
                            </p>
                          </div>
                          {result.blob && <Button onClick={() => downloadBlob(result.blob!, result.fileName)}>Download DOCX</Button>}
                        </div>
                        <p className={"mt-3 text-sm " + (result.status === "Error" ? "text-rose-300" : result.status === "Warning" ? "text-amber-200" : "text-emerald-200")}>
                          {result.message}
                        </p>
                        {result.previewText && (
                          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Extracted text preview</p>
                            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-sans text-sm text-slate-200">{result.previewText}</pre>
                          </div>
                        )}
                        {result.previewUrl && (
                          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase text-slate-400">First page preview · image, not editable text</p>
                            <Image src={result.previewUrl} alt="First converted PDF page preview" width={720} height={960} unoptimized className="mx-auto max-h-80 max-w-full object-contain" />
                          </div>
                        )}
                        {result.mode === "editable" && result.blob && (
                          <p className="mt-2 text-xs text-slate-400">
                            Selectable-text pages: {result.pagesWithText}; pages without selectable text: {result.pagesWithoutText}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="text-xl font-bold">What to expect</h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
                <p><strong className="text-white">Editable text mode:</strong> uses embedded/selectable PDF text. It does not run OCR, reproduce exact page layout, or guarantee reading order for columns, tables, and positioned text.</p>
                <p><strong className="text-white">Visual pages mode:</strong> renders the pages as JPEG images inside DOCX. It is suitable when appearance matters more than editing the text; the embedded page content is not searchable/editable text.</p>
                <p>Scanned/image-only pages are detected as having no selectable text and clearly reported. Use the separate PDF OCR tool when you need OCR text extraction.</p>
                <p>Password-protected, damaged, or unsupported PDFs may fail. This tool does not bypass PDF passwords. Large files can use substantial browser memory.</p>
              </div>
            </ToolCard>
          </div>

          <section className="mt-10 space-y-8 text-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-white">Convert PDF to Word online</h2>
              <p className="mt-3 leading-7">ToolMint converts PDF files to DOCX in your browser. Choose editable text extraction for PDFs with selectable text, or visual page conversion when retaining the page appearance is more important than editing. Select individual pages or ranges such as 1-3,7, and convert a small batch of files in one job.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">How this PDF to DOCX converter works</h2>
              <p className="mt-3 leading-7">PDF.js reads the selected document locally. In editable mode, the converter extracts text items page by page and writes them into a genuine Word DOCX document with page markers. PDF text has coordinates rather than Word-style paragraphs, so columns, tables, spacing, and fonts can need manual adjustment after conversion.</p>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Privacy and scanned PDF limitations</h2>
              <p className="mt-3 leading-7">Your source PDF is not sent to a ToolMint server. Scanned PDFs contain page images instead of selectable text; this converter identifies pages without text but does not silently invent text or claim OCR conversion. For scanned documents, use a dedicated OCR workflow and review its output.</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
