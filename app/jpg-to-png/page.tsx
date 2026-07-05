"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function createDownloadName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "converted-image";
  return `${baseName}.png`;
}

export default function JpgToPngPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [pngUrl, setPngUrl] = useState("");
  const [pngSize, setPngSize] = useState(0);

  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  const resultReady = Boolean(originalFile && pngUrl && pngSize);

  const sizeChangePercent =
    originalFile && pngSize
      ? ((pngSize - originalFile.size) / originalFile.size) * 100
      : 0;

  const statusLabel = useMemo(() => {
    if (!originalFile) return "Upload JPG";
    if (isConverting) return "Converting...";
    if (resultReady) return "PNG ready";
    return "Ready to convert";
  }, [originalFile, isConverting, resultReady]);

  function clearResult() {
    if (pngUrl) {
      URL.revokeObjectURL(pngUrl);
    }

    setPngUrl("");
    setPngSize(0);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    clearResult();

    if (!file) return;

    const isJpg =
      file.type === "image/jpeg" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg");

    if (!isJpg) {
      setError("Please upload a JPG or JPEG image only.");
      return;
    }

    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setOriginalFile(file);
    setOriginalPreview(previewUrl);

    const image = new window.Image();

    image.onload = () => {
      setImageWidth(image.naturalWidth);
      setImageHeight(image.naturalHeight);
    };

    image.onerror = () => {
      setError("Unable to read this JPG image. Please try another file.");
    };

    image.src = previewUrl;
  }

  async function convertToPng() {
    if (!originalFile || !originalPreview) {
      alert("Please upload a JPG image first.");
      return;
    }

    setError("");
    setIsConverting(true);
    clearResult();

    try {
      const image = new window.Image();

      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to load image."));
      });

      image.src = originalPreview;
      await imageLoaded;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas is not supported in this browser.");
      }

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!blob) {
        throw new Error("Unable to convert JPG to PNG.");
      }

      setPngUrl(URL.createObjectURL(blob));
      setPngSize(blob.size);
    } catch {
      setError("JPG to PNG conversion failed. Please try another image.");
    } finally {
      setIsConverting(false);
    }
  }

  function resetTool() {
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    clearResult();
    setOriginalFile(null);
    setOriginalPreview("");
    setImageWidth(0);
    setImageHeight(0);
    setError("");
  }

  async function copyResult() {
    if (!originalFile || !pngSize) {
      alert("Please convert a JPG image first.");
      return;
    }

    const text = `JPG to PNG Converter Result

Input Format: JPG/JPEG
Output Format: PNG
Original File Size: ${formatBytes(originalFile.size)}
PNG File Size: ${formatBytes(pngSize)}
Size Change: ${sizeChangePercent.toFixed(1)}%
Dimensions: ${imageWidth} x ${imageHeight}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("JPG to PNG result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🖼️ JPG to PNG Converter"
          description="Convert JPG and JPEG images to PNG online in your browser with preview, file size comparison and instant download."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload JPG Image
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose a JPG or JPEG image and convert it to PNG locally.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {statusLabel}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/jpeg,.jpg,.jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload JPG
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports .jpg and .jpeg images.
                  </span>
                </label>

                {originalPreview ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={originalPreview}
                      alt="Original JPG preview"
                      className="max-h-[320px] w-full object-contain"
                    />
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ⚙️ Convert Settings
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    Output format
                  </p>
                  <p className="mt-2 text-4xl font-extrabold text-blue-300">
                    PNG
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    PNG is useful for screenshots, editing workflows and
                    lossless image storage.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={convertToPng}>
                    {isConverting ? "⏳ Converting..." : "⚡ Convert to PNG"}
                  </Button>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                  >
                    🔄 Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={copyResult}
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  📋 Copy Result
                </button>

                <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                  JPG images do not contain transparency. Converting JPG to PNG
                  will not automatically remove or make the background
                  transparent.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ PNG Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    JPG
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Input Format
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    PNG
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Output Format
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {originalFile ? formatBytes(originalFile.size) : "0 B"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Original Size
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div
                    className={`text-2xl font-extrabold ${
                      sizeChangePercent <= 0
                        ? "text-emerald-400"
                        : "text-amber-300"
                    }`}
                  >
                    {resultReady ? `${sizeChangePercent.toFixed(1)}%` : "0%"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Size Change</div>
                </div>
              </div>

              {pngUrl ? (
                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={pngUrl}
                      alt="Converted PNG preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <h3 className="text-xl font-bold text-white">
                      📥 Download Ready
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      Your PNG image is ready. Download it and use it for
                      editing, documents or web graphics.
                    </p>

                    <a
                      href={pngUrl}
                      download={
                        originalFile
                          ? createDownloadName(originalFile.name)
                          : "converted-image.png"
                      }
                      className="mt-5 block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download PNG
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload a JPG image and click convert to see the PNG result
                  here.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your JPG image is processed inside your browser.
              This tool does not upload your image to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a JPG to PNG Converter?
                </h2>
                <p className="text-slate-300">
                  A JPG to PNG converter changes a JPEG image into a PNG file.
                  PNG is useful when you need lossless quality, editing-friendly
                  output or a format commonly used for graphics and screenshots.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 JPG vs PNG
                </h2>
                <p className="text-slate-300">
                  JPG is usually smaller and best for photos. PNG keeps image
                  quality better and is commonly used for screenshots, design
                  assets and graphics, but PNG files can be larger.
                </p>
              </div>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}