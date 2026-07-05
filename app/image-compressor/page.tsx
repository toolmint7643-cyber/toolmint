"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

const outputFormats = [
  { label: "JPEG", value: "image/jpeg", extension: "jpg" },
  { label: "PNG", value: "image/png", extension: "png" },
  { label: "WEBP", value: "image/webp", extension: "webp" },
] as const;

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function getOutputExtension(format: OutputFormat) {
  return (
    outputFormats.find((item) => item.value === format)?.extension || "jpg"
  );
}

function createDownloadName(fileName: string, format: OutputFormat) {
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "compressed-image";
  return `${baseName}-compressed.${getOutputExtension(format)}`;
}

function calculateNewSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { width, height };
  }

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

export default function ImageCompressorPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [compressedUrl, setCompressedUrl] = useState("");
  const [compressedSize, setCompressedSize] = useState(0);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [compressedWidth, setCompressedWidth] = useState(0);
  const [compressedHeight, setCompressedHeight] = useState(0);

  const [quality, setQuality] = useState(75);
  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/jpeg");
  const [maxWidth, setMaxWidth] = useState("1920");
  const [maxHeight, setMaxHeight] = useState("1080");

  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState("");

  const savedBytes = originalFile ? originalFile.size - compressedSize : 0;
  const savedPercent =
    originalFile && compressedSize > 0
      ? Math.max(0, (savedBytes / originalFile.size) * 100)
      : 0;

  const resultReady = Boolean(originalFile && compressedUrl && compressedSize);

  const compressionLabel = useMemo(() => {
    if (!originalFile) return "Upload image";
    if (isCompressing) return "Compressing...";
    if (resultReady) return "Compressed";
    return "Ready to compress";
  }, [originalFile, isCompressing, resultReady]);

  function clearCompressedResult() {
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
    }

    setCompressedUrl("");
    setCompressedSize(0);
    setCompressedWidth(0);
    setCompressedHeight(0);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    clearCompressedResult();

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
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
      setOriginalWidth(image.naturalWidth);
      setOriginalHeight(image.naturalHeight);
      setMaxWidth(String(image.naturalWidth));
      setMaxHeight(String(image.naturalHeight));
    };

    image.onerror = () => {
      setError("Unable to read this image. Please try another file.");
    };

    image.src = previewUrl;
  }

  async function compressImage() {
    if (!originalFile || !originalPreview) {
      alert("Please upload an image first.");
      return;
    }

    setError("");
    setIsCompressing(true);
    clearCompressedResult();

    try {
      const image = new window.Image();

      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to load image."));
      });

      image.src = originalPreview;
      await imageLoaded;

      const targetMaxWidth = Number(maxWidth);
      const targetMaxHeight = Number(maxHeight);

      const targetSize = calculateNewSize(
        image.naturalWidth,
        image.naturalHeight,
        Number.isFinite(targetMaxWidth) ? targetMaxWidth : image.naturalWidth,
        Number.isFinite(targetMaxHeight) ? targetMaxHeight : image.naturalHeight
      );

      const canvas = document.createElement("canvas");
      canvas.width = targetSize.width;
      canvas.height = targetSize.height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas is not supported in this browser.");
      }

      if (outputFormat === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputFormat, quality / 100);
      });

      if (!blob) {
        throw new Error("Unable to compress image. Try another format.");
      }

      const nextUrl = URL.createObjectURL(blob);

      setCompressedUrl(nextUrl);
      setCompressedSize(blob.size);
      setCompressedWidth(targetSize.width);
      setCompressedHeight(targetSize.height);
    } catch {
      setError("Image compression failed. Please try another image or format.");
    } finally {
      setIsCompressing(false);
    }
  }

  function resetTool() {
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    clearCompressedResult();
    setOriginalFile(null);
    setOriginalPreview("");
    setOriginalWidth(0);
    setOriginalHeight(0);
    setQuality(75);
    setOutputFormat("image/jpeg");
    setMaxWidth("1920");
    setMaxHeight("1080");
    setError("");
  }

  async function copyResult() {
    if (!originalFile || !compressedSize) {
      alert("Please compress an image first.");
      return;
    }

    const text = `Image Compressor Result

Original Size: ${formatBytes(originalFile.size)}
Compressed Size: ${formatBytes(compressedSize)}
Saved: ${formatBytes(Math.max(0, savedBytes))} (${savedPercent.toFixed(1)}%)
Original Dimensions: ${originalWidth} x ${originalHeight}
Output Dimensions: ${compressedWidth} x ${compressedHeight}
Format: ${outputFormats.find((item) => item.value === outputFormat)?.label}
Quality: ${quality}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Image compression result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🖼️ Image Compressor"
          description="Compress JPG, PNG and WEBP images online, reduce image size, resize dimensions and download optimized images instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload Image
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose an image, set quality and compress it in your
                      browser.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {compressionLabel}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload image
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports JPG, PNG, WEBP and most browser-readable image
                    files.
                  </span>
                </label>

                {originalPreview ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={originalPreview}
                      alt="Original preview"
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
                  ⚙️ Compression Settings
                </h2>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-slate-300">
                      <span>Quality</span>
                      <strong className="text-blue-300">{quality}%</strong>
                    </span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(event) =>
                        setQuality(Number(event.target.value))
                      }
                      className="w-full accent-blue-600"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Lower quality means smaller file size. PNG may not reduce
                      as much as JPG or WEBP.
                    </p>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Output format
                    </span>
                    <select
                      value={outputFormat}
                      onChange={(event) =>
                        setOutputFormat(event.target.value as OutputFormat)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      {outputFormats.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Max width
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={maxWidth}
                        onChange={(event) => setMaxWidth(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Max height
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={maxHeight}
                        onChange={(event) => setMaxHeight(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={compressImage}>
                      {isCompressing ? "⏳ Compressing..." : "⚡ Compress Image"}
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    📋 Copy Result
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ Compression Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {originalFile ? formatBytes(originalFile.size) : "0 B"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Original Size
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {compressedSize ? formatBytes(compressedSize) : "0 B"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Compressed Size
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-emerald-400">
                    {resultReady ? `${savedPercent.toFixed(1)}%` : "0%"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Saved</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {compressedWidth && compressedHeight
                      ? `${compressedWidth} x ${compressedHeight}`
                      : originalWidth && originalHeight
                      ? `${originalWidth} x ${originalHeight}`
                      : "0 x 0"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Dimensions</div>
                </div>
              </div>

              {compressedUrl ? (
                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={compressedUrl}
                      alt="Compressed preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <h3 className="text-xl font-bold text-white">
                      📥 Download Ready
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      Your compressed image is ready. Download it and compare the
                      file size with the original image.
                    </p>

                    <a
                      href={compressedUrl}
                      download={
                        originalFile
                          ? createDownloadName(originalFile.name, outputFormat)
                          : `compressed-image.${getOutputExtension(
                              outputFormat
                            )}`
                      }
                      className="mt-5 block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download Image
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload an image and click compress to see the optimized result
                  here.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your image is processed inside your browser. This
              tool does not upload your image to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is an Image Compressor?
                </h2>
                <p className="text-slate-300">
                  An image compressor reduces image file size by changing image
                  quality, dimensions or output format. Smaller images load
                  faster on websites, blogs, apps and social media.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Best Compression Tips
                </h2>
                <p className="text-slate-300">
                  Use WEBP for modern websites, JPEG for photos and PNG for
                  transparent graphics. Reducing large dimensions usually saves
                  more size than quality changes alone.
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