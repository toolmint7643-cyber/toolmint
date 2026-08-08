"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type InsertLocation = "before" | "after" | "beginning" | "end";
type PageSizeMode = "same" | "a4" | "a5" | "letter" | "legal" | "custom";
type Unit = "pt" | "mm" | "in";
type Orientation = "portrait" | "landscape";

type PageItem = {
  id: string;
  type: "pdf" | "blank";
  originalPage?: number;
  label: string;
  thumbUrl?: string;
  width: number;
  height: number;
  backgroundColor: string;
};

type OutputFile = {
  name: string;
  size: string;
  url: string;
};

const pageSizes = {
  a4: { width: 595.28, height: 841.89 },
  a5: { width: 419.53, height: 595.28 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

function parseColor(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((x) => x + x).join("") : clean, 16);

  if (Number.isNaN(value)) return rgb(1, 1, 1);

  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function toPoints(value: number, unit: Unit) {
  if (unit === "mm") return value * 2.83465;
  if (unit === "in") return value * 72;
  return value;
}

function applyOrientation(size: { width: number; height: number }, orientation: Orientation) {
  if (orientation === "landscape") {
    return {
      width: Math.max(size.width, size.height),
      height: Math.min(size.width, size.height),
    };
  }

  return {
    width: Math.min(size.width, size.height),
    height: Math.max(size.width, size.height),
  };
}

async function renderPdfPages(file: File) {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const pages: PageItem[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const fullViewport = page.getViewport({ scale: 1 });
    const previewViewport = page.getViewport({ scale: 0.32 });
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
      id: createId(),
      type: "pdf",
      originalPage: pageNumber,
      label: `Page ${pageNumber}`,
      thumbUrl: canvas.toDataURL("image/jpeg", 0.76),
      width: fullViewport.width,
      height: fullViewport.height,
      backgroundColor: "#ffffff",
    });
  }

  return pages;
}

export default function InsertBlankPagePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [insertLocation, setInsertLocation] = useState<InsertLocation>("after");
  const [blankCount, setBlankCount] = useState("1");
  const [sizeMode, setSizeMode] = useState<PageSizeMode>("same");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [customWidth, setCustomWidth] = useState("210");
  const [customHeight, setCustomHeight] = useState("297");
  const [unit, setUnit] = useState<Unit>("mm");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [future, setFuture] = useState<PageItem[][]>([]);
  const [output, setOutput] = useState<OutputFile | null>(null);
  const [status, setStatus] = useState("Upload a PDF and insert blank pages anywhere.");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedPage = useMemo(() => {
    return pages.find((page) => page.id === selectedId) || null;
  }, [pages, selectedId]);

  const originalPages = pages.filter((page) => page.type === "pdf").length;
  const blankPages = pages.filter((page) => page.type === "blank").length;

  function clearOutput() {
    if (output?.url) URL.revokeObjectURL(output.url);
    setOutput(null);
  }

  function commitPages(nextPages: PageItem[]) {
    setHistory((current) => [...current, pages]);
    setFuture([]);
    setPages(nextPages);
    clearOutput();
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
      setSelectedId(renderedPages[0].id);
      setHistory([]);
      setFuture([]);
      setStatus(`${renderedPages.length} pages ready. Select a page and insert blank pages.`);
    } catch (readError) {
      console.error("Insert blank page PDF read error:", readError);
      setFile(null);
      setFileSize(0);
      setPages([]);
      setSelectedId("");
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

  function getBlankPageSize() {
    if (sizeMode === "same") {
      const reference = selectedPage || pages[0];

      if (!reference) {
        throw new Error("Select a page first.");
      }

      return { width: reference.width, height: reference.height };
    }

    if (sizeMode === "custom") {
      const width = Number(customWidth);
      const height = Number(customHeight);

      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error("Please enter valid custom page dimensions.");
      }

      return applyOrientation(
        {
          width: toPoints(width, unit),
          height: toPoints(height, unit),
        },
        orientation
      );
    }

    return applyOrientation(pageSizes[sizeMode], orientation);
  }

  function createBlankPages(count: number) {
    const size = getBlankPageSize();

    return Array.from({ length: count }, (_, index) => ({
      id: createId(),
      type: "blank" as const,
      label: `Blank Page ${blankPages + index + 1}`,
      width: size.width,
      height: size.height,
      backgroundColor,
    }));
  }

  function insertBlankPages(location: InsertLocation = insertLocation, countOverride?: number) {
    setError("");

    if (!pages.length) {
      setError("Please upload a PDF first.");
      return;
    }

    const count = countOverride || Number(blankCount);

    if (!Number.isInteger(count) || count < 1 || count > 50) {
      setError("Please enter a blank page count between 1 and 50.");
      return;
    }

    if ((location === "before" || location === "after") && !selectedPage) {
      setError("Please select a page first.");
      return;
    }

    try {
      const blanks = createBlankPages(count);
      const next = [...pages];

      if (location === "beginning") {
        commitPages([...blanks, ...next]);
        setSelectedId(blanks[0].id);
        return;
      }

      if (location === "end") {
        commitPages([...next, ...blanks]);
        setSelectedId(blanks[0].id);
        return;
      }

      const selectedIndex = next.findIndex((page) => page.id === selectedId);

      if (selectedIndex === -1) {
        setError("Please select a valid page first.");
        return;
      }

      const insertIndex = location === "before" ? selectedIndex : selectedIndex + 1;
      next.splice(insertIndex, 0, ...blanks);

      commitPages(next);
      setSelectedId(blanks[0].id);
    } catch (insertError) {
      setError(insertError instanceof Error ? insertError.message : "Unable to insert blank pages.");
    }
  }

  function undo() {
    const previous = history[history.length - 1];

    if (!previous) return;

    setFuture((current) => [pages, ...current]);
    setPages(previous);
    setHistory((current) => current.slice(0, -1));
    clearOutput();
  }

  function redo() {
    const next = future[0];

    if (!next) return;

    setHistory((current) => [...current, pages]);
    setPages(next);
    setFuture((current) => current.slice(1));
    clearOutput();
  }

  async function resetArrangement() {
    if (!file) return;
    await loadPdf(file);
  }

  async function generatePdf() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!pages.length) {
      setError("At least one page is required.");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setStatus("Creating PDF with blank pages...");
      clearOutput();

      const inputBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
      const outputPdf = await PDFDocument.create();

      for (const pageItem of pages) {
        if (pageItem.type === "pdf" && pageItem.originalPage) {
          const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageItem.originalPage - 1]);
          outputPdf.addPage(copiedPage);
        }

        if (pageItem.type === "blank") {
          const blankPage = outputPdf.addPage([pageItem.width, pageItem.height]);
          blankPage.drawRectangle({
            x: 0,
            y: 0,
            width: pageItem.width,
            height: pageItem.height,
            color: parseColor(pageItem.backgroundColor),
          });
        }
      }

      const bytes = await outputPdf.save();
      const blob = createPdfBlob(bytes);
      const url = URL.createObjectURL(blob);

      setOutput({
        name: `${cleanFileName(file.name)}-with-blank-pages.pdf`,
        size: formatBytes(blob.size),
        url,
      });

      setStatus("PDF with blank pages ready to download.");
      alert("Blank pages inserted successfully.");
    } catch (processError) {
      console.error("Insert blank page PDF error:", processError);
      setError("Unable to process this PDF. It may be corrupted, password-protected, or use a PDF feature that isn't supported.");
      setStatus("Processing failed. Please try another PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function copySummary() {
    const summary = `Insert Blank Page PDF Summary

File: ${file?.name || "No file"}
Original pages: ${originalPages}
Blank pages added: ${blankPages}
Final pages: ${pages.length}
Page size mode: ${sizeMode}
Background color: ${backgroundColor}
Original file untouched: Yes`;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="➕ Insert Blank Page into PDF"
          description="Insert blank pages into PDF online for free. Add pages before, after, at the beginning or end with custom size, orientation and background color."
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
                <span className="mt-1 text-sm text-slate-300">Original PDF remains untouched. Processing stays in your browser.</span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold text-white">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(fileSize)} · {originalPages} original pages
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
              <h2 className="mb-4 text-2xl font-bold text-white">⚙️ Insert Settings</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Insert Location</span>
                  <select
                    value={insertLocation}
                    onChange={(event) => setInsertLocation(event.target.value as InsertLocation)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="before">Before selected page</option>
                    <option value="after">After selected page</option>
                    <option value="beginning">Beginning</option>
                    <option value="end">End</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Number of Blank Pages</span>
                  <input
                    type="number"
                    value={blankCount}
                    onChange={(event) => setBlankCount(event.target.value)}
                    min="1"
                    max="50"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Page Size</span>
                  <select
                    value={sizeMode}
                    onChange={(event) => setSizeMode(event.target.value as PageSizeMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="same">Same as selected page</option>
                    <option value="a4">A4</option>
                    <option value="a5">A5</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                    <option value="custom">Custom size</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Orientation</span>
                  <select
                    value={orientation}
                    onChange={(event) => setOrientation(event.target.value as Orientation)}
                    disabled={sizeMode === "same"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>

                {sizeMode === "custom" && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Width</span>
                      <input
                        type="number"
                        value={customWidth}
                        onChange={(event) => setCustomWidth(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Height</span>
                      <input
                        type="number"
                        value={customHeight}
                        onChange={(event) => setCustomHeight(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-slate-300">Unit</span>
                      <select
                        value={unit}
                        onChange={(event) => setUnit(event.target.value as Unit)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      >
                        <option value="mm">Millimeters</option>
                        <option value="in">Inches</option>
                        <option value="pt">Points</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Background Color</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.target.value)}
                    className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 p-2"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => insertBlankPages()}
                className="mt-5 w-full rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
              >
                ➕ Insert Blank Page
              </button>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">⚡ Quick Actions</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => insertBlankPages("after", 1)} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  Add 1 after selected
                </button>
                <button type="button" onClick={() => insertBlankPages("after", 2)} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  Add 2 after selected
                </button>
                <button type="button" onClick={() => insertBlankPages("after", 5)} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  Add 5 after selected
                </button>
                <button type="button" onClick={() => insertBlankPages("beginning", 1)} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  Add at beginning
                </button>
                <button type="button" onClick={() => insertBlankPages("end", 1)} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  Add at end
                </button>
                <button type="button" onClick={copySummary} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700">
                  📋 Copy Summary
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={undo} disabled={!history.length} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60">
                  Undo
                </button>
                <button type="button" onClick={redo} disabled={!future.length} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60">
                  Redo
                </button>
                <button type="button" onClick={resetArrangement} disabled={!file} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60">
                  Reset
                </button>
              </div>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🖼️ Live Document Structure</h2>

              <p className="mb-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{status}</p>

              {isLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center font-bold text-slate-300">
                  Rendering thumbnails...
                </div>
              ) : pages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center text-slate-300">
                  Page thumbnails will appear here.
                </div>
              ) : (
                <div className="max-h-[760px] overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {pages.map((page, index) => {
                      const selected = selectedId === page.id;

                      return (
                        <div
                          key={page.id}
                          className={`rounded-2xl border p-3 transition ${
                            selected ? "border-blue-500 bg-blue-950/40" : "border-slate-700 bg-slate-900 hover:border-blue-500"
                          }`}
                        >
                          <button type="button" onClick={() => setSelectedId(page.id)} className="w-full text-left">
                            {page.type === "pdf" ? (
                              <div className="rounded-xl bg-white p-1">
                                <img src={page.thumbUrl} alt={`PDF page ${page.originalPage}`} className="mx-auto rounded" />
                              </div>
                            ) : (
                              <div
                                className="flex aspect-[3/4] items-center justify-center rounded-xl border-2 border-dashed border-slate-400 text-center"
                                style={{ backgroundColor: page.backgroundColor }}
                              >
                                <span className="rounded-lg bg-slate-950/80 px-3 py-2 text-sm font-black text-white">
                                  BLANK PAGE
                                </span>
                              </div>
                            )}

                            <span className="mt-3 block text-sm font-bold text-white">
                              {index + 1}. {page.label}
                            </span>
                            <span className="mt-1 block text-xs text-slate-300">
                              {Math.round(page.width)} x {Math.round(page.height)} pt
                            </span>
                          </button>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(page.id);
                                insertBlankPages("before", 1);
                              }}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700"
                            >
                              + Before
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(page.id);
                                insertBlankPages("after", 1);
                              }}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700"
                            >
                              + After
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🚀 Download PDF</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Original</p>
                  <p className="mt-2 text-3xl font-bold text-blue-300">{originalPages}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Blank Added</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-300">{blankPages}</p>
                </div>
                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Final</p>
                  <p className="mt-2 text-3xl font-bold text-purple-300">{pages.length}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={generatePdf}
                disabled={isProcessing || !pages.length}
                className="mt-5 w-full rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? "Processing..." : "➕ Create PDF with Blank Pages"}
              </button>

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
                  Updated PDF will appear here.
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
              Password-protected or corrupted PDFs may fail. Very large PDFs can be slower while rendering thumbnails.
              Custom page sizes must be valid positive numbers.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}