"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument, PDFPage, rgb } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type PageSizeMode = "a3" | "a4" | "a5" | "a6" | "letter" | "legal" | "tabloid" | "executive" | "custom";
type OrientationMode = "portrait" | "landscape" | "auto" | "preserve";
type FitMode = "fit" | "fill" | "center" | "stretch";
type Unit = "mm" | "cm" | "in" | "pt";
type PageMode = "all" | "range" | "custom";
type BackgroundMode = "white" | "custom" | "none";

type PageInfo = {
  page: number;
  width: number;
  height: number;
  thumbUrl: string;
};

type OutputFile = {
  name: string;
  size: string;
  url: string;
};

const pagePresets: Record<Exclude<PageSizeMode, "custom">, { label: string; width: number; height: number }> = {
  a3: { label: "A3", width: 841.89, height: 1190.55 },
  a4: { label: "A4", width: 595.28, height: 841.89 },
  a5: { label: "A5", width: 419.53, height: 595.28 },
  a6: { label: "A6", width: 297.64, height: 419.53 },
  letter: { label: "Letter", width: 612, height: 792 },
  legal: { label: "Legal", width: 612, height: 1008 },
  tabloid: { label: "Tabloid", width: 792, height: 1224 },
  executive: { label: "Executive", width: 522, height: 756 },
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function cleanFileName(name: string) {
  return name.replace(/\.pdf$/i, "");
}

function createPdfBlob(bytes: Uint8Array) {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
}

function toPoints(value: number, unit: Unit) {
  if (unit === "mm") return value * 2.83465;
  if (unit === "cm") return value * 28.3465;
  if (unit === "in") return value * 72;
  return value;
}

function fromPoints(value: number, unit: Unit) {
  if (unit === "mm") return value / 2.83465;
  if (unit === "cm") return value / 28.3465;
  if (unit === "in") return value / 72;
  return value;
}

function parseColor(hex: string) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;

  const value = Number.parseInt(full, 16);

  if (Number.isNaN(value) || full.length !== 6) return rgb(1, 1, 1);

  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function applyOrientation(size: { width: number; height: number }, orientation: OrientationMode, original: { width: number; height: number }) {
  const originalLandscape = original.width >= original.height;

  if (orientation === "landscape") {
    return { width: Math.max(size.width, size.height), height: Math.min(size.width, size.height) };
  }

  if (orientation === "auto" || orientation === "preserve") {
    return originalLandscape
      ? { width: Math.max(size.width, size.height), height: Math.min(size.width, size.height) }
      : { width: Math.min(size.width, size.height), height: Math.max(size.width, size.height) };
  }

  return { width: Math.min(size.width, size.height), height: Math.max(size.width, size.height) };
}

function parsePages(value: string, totalPages: number) {
  const selected = new Set<number>();
  const invalidParts: string[] = [];
  const outOfRange: number[] = [];

  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.includes("-")) {
        const [startRaw, endRaw] = part.split("-");
        const start = Number(startRaw);
        const end = Number(endRaw);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
          invalidParts.push(part);
          return;
        }

        for (let page = Math.min(start, end); page <= Math.max(start, end); page += 1) {
          if (page > totalPages) outOfRange.push(page);
          else selected.add(page);
        }

        return;
      }

      const page = Number(part);

      if (!Number.isInteger(page) || page < 1) {
        invalidParts.push(part);
        return;
      }

      if (page > totalPages) outOfRange.push(page);
      else selected.add(page);
    });

  return {
    pages: Array.from(selected).sort((a, b) => a - b),
    invalidParts,
    outOfRange: Array.from(new Set(outOfRange)).sort((a, b) => a - b),
  };
}

async function renderPdfPages(file: File) {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const pages: PageInfo[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const fullViewport = page.getViewport({ scale: 1 });
    const previewViewport = page.getViewport({ scale: 0.24 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

    canvas.width = Math.ceil(previewViewport.width);
    canvas.height = Math.ceil(previewViewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport: previewViewport,
    }).promise;

    pages.push({
      page: pageNumber,
      width: fullViewport.width,
      height: fullViewport.height,
      thumbUrl: canvas.toDataURL("image/jpeg", 0.72),
    });
  }

  return pages;
}

function getDrawBox({
  fitMode,
  original,
  target,
  margins,
}: {
  fitMode: FitMode;
  original: { width: number; height: number };
  target: { width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
}) {
  const usableWidth = Math.max(1, target.width - margins.left - margins.right);
  const usableHeight = Math.max(1, target.height - margins.top - margins.bottom);

  if (fitMode === "stretch") {
    return {
      x: margins.left,
      y: margins.bottom,
      width: usableWidth,
      height: usableHeight,
    };
  }

  if (fitMode === "center") {
    return {
      x: margins.left + usableWidth / 2 - original.width / 2,
      y: margins.bottom + usableHeight / 2 - original.height / 2,
      width: original.width,
      height: original.height,
    };
  }

  const scale =
    fitMode === "fill"
      ? Math.max(usableWidth / original.width, usableHeight / original.height)
      : Math.min(usableWidth / original.width, usableHeight / original.height);

  const width = original.width * scale;
  const height = original.height * scale;

  return {
    x: margins.left + usableWidth / 2 - width / 2,
    y: margins.bottom + usableHeight / 2 - height / 2,
    width,
    height,
  };
}

export default function PdfPageSizeConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("all");
  const [pageRange, setPageRange] = useState("1-5");
  const [customPages, setCustomPages] = useState("1,3,7");
  const [sizeMode, setSizeMode] = useState<PageSizeMode>("a4");
  const [orientation, setOrientation] = useState<OrientationMode>("auto");
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [unit, setUnit] = useState<Unit>("mm");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [linkedMargins, setLinkedMargins] = useState(true);
  const [marginAll, setMarginAll] = useState("10");
  const [marginTop, setMarginTop] = useState("10");
  const [marginRight, setMarginRight] = useState("10");
  const [marginBottom, setMarginBottom] = useState("10");
  const [marginLeft, setMarginLeft] = useState("10");
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("white");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [output, setOutput] = useState<OutputFile | null>(null);
  const [status, setStatus] = useState("Upload a PDF to convert page size.");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const firstPage = pages[0];
  const affectedPages = useMemo(() => {
    if (!pages.length) return [];

    if (pageMode === "all") {
      return pages.map((page) => page.page);
    }

    const parsed = parsePages(pageMode === "range" ? pageRange : customPages, pages.length);
    return parsed.pages;
  }, [customPages, pageMode, pageRange, pages]);

  const affectedSet = useMemo(() => new Set(affectedPages), [affectedPages]);

  function getBaseTargetSize() {
    if (sizeMode === "custom") {
      const width = Number(customWidth);
      const height = Number(customHeight);

      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error("Please enter valid custom width and height.");
      }

      return {
        width: toPoints(width, unit),
        height: toPoints(height, unit),
      };
    }

    return pagePresets[sizeMode];
  }

  function getMargins() {
    const top = linkedMargins ? Number(marginAll) : Number(marginTop);
    const right = linkedMargins ? Number(marginAll) : Number(marginRight);
    const bottom = linkedMargins ? Number(marginAll) : Number(marginBottom);
    const left = linkedMargins ? Number(marginAll) : Number(marginLeft);

    if ([top, right, bottom, left].some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Please enter valid margin values.");
    }

    return {
      top: toPoints(top, unit),
      right: toPoints(right, unit),
      bottom: toPoints(bottom, unit),
      left: toPoints(left, unit),
    };
  }

  const preview = useMemo(() => {
    if (!firstPage) return null;

    try {
      const base = getBaseTargetSize();
      const target = applyOrientation(base, orientation, firstPage);
      const margins = getMargins();
      const drawBox = getDrawBox({
        fitMode,
        original: firstPage,
        target,
        margins,
      });

      return { target, drawBox, margins };
    } catch {
      return null;
    }
  }, [
    backgroundColor,
    customHeight,
    customWidth,
    firstPage,
    fitMode,
    linkedMargins,
    marginAll,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    orientation,
    sizeMode,
    unit,
  ]);

  function clearOutput() {
    if (output?.url) URL.revokeObjectURL(output.url);
    setOutput(null);
  }

  async function loadPdf(selectedFile: File) {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      setStatus("Reading PDF and rendering thumbnails...");
      clearOutput();

      const renderedPages = await renderPdfPages(selectedFile);

      if (!renderedPages.length) {
        setError("Unable to read pages from this PDF.");
        return;
      }

      setFile(selectedFile);
      setFileSize(selectedFile.size);
      setPages(renderedPages);
      setSelectedPages(renderedPages.map((page) => page.page));
      setStatus(`${renderedPages.length} pages ready. Choose target page size and fit mode.`);
    } catch (readError) {
      console.error("PDF page size converter read error:", readError);
      setFile(null);
      setFileSize(0);
      setPages([]);
      setSelectedPages([]);
      setError("Unable to process this PDF. It may be corrupted, password-protected, or use a PDF feature that isn't supported.");
      setStatus("Upload another PDF to try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) loadPdf(selectedFile);

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) loadPdf(selectedFile);
  }

  function applySelection() {
    if (!pages.length) {
      setError("Please upload a PDF first.");
      return;
    }

    setError("");

    if (pageMode === "all") {
      setSelectedPages(pages.map((page) => page.page));
      return;
    }

    const parsed = parsePages(pageMode === "range" ? pageRange : customPages, pages.length);

    if (parsed.invalidParts.length) {
      setError(`Invalid page input: ${parsed.invalidParts.join(", ")}`);
      return;
    }

    if (parsed.outOfRange.length) {
      setError(`These page numbers are greater than total pages: ${parsed.outOfRange.join(", ")}`);
      return;
    }

    if (!parsed.pages.length) {
      setError("Please select at least one page.");
      return;
    }

    setSelectedPages(parsed.pages);
  }

  function togglePage(page: number) {
    setSelectedPages((current) =>
      current.includes(page) ? current.filter((item) => item !== page) : [...current, page].sort((a, b) => a - b)
    );
  }

  async function convertPdf() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!selectedPages.length) {
      setError("Please select at least one page to convert.");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setStatus("Converting PDF page sizes...");
      clearOutput();

      const baseTargetSize = getBaseTargetSize();
      const margins = getMargins();
      const inputBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
      const outputPdf = await PDFDocument.create();
      const sourcePages = sourcePdf.getPages();
      const selected = new Set(selectedPages);

      for (let index = 0; index < sourcePages.length; index += 1) {
        const sourcePage = sourcePages[index];
        const pageNumber = index + 1;
        const originalSize = sourcePage.getSize();

        if (!selected.has(pageNumber)) {
          const [copiedPage] = await outputPdf.copyPages(sourcePdf, [index]);
          outputPdf.addPage(copiedPage);
          continue;
        }

        const target = applyOrientation(baseTargetSize, orientation, originalSize);

        if (target.width - margins.left - margins.right <= 0 || target.height - margins.top - margins.bottom <= 0) {
          throw new Error("Margins are too large for the selected page size.");
        }

        const outputPage = outputPdf.addPage([target.width, target.height]);

        if (backgroundMode !== "none") {
          outputPage.drawRectangle({
            x: 0,
            y: 0,
            width: target.width,
            height: target.height,
            color: backgroundMode === "white" ? rgb(1, 1, 1) : parseColor(backgroundColor),
          });
        }

        const embeddedPage = await outputPdf.embedPage(sourcePage);
        const box = getDrawBox({
          fitMode,
          original: originalSize,
          target,
          margins,
        });

        outputPage.drawPage(embeddedPage, {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        });
      }

      const bytes = await outputPdf.save();
      const blob = createPdfBlob(bytes);
      const url = URL.createObjectURL(blob);

      setOutput({
        name: `${cleanFileName(file.name)}-page-size-converted.pdf`,
        size: formatBytes(blob.size),
        url,
      });

      setStatus("PDF page size converted successfully.");
      alert("PDF page size converted successfully.");
    } catch (processError) {
      console.error("PDF page size converter error:", processError);
      setError(
        processError instanceof Error
          ? processError.message
          : "Unable to convert this PDF. It may be corrupted, password-protected, or unsupported."
      );
      setStatus("Conversion failed. Please check settings and try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function copySummary() {
    const targetLabel = sizeMode === "custom" ? `${customWidth} x ${customHeight} ${unit}` : pagePresets[sizeMode].label;
    const summary = `PDF Page Size Converter Summary

File: ${file?.name || "No file"}
Original pages: ${pages.length}
Target: ${targetLabel}
Orientation: ${orientation}
Fit mode: ${fitMode}
Margins: ${linkedMargins ? `${marginAll} ${unit}` : `${marginTop}/${marginRight}/${marginBottom}/${marginLeft} ${unit}`}
Pages affected: ${selectedPages.length}
Background: ${backgroundMode}
Output: Content-preserving resized PDF`;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  }

  const targetLabel = sizeMode === "custom" ? `Custom ${customWidth} x ${customHeight} ${unit}` : pagePresets[sizeMode].label;

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="📐 PDF Page Size Converter"
          description="Resize PDF pages online for free. Convert PDF to A4, A5, Letter, Legal or custom size with margins, fit modes, selected pages and browser-side privacy."
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📄 Upload PDF</h2>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-900 focus-within:border-blue-400"
              >
                <span className="text-4xl">📎</span>
                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">Content-preserving conversion. Files stay in your browser.</span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold text-white">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(fileSize)} · {pages.length} pages
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">⚙️ Page Size Settings</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Target Size</span>
                  <select
                    value={sizeMode}
                    onChange={(event) => setSizeMode(event.target.value as PageSizeMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="a4">A4</option>
                    <option value="a5">A5</option>
                    <option value="a3">A3</option>
                    <option value="a6">A6</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                    <option value="tabloid">Tabloid</option>
                    <option value="executive">Executive</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Orientation</span>
                  <select
                    value={orientation}
                    onChange={(event) => setOrientation(event.target.value as OrientationMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="auto">Smart / Auto</option>
                    <option value="preserve">Preserve original orientation</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Fit Mode</span>
                  <select
                    value={fitMode}
                    onChange={(event) => setFitMode(event.target.value as FitMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="fit">Fit inside</option>
                    <option value="fill">Fill / Crop</option>
                    <option value="center">Keep original size centered</option>
                    <option value="stretch">Stretch to fit</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Unit</span>
                  <select
                    value={unit}
                    onChange={(event) => setUnit(event.target.value as Unit)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="mm">Millimeters</option>
                    <option value="cm">Centimeters</option>
                    <option value="in">Inches</option>
                    <option value="pt">Points</option>
                  </select>
                </label>

                {sizeMode === "custom" && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Custom Width</span>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(event) => setCustomWidth(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Custom Height</span>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(event) => setCustomHeight(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                  </>
                )}
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📏 Margins & Background</h2>

              <label className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                <input
                  type="checkbox"
                  checked={linkedMargins}
                  onChange={(event) => setLinkedMargins(event.target.checked)}
                />
                Same margin on all sides
              </label>

              {linkedMargins ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Margin</span>
                  <input
                    type="number"
                    value={marginAll}
                    onChange={(event) => setMarginAll(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Top", marginTop, setMarginTop],
                    ["Right", marginRight, setMarginRight],
                    ["Bottom", marginBottom, setMarginBottom],
                    ["Left", marginLeft, setMarginLeft],
                  ].map(([label, value, setter]) => (
                    <label key={label as string} className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">{label as string}</span>
                      <input
                        type="number"
                        value={value as string}
                        onChange={(event) => (setter as (next: string) => void)(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Background</span>
                  <select
                    value={backgroundMode}
                    onChange={(event) => setBackgroundMode(event.target.value as BackgroundMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="white">White</option>
                    <option value="custom">Custom color</option>
                    <option value="none">No background fill</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Custom Color</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    disabled={backgroundMode !== "custom"}
                    className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 disabled:opacity-50"
                  />
                </label>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📑 Page Selection</h2>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Apply To</span>
                  <select
                    value={pageMode}
                    onChange={(event) => setPageMode(event.target.value as PageMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All pages</option>
                    <option value="range">Page range</option>
                    <option value="custom">Custom pages</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={applySelection}
                  className="self-end rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-500"
                >
                  Apply
                </button>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Range</span>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(event) => setPageRange(event.target.value)}
                    disabled={pageMode !== "range"}
                    placeholder="1-5"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Custom Pages</span>
                  <input
                    type="text"
                    value={customPages}
                    onChange={(event) => setCustomPages(event.target.value)}
                    disabled={pageMode !== "custom"}
                    placeholder="1,3,7"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </label>
              </div>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">👀 Visual Preview</h2>

              <p className="mb-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{status}</p>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <p className="mb-3 font-bold text-slate-200">Original</p>
                  <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    {firstPage ? (
                      <div className="rounded-xl bg-white p-2 shadow-xl">
                        <img src={firstPage.thumbUrl} alt="Original PDF first page preview" className="max-h-64 rounded" />
                      </div>
                    ) : (
                      <p className="text-center text-slate-400">Upload PDF to preview original page.</p>
                    )}
                  </div>
                  {firstPage && (
                    <p className="mt-3 text-sm text-slate-300">
                      {Math.round(firstPage.width)} x {Math.round(firstPage.height)} pt · ratio{" "}
                      {(firstPage.width / firstPage.height).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-3 font-bold text-slate-200">New Page</p>
                  <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    {preview && firstPage ? (
                      <div
                        className="relative overflow-hidden rounded-xl border border-blue-400"
                        style={{
                          width: 190,
                          height: Math.max(150, 190 * (preview.target.height / preview.target.width)),
                          backgroundColor: backgroundMode === "custom" ? backgroundColor : backgroundMode === "white" ? "#ffffff" : "#f8fafc",
                        }}
                      >
                        <div
                          className="absolute rounded bg-blue-500/30 ring-2 ring-blue-500"
                          style={{
                            left: `${(preview.drawBox.x / preview.target.width) * 100}%`,
                            bottom: `${(preview.drawBox.y / preview.target.height) * 100}%`,
                            width: `${(preview.drawBox.width / preview.target.width) * 100}%`,
                            height: `${(preview.drawBox.height / preview.target.height) * 100}%`,
                          }}
                        />
                        <div
                          className="absolute border border-dashed border-slate-500"
                          style={{
                            left: `${(preview.margins.left / preview.target.width) * 100}%`,
                            right: `${(preview.margins.right / preview.target.width) * 100}%`,
                            top: `${(preview.margins.top / preview.target.height) * 100}%`,
                            bottom: `${(preview.margins.bottom / preview.target.height) * 100}%`,
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-center text-slate-400">Choose valid settings to preview target page.</p>
                    )}
                  </div>
                  {preview && (
                    <p className="mt-3 text-sm text-slate-300">
                      {Math.round(fromPoints(preview.target.width, unit))} x {Math.round(fromPoints(preview.target.height, unit))} {unit} ·{" "}
                      {fitMode}
                    </p>
                  )}
                </div>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🖼️ Page Thumbnails</h2>

              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center font-bold text-slate-300">
                  Rendering thumbnails...
                </div>
              ) : pages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center text-slate-300">
                  Page thumbnails will appear here.
                </div>
              ) : (
                <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {pages.map((page) => {
                      const selected = affectedSet.has(page.page);

                      return (
                        <button
                          key={page.page}
                          type="button"
                          onClick={() => togglePage(page.page)}
                          className={`relative rounded-xl border p-2 transition ${
                            selected ? "border-blue-500 bg-blue-950/40" : "border-slate-700 bg-slate-900 hover:border-blue-500"
                          }`}
                        >
                          <img src={page.thumbUrl} alt={`PDF page ${page.page}`} className="mx-auto rounded bg-white" />
                          <span className="mt-2 block text-sm font-bold">Page {page.page}</span>
                          {selected && (
                            <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                              Resize
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📊 Before → After Summary</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Original Pages</p>
                  <p className="mt-2 text-3xl font-bold text-blue-300">{pages.length}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Pages Affected</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-300">{selectedPages.length}</p>
                </div>

                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Target</p>
                  <p className="mt-2 text-xl font-bold text-purple-300">{targetLabel}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={convertPdf}
                  disabled={isProcessing || !file}
                  className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Converting..." : "📐 Convert Page Size"}
                </button>

                <button
                  type="button"
                  onClick={copySummary}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white transition hover:bg-slate-700"
                >
                  📋 Copy Summary
                </button>
              </div>

              {output ? (
                <a
                  href={output.url}
                  download={output.name}
                  className="mt-5 flex flex-col gap-2 rounded-xl border border-blue-500/50 bg-blue-950/40 p-4 font-bold text-white transition hover:bg-blue-900/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="break-all">{output.name}</span>
                  <span className="text-sm text-blue-200">{output.size} · Download</span>
                </a>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                  Converted PDF will appear here.
                </div>
              )}
            </ToolCard>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">🔒 Privacy</h2>
            <p className="text-slate-300">
              Your PDF is processed locally in your browser. Files are not uploaded to our server, and the original PDF remains untouched.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">⚠️ Important Notes</h2>
            <p className="text-slate-300">
              Complex PDFs may not render exactly as expected after resizing. Password-protected or corrupted PDFs may fail.
              Fill/crop can intentionally crop content, and very large PDFs may require more browser memory.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}