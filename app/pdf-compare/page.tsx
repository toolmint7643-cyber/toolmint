"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type PdfSide = "a" | "b";
type CompareMode = "quick" | "text" | "visual" | "full";
type FilterMode = "all" | "changed" | "unchanged" | "added" | "removed" | "text" | "visual" | "no-text";
type PageStatus = "Unchanged" | "Modified" | "Added" | "Removed" | "Unable to compare";
type SignalStatus = "Same" | "Changed" | "Added" | "Removed" | "No extractable text" | "Not checked" | "Unable";

type PdfInfo = {
  file: File;
  buffer: ArrayBuffer;
  hash: string;
  pageCount: number;
  size: number;
  metadata: Record<string, string>;
  dimensions: PageDimension[];
  textPages: TextPage[];
};

type PageDimension = {
  pageNumber: number;
  width: number;
  height: number;
  orientation: "Portrait" | "Landscape" | "Square";
};

type TextPage = {
  pageNumber: number;
  text: string;
  lines: string[];
  hasText: boolean;
};

type VisualResult = {
  checked: boolean;
  differencePercent: number | null;
  previewA: string;
  previewB: string;
  diffPreview: string;
  width: number;
  height: number;
  error: string;
};

type PageCompare = {
  pageNumber: number;
  status: PageStatus;
  textStatus: SignalStatus;
  visualStatus: SignalStatus;
  removedLines: string[];
  addedLines: string[];
  aText: string;
  bText: string;
  visual: VisualResult;
};

type CompareResult = {
  pages: PageCompare[];
  metadataChanges: string[];
  summary: {
    pageCountA: number;
    pageCountB: number;
    unchanged: number;
    modified: number;
    added: number;
    removed: number;
    textChanges: number;
    visualChanges: number;
    noExtractableText: number;
    metadataChanges: number;
    identicalHash: boolean;
  };
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function cleanText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLines(text: string) {
  return cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeLine(line: string) {
  return line.toLowerCase().replace(/\s+/g, " ").trim();
}

function getOrientation(width: number, height: number): PageDimension["orientation"] {
  if (Math.abs(width - height) < 1) return "Square";
  return width > height ? "Landscape" : "Portrait";
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is encrypted or password-protected and cannot be compared in the current browser-side mode.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("pdf")) {
    return "This PDF could not be opened. It may be corrupted, unsupported, encrypted, or not a valid PDF file.";
  }

  if (message.includes("canvas") || message.includes("memory") || message.includes("allocation")) {
    return "Visual comparison needs too much browser memory. Try Quick Compare or Text Compare.";
  }

  return "PDF comparison failed. Try another PDF or use a lighter comparison mode.";
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer.slice(0));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function loadPdfInfo(file: File, status: (message: string) => void): Promise<PdfInfo> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please upload a valid PDF file.");
  }

  status(`Reading ${file.name}...`);

  const buffer = await file.arrayBuffer();
  const [hash, pdfDoc] = await Promise.all([
    sha256(buffer),
    PDFDocument.load(buffer.slice(0), { ignoreEncryption: false }),
  ]);

  const metadata: Record<string, string> = {
    Title: pdfDoc.getTitle() || "Unavailable",
    Author: pdfDoc.getAuthor() || "Unavailable",
    Subject: pdfDoc.getSubject() || "Unavailable",
    Keywords: pdfDoc.getKeywords() || "Unavailable",
    Creator: pdfDoc.getCreator() || "Unavailable",
    Producer: pdfDoc.getProducer() || "Unavailable",
    "Creation Date": pdfDoc.getCreationDate()?.toISOString() || "Unavailable",
    "Modification Date": pdfDoc.getModificationDate()?.toISOString() || "Unavailable",
  };

  const dimensions = pdfDoc.getPages().map((page, index) => {
    const size = page.getSize();
    return {
      pageNumber: index + 1,
      width: Math.round(size.width),
      height: Math.round(size.height),
      orientation: getOrientation(size.width, size.height),
    };
  });

  status(`Extracting text from ${file.name}...`);

  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false });
  const pdf = await task.promise;
  const textPages: TextPage[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    status(`Extracting text from ${file.name}: page ${pageNumber} of ${pdf.numPages}...`);

    try {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = cleanText(
        content.items
          .map((item: unknown) => {
            const maybe = item as { str?: string };
            return maybe.str || "";
          })
          .join(" "),
      );

      textPages.push({
        pageNumber,
        text,
        lines: splitLines(text),
        hasText: text.length > 0,
      });
    } catch {
      textPages.push({
        pageNumber,
        text: "",
        lines: [],
        hasText: false,
      });
    }

    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  return {
    file,
    buffer,
    hash,
    pageCount: pdfDoc.getPageCount(),
    size: file.size,
    metadata,
    dimensions,
    textPages,
  };
}

function compareLines(aLines: string[], bLines: string[]) {
  const aMap = new Map<string, number>();
  const bMap = new Map<string, number>();

  aLines.forEach((line) => {
    const key = normalizeLine(line);
    aMap.set(key, (aMap.get(key) || 0) + 1);
  });

  bLines.forEach((line) => {
    const key = normalizeLine(line);
    bMap.set(key, (bMap.get(key) || 0) + 1);
  });

  const removed: string[] = [];
  const added: string[] = [];

  aLines.forEach((line) => {
    const key = normalizeLine(line);
    const bCount = bMap.get(key) || 0;

    if (bCount <= 0) {
      removed.push(line);
    } else {
      bMap.set(key, bCount - 1);
    }
  });

  bLines.forEach((line) => {
    const key = normalizeLine(line);
    const aCount = aMap.get(key) || 0;

    if (aCount <= 0) {
      added.push(line);
    } else {
      aMap.set(key, aCount - 1);
    }
  });

  return { removed, added };
}

function compareMetadata(a: PdfInfo, b: PdfInfo) {
  const changes: string[] = [];

  Object.keys(a.metadata).forEach((key) => {
    const aValue = a.metadata[key] || "Unavailable";
    const bValue = b.metadata[key] || "Unavailable";

    if (aValue !== bValue) {
      changes.push(`${key}: ${aValue} -> ${bValue}`);
    }
  });

  if (a.pageCount !== b.pageCount) {
    changes.push(`Page count: ${a.pageCount} -> ${b.pageCount}`);
  }

  if (a.size !== b.size) {
    changes.push(`File size: ${formatBytes(a.size)} -> ${formatBytes(b.size)}`);
  }

  const maxPages = Math.max(a.dimensions.length, b.dimensions.length);

  for (let index = 0; index < maxPages; index += 1) {
    const aDim = a.dimensions[index];
    const bDim = b.dimensions[index];

    if (!aDim || !bDim) continue;

    if (aDim.width !== bDim.width || aDim.height !== bDim.height || aDim.orientation !== bDim.orientation) {
      changes.push(
        `Page ${index + 1} dimensions/orientation: ${aDim.width}x${aDim.height} ${aDim.orientation} -> ${bDim.width}x${bDim.height} ${bDim.orientation}`,
      );
    }
  }

  return changes;
}

async function renderPagePreview(buffer: ArrayBuffer, pageNumber: number, maxWidth = 520) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false }).promise;
  const page = await pdf.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(1.3, maxWidth / baseViewport.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("Canvas rendering failed.");

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvas, canvasContext: context, viewport }).promise;

  return canvas;
}

function compareCanvases(canvasA: HTMLCanvasElement, canvasB: HTMLCanvasElement) {
  const width = Math.min(canvasA.width, canvasB.width);
  const height = Math.min(canvasA.height, canvasB.height);
  const normalizedA = document.createElement("canvas");
  const normalizedB = document.createElement("canvas");
  const diffCanvas = document.createElement("canvas");

  normalizedA.width = width;
  normalizedA.height = height;
  normalizedB.width = width;
  normalizedB.height = height;
  diffCanvas.width = width;
  diffCanvas.height = height;

  const ctxA = normalizedA.getContext("2d", { willReadFrequently: true });
  const ctxB = normalizedB.getContext("2d", { willReadFrequently: true });
  const diffCtx = diffCanvas.getContext("2d", { willReadFrequently: true });

  if (!ctxA || !ctxB || !diffCtx) throw new Error("Canvas comparison failed.");

  ctxA.drawImage(canvasA, 0, 0, width, height);
  ctxB.drawImage(canvasB, 0, 0, width, height);
  diffCtx.drawImage(normalizedB, 0, 0);

  const imageA = ctxA.getImageData(0, 0, width, height);
  const imageB = ctxB.getImageData(0, 0, width, height);
  const diff = diffCtx.getImageData(0, 0, width, height);

  let changed = 0;
  const threshold = 35;

  for (let index = 0; index < imageA.data.length; index += 4) {
    const delta =
      Math.abs(imageA.data[index] - imageB.data[index]) +
      Math.abs(imageA.data[index + 1] - imageB.data[index + 1]) +
      Math.abs(imageA.data[index + 2] - imageB.data[index + 2]);

    if (delta > threshold) {
      changed += 1;
      diff.data[index] = 255;
      diff.data[index + 1] = 40;
      diff.data[index + 2] = 40;
      diff.data[index + 3] = 180;
    }
  }

  diffCtx.putImageData(diff, 0, 0);

  const differencePercent = (changed / (width * height)) * 100;

  const previewA = normalizedA.toDataURL("image/png");
  const previewB = normalizedB.toDataURL("image/png");
  const diffPreview = diffCanvas.toDataURL("image/png");

  canvasA.width = 0;
  canvasA.height = 0;
  canvasB.width = 0;
  canvasB.height = 0;
  normalizedA.width = 0;
  normalizedA.height = 0;
  normalizedB.width = 0;
  normalizedB.height = 0;
  diffCanvas.width = 0;
  diffCanvas.height = 0;

  return {
    differencePercent,
    previewA,
    previewB,
    diffPreview,
    width,
    height,
  };
}

function emptyVisual(): VisualResult {
  return {
    checked: false,
    differencePercent: null,
    previewA: "",
    previewB: "",
    diffPreview: "",
    width: 0,
    height: 0,
    error: "",
  };
}

export default function PdfComparePage() {
  const [pdfA, setPdfA] = useState<PdfInfo | null>(null);
  const [pdfB, setPdfB] = useState<PdfInfo | null>(null);
  const [mode, setMode] = useState<CompareMode>("quick");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [status, setStatus] = useState("Upload two PDFs to compare document structure, extractable text and visual differences.");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [loading, setLoading] = useState(false);

  const shouldDoText = mode === "quick" || mode === "text" || mode === "full";
  const shouldDoVisual = mode === "visual" || mode === "full";

  const filteredPages = useMemo(() => {
    if (!result) return [];

    const query = search.trim().toLowerCase();

    return result.pages.filter((page) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "changed" && page.status === "Modified") ||
        (filter === "unchanged" && page.status === "Unchanged") ||
        (filter === "added" && page.status === "Added") ||
        (filter === "removed" && page.status === "Removed") ||
        (filter === "text" && page.textStatus === "Changed") ||
        (filter === "visual" && page.visualStatus === "Changed") ||
        (filter === "no-text" && page.textStatus === "No extractable text");

      const haystack = [...page.addedLines, ...page.removedLines, page.aText, page.bText].join(" ").toLowerCase();
      const matchesSearch = !query || haystack.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, result, search]);

  async function handleFile(side: PdfSide, file: File) {
    setError("");
    setCopied("");
    setResult(null);
    setLoading(true);
    setProgress(0);

    try {
      const info = await loadPdfInfo(file, setStatus);

      if (side === "a") {
        setPdfA(info);
      } else {
        setPdfB(info);
      }

      setStatus(`${file.name} loaded. Upload the other PDF or start comparison.`);
      setProgress(100);
    } catch (loadError) {
      setError(getFriendlyError(loadError));
      setStatus("PDF loading failed.");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }

  function onInput(side: PdfSide, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) handleFile(side, file);
    event.target.value = "";
  }

  function onDrop(side: PdfSide, event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(side, file);
  }

  async function runCompare() {
    if (!pdfA || !pdfB) {
      setError("Upload both PDF A and PDF B before comparing.");
      return;
    }

    setLoading(true);
    setError("");
    setCopied("");
    setResult(null);
    setProgress(0);

    try {
      const identicalHash = pdfA.hash === pdfB.hash;
      const metadataChanges = compareMetadata(pdfA, pdfB);
      const maxPages = Math.max(pdfA.pageCount, pdfB.pageCount);
      const pages: PageCompare[] = [];

      setStatus("Analyzing document structure...");
      setProgress(10);

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
        const aText = pdfA.textPages[pageNumber - 1];
        const bText = pdfB.textPages[pageNumber - 1];
        const pageProgress = 10 + Math.round((pageNumber / maxPages) * 75);

        setStatus(`Comparing page ${pageNumber} of ${maxPages}...`);
        setProgress(pageProgress);

        let statusPage: PageStatus = "Unchanged";
        let textStatus: SignalStatus = shouldDoText ? "Same" : "Not checked";
        let visualStatus: SignalStatus = shouldDoVisual ? "Same" : "Not checked";
        let removedLines: string[] = [];
        let addedLines: string[] = [];
        let visual = emptyVisual();

        if (!aText && bText) {
          statusPage = "Added";
          textStatus = bText.hasText ? "Added" : "No extractable text";
        } else if (aText && !bText) {
          statusPage = "Removed";
          textStatus = aText.hasText ? "Removed" : "No extractable text";
        } else if (!aText || !bText) {
          statusPage = "Unable to compare";
          textStatus = "Unable";
        } else {
          if (shouldDoText) {
            if (!aText.hasText && !bText.hasText) {
              textStatus = "No extractable text";
            } else if (!aText.hasText || !bText.hasText) {
              textStatus = "No extractable text";
              statusPage = "Modified";
            } else {
              const diff = compareLines(aText.lines, bText.lines);
              removedLines = diff.removed;
              addedLines = diff.added;

              if (removedLines.length || addedLines.length) {
                textStatus = "Changed";
                statusPage = "Modified";
              }
            }
          }

          if (shouldDoVisual) {
            try {
              const [canvasA, canvasB] = await Promise.all([
                renderPagePreview(pdfA.buffer, pageNumber),
                renderPagePreview(pdfB.buffer, pageNumber),
              ]);

              const compared = compareCanvases(canvasA, canvasB);

              visual = {
                checked: true,
                differencePercent: compared.differencePercent,
                previewA: compared.previewA,
                previewB: compared.previewB,
                diffPreview: compared.diffPreview,
                width: compared.width,
                height: compared.height,
                error: "",
              };

              if (compared.differencePercent > 0.25) {
                visualStatus = "Changed";
                statusPage = statusPage === "Unchanged" ? "Modified" : statusPage;
              }
            } catch (visualError) {
              visualStatus = "Unable";
              visual = {
                ...emptyVisual(),
                checked: true,
                error: getFriendlyError(visualError),
              };
            }
          }
        }

        pages.push({
          pageNumber,
          status: statusPage,
          textStatus,
          visualStatus,
          removedLines,
          addedLines,
          aText: aText?.text || "",
          bText: bText?.text || "",
          visual,
        });

        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      const summary = {
        pageCountA: pdfA.pageCount,
        pageCountB: pdfB.pageCount,
        unchanged: pages.filter((page) => page.status === "Unchanged").length,
        modified: pages.filter((page) => page.status === "Modified").length,
        added: pages.filter((page) => page.status === "Added").length,
        removed: pages.filter((page) => page.status === "Removed").length,
        textChanges: pages.filter((page) => page.textStatus === "Changed" || page.textStatus === "Added" || page.textStatus === "Removed").length,
        visualChanges: pages.filter((page) => page.visualStatus === "Changed").length,
        noExtractableText: pages.filter((page) => page.textStatus === "No extractable text").length,
        metadataChanges: metadataChanges.length,
        identicalHash,
      };

      setResult({ pages, metadataChanges, summary });
      setSelectedPage(1);
      setStatus(identicalHash ? "Comparison completed. These files have the same SHA-256 hash." : "Comparison completed.");
      setProgress(100);
    } catch (compareError) {
      setError(getFriendlyError(compareError));
      setStatus("Comparison failed.");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }

  function downloadReport() {
    if (!result || !pdfA || !pdfB) {
      setError("Run a comparison before downloading the report.");
      return;
    }

    const report = {
      tool: "ToolMint PDF Compare",
      generatedAt: new Date().toISOString(),
      pdfA: {
        name: pdfA.file.name,
        size: pdfA.size,
        hash: pdfA.hash,
        pageCount: pdfA.pageCount,
        metadata: pdfA.metadata,
        dimensions: pdfA.dimensions,
      },
      pdfB: {
        name: pdfB.file.name,
        size: pdfB.size,
        hash: pdfB.hash,
        pageCount: pdfB.pageCount,
        metadata: pdfB.metadata,
        dimensions: pdfB.dimensions,
      },
      summary: result.summary,
      metadataChanges: result.metadataChanges,
      pages: result.pages.map((page) => ({
        pageNumber: page.pageNumber,
        status: page.status,
        textStatus: page.textStatus,
        visualStatus: page.visualStatus,
        visualDifferencePercent: page.visual.differencePercent,
        addedLines: page.addedLines,
        removedLines: page.removedLines,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "toolmint-pdf-compare-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copySummary() {
    if (!result) return;

    const text = [
      "PDF Compare Summary",
      `Pages: ${result.summary.pageCountA} vs ${result.summary.pageCountB}`,
      `Unchanged pages: ${result.summary.unchanged}`,
      `Modified pages: ${result.summary.modified}`,
      `Added pages: ${result.summary.added}`,
      `Removed pages: ${result.summary.removed}`,
      `Text changes: ${result.summary.textChanges}`,
      `Visual changes: ${result.summary.visualChanges}`,
      `Pages without extractable text: ${result.summary.noExtractableText}`,
      `Metadata changes: ${result.summary.metadataChanges}`,
      `Same file hash: ${result.summary.identicalHash ? "Yes" : "No"}`,
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied("Comparison summary copied.");
    window.setTimeout(() => setCopied(""), 1500);
  }

  const selectedPageResult = result?.pages.find((page) => page.pageNumber === selectedPage);

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Compare"
          description="Compare two PDF files in your browser. Analyze page counts, metadata, extractable text and visual page differences without uploading files."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Upload PDFs</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <UploadBox
                  label="PDF A - Original"
                  file={pdfA?.file || null}
                  onInput={(event) => onInput("a", event)}
                  onDrop={(event) => onDrop("a", event)}
                />
                <UploadBox
                  label="PDF B - Comparison"
                  file={pdfB?.file || null}
                  onInput={(event) => onInput("b", event)}
                  onDrop={(event) => onDrop("b", event)}
                />
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
                {status}
              </p>

              {loading && (
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Comparison Mode</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["quick", "Quick Compare", "Document analysis and basic text comparison."],
                  ["text", "Text Compare", "Detailed extractable text comparison."],
                  ["visual", "Visual Compare", "Rendered page pixel comparison."],
                  ["full", "Full Compare", "Document, text and visual comparison."],
                ].map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value as CompareMode)}
                    className={`rounded-xl border p-4 text-left font-bold ${
                      mode === value ? "border-blue-500 bg-blue-600" : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    {label}
                    <span className="mt-2 block text-xs font-medium text-slate-200">{description}</span>
                  </button>
                ))}
              </div>

              {(mode === "visual" || mode === "full") && (
                <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">
                  Visual comparison renders pages and compares pixels. Large PDFs may use significant CPU and RAM.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={runCompare}>Compare PDFs</Button>
                <Button onClick={downloadReport} variant="secondary">Download JSON Report</Button>
                <Button onClick={copySummary} variant="secondary">Copy Summary</Button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Document Analysis</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <PdfInfoCard title="PDF A" info={pdfA} />
                <PdfInfoCard title="PDF B" info={pdfB} />
              </div>
            </ToolCard>

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Filters</h2>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Filter results</span>
                    <select
                      value={filter}
                      onChange={(event) => setFilter(event.target.value as FilterMode)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="changed">Changed</option>
                      <option value="unchanged">Unchanged</option>
                      <option value="added">Added</option>
                      <option value="removed">Removed</option>
                      <option value="text">Text Changed</option>
                      <option value="visual">Visual Changed</option>
                      <option value="no-text">No Extractable Text</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Search differences</span>
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search added or removed text..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Page-by-Page Report</h2>

                <div className="space-y-3">
                  {filteredPages.map((page) => (
                    <button
                      key={page.pageNumber}
                      type="button"
                      onClick={() => setSelectedPage(page.pageNumber)}
                      className={`w-full rounded-2xl border p-4 text-left ${
                        selectedPage === page.pageNumber ? "border-blue-500 bg-blue-950/50" : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      <div className="grid gap-2 sm:grid-cols-4">
                        <span className="font-bold">Page {page.pageNumber}</span>
                        <span>Status: {page.status}</span>
                        <span>Text: {page.textStatus}</span>
                        <span>
                          Visual:{" "}
                          {page.visual.differencePercent === null
                            ? page.visualStatus
                            : `${page.visualStatus} (${page.visual.differencePercent.toFixed(2)}%)`}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ToolCard>
            )}
          </div>

          <div className="space-y-6">
            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">PDF Compare Result</h2>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Stat label="Pages" value={`${result.summary.pageCountA} vs ${result.summary.pageCountB}`} />
                  <Stat label="Unchanged" value={result.summary.unchanged} />
                  <Stat label="Modified" value={result.summary.modified} />
                  <Stat label="Added" value={result.summary.added} />
                  <Stat label="Removed" value={result.summary.removed} />
                  <Stat label="Text changes" value={result.summary.textChanges} />
                  <Stat label="Visual changes" value={result.summary.visualChanges} />
                  <Stat label="No text pages" value={result.summary.noExtractableText} />
                  <Stat label="Metadata changes" value={result.summary.metadataChanges} />
                </div>

                {result.summary.identicalHash && (
                  <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">
                    These files have the same SHA-256 hash, so the uploaded PDF bytes appear identical.
                  </p>
                )}
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Metadata Changes</h2>

                {result.metadataChanges.length ? (
                  <div className="space-y-2">
                    {result.metadataChanges.map((change) => (
                      <p key={change} className="rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                        {change}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                    No metadata/page-count/dimension changes were detected by the browser-side comparison.
                  </p>
                )}
              </ToolCard>
            )}

            {selectedPageResult && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Selected Page Detail</h2>

                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="font-bold">Page {selectedPageResult.pageNumber}</p>
                  <p className="mt-1 text-sm text-slate-300">Status: {selectedPageResult.status}</p>
                  <p className="mt-1 text-sm text-slate-300">Text: {selectedPageResult.textStatus}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Rendered page difference:{" "}
                    {selectedPageResult.visual.differencePercent === null
                      ? selectedPageResult.visualStatus
                      : `${selectedPageResult.visual.differencePercent.toFixed(2)}%`}
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextDiff title="Removed from PDF A" lines={selectedPageResult.removedLines} />
                  <TextDiff title="Added in PDF B" lines={selectedPageResult.addedLines} />
                </div>

                {selectedPageResult.visual.checked && selectedPageResult.visual.previewA && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    <Preview title="PDF A" src={selectedPageResult.visual.previewA} />
                    <Preview title="PDF B" src={selectedPageResult.visual.previewB} />
                    <Preview title="Difference View" src={selectedPageResult.visual.diffPreview} />
                  </div>
                )}

                {selectedPageResult.visual.error && (
                  <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
                    {selectedPageResult.visual.error}
                  </p>
                )}
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">What is PDF Comparison?</h2>
              <p className="text-slate-300">
                PDF comparison checks two documents across separate layers: document structure, extractable text and rendered visual appearance. These signals can differ, so ToolMint reports them separately.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Text vs Visual Comparison</h2>
              <p className="text-slate-300">
                Text comparison detects changes in extractable PDF text. Visual comparison renders pages and compares pixels, so layout, images, fonts or graphics can show visual changes even when extracted text is the same.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Privacy</h2>
              <p className="text-slate-300">
                Your PDFs are processed locally in your browser. Files are not uploaded to our server, and no external PDF comparison API is used.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Limitations</h2>
              <p className="text-slate-300">
                This tool does not perform OCR. If a scanned PDF has no extractable text, text comparison may be unavailable, while visual comparison can still detect rendered differences. Same-index page comparison is used; it does not invent shifted page matching.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function UploadBox({
  label,
  file,
  onInput,
  onDrop,
}: {
  label: string;
  file: File | null;
  onInput: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
}) {
  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="flex cursor-pointer flex-col justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-6 text-center hover:bg-slate-900"
    >
      <span className="text-lg font-bold">{label}</span>
      <span className="mt-2 text-sm text-slate-300">Drop PDF or choose file</span>
      {file && (
        <span className="mt-3 break-all rounded-xl bg-slate-950 p-3 text-sm text-blue-100">
          {file.name} - {formatBytes(file.size)}
        </span>
      )}
      <input type="file" accept="application/pdf,.pdf" onChange={onInput} className="sr-only" />
    </label>
  );
}

function PdfInfoCard({ title, info }: { title: string; info: PdfInfo | null }) {
  if (!info) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-slate-300">
        {title} not loaded.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-2 break-all text-sm text-slate-300">{info.file.name}</p>
      <p className="mt-1 text-sm text-slate-300">Size: {formatBytes(info.size)}</p>
      <p className="mt-1 text-sm text-slate-300">Pages: {info.pageCount}</p>
      <p className="mt-1 break-all text-xs text-slate-400">SHA-256: {info.hash}</p>
      <div className="mt-3 max-h-40 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
        {info.dimensions.map((dim) => (
          <p key={dim.pageNumber}>
            Page {dim.pageNumber}: {dim.width} x {dim.height} - {dim.orientation}
          </p>
        ))}
      </div>
    </div>
  );
}

function TextDiff({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="font-bold">{title}</h3>
      {lines.length ? (
        <div className="mt-3 max-h-56 overflow-auto space-y-2">
          {lines.map((line, index) => (
            <p key={`${line}-${index}`} className="rounded-xl bg-slate-950 p-3 text-sm text-slate-200">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-300">No line-level changes detected here.</p>
      )}
    </div>
  );
}

function Preview({ title, src }: { title: string; src: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3">
      <h3 className="mb-3 font-bold">{title}</h3>
      <img src={src} alt={`${title} preview`} className="max-h-96 w-full rounded-xl object-contain" />
    </div>
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