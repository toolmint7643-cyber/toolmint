"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type CompressionMode = "smart" | "preserve" | "image";
type CompressionPreset = "high" | "balanced" | "small";
type ContentType = "Likely image-heavy" | "Likely text/vector-heavy" | "Mixed/unknown";

type PdfInfo = {
  pageCount: number;
  firstPagePreview: string;
  contentType: ContentType;
  recommendedMode: CompressionMode;
};

type CompressionResult = {
  name: string;
  url: string;
  originalSize: number;
  outputSize: number;
  savedBytes: number;
  percentChange: number;
  modeUsed: CompressionMode;
  isValid: boolean;
  message: string;
};

const presetSettings: Record<CompressionPreset, { label: string; quality: number; dpi: number; note: string }> = {
  high: {
    label: "High Quality",
    quality: 0.88,
    dpi: 150,
    note: "Better visual quality, larger output expected.",
  },
  balanced: {
    label: "Balanced",
    quality: 0.72,
    dpi: 120,
    note: "Good quality with moderate image compression.",
  },
  small: {
    label: "Small Size",
    quality: 0.52,
    dpi: 72,
    note: "Smaller output, more visible quality loss possible.",
  },
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

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getCompressionMessage(originalSize: number, outputSize: number) {
  const difference = originalSize - outputSize;
  const percent = originalSize > 0 ? (difference / originalSize) * 100 : 0;

  if (difference > 0) {
    return {
      savedBytes: difference,
      percentChange: percent,
      message: `${percent.toFixed(1)}% smaller`,
    };
  }

  if (difference === 0) {
    return {
      savedBytes: 0,
      percentChange: 0,
      message: "No size reduction achieved",
    };
  }

  return {
    savedBytes: difference,
    percentChange: percent,
    message: `Output is ${Math.abs(percent).toFixed(1)}% larger`,
  };
}

function analyzeContentType(fileSize: number, pageCount: number): { contentType: ContentType; recommendedMode: CompressionMode } {
  const averagePageSize = pageCount > 0 ? fileSize / pageCount : fileSize;

  if (averagePageSize > 650 * 1024) {
    return {
      contentType: "Likely image-heavy",
      recommendedMode: "image",
    };
  }

  if (averagePageSize < 180 * 1024) {
    return {
      contentType: "Likely text/vector-heavy",
      recommendedMode: "preserve",
    };
  }

  return {
    contentType: "Mixed/unknown",
    recommendedMode: "preserve",
  };
}

async function analyzePdf(file: File): Promise<PdfInfo> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.32 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create PDF preview canvas.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvas,
    canvasContext: context,
    viewport,
  }).promise;

  const analysis = analyzeContentType(file.size, pdf.numPages);

  return {
    pageCount: pdf.numPages,
    firstPagePreview: canvas.toDataURL("image/jpeg", 0.76),
    contentType: analysis.contentType,
    recommendedMode: analysis.recommendedMode,
  };
}

async function compressPreserveQuality(file: File, removeMetadata: boolean) {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });

  if (removeMetadata) {
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator("");
    pdfDoc.setProducer("");
  }

  const bytes = await pdfDoc.save({
    useObjectStreams: true,
  });

  return createPdfBlob(bytes);
}

async function compressAsImages(file: File, quality: number, dpi: number, setStatus: (message: string) => void) {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data: buffer });
  const pdf = await task.promise;
  const outputPdf = await PDFDocument.create();
  const scale = dpi / 72;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    setStatus(`Rendering page ${pageNumber} of ${pdf.numPages}...`);

    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const renderViewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to create image compression canvas.");
    }

    canvas.width = Math.ceil(renderViewport.width);
    canvas.height = Math.ceil(renderViewport.height);

    await page.render({
      canvas,
      canvasContext: context,
      viewport: renderViewport,
    }).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const jpgBytes = dataUrlToBytes(dataUrl);
    const jpgImage = await outputPdf.embedJpg(jpgBytes);
    const outputPage = outputPdf.addPage([baseViewport.width, baseViewport.height]);

    outputPage.drawRectangle({
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
      color: rgb(1, 1, 1),
    });

    outputPage.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });
  }

  setStatus("Building compressed PDF...");

  const bytes = await outputPdf.save({
    useObjectStreams: true,
  });

  return createPdfBlob(bytes);
}

async function validatePdfBlob(blob: Blob) {
  try {
    const buffer = await blob.arrayBuffer();
    await PDFDocument.load(buffer, { ignoreEncryption: true });
    return true;
  } catch {
    return false;
  }
}

export default function PdfCompressorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [mode, setMode] = useState<CompressionMode>("smart");
  const [preset, setPreset] = useState<CompressionPreset>("balanced");
  const [quality, setQuality] = useState("72");
  const [dpi, setDpi] = useState("120");
  const [removeMetadata, setRemoveMetadata] = useState(false);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [status, setStatus] = useState("Upload a PDF to analyze compression options.");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const selectedPreset = presetSettings[preset];

  const modeUsed = useMemo(() => {
    if (mode === "smart") {
      return pdfInfo?.recommendedMode || "preserve";
    }

    return mode;
  }, [mode, pdfInfo]);

  function clearResult() {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  }

  async function loadFile(selectedFile: File) {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setError("");
      clearResult();
      setStatus("Analyzing PDF...");

      const info = await analyzePdf(selectedFile);

      setFile(selectedFile);
      setPdfInfo(info);
      setStatus(`Analysis complete. Recommended mode: ${info.recommendedMode === "image" ? "Image Compression" : "Preserve PDF Quality"}.`);
    } catch (readError) {
      console.error("PDF compressor analysis error:", readError);
      setFile(null);
      setPdfInfo(null);
      setError("Unable to analyze this PDF. It may be corrupted, password-protected, or unsupported by browser-side processing.");
      setStatus("Upload another PDF to try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) loadFile(selectedFile);

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) loadFile(selectedFile);
  }

  function applyPreset(nextPreset: CompressionPreset) {
    const settings = presetSettings[nextPreset];

    setPreset(nextPreset);
    setQuality(String(Math.round(settings.quality * 100)));
    setDpi(String(settings.dpi));
    clearResult();
  }

  async function compressPdf() {
    if (!file) {
      setError("Please upload a PDF first.");
      return;
    }

    try {
      setIsCompressing(true);
      setError("");
      clearResult();

      const finalMode = modeUsed;
      let outputBlob: Blob;

      if (finalMode === "preserve") {
        setStatus("Preparing preserve-quality compression...");
        outputBlob = await compressPreserveQuality(file, removeMetadata);
      } else {
        const safeQuality = Math.max(10, Math.min(Number(quality) || 72, 95)) / 100;
        const safeDpi = Math.max(72, Math.min(Number(dpi) || 120, 180));

        setStatus("Preparing image compression...");
        outputBlob = await compressAsImages(file, safeQuality, safeDpi, setStatus);
      }

      setStatus("Validating output PDF...");

      const isValid = await validatePdfBlob(outputBlob);

      if (!isValid) {
        setError("Compression could not produce a valid PDF.");
        setStatus("Output validation failed.");
        return;
      }

      const url = URL.createObjectURL(outputBlob);
      const stats = getCompressionMessage(file.size, outputBlob.size);

      setResult({
        name: `${cleanFileName(file.name)}-compressed.pdf`,
        url,
        originalSize: file.size,
        outputSize: outputBlob.size,
        savedBytes: stats.savedBytes,
        percentChange: stats.percentChange,
        modeUsed: finalMode,
        isValid,
        message: stats.message,
      });

      setStatus("Compression complete.");
      alert("PDF compression finished.");
    } catch (processError) {
      console.error("PDF compressor error:", processError);
      setError("Unable to process this PDF. It may be corrupted, password-protected, too large, or use a feature that is not supported by browser-side processing.");
      setStatus("Compression failed.");
    } finally {
      setIsCompressing(false);
    }
  }

  async function copySummary() {
    const summary = `PDF Compressor Lite Summary

File: ${file?.name || "No file"}
Original size: ${file ? formatBytes(file.size) : "N/A"}
Page count: ${pdfInfo?.pageCount || 0}
Content type: ${pdfInfo?.contentType || "N/A"}
Selected mode: ${mode}
Actual mode used: ${modeUsed}
Preset: ${presetSettings[preset].label}
Image quality: ${quality}%
DPI: ${dpi}
Remove metadata: ${removeMetadata ? "Yes" : "No"}
Result: ${result ? result.message : "Not compressed yet"}`;

    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Compressor Lite"
          description="Compress PDF online for free directly in your browser. Reduce PDF file size with honest preserve-quality and image compression modes without uploading files."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Upload PDF</h2>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-900 focus-within:border-blue-400"
              >
                <span className="text-4xl">PDF</span>
                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">Your PDF stays on your device. No server upload.</span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="break-all font-bold text-white">{file.name}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatBytes(file.size)} - {pdfInfo?.pageCount || 0} pages
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPdfInfo(null);
                      clearResult();
                      setError("");
                      setStatus("Upload a PDF to analyze compression options.");
                    }}
                    className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 font-bold text-red-200 transition hover:bg-red-900/60"
                  >
                    Remove
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                {isAnalyzing ? "Analyzing PDF..." : status}
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">PDF Analysis</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Original Size</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">{file ? formatBytes(file.size) : "0 B"}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Pages</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">{pdfInfo?.pageCount || 0}</p>
                </div>

                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Content Type</p>
                  <p className="mt-2 text-lg font-bold text-purple-300">{pdfInfo?.contentType || "Not analyzed"}</p>
                </div>
              </div>

              <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
                Recommended:{" "}
                <span className="font-bold text-white">
                  {pdfInfo?.recommendedMode === "image" ? "Image Compression" : "Preserve PDF Quality"}
                </span>
                . This is only a recommendation; you remain in control.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Compression Settings</h2>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Compression Mode</span>
                <select
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value as CompressionMode);
                    clearResult();
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                >
                  <option value="smart">Smart Compression</option>
                  <option value="preserve">Preserve PDF Quality</option>
                  <option value="image">Image Compression</option>
                </select>
              </label>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(["high", "balanced", "small"] as CompressionPreset[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyPreset(item)}
                    className={`rounded-xl border p-4 text-left font-bold transition ${
                      preset === item
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    <span className="block">{presetSettings[item].label}</span>
                    <span className="mt-1 block text-xs font-medium text-slate-300">{presetSettings[item].note}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Image Quality: {quality}%</span>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="1"
                    value={quality}
                    onChange={(event) => {
                      setQuality(event.target.value);
                      clearResult();
                    }}
                    disabled={modeUsed === "preserve"}
                    className="w-full disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Resolution / DPI</span>
                  <select
                    value={dpi}
                    onChange={(event) => {
                      setDpi(event.target.value);
                      clearResult();
                    }}
                    disabled={modeUsed === "preserve"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="72">Screen / 72 DPI</option>
                    <option value="120">Balanced / 120 DPI</option>
                    <option value="150">Print / 150 DPI</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                <input
                  type="checkbox"
                  checked={removeMetadata}
                  onChange={(event) => {
                    setRemoveMetadata(event.target.checked);
                    clearResult();
                  }}
                />
                <span>
                  Remove unnecessary metadata
                  <span className="mt-1 block text-sm font-normal text-slate-300">
                    Optional. This may remove title, author, subject, keywords, creator and producer metadata.
                  </span>
                </span>
              </label>

              {modeUsed === "image" && (
                <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                  Image Compression rebuilds PDF pages as JPEG images. Text may no longer be selectable or searchable.
                </p>
              )}

              {modeUsed === "preserve" && (
                <p className="mt-4 rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 text-sm font-semibold text-blue-200">
                  Preserve PDF Quality does not rasterize pages. Some text/vector PDFs may show little or no size reduction.
                </p>
              )}
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Preview</h2>

              {pdfInfo?.firstPagePreview ? (
                <div className="mx-auto max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <img src={pdfInfo.firstPagePreview} alt="PDF first page preview" className="mx-auto rounded bg-white" />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center text-slate-300">
                  First page preview will appear here.
                </div>
              )}

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                Mode: {modeUsed === "image" ? "Image Compression" : "Preserve PDF Quality"} - Preset: {selectedPreset.label}
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Compress & Download</h2>

              <button
                type="button"
                onClick={compressPdf}
                disabled={!file || isCompressing || isAnalyzing}
                className="w-full rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCompressing ? "Compressing..." : "Compress PDF"}
              </button>

              <button
                type="button"
                onClick={copySummary}
                className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white transition hover:bg-slate-700"
              >
                Copy Summary
              </button>

              {result ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                      <p className="text-sm text-blue-200">Original</p>
                      <p className="mt-2 text-2xl font-bold text-blue-300">{formatBytes(result.originalSize)}</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                      <p className="text-sm text-emerald-200">Compressed</p>
                      <p className="mt-2 text-2xl font-bold text-emerald-300">{formatBytes(result.outputSize)}</p>
                    </div>

                    <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                      <p className="text-sm text-purple-200">Result</p>
                      <p className="mt-2 text-lg font-bold text-purple-300">{result.message}</p>
                    </div>
                  </div>

                  {result.savedBytes > 0 ? (
                    <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">
                      Saved {formatBytes(result.savedBytes)}. Reduction: {result.percentChange.toFixed(1)}%.
                    </p>
                  ) : (
                    <p className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                      No significant size reduction achieved. This PDF may already be optimized or mostly contain text/vector content.
                    </p>
                  )}

                  {result.modeUsed === "image" && (
                    <p className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                      Compression mode: Image Compression. Text/searchability may have changed because pages were rendered as images.
                    </p>
                  )}

                  <a
                    href={result.url}
                    download={result.name}
                    className="flex flex-col gap-2 rounded-xl border border-blue-500/50 bg-blue-950/40 p-4 font-bold text-white transition hover:bg-blue-900/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="break-all">{result.name}</span>
                    <span className="text-sm text-blue-200">Download Compressed PDF</span>
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                  Compression results will appear here.
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Privacy</h2>
              <p className="text-slate-300">
                PDF compression is performed locally in your browser. Files are not uploaded to our server.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Known Limitations</h2>
              <p className="text-slate-300">
                Browser-side compression cannot match every native/server PDF optimizer. Text/vector-heavy PDFs may show
                little or no size reduction. Image Compression can remove text searchability. Some PDFs may become larger
                after processing. Password-protected, encrypted or very large PDFs may fail.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
