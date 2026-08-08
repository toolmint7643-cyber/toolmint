"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type Unit = "mm" | "cm" | "in" | "pt";
type ApplyMode = "all" | "selected" | "range" | "custom";

type PageInfo = {
  page: number;
  width: number;
  height: number;
  rotation: number;
  thumbUrl: string;
};

type CropValues = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

type OutputFile = {
  name: string;
  size: string;
  url: string;
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

function getCropNumbers(crop: CropValues) {
  const top = Number(crop.top);
  const right = Number(crop.right);
  const bottom = Number(crop.bottom);
  const left = Number(crop.left);

  if ([top, right, bottom, left].some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Please enter valid non-negative crop values.");
  }

  return { top, right, bottom, left };
}

function getCropPoints(crop: CropValues, unit: Unit) {
  const values = getCropNumbers(crop);

  return {
    top: toPoints(values.top, unit),
    right: toPoints(values.right, unit),
    bottom: toPoints(values.bottom, unit),
    left: toPoints(values.left, unit),
  };
}

function validateCropForPage(page: { width: number; height: number }, cropPoints: { top: number; right: number; bottom: number; left: number }) {
  const remainingWidth = page.width - cropPoints.left - cropPoints.right;
  const remainingHeight = page.height - cropPoints.top - cropPoints.bottom;

  return remainingWidth > 0 && remainingHeight > 0;
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
    const previewViewport = page.getViewport({ scale: 0.26 });
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
      rotation: page.rotate || 0,
      thumbUrl: canvas.toDataURL("image/jpeg", 0.74),
    });
  }

  return pages;
}

export default function CropPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [applyMode, setApplyMode] = useState<ApplyMode>("all");
  const [pageRange, setPageRange] = useState("1-5");
  const [customPages, setCustomPages] = useState("1,3,5-8");
  const [unit, setUnit] = useState<Unit>("mm");
  const [linkedMargins, setLinkedMargins] = useState(true);
  const [crop, setCrop] = useState<CropValues>({
    top: "10",
    right: "10",
    bottom: "10",
    left: "10",
  });
  const [presetName, setPresetName] = useState("Manual crop");
  const [output, setOutput] = useState<OutputFile | null>(null);
  const [status, setStatus] = useState("Upload a PDF and set crop margins.");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const activePageInfo = useMemo(() => {
    return pages.find((page) => page.page === activePage) || pages[0] || null;
  }, [activePage, pages]);

  const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const cropPoints = useMemo(() => {
    try {
      return getCropPoints(crop, unit);
    } catch {
      return null;
    }
  }, [crop, unit]);

  const affectedPages = useMemo(() => {
    if (!pages.length) return [];

    if (applyMode === "all") {
      return pages.map((page) => page.page);
    }

    if (applyMode === "selected") {
      return selectedPages;
    }

    const parsed = parsePages(applyMode === "range" ? pageRange : customPages, pages.length);
    return parsed.pages;
  }, [applyMode, customPages, pageRange, pages, selectedPages]);

  const affectedSet = useMemo(() => new Set(affectedPages), [affectedPages]);

  const previewBox = useMemo(() => {
    if (!activePageInfo || !cropPoints) return null;

    const valid = validateCropForPage(activePageInfo, cropPoints);

    return {
      valid,
      left: (cropPoints.left / activePageInfo.width) * 100,
      right: (cropPoints.right / activePageInfo.width) * 100,
      top: (cropPoints.top / activePageInfo.height) * 100,
      bottom: (cropPoints.bottom / activePageInfo.height) * 100,
    };
  }, [activePageInfo, cropPoints]);

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
      clearOutput();
      setStatus("Reading PDF and rendering thumbnails...");

      const renderedPages = await renderPdfPages(selectedFile);

      if (!renderedPages.length) {
        setError("Unable to read pages from this PDF.");
        return;
      }

      setFile(selectedFile);
      setFileSize(selectedFile.size);
      setPages(renderedPages);
      setSelectedPages(renderedPages.map((page) => page.page));
      setActivePage(1);
      setStatus(`${renderedPages.length} pages ready. Set crop margins and choose pages.`);
    } catch (readError) {
      console.error("Crop PDF read error:", readError);
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

  function updateCrop(side: keyof CropValues, value: string) {
    setPresetName("Manual crop");

    if (linkedMargins) {
      setCrop({
        top: value,
        right: value,
        bottom: value,
        left: value,
      });
      return;
    }

    setCrop((current) => ({
      ...current,
      [side]: value,
    }));
  }

  function applyPreset(name: string, values: CropValues) {
    setCrop(values);
    setPresetName(name);
    clearOutput();
  }

  function applyPageSelection() {
    if (!pages.length) {
      setError("Please upload a PDF first.");
      return;
    }

    setError("");

    if (applyMode === "all") {
      setSelectedPages(pages.map((page) => page.page));
      return;
    }

    if (applyMode === "selected") {
      if (!selectedPages.length) setError("Please select at least one page thumbnail.");
      return;
    }

    const parsed = parsePages(applyMode === "range" ? pageRange : customPages, pages.length);

    if (parsed.invalidParts.length) {
      setError(`Invalid page input: ${parsed.invalidParts.join(", ")}`);
      return;
    }

    if (parsed.outOfRange.length) {
      setError(`These page numbers are greater than total pages: ${parsed.outOfRange.join(", ")}`);
      return;
    }

    if (!parsed.pages.length) {
      setError("Please select at least one valid page.");
      return;
    }

    setSelectedPages(parsed.pages);
  }

  function togglePage(page: number) {
    setApplyMode("selected");
    setActivePage(page);
    setSelectedPages((current) =>
      current.includes(page) ? current.filter((item) => item !== page) : [...current, page].sort((a, b) => a - b)
    );
  }

  function selectAllPages() {
    setApplyMode("selected");
    setSelectedPages(pages.map((page) => page.page));
  }

  function deselectAllPages() {
    setApplyMode("selected");
    setSelectedPages([]);
  }

  function invertSelection() {
    setApplyMode("selected");
    const current = new Set(selectedPages);
    setSelectedPages(pages.map((page) => page.page).filter((page) => !current.has(page)));
  }

  function resetTool() {
    setCrop({
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
    });
    setPresetName("Manual crop");
    setApplyMode("all");
    setPageRange("1-5");
    setCustomPages("1,3,5-8");
    setSelectedPages(pages.map((page) => page.page));
    clearOutput();
    setError("");
    setStatus(pages.length ? "Crop settings reset." : "Upload a PDF and set crop margins.");
  }

  async function cropPdf() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!affectedPages.length) {
      setError("Please select at least one page to crop.");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      clearOutput();
      setStatus("Preparing PDF...");

      const cropValues = getCropPoints(crop, unit);
      const affected = new Set(affectedPages);

      for (const page of pages) {
        if (affected.has(page.page) && !validateCropForPage(page, cropValues)) {
          throw new Error("The selected crop margins leave no usable page area for one or more selected pages.");
        }
      }

      setStatus("Cropping pages...");

      const inputBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
      const pdfPages = pdfDoc.getPages();

      pdfPages.forEach((page, index) => {
        const pageNumber = index + 1;

        if (!affected.has(pageNumber)) return;

        const { width, height } = page.getSize();
        const newWidth = width - cropValues.left - cropValues.right;
        const newHeight = height - cropValues.top - cropValues.bottom;

        if (newWidth <= 0 || newHeight <= 0) {
          throw new Error("The selected crop margins leave no usable page area.");
        }

        page.setCropBox(cropValues.left, cropValues.bottom, newWidth, newHeight);
      });

      setStatus("Finalizing PDF...");

      const bytes = await pdfDoc.save();
      const blob = createPdfBlob(bytes);
      const url = URL.createObjectURL(blob);

      setOutput({
        name: `${cleanFileName(file.name)}-cropped.pdf`,
        size: formatBytes(blob.size),
        url,
      });

      setStatus("Done. Cropped PDF is ready to download.");
      alert("PDF cropped successfully.");
    } catch (processError) {
      console.error("Crop PDF error:", processError);
      setError(
        processError instanceof Error
          ? processError.message
          : "Unable to process this PDF. It may be corrupted, password-protected, or use a PDF feature that isn't supported."
      );
      setStatus("Cropping failed. Please check your settings and try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function copySummary() {
    const summary = `Crop PDF Summary

File: ${file?.name || "No file"}
Original pages: ${pages.length}
Pages to crop: ${affectedPages.length}
Top: ${crop.top} ${unit}
Right: ${crop.right} ${unit}
Bottom: ${crop.bottom} ${unit}
Left: ${crop.left} ${unit}
Preset: ${presetName}
Result: ${pages.length} pages
Processing: Browser-side`;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="✂️ Crop PDF"
          description="Crop PDF online for free. Remove PDF margins, trim PDF pages and crop selected pages with accurate units, visual preview and browser-side privacy."
        />

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
                <span className="mt-1 text-sm text-slate-300">Manual crop margins. Files stay in your browser.</span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="break-all font-bold text-white">{file.name}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatBytes(fileSize)} · {pages.length} pages
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFileSize(0);
                      setPages([]);
                      setSelectedPages([]);
                      setActivePage(1);
                      clearOutput();
                      setStatus("Upload a PDF and set crop margins.");
                    }}
                    className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 font-bold text-red-200 transition hover:bg-red-900/60"
                  >
                    Clear file
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🖼️ Page Thumbnails</h2>

              <div className="mb-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={selectAllPages}
                  disabled={!pages.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={deselectAllPages}
                  disabled={!pages.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Deselect all
                </button>

                <button
                  type="button"
                  onClick={invertSelection}
                  disabled={!pages.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Invert selection
                </button>
              </div>

              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center font-bold text-slate-300">
                  Rendering thumbnails...
                </div>
              ) : pages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center text-slate-300">
                  Page thumbnails will appear here.
                </div>
              ) : (
                <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {pages.map((page) => {
                      const selected = selectedSet.has(page.page);
                      const willCrop = affectedSet.has(page.page);
                      const active = activePage === page.page;

                      return (
                        <button
                          key={page.page}
                          type="button"
                          onClick={() => togglePage(page.page)}
                          className={`relative rounded-xl border p-2 transition ${
                            active
                              ? "border-blue-500 bg-blue-950/50"
                              : selected
                                ? "border-emerald-500 bg-emerald-950/30"
                                : "border-slate-700 bg-slate-900 hover:border-blue-500"
                          }`}
                        >
                          <img src={page.thumbUrl} alt={`PDF page ${page.page}`} className="mx-auto rounded bg-white" />
                          <span className="mt-2 block text-sm font-bold">Page {page.page}</span>
                          <span className="mt-1 block text-xs text-slate-300">
                            {Math.round(page.width)} x {Math.round(page.height)} pt
                          </span>
                          {willCrop && (
                            <span className="absolute right-2 top-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                              Crop
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">✂️ Crop Controls</h2>

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

              <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                <input
                  type="checkbox"
                  checked={linkedMargins}
                  onChange={(event) => setLinkedMargins(event.target.checked)}
                />
                Link margins
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["top", "right", "bottom", "left"] as const).map((side) => (
                  <label key={side} className="block">
                    <span className="mb-2 block text-sm font-semibold capitalize text-slate-300">{side}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={crop[side]}
                      onChange={(event) => updateCrop(side, event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => applyPreset("Manual trim margin preset", { top: "3", right: "3", bottom: "3", left: "3" })}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Manual trim margin
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("Crop 5 mm", { top: "5", right: "5", bottom: "5", left: "5" })}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Crop 5 mm
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("Crop 10 mm", { top: "10", right: "10", bottom: "10", left: "10" })}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Crop 10 mm
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("Remove header", { top: "20", right: "0", bottom: "0", left: "0" })}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Remove header
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("Remove footer", { top: "0", right: "0", bottom: "20", left: "0" })}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Remove footer
                </button>

                <button
                  type="button"
                  onClick={resetTool}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Reset
                </button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📑 Apply Crop To</h2>

              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Mode</span>
                  <select
                    value={applyMode}
                    onChange={(event) => setApplyMode(event.target.value as ApplyMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All pages</option>
                    <option value="selected">Selected thumbnails</option>
                    <option value="range">Page range</option>
                    <option value="custom">Custom pages</option>
                  </select>
                </label>

                <button
                  type="button"
                  onClick={applyPageSelection}
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
                    disabled={applyMode !== "range"}
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
                    disabled={applyMode !== "custom"}
                    placeholder="1,3,5-8"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </label>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">👀 Visual Crop Preview</h2>

              <p className="mb-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{status}</p>

              {activePageInfo && previewBox ? (
                <div>
                  <div className="relative mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-white p-2">
                    <img src={activePageInfo.thumbUrl} alt={`Crop preview for page ${activePageInfo.page}`} className="w-full rounded" />

                    <div
                      className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]"
                      style={{
                        left: `${previewBox.left}%`,
                        right: `${previewBox.right}%`,
                        top: `${previewBox.top}%`,
                        bottom: `${previewBox.bottom}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                    <p className="font-bold text-white">Preview page: {activePageInfo.page}</p>
                    <p>Preset: {presetName}</p>
                    <p>
                      Crop: Top {crop.top} {unit}, Right {crop.right} {unit}, Bottom {crop.bottom} {unit}, Left {crop.left} {unit}
                    </p>
                    {!previewBox.valid && (
                      <p className="mt-2 font-bold text-red-300">Crop area is too large for this page.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                  Upload a PDF to preview crop area.
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📊 Crop Summary</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Original Pages</p>
                  <p className="mt-2 text-3xl font-bold text-blue-300">{pages.length}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Pages To Crop</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-300">{affectedPages.length}</p>
                </div>

                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Result Pages</p>
                  <p className="mt-2 text-3xl font-bold text-purple-300">{pages.length}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cropPdf}
                  disabled={isProcessing || !file}
                  className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Cropping..." : "✂️ Crop PDF"}
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
                  <span className="text-sm text-blue-200">{output.size} · Download Cropped PDF</span>
                </a>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                  Cropped PDF will appear here.
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
              Manual crop margins are used in V1. Automatic white-margin detection is not included. Password-protected,
              corrupted or very complex PDFs may fail, and large PDFs may require more browser memory.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}