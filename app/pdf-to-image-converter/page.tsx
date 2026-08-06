"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputFormat = "png" | "jpeg";

type ConvertedPage = {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function dataUrlSize(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export default function PdfToImageConverterPage() {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [scale, setScale] = useState(2);
  const [pageRange, setPageRange] = useState("all");
  const [convertedPages, setConvertedPages] = useState<ConvertedPage[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const totalOutputSize = useMemo(
    () => convertedPages.reduce((total, page) => total + page.size, 0),
    [convertedPages]
  );

  const parsePageRange = (range: string, maxPages: number) => {
    if (range.trim().toLowerCase() === "all") {
      return Array.from({ length: maxPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();

    range.split(",").forEach((part) => {
      const value = part.trim();

      if (!value) return;

      if (value.includes("-")) {
        const [startRaw, endRaw] = value.split("-");
        const start = Number(startRaw);
        const end = Number(endRaw);

        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          for (let page = start; page <= end; page += 1) {
            if (page >= 1 && page <= maxPages) pages.add(page);
          }
        }

        return;
      }

      const page = Number(value);

      if (!Number.isNaN(page) && page >= 1 && page <= maxPages) {
        pages.add(page);
      }
    });

    return Array.from(pages).sort((first, second) => first - second);
  };

  const convertPdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setConvertedPages([]);
    setError("");
    setStatus("Reading PDF...");
    setLoading(true);

    try {
      const pdfjsLib = await import("pdfjs-dist");

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      setTotalPages(pdf.numPages);

      const selectedPages = parsePageRange(pageRange, pdf.numPages);

      if (selectedPages.length === 0) {
        setError("Please enter a valid page range, like all, 1, 1-3 or 1,3,5.");
        setLoading(false);
        return;
      }

      const results: ConvertedPage[] = [];

      for (const pageNumber of selectedPages) {
        setStatus(`Converting page ${pageNumber} of ${pdf.numPages}...`);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Canvas is not supported in this browser.");
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const dataUrl =
          format === "png"
            ? canvas.toDataURL(mimeType)
            : canvas.toDataURL(mimeType, quality);

        results.push({
          pageNumber,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          size: dataUrlSize(dataUrl),
        });

        setConvertedPages([...results]);
      }

      setStatus(`Converted ${results.length} page${results.length === 1 ? "" : "s"}.`);
      alert("PDF converted to images!");
    } catch {
      setError(
        "Unable to convert this PDF. Password-protected or very large PDFs may fail in browser."
      );
      setStatus("");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const downloadAll = () => {
    if (convertedPages.length === 0) {
      alert("Please convert a PDF first.");
      return;
    }

    convertedPages.forEach((page, index) => {
      setTimeout(() => {
        downloadDataUrl(
          page.dataUrl,
          `${fileName.replace(/\.pdf$/i, "") || "pdf"}-page-${page.pageNumber}.${format === "jpeg" ? "jpg" : "png"}`
        );
      }, index * 250);
    });
  };

  const copySummary = async () => {
    const summary = `PDF to Image Conversion Report

File: ${fileName || "Not selected"}
Original size: ${formatBytes(fileSize)}
Total PDF pages: ${totalPages}
Converted pages: ${convertedPages.length}
Output format: ${format.toUpperCase()}
Scale: ${scale}x
Output size: ${formatBytes(totalOutputSize)}

Pages:
${convertedPages
  .map(
    (page) =>
      `Page ${page.pageNumber}: ${page.width}x${page.height}, ${formatBytes(page.size)}`
  )
  .join("\n")}`;

    await navigator.clipboard.writeText(summary);
    alert("Conversion summary copied!");
  };

  const resetTool = () => {
    setFileName("");
    setFileSize(0);
    setFormat("png");
    setQuality(0.92);
    setScale(2);
    setPageRange("all");
    setConvertedPages([]);
    setTotalPages(0);
    setLoading(false);
    setStatus("");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🖼️ PDF to Image Converter"
          description="Convert PDF pages to PNG or JPG images directly in your browser with page range, quality and resolution options."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Upload PDF
                </h2>
                <p className="text-slate-300">
                  Select a PDF file and convert pages into downloadable images.
                  Your file stays in your browser.
                </p>
              </div>

              <label className="block rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-8 text-center transition hover:border-blue-500">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={convertPdf}
                  disabled={loading}
                  className="hidden"
                />
                <span className="block text-4xl">📤</span>
                <span className="mt-3 block text-xl font-bold text-white">
                  Choose PDF File
                </span>
                <span className="mt-2 block text-slate-400">
                  PDF pages will be rendered as images locally.
                </span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Output Format
                  </span>
                  <select
                    value={format}
                    onChange={(event) => setFormat(event.target.value as OutputFormat)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPG</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Resolution
                  </span>
                  <select
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value={1}>Standard 1x</option>
                    <option value={1.5}>Better 1.5x</option>
                    <option value={2}>High 2x</option>
                    <option value={3}>Ultra 3x</option>
                  </select>
                </label>
              </div>

              {format === "jpeg" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    JPG Quality: {Math.round(quality * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.01"
                    value={quality}
                    onChange={(event) => setQuality(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Page Range
                </span>
                <input
                  type="text"
                  value={pageRange}
                  onChange={(event) => setPageRange(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  placeholder="all, 1, 1-3, 1,3,5"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                  ⚠️ {error}
                </div>
              )}

              {status && (
                <div className="rounded-xl border border-blue-500/40 bg-blue-500/10 p-4 text-blue-200">
                  {loading ? "⏳" : "✅"} {status}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={downloadAll}>⬇️ Download All</Button>
                <Button onClick={copySummary}>📋 Copy Summary</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 Conversion Summary
                </h2>
                <p className="text-slate-300">
                  Review PDF details and converted image output.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">PDF Pages</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {totalPages}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Converted</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {convertedPages.length}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">PDF Size</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {formatBytes(fileSize)}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Output Size</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {formatBytes(totalOutputSize)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 File Info
                </h3>
                <div className="space-y-2 text-slate-300">
                  <p className="break-words">
                    <span className="font-bold text-slate-100">Name:</span>{" "}
                    {fileName || "No PDF selected"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Format:</span>{" "}
                    {format.toUpperCase()}
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Resolution:</span>{" "}
                    {scale}x
                  </p>
                </div>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="text-2xl font-bold text-white">🧾 Converted Images</h2>

          {convertedPages.length === 0 ? (
            <ToolCard>
              <p className="text-slate-400">
                Converted PDF page images will appear here.
              </p>
            </ToolCard>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {convertedPages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        Page {page.pageNumber}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {page.width} x {page.height} • {formatBytes(page.size)}
                      </p>
                    </div>

                    <Button
                      onClick={() =>
                        downloadDataUrl(
                          page.dataUrl,
                          `${fileName.replace(/\.pdf$/i, "") || "pdf"}-page-${page.pageNumber}.${format === "jpeg" ? "jpg" : "png"}`
                        )
                      }
                    >
                      ⬇️ Download
                    </Button>
                  </div>

                  <div className="max-h-[520px] overflow-auto rounded-xl border border-slate-700 bg-white p-3">
                    <img
                      src={page.dataUrl}
                      alt={`PDF page ${page.pageNumber}`}
                      className="mx-auto h-auto max-w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔒 Privacy Friendly
            </h2>
            <p className="text-slate-300">
              PDF rendering happens inside your browser. The file is not uploaded
              to a server by this tool.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Use
            </h2>
            <p className="text-slate-300">
              Use PNG for sharp document screenshots and JPG when you want
              smaller image files.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Password-protected PDFs may fail, and very large PDFs can be slow
              on mobile devices.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}