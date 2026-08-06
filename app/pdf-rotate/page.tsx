"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import { PDFDocument, degrees } from "pdf-lib";

type RotateMode = "all" | "range" | "custom";
type RotationAngle = 90 | 180 | 270;

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function parsePages(value: string, totalPages: number) {
  const pages = new Set<number>();

  value.split(",").forEach((part) => {
    const text = part.trim();

    if (!text) return;

    if (text.includes("-")) {
      const [startRaw, endRaw] = text.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);

      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        for (let page = start; page <= end; page += 1) {
          if (page >= 1 && page <= totalPages) pages.add(page);
        }
      }

      return;
    }

    const page = Number(text);

    if (!Number.isNaN(page) && page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  });

  return Array.from(pages).sort((first, second) => first - second);
}

function downloadBlob(bytes: Uint8Array, filename: string) {
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

export default function PdfRotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [rotateMode, setRotateMode] = useState<RotateMode>("all");
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [pageRange, setPageRange] = useState("1-3");
  const [customPages, setCustomPages] = useState("1,3,5");
  const [outputSize, setOutputSize] = useState(0);
  const [rotatedPages, setRotatedPages] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const selectedPages = useMemo(() => {
    if (pageCount === 0) return [];

    if (rotateMode === "all") {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    if (rotateMode === "range") {
      return parsePages(pageRange, pageCount);
    }

    return parsePages(customPages, pageCount);
  }, [pageCount, rotateMode, pageRange, customPages]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(selectedFile.size);
    setOutputSize(0);
    setRotatedPages([]);
    setError("");
    setStatus("Reading PDF...");

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      setPageCount(pdfDoc.getPageCount());
      setStatus("PDF ready. Choose rotation settings.");
    } catch {
      setFile(null);
      setFileName("");
      setFileSize(0);
      setPageCount(0);
      setStatus("");
      setError("Unable to read this PDF. Password-protected PDFs may fail.");
    } finally {
      event.target.value = "";
    }
  };

  const rotatePdf = async () => {
    if (!file) {
      alert("Please upload a PDF first.");
      return;
    }

    if (selectedPages.length === 0) {
      alert("Please select at least one valid page.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Rotating PDF pages...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();

      selectedPages.forEach((pageNumber) => {
        const page = pages[pageNumber - 1];
        const currentRotation = page.getRotation().angle || 0;
        const nextRotation = (currentRotation + angle) % 360;

        page.setRotation(degrees(nextRotation));
      });

      const outputBytes = await pdfDoc.save();
      setOutputSize(outputBytes.length);
      setRotatedPages(selectedPages);
      setStatus(`Rotated ${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"}.`);

      downloadBlob(
        outputBytes,
        `${fileName.replace(/\.pdf$/i, "") || "document"}-rotated.pdf`
      );

      alert("Rotated PDF downloaded!");
    } catch {
      setError("Unable to rotate this PDF. Please try another file.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const copySummary = async () => {
    const summary = `PDF Rotate Summary

File: ${fileName || "No PDF selected"}
Original size: ${formatBytes(fileSize)}
Output size: ${formatBytes(outputSize)}
Total pages: ${pageCount}
Rotation angle: ${angle} degrees
Rotate mode: ${rotateMode}
Selected pages: ${selectedPages.join(", ") || "None"}
Rotated pages: ${rotatedPages.join(", ") || "Not rotated yet"}`;

    await navigator.clipboard.writeText(summary);
    alert("PDF rotate summary copied!");
  };

  const resetTool = () => {
    setFile(null);
    setFileName("");
    setFileSize(0);
    setPageCount(0);
    setRotateMode("all");
    setAngle(90);
    setPageRange("1-3");
    setCustomPages("1,3,5");
    setOutputSize(0);
    setRotatedPages([]);
    setLoading(false);
    setStatus("");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔄 PDF Rotate Pages"
          description="Rotate all PDF pages or selected PDF pages by 90, 180 or 270 degrees directly in your browser."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Upload PDF
                </h2>
                <p className="text-slate-300">
                  Select a PDF, choose pages and rotation angle, then download
                  the rotated PDF.
                </p>
              </div>

              <label className="block rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-8 text-center transition hover:border-blue-500">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFile}
                  disabled={loading}
                  className="hidden"
                />
                <span className="block text-4xl">📤</span>
                <span className="mt-3 block text-xl font-bold text-white">
                  Choose PDF File
                </span>
                <span className="mt-2 block text-slate-400">
                  PDF rotation happens locally in your browser.
                </span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Rotation Angle
                  </span>
                  <select
                    value={angle}
                    onChange={(event) =>
                      setAngle(Number(event.target.value) as RotationAngle)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value={90}>90° clockwise</option>
                    <option value={180}>180°</option>
                    <option value={270}>270° clockwise</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Rotate Mode
                  </span>
                  <select
                    value={rotateMode}
                    onChange={(event) => setRotateMode(event.target.value as RotateMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="all">All pages</option>
                    <option value="range">Page range</option>
                    <option value="custom">Custom pages</option>
                  </select>
                </label>
              </div>

              {rotateMode === "range" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Page Range
                  </span>
                  <input
                    type="text"
                    value={pageRange}
                    onChange={(event) => setPageRange(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    placeholder="Example: 1-3"
                  />
                </label>
              )}

              {rotateMode === "custom" && (
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Custom Pages
                  </span>
                  <input
                    type="text"
                    value={customPages}
                    onChange={(event) => setCustomPages(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    placeholder="Example: 1,3,5"
                  />
                </label>
              )}

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
                <Button onClick={rotatePdf}>
                  {loading ? "⏳ Rotating" : "🔄 Rotate PDF"}
                </Button>
                <Button onClick={copySummary}>📋 Copy Summary</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔁 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📊 PDF Summary
                </h2>
                <p className="text-slate-300">
                  Review selected pages and rotation output.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-slate-300">Total Pages</p>
                  <p className="mt-1 text-3xl font-bold text-blue-300">
                    {pageCount}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <p className="text-sm text-slate-300">Selected Pages</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-300">
                    {selectedPages.length}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
                  <p className="text-sm text-slate-300">Original Size</p>
                  <p className="mt-1 text-3xl font-bold text-purple-300">
                    {formatBytes(fileSize)}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <p className="text-sm text-slate-300">Output Size</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {formatBytes(outputSize)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 Selected PDF
                </h3>
                <div className="space-y-2 text-slate-300">
                  <p className="break-words">
                    <span className="font-bold text-slate-100">Name:</span>{" "}
                    {fileName || "No PDF selected"}
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Angle:</span>{" "}
                    {angle}°
                  </p>
                  <p>
                    <span className="font-bold text-slate-100">Mode:</span>{" "}
                    {rotateMode}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  🧾 Pages to Rotate
                </h3>
                <p className="break-words text-slate-300">
                  {selectedPages.length > 0
                    ? selectedPages.join(", ")
                    : "Upload a PDF and select pages."}
                </p>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔒 Privacy Friendly
            </h2>
            <p className="text-slate-300">
              PDF rotation happens inside your browser. The file is not uploaded
              to a server by this tool.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Use
            </h2>
            <p className="text-slate-300">
              Use this tool to fix scanned PDFs, sideways pages, upside-down
              documents and selected page orientation issues.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Password-protected PDFs may fail, and very large PDFs can take
              longer to process on mobile devices.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}