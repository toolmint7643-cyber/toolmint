"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";
type ResizeMode = "fit" | "stretch" | "crop";

const outputFormats = [
  { label: "JPEG", value: "image/jpeg", extension: "jpg" },
  { label: "PNG", value: "image/png", extension: "png" },
  { label: "WEBP", value: "image/webp", extension: "webp" },
] as const;

const quickSizes = [
  { label: "Thumbnail", width: 300, height: 300 },
  { label: "Profile", width: 512, height: 512 },
  { label: "Social Post", width: 1080, height: 1080 },
  { label: "Facebook OG", width: 1200, height: 630 },
  { label: "Blog 16:9", width: 1280, height: 720 },
  { label: "Full HD", width: 1920, height: 1080 },
];

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
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "resized-image";
  return `${baseName}-resized.${getOutputExtension(format)}`;
}

function calculateFitSize(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const ratio = Math.min(
    targetWidth / originalWidth,
    targetHeight / originalHeight,
    1
  );

  return {
    width: Math.max(1, Math.round(originalWidth * ratio)),
    height: Math.max(1, Math.round(originalHeight * ratio)),
  };
}

export default function ImageResizerPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [resizedUrl, setResizedUrl] = useState("");
  const [resizedSize, setResizedSize] = useState(0);

  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);

  const [targetWidth, setTargetWidth] = useState("1080");
  const [targetHeight, setTargetHeight] = useState("1080");
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [resizeMode, setResizeMode] = useState<ResizeMode>("fit");
  const [quality, setQuality] = useState(85);
  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/jpeg");

  const [isResizing, setIsResizing] = useState(false);
  const [error, setError] = useState("");

  const resultReady = Boolean(originalFile && resizedUrl && resizedSize);

  const sizeChangePercent =
    originalFile && resizedSize
      ? ((resizedSize - originalFile.size) / originalFile.size) * 100
      : 0;

  const statusLabel = useMemo(() => {
    if (!originalFile) return "Upload image";
    if (isResizing) return "Resizing...";
    if (resultReady) return "Resized";
    return "Ready to resize";
  }, [originalFile, isResizing, resultReady]);

  function clearResult() {
    if (resizedUrl) {
      URL.revokeObjectURL(resizedUrl);
    }

    setResizedUrl("");
    setResizedSize(0);
    setOutputWidth(0);
    setOutputHeight(0);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    clearResult();

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
      setTargetWidth(String(image.naturalWidth));
      setTargetHeight(String(image.naturalHeight));
    };

    image.onerror = () => {
      setError("Unable to read this image. Please try another file.");
    };

    image.src = previewUrl;
  }

  function updateWidth(value: string) {
    setTargetWidth(value);

    if (!lockAspectRatio || !originalWidth || !originalHeight) return;

    const widthNumber = Number(value);

    if (Number.isFinite(widthNumber) && widthNumber > 0) {
      setTargetHeight(String(Math.round((widthNumber * originalHeight) / originalWidth)));
    }
  }

  function updateHeight(value: string) {
    setTargetHeight(value);

    if (!lockAspectRatio || !originalWidth || !originalHeight) return;

    const heightNumber = Number(value);

    if (Number.isFinite(heightNumber) && heightNumber > 0) {
      setTargetWidth(String(Math.round((heightNumber * originalWidth) / originalHeight)));
    }
  }

  async function resizeImage() {
    if (!originalFile || !originalPreview) {
      alert("Please upload an image first.");
      return;
    }

    const widthNumber = Number(targetWidth);
    const heightNumber = Number(targetHeight);

    if (
      !Number.isFinite(widthNumber) ||
      !Number.isFinite(heightNumber) ||
      widthNumber <= 0 ||
      heightNumber <= 0
    ) {
      alert("Please enter valid width and height.");
      return;
    }

    setError("");
    setIsResizing(true);
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
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas is not supported in this browser.");
      }

      if (resizeMode === "fit") {
        const fitSize = calculateFitSize(
          image.naturalWidth,
          image.naturalHeight,
          widthNumber,
          heightNumber
        );

        canvas.width = fitSize.width;
        canvas.height = fitSize.height;

        if (outputFormat === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(image, 0, 0, fitSize.width, fitSize.height);

        setOutputWidth(fitSize.width);
        setOutputHeight(fitSize.height);
      }

      if (resizeMode === "stretch") {
        canvas.width = Math.round(widthNumber);
        canvas.height = Math.round(heightNumber);

        if (outputFormat === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        setOutputWidth(canvas.width);
        setOutputHeight(canvas.height);
      }

      if (resizeMode === "crop") {
        canvas.width = Math.round(widthNumber);
        canvas.height = Math.round(heightNumber);

        if (outputFormat === "image/jpeg") {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        const scale = Math.max(
          canvas.width / image.naturalWidth,
          canvas.height / image.naturalHeight
        );

        const sourceWidth = canvas.width / scale;
        const sourceHeight = canvas.height / scale;
        const sourceX = (image.naturalWidth - sourceWidth) / 2;
        const sourceY = (image.naturalHeight - sourceHeight) / 2;

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );

        setOutputWidth(canvas.width);
        setOutputHeight(canvas.height);
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputFormat, quality / 100);
      });

      if (!blob) {
        throw new Error("Unable to create resized image.");
      }

      setResizedUrl(URL.createObjectURL(blob));
      setResizedSize(blob.size);
    } catch {
      setError("Image resize failed. Please try another image or format.");
    } finally {
      setIsResizing(false);
    }
  }

  function resetTool() {
    if (originalPreview) {
      URL.revokeObjectURL(originalPreview);
    }

    clearResult();
    setOriginalFile(null);
    setOriginalPreview("");
    setOriginalWidth(0);
    setOriginalHeight(0);
    setOutputWidth(0);
    setOutputHeight(0);
    setTargetWidth("1080");
    setTargetHeight("1080");
    setLockAspectRatio(true);
    setResizeMode("fit");
    setQuality(85);
    setOutputFormat("image/jpeg");
    setError("");
  }

  async function copyResult() {
    if (!originalFile || !resizedSize) {
      alert("Please resize an image first.");
      return;
    }

    const text = `Image Resizer Result

Original Size: ${originalWidth} x ${originalHeight}
Output Size: ${outputWidth} x ${outputHeight}
Original File Size: ${formatBytes(originalFile.size)}
Output File Size: ${formatBytes(resizedSize)}
Resize Mode: ${resizeMode}
Format: ${outputFormats.find((item) => item.value === outputFormat)?.label}
Quality: ${quality}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Image resize result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="📐 Image Resizer"
          description="Resize JPG, PNG and WEBP images online with custom width, height, aspect ratio lock, crop mode and quick standard sizes."
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
                      Upload an image and resize it without sending it to a server.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {statusLabel}
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
                    Supports JPG, PNG, WEBP and most browser-readable images.
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
                  ⚙️ Resize Settings
                </h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">Width</span>
                      <input
                        type="number"
                        min="1"
                        value={targetWidth}
                        onChange={(event) => updateWidth(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">Height</span>
                      <input
                        type="number"
                        min="1"
                        value={targetHeight}
                        onChange={(event) => updateHeight(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={lockAspectRatio}
                      onChange={(event) => setLockAspectRatio(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Lock aspect ratio
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Resize mode
                    </span>
                    <select
                      value={resizeMode}
                      onChange={(event) =>
                        setResizeMode(event.target.value as ResizeMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="fit">Fit inside size</option>
                      <option value="stretch">Exact stretch</option>
                      <option value="crop">Crop to fill</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Fit keeps proportions, stretch forces exact size, crop fills
                      the selected size from the center.
                    </p>
                  </label>

                  <div>
                    <h3 className="mb-3 font-bold text-white">
                      ⚡ Quick standard sizes
                    </h3>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {quickSizes.map((size) => (
                        <button
                          key={size.label}
                          type="button"
                          onClick={() => {
                            setTargetWidth(String(size.width));
                            setTargetHeight(String(size.height));
                          }}
                          className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-left text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          <span className="block">{size.label}</span>
                          <span className="mt-1 block text-xs font-normal text-slate-400">
                            {size.width} x {size.height}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                      onChange={(event) => setQuality(Number(event.target.value))}
                      className="w-full accent-blue-600"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={resizeImage}>
                      {isResizing ? "⏳ Resizing..." : "⚡ Resize Image"}
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
                ✅ Resize Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {originalWidth && originalHeight
                      ? `${originalWidth} x ${originalHeight}`
                      : "0 x 0"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Original Size
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {outputWidth && outputHeight
                      ? `${outputWidth} x ${outputHeight}`
                      : "0 x 0"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">Output Size</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {resizedSize ? formatBytes(resizedSize) : "0 B"}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">File Size</div>
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

              {resizedUrl ? (
                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={resizedUrl}
                      alt="Resized preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <h3 className="text-xl font-bold text-white">
                      📥 Download Ready
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      Your resized image is ready. Download it and use it for web,
                      social media, documents or profile photos.
                    </p>

                    <a
                      href={resizedUrl}
                      download={
                        originalFile
                          ? createDownloadName(originalFile.name, outputFormat)
                          : `resized-image.${getOutputExtension(outputFormat)}`
                      }
                      className="mt-5 block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download Image
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload an image and click resize to see the result here.
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
                  📌 What is an Image Resizer?
                </h2>
                <p className="text-slate-300">
                  An image resizer changes the width and height of an image for
                  websites, social media, documents, profile photos and thumbnails.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Resize Tips
                </h2>
                <p className="text-slate-300">
                  Use fit mode to keep the image natural, crop mode for exact
                  social sizes and stretch mode only when exact dimensions matter
                  more than image proportions.
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