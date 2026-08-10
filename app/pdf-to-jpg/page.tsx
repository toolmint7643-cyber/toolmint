"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const MAX_CANVAS_PIXELS = 28000000;
const MAX_CANVAS_SIDE = 12000;
const THUMBNAIL_SCALE = 0.22;

type PageMode = "all" | "custom";
type PageStatus = "Ready" | "Selected" | "Rendering" | "Converting" | "Completed" | "Failed";

type PageItem = {
  pageNumber: number;
  selected: boolean;
  thumbnailUrl: string;
  status: PageStatus;
  width: number;
  height: number;
  error: string;
};

type ConvertedPage = {
  pageNumber: number;
  fileName: string;
  url: string;
  size: number;
  width: number;
  height: number;
  status: "Completed" | "Failed";
  error: string;
  blob: Blob | null;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function safeBaseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "document";
}

function padPage(page: number) {
  return String(page).padStart(3, "0");
}

function parsePageRange(input: string, pageCount: number) {
  const trimmed = input.trim();

  if (!trimmed) return { pages: [] as number[], error: "Enter a page range like 1-3,7,10." };

  const pages = new Set<number>();

  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();

    if (!part) return { pages: [] as number[], error: "Page range contains an empty value." };

    if (part.includes("-")) {
      const range = part.split("-").map((value) => value.trim());

      if (range.length !== 2 || !range[0] || !range[1]) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      const start = Number(range[0]);
      const end = Number(range[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      if (start <= 0 || end <= 0) return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      if (start > end) return { pages: [] as number[], error: `Range start cannot be greater than end: ${part}` };
      if (end > pageCount) return { pages: [] as number[], error: `Page ${end} is beyond total pages (${pageCount}).` };

      for (let page = start; page <= end; page += 1) pages.add(page);
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) return { pages: [] as number[], error: `Invalid page number: ${part}` };
      if (page <= 0) return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      if (page > pageCount) return { pages: [] as number[], error: `Page ${page} is beyond total pages (${pageCount}).` };

      pages.add(page);
    }
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: "" };
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is password-protected. Enter the password and unlock it locally in your browser.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("pdf")) {
    return "Unable to read this PDF. It may be corrupt, unsupported, encrypted, or not a valid PDF file.";
  }

  if (message.includes("canvas") || message.includes("memory") || message.includes("allocation")) {
    return "The requested output is too large for the browser. Try a lower scale or fewer pages.";
  }

  return "Unable to convert this PDF. Try another file, lower scale, or fewer pages.";
}

async function canvasToJpgBlob(canvas: HTMLCanvasElement, quality: number) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Unable to create JPG image.");
  return blob;
}

export default function PdfToJpgPage() {
  const pdfRef = useRef<any>(null);

  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [convertedPages, setConvertedPages] = useState<ConvertedPage[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [pageRange, setPageRange] = useState("1");
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(2);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to convert selected pages into JPG images.");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const selectedPages = useMemo(() => pages.filter((page) => page.selected).map((page) => page.pageNumber), [pages]);

  const stats = useMemo(() => {
    const completed = convertedPages.filter((page) => page.status === "Completed");
    const failed = convertedPages.filter((page) => page.status === "Failed");
    const sizes = completed.map((page) => page.size);
    const total = sizes.reduce((sum, size) => sum + size, 0);

    return {
      selected: selectedPages.length,
      converted: completed.length,
      failed: failed.length,
      totalSize: total,
      averageSize: sizes.length ? Math.round(total / sizes.length) : 0,
      largest: sizes.length ? Math.max(...sizes) : 0,
      smallest: sizes.length ? Math.min(...sizes) : 0,
    };
  }, [convertedPages, selectedPages.length]);

  const highOutputWarning = selectedPages.length >= 20 || scale >= 3 || quality >= 95;

  function revokeUrls() {
    pages.forEach((page) => {
      if (page.thumbnailUrl) URL.revokeObjectURL(page.thumbnailUrl);
    });

    convertedPages.forEach((page) => {
      if (page.url) URL.revokeObjectURL(page.url);
    });
  }

  useEffect(() => {
    return () => revokeUrls();
  }, [pages, convertedPages]);

  function setPageStatus(pageNumber: number, status: PageStatus, errorMessage = "") {
    setPages((current) =>
      current.map((page) =>
        page.pageNumber === pageNumber
          ? {
              ...page,
              status,
              error: errorMessage,
            }
          : page,
      ),
    );
  }

  function clearResults() {
    convertedPages.forEach((page) => {
      if (page.url) URL.revokeObjectURL(page.url);
    });

    setConvertedPages([]);
    setProgress(0);
  }

  async function reset() {
    revokeUrls();
    pdfRef.current = null;
    setFile(null);
    setBuffer(null);
    setPageCount(0);
    setPages([]);
    setConvertedPages([]);
    setPageMode("all");
    setPageRange("1");
    setQuality(90);
    setScale(2);
    setPassword("");
    setNeedsPassword(false);
    setStatus("Upload a PDF to convert selected pages into JPG images.");
    setError("");
    setCopied("");
    setLoadingPdf(false);
    setConverting(false);
    setProgress(0);
  }

  async function renderThumbnail(pdf: any, pageNumber: number) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Canvas is not supported in this browser.");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await canvasToJpgBlob(canvas, 0.65);
    const url = URL.createObjectURL(blob);

    canvas.width = 0;
    canvas.height = 0;

    return { url, width: Math.round(viewport.width / THUMBNAIL_SCALE), height: Math.round(viewport.height / THUMBNAIL_SCALE) };
  }

  async function buildPageItems(pdf: any) {
    const nextPages: PageItem[] = Array.from({ length: pdf.numPages }, (_, index) => ({
      pageNumber: index + 1,
      selected: true,
      thumbnailUrl: "",
      status: "Selected" as PageStatus,
      width: 0,
      height: 0,
      error: "",
    }));

    setPages(nextPages);

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      setStatus(`Rendering thumbnail ${pageNumber} of ${pdf.numPages}...`);

      try {
        const thumbnail = await renderThumbnail(pdf, pageNumber);

        setPages((current) =>
          current.map((page) =>
            page.pageNumber === pageNumber
              ? {
                  ...page,
                  thumbnailUrl: thumbnail.url,
                  width: thumbnail.width,
                  height: thumbnail.height,
                }
              : page,
          ),
        );
      } catch {
        setPages((current) =>
          current.map((page) =>
            page.pageNumber === pageNumber
              ? {
                  ...page,
                  status: "Failed",
                  error: "Thumbnail failed.",
                }
              : page,
          ),
        );
      }

      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  async function loadPdf(selectedFile: File, unlockPassword = "") {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoadingPdf(true);
    setError("");
    setCopied("");
    setNeedsPassword(false);
    clearResults();

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const bytes = buffer && selectedFile === file ? buffer : await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(bytes.slice(0)),
        password: unlockPassword || undefined,
        useWorkerFetch: false,
      }).promise;

      if (!pdf.numPages) throw new Error("Empty PDF");

      revokeUrls();

      pdfRef.current = pdf;
      setFile(selectedFile);
      setBuffer(bytes);
      setPageCount(pdf.numPages);
      setPageRange(`1-${Math.min(5, pdf.numPages)}`);
      setStatus(`PDF loaded. ${pdf.numPages} page(s) ready. Select pages and convert to JPG.`);
      setPages([]);
      await buildPageItems(pdf);
      setStatus(`PDF ready. ${pdf.numPages} page(s) loaded. Your PDF stays in your browser.`);
    } catch (loadError) {
      const friendly = getFriendlyError(loadError);
      setError(friendly);
      setStatus("PDF loading failed.");
      if (friendly.toLowerCase().includes("password")) setNeedsPassword(true);
    } finally {
      setLoadingPdf(false);
    }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) loadPdf(selectedFile);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) loadPdf(selectedFile);
  }

  function togglePage(pageNumber: number) {
    setPages((current) =>
      current.map((page) =>
        page.pageNumber === pageNumber
          ? {
              ...page,
              selected: !page.selected,
              status: !page.selected ? "Selected" : "Ready",
            }
          : page,
      ),
    );
    setPageMode("custom");
  }

  function selectPages(pageNumbers: number[]) {
    const selected = new Set(pageNumbers);

    setPages((current) =>
      current.map((page) => ({
        ...page,
        selected: selected.has(page.pageNumber),
        status: selected.has(page.pageNumber) ? "Selected" : "Ready",
      })),
    );
  }

  function quickSelect(type: "all" | "none" | "first" | "last" | "odd" | "even" | "first5" | "first10" | "custom") {
    if (!pageCount) return;

    if (type === "all") {
      setPageMode("all");
      selectPages(Array.from({ length: pageCount }, (_, index) => index + 1));
      return;
    }

    setPageMode("custom");

    if (type === "none") selectPages([]);
    if (type === "first") selectPages([1]);
    if (type === "last") selectPages([pageCount]);
    if (type === "odd") selectPages(Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page % 2 === 1));
    if (type === "even") selectPages(Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => page % 2 === 0));
    if (type === "first5") selectPages(Array.from({ length: Math.min(5, pageCount) }, (_, index) => index + 1));
    if (type === "first10") selectPages(Array.from({ length: Math.min(10, pageCount) }, (_, index) => index + 1));

    if (type === "custom") {
      const parsed = parsePageRange(pageRange, pageCount);
      if (parsed.error) {
        setError(parsed.error);
        return;
      }
      selectPages(parsed.pages);
    }
  }

  async function convertSinglePage(pdf: any, pageNumber: number) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const pixels = width * height;

    if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE || pixels > MAX_CANVAS_PIXELS) {
      throw new Error("Canvas size would be too large. Lower the scale.");
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Canvas is not supported in this browser.");

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await canvasToJpgBlob(canvas, quality / 100);
    const url = URL.createObjectURL(blob);

    canvas.width = 0;
    canvas.height = 0;

    return { blob, url, width, height };
  }

  async function convertSelectedPages() {
    if (!pdfRef.current || !file) {
      setError("Upload a PDF first.");
      return;
    }

    if (!selectedPages.length) {
      setError("Select at least one page to convert.");
      return;
    }

    setConverting(true);
    setError("");
    setCopied("");
    clearResults();

    const pdf = pdfRef.current;
    const baseName = safeBaseName(file.name);
    const results: ConvertedPage[] = [];

    try {
      for (let index = 0; index < selectedPages.length; index += 1) {
        const pageNumber = selectedPages[index];

        setStatus(`Converting page ${pageNumber} (${index + 1} of ${selectedPages.length})...`);
        setProgress(Math.round((index / selectedPages.length) * 100));
        setPageStatus(pageNumber, "Rendering");

        try {
          setPageStatus(pageNumber, "Converting");
          const converted = await convertSinglePage(pdf, pageNumber);
          const fileName = `${baseName}-page-${padPage(pageNumber)}.jpg`;

          const result: ConvertedPage = {
            pageNumber,
            fileName,
            url: converted.url,
            size: converted.blob.size,
            width: converted.width,
            height: converted.height,
            status: "Completed",
            error: "",
            blob: converted.blob,
          };

          results.push(result);
          setConvertedPages([...results]);
          setPageStatus(pageNumber, "Completed");
        } catch (pageError) {
          results.push({
            pageNumber,
            fileName: `${baseName}-page-${padPage(pageNumber)}.jpg`,
            url: "",
            size: 0,
            width: 0,
            height: 0,
            status: "Failed",
            error: getFriendlyError(pageError),
            blob: null,
          });

          setConvertedPages([...results]);
          setPageStatus(pageNumber, "Failed", getFriendlyError(pageError));
        }

        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      const failedCount = results.filter((result) => result.status === "Failed").length;
      const successCount = results.filter((result) => result.status === "Completed").length;

      setProgress(100);
      setStatus(
        failedCount
          ? `${failedCount} page(s) failed. ${successCount} page(s) converted successfully.`
          : `Converted ${successCount} page(s) to JPG successfully.`,
      );
    } finally {
      setConverting(false);
    }
  }

  function downloadResult(result: ConvertedPage) {
    if (!result.url) return;

    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.fileName;
    link.click();
  }

  async function downloadZip() {
    const completed = convertedPages.filter((page) => page.status === "Completed" && page.blob);

    if (!completed.length) {
      setError("Convert at least one page before creating a ZIP.");
      return;
    }

    setError("");
    setStatus("Creating ZIP file...");

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      completed.forEach((page) => {
        if (page.blob) zip.file(page.fileName, page.blob);
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${safeBaseName(file?.name || "pdf")}-jpg-pages.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setStatus("ZIP download ready.");
    } catch {
      setError("ZIP generation failed. Try fewer pages or download JPG files individually.");
    }
  }

  async function copySummary() {
    const text = [
      "PDF to JPG conversion summary",
      `File: ${file?.name || "N/A"}`,
      `Pages selected: ${stats.selected}`,
      `Pages converted: ${stats.converted}`,
      `Failed pages: ${stats.failed}`,
      `Total output size: ${formatBytes(stats.totalSize)}`,
      `Quality: ${quality}%`,
      `Scale: ${scale}x`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied("Conversion summary copied.");
    window.setTimeout(() => setCopied(""), 1500);
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF to JPG Converter"
          description="Convert PDF pages to JPG images online. Select pages, adjust quality and resolution, preview results and download individual JPG files or a ZIP."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Upload PDF</h2>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center hover:bg-slate-900"
              >
                <span className="text-4xl font-bold text-blue-300">PDF to JPG</span>
                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">
                  Your PDF is processed locally in your browser. Files are never uploaded to our server.
                </span>
                <input type="file" accept="application/pdf,.pdf" onChange={handleUpload} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(file.size)} - {pageCount || "Loading"} page(s)
                  </p>
                  <p className="mt-1 text-sm text-slate-300">PDF Status: {needsPassword ? "Password required" : pageCount ? "Ready" : "Loading"}</p>
                </div>
              )}

              {needsPassword && file && (
                <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-amber-100">PDF Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => loadPdf(file, password)}
                    className="mt-3 rounded-xl bg-blue-600 px-4 py-2 font-bold"
                  >
                    Unlock PDF
                  </button>
                </div>
              )}

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
                {status}
              </p>

              {(loadingPdf || converting) && (
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Conversion Settings</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Pages</span>
                  <select
                    value={pageMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as PageMode;
                      setPageMode(nextMode);
                      if (nextMode === "all") quickSelect("all");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All Pages</option>
                    <option value="custom">Custom Range / Selected Pages</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Page Range</span>
                  <input
                    value={pageRange}
                    onChange={(event) => {
                      setPageRange(event.target.value);
                      setPageMode("custom");
                    }}
                    placeholder="Example: 1-3,7,10"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">JPG Quality: {quality}%</span>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    className="w-full"
                  />
                  <span className="mt-1 block text-xs text-slate-400">Lower quality = smaller files. Higher quality = better image quality.</span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Resolution Scale</span>
                  <select
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x Recommended</option>
                    <option value={3}>3x High Resolution</option>
                    <option value={4}>4x Very Large</option>
                  </select>
                  <span className="mt-1 block text-xs text-slate-400">Higher scale = higher resolution and larger output.</span>
                </label>
              </div>

              {highOutputWarning && (
                <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">
                  High resolution, high quality or many pages may produce large JPG files and use more browser memory.
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <button type="button" onClick={() => quickSelect("all")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">All Pages</button>
                <button type="button" onClick={() => quickSelect("none")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">None</button>
                <button type="button" onClick={() => quickSelect("first")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">First Page</button>
                <button type="button" onClick={() => quickSelect("last")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">Last Page</button>
                <button type="button" onClick={() => quickSelect("odd")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">Odd Pages</button>
                <button type="button" onClick={() => quickSelect("even")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">Even Pages</button>
                <button type="button" onClick={() => quickSelect("first5")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">First 5</button>
                <button type="button" onClick={() => quickSelect("custom")} className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold">Apply Range</button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={convertSelectedPages}>Convert Selected Pages</Button>
                <Button onClick={downloadZip} variant="secondary">Download ZIP</Button>
                <Button onClick={clearResults} variant="secondary">Clear Results</Button>
                <Button onClick={() => reset()} variant="danger">Reset</Button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Page Preview / Selection</h2>

              {pages.length ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {pages.map((page) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      onClick={() => togglePage(page.pageNumber)}
                      className={`rounded-2xl border p-3 text-left transition ${
                        page.selected ? "border-blue-500 bg-blue-950/50" : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                      }`}
                      aria-label={`Toggle page ${page.pageNumber}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">Page {page.pageNumber}</span>
                        <input type="checkbox" checked={page.selected} readOnly aria-label={`Page ${page.pageNumber} selected`} />
                      </div>

                      <div className="mt-3 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                        {page.thumbnailUrl ? (
                          <img src={page.thumbnailUrl} alt={`PDF page ${page.pageNumber} preview`} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-sm text-slate-400">Loading...</span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-300">
                        {page.width && page.height ? `${page.width} x ${page.height}` : "Dimensions loading"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-blue-200">{page.status}</p>
                      {page.error && <p className="mt-1 text-xs text-red-200">{page.error}</p>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                  Page thumbnails will appear after upload.
                </div>
              )}
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Output Statistics</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Selected pages" value={stats.selected} />
                <Stat label="Converted" value={stats.converted} />
                <Stat label="Failed" value={stats.failed} />
                <Stat label="Total output" value={formatBytes(stats.totalSize)} />
                <Stat label="Average JPG" value={formatBytes(stats.averageSize)} />
                <Stat label="Largest JPG" value={formatBytes(stats.largest)} />
                <Stat label="Smallest JPG" value={formatBytes(stats.smallest)} />
                <Stat label="Quality" value={`${quality}%`} />
                <Stat label="Scale" value={`${scale}x`} />
              </div>

              <button
                type="button"
                onClick={copySummary}
                className="mt-4 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold"
              >
                Copy Summary
              </button>
            </ToolCard>

            <ToolCard>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">Conversion Results</h2>
                <button
                  type="button"
                  onClick={downloadZip}
                  disabled={!convertedPages.some((page) => page.status === "Completed")}
                  className="rounded-xl bg-blue-600 px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Download All as ZIP
                </button>
              </div>

              {convertedPages.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {convertedPages.map((result) => (
                    <div key={`${result.pageNumber}-${result.fileName}`} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">Page {result.pageNumber}</p>
                          <p className="mt-1 text-sm text-slate-300">{result.status}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadResult(result)}
                          disabled={!result.url}
                          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Download JPG
                        </button>
                      </div>

                      <div className="mt-3 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                        {result.url ? (
                          <img src={result.url} alt={`Converted JPG page ${result.pageNumber}`} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-sm text-red-200">{result.error || "Failed"}</span>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-slate-300">
                        {result.width && result.height ? `${result.width} x ${result.height}` : "No dimensions"} - {formatBytes(result.size)}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-400">{result.fileName}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                  Converted JPG files will appear here.
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">How to Convert PDF to JPG</h2>
              <p className="text-slate-300">
                Upload a PDF, select all pages or enter a range such as 1-3,7,10, choose JPG quality and scale, then convert. You can download each JPG separately or download all converted pages as a ZIP file.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Privacy</h2>
              <p className="text-slate-300">
                Your PDF is processed locally in your browser using PDF.js and browser image export. ToolMint does not upload your PDF to a server for conversion.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">FAQ</h2>
              <div className="space-y-3 text-slate-300">
                <p><strong className="text-white">Can I convert selected PDF pages?</strong><br />Yes. Use quick selection or a page range like 2,5,8-10.</p>
                <p><strong className="text-white">Can I choose JPG quality?</strong><br />Yes. The quality slider controls the browser JPEG encoder.</p>
                <p><strong className="text-white">Are my PDFs uploaded?</strong><br />No. Conversion runs locally in your browser.</p>
                <p><strong className="text-white">Why can high scale fail?</strong><br />Very large canvas sizes can exceed browser memory limits. Lower the scale if needed.</p>
              </div>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
    </div>
  );
}