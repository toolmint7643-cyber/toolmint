"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { degrees, PDFDocument } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type PageItem = {
  id: string;
  originalPage: number;
  label: string;
  thumbUrl: string;
  rotation: number;
  deleted: boolean;
};

type OutputFile = {
  name: string;
  size: string;
  url: string;
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

async function renderPdfPages(file: File) {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const pages: PageItem[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.32 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport,
    }).promise;

    pages.push({
      id: createId(),
      originalPage: pageNumber,
      label: `Page ${pageNumber}`,
      thumbUrl: canvas.toDataURL("image/jpeg", 0.76),
      rotation: 0,
      deleted: false,
    });
  }

  return pages;
}

export default function OrganizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState("");
  const [history, setHistory] = useState<PageItem[][]>([]);
  const [future, setFuture] = useState<PageItem[][]>([]);
  const [output, setOutput] = useState<OutputFile | null>(null);
  const [status, setStatus] = useState("Upload a PDF to organize pages visually.");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const visiblePages = useMemo(() => pages.filter((page) => !page.deleted), [pages]);
  const deletedCount = pages.filter((page) => page.deleted).length;
  const duplicatedCount = Math.max(0, pages.length - new Set(pages.map((page) => page.originalPage)).size);
  const rotatedCount = pages.filter((page) => page.rotation !== 0 && !page.deleted).length;
  const orderChanged = visiblePages.some((page, index) => page.originalPage !== index + 1);
  const selectedCount = selectedIds.length;

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
    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
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
      setSelectedIds([]);
      setHistory([]);
      setFuture([]);
      setStatus(`${renderedPages.length} pages ready. Drag, select, delete, duplicate or rotate pages.`);
    } catch (readError) {
      console.error("Organize PDF read error:", readError);
      setFile(null);
      setFileSize(0);
      setPages([]);
      setSelectedIds([]);
      setError("Unable to read this PDF. It may be corrupted, password-protected, or unsupported.");
      setStatus("Upload another PDF to try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      loadPdf(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) {
      loadPdf(selectedFile);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function selectAll() {
    setSelectedIds(visiblePages.map((page) => page.id));
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  function movePage(id: string, direction: "left" | "right" | "start" | "end") {
    const index = pages.findIndex((page) => page.id === id);

    if (index === -1) return;

    const next = [...pages];
    const [page] = next.splice(index, 1);

    if (direction === "start") next.unshift(page);
    if (direction === "end") next.push(page);
    if (direction === "left") next.splice(Math.max(index - 1, 0), 0, page);
    if (direction === "right") next.splice(Math.min(index + 1, next.length), 0, page);

    commitPages(next);
  }

  function handleDropPage(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = pages.findIndex((page) => page.id === draggedId);
    const toIndex = pages.findIndex((page) => page.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    commitPages(next);
    setDraggedId("");
  }

  function deleteSelected() {
    if (!selectedIds.length) {
      alert("Select pages first.");
      return;
    }

    const remaining = pages.filter((page) => !selectedIds.includes(page.id) && !page.deleted);

    if (!remaining.length) {
      setError("At least one page must remain in the PDF.");
      return;
    }

    commitPages(
      pages.map((page) =>
        selectedIds.includes(page.id) ? { ...page, deleted: true } : page
      )
    );
    setSelectedIds([]);
  }

  function duplicateSelected() {
    if (!selectedIds.length) {
      alert("Select pages first.");
      return;
    }

    const next: PageItem[] = [];

    pages.forEach((page) => {
      next.push(page);

      if (selectedIds.includes(page.id) && !page.deleted) {
        next.push({
          ...page,
          id: createId(),
          label: `${page.label} copy`,
        });
      }
    });

    commitPages(next);
  }

  function rotateSelected(angle: number) {
    if (!selectedIds.length) {
      alert("Select pages first.");
      return;
    }

    commitPages(
      pages.map((page) =>
        selectedIds.includes(page.id) && !page.deleted
          ? { ...page, rotation: (page.rotation + angle + 360) % 360 }
          : page
      )
    );
  }

  function restoreDeletedPage(id: string) {
    commitPages(pages.map((page) => (page.id === id ? { ...page, deleted: false } : page)));
  }

  function resetArrangement() {
    if (!file) return;
    commitPages(
      [...pages]
        .filter((page) => page.originalPage <= new Set(pages.map((item) => item.originalPage)).size)
        .sort((a, b) => a.originalPage - b.originalPage)
        .map((page) => ({
          ...page,
          id: createId(),
          label: `Page ${page.originalPage}`,
          rotation: 0,
          deleted: false,
        }))
    );
    setSelectedIds([]);
  }

  function undo() {
    const previous = history[history.length - 1];

    if (!previous) return;

    setFuture((current) => [pages, ...current]);
    setPages(previous);
    setHistory((current) => current.slice(0, -1));
    setSelectedIds([]);
    clearOutput();
  }

  function redo() {
    const next = future[0];

    if (!next) return;

    setHistory((current) => [...current, pages]);
    setPages(next);
    setFuture((current) => current.slice(1));
    setSelectedIds([]);
    clearOutput();
  }

  async function organizePdf() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    if (!visiblePages.length) {
      setError("At least one page must remain in the PDF.");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setStatus("Creating organized PDF...");
      clearOutput();

      const inputBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
      const outputPdf = await PDFDocument.create();

      for (const pageItem of visiblePages) {
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [pageItem.originalPage - 1]);
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRotation + pageItem.rotation) % 360));
        outputPdf.addPage(copiedPage);
      }

      const bytes = await outputPdf.save();
      const blob = createPdfBlob(bytes);
      const url = URL.createObjectURL(blob);

      setOutput({
        name: `${cleanFileName(file.name)}-organized.pdf`,
        size: formatBytes(blob.size),
        url,
      });

      setStatus("Organized PDF ready to download.");
      alert("PDF organized successfully.");
    } catch (processError) {
      console.error("Organize PDF error:", processError);
      setError("Unable to organize this PDF. It may be corrupted, password-protected, or unsupported.");
      setStatus("Processing failed. Please try another PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function copySummary() {
    const summary = `Organize PDF Summary

File: ${file?.name || "No file"}
Original pages: ${pages.length}
Final pages: ${visiblePages.length}
Deleted pages: ${deletedCount}
Duplicated pages: ${duplicatedCount}
Rotated pages: ${rotatedCount}
Page order modified: ${orderChanged ? "Yes" : "No"}`;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="🗂️ Organize PDF"
          description="Organize PDF pages online for free. Reorder, delete, duplicate and rotate PDF pages visually with browser-side privacy."
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
              <h2 className="mb-4 text-2xl font-bold text-white">🎛️ Page Actions</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={!visiblePages.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={deselectAll}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Deselect all
                </button>

                <button
                  type="button"
                  onClick={deleteSelected}
                  className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 font-bold text-red-200 transition hover:bg-red-900/60"
                >
                  Delete selected
                </button>

                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 font-bold text-emerald-200 transition hover:bg-emerald-900/60"
                >
                  Duplicate selected
                </button>

                <button
                  type="button"
                  onClick={() => rotateSelected(90)}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Rotate 90°
                </button>

                <button
                  type="button"
                  onClick={() => rotateSelected(180)}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                >
                  Rotate 180°
                </button>

                <button
                  type="button"
                  onClick={undo}
                  disabled={!history.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Undo
                </button>

                <button
                  type="button"
                  onClick={redo}
                  disabled={!future.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                >
                  Redo
                </button>

                <button
                  type="button"
                  onClick={resetArrangement}
                  disabled={!pages.length}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700 disabled:opacity-60 sm:col-span-2"
                >
                  Reset arrangement
                </button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">📊 Smart Summary</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Final Pages</p>
                  <p className="mt-2 text-3xl font-bold text-blue-300">{visiblePages.length}</p>
                </div>

                <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4">
                  <p className="text-sm text-red-200">Deleted</p>
                  <p className="mt-2 text-3xl font-bold text-red-300">{deletedCount}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Duplicated</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-300">{duplicatedCount}</p>
                </div>

                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Rotated</p>
                  <p className="mt-2 text-3xl font-bold text-purple-300">{rotatedCount}</p>
                </div>
              </div>

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                {orderChanged ? "Page order modified." : "Page order is still original."} {selectedCount} page
                {selectedCount === 1 ? "" : "s"} selected.
              </p>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🖼️ Visual Page Organizer</h2>

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
                      const selected = selectedIds.includes(page.id);

                      return (
                        <div
                          key={page.id}
                          draggable={!page.deleted}
                          onDragStart={() => setDraggedId(page.id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleDropPage(page.id)}
                          className={`rounded-2xl border p-3 transition ${
                            page.deleted
                              ? "border-red-500/50 bg-red-950/30 opacity-60"
                              : selected
                                ? "border-blue-500 bg-blue-950/40"
                                : "border-slate-700 bg-slate-900 hover:border-blue-500"
                          }`}
                        >
                          <button type="button" onClick={() => toggleSelect(page.id)} className="w-full text-left">
                            <div className="relative rounded-xl bg-white p-1">
                              <img
                                src={page.thumbUrl}
                                alt={`PDF page ${page.originalPage}`}
                                className="mx-auto rounded"
                                style={{ transform: `rotate(${page.rotation}deg)` }}
                              />
                              {page.deleted && (
                                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-950/70 text-sm font-black text-white">
                                  DELETED
                                </span>
                              )}
                            </div>

                            <span className="mt-3 block text-sm font-bold text-white">
                              {index + 1}. {page.label}
                            </span>
                            <span className="mt-1 block text-xs text-slate-300">
                              Original page {page.originalPage} · {page.rotation}°
                            </span>
                          </button>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => movePage(page.id, "left")}
                              disabled={page.deleted}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => movePage(page.id, "right")}
                              disabled={page.deleted}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={() => movePage(page.id, "start")}
                              disabled={page.deleted}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                            >
                              Start
                            </button>
                            <button
                              type="button"
                              onClick={() => movePage(page.id, "end")}
                              disabled={page.deleted}
                              className="rounded-lg bg-slate-800 px-2 py-2 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                            >
                              End
                            </button>
                          </div>

                          {page.deleted && (
                            <button
                              type="button"
                              onClick={() => restoreDeletedPage(page.id)}
                              className="mt-2 w-full rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-900/60"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">🚀 Download Organized PDF</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={organizePdf}
                  disabled={isProcessing || !pages.length}
                  className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Processing..." : "🗂️ Organize PDF"}
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
                  Organized PDF will appear here.
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
              At least one page must remain before downloading.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}