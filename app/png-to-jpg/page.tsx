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
  return `${baseName}.jpg`;
}

export default function PngToJpgPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [jpgUrl, setJpgUrl] = useState("");
  const [jpgSize, setJpgSize] = useState(0);

  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  const [quality, setQuality] = useState(85);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");

  const resultReady = Boolean(originalFile && jpgUrl && jpgSize);

  const savedBytes = originalFile ? originalFile.size - jpgSize : 0;
  const savedPercent =
    originalFile && jpgSize
      ? Math.max(0, (savedBytes / originalFile.size) * 100)
      : 0;

  const sizeChangePercent =
    originalFile && jpgSize
      ? ((jpgSize - originalFile.size) / originalFile.size) * 100
      : 0;

  const statusLabel = useMemo(() => {
    if (!originalFile) return "Upload PNG";
    if (isConverting) return "Converting...";
    if (resultReady) return "JPG ready";
    return "Ready to convert";
  }, [originalFile, isConverting, resultReady]);

  function clearResult() {
    if (jpgUrl) {
      URL.revokeObjectURL(jpgUrl);
    }

    setJpgUrl("");
    setJpgSize(0);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    clearResult();

    if (!file) return;

    const isPng =
      file.type === "image/png" || file.name.toLowerCase().endsWith(".png");

    if (!isPng) {
      setError("Please upload a PNG image only.");
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
      setError("Unable to read this PNG image. Please try another file.");
    };

    image.src = previewUrl;
  }

  async function convertToJpg() {
    if (!originalFile || !originalPreview) {
      alert("Please upload a PNG image first.");
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

      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality / 100);
      });

      if (!blob) {
        throw new Error("Unable to convert PNG to JPG.");
      }

      setJpgUrl(URL.createObjectURL(blob));
      setJpgSize(blob.size);
    } catch {
      setError("PNG to JPG conversion failed. Please try another image.");
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
    setQuality(85);
    setBackgroundColor("#ffffff");
    setError("");
  }

  async function copyResult() {
    if (!originalFile || !jpgSize) {
      alert("Please convert a PNG image first.");
      return;
    }

    const text = `PNG to JPG Converter Result

Input Format: PNG
Output Format: JPG
Original File Size: ${formatBytes(originalFile.size)}
JPG File Size: ${formatBytes(jpgSize)}
Saved: ${formatBytes(Math.max(0, savedBytes))} (${savedPercent.toFixed(1)}%)
Size Change: ${sizeChangePercent.toFixed(1)}%
Dimensions: ${imageWidth} x ${imageHeight}
Quality: ${quality}%
Background Color: ${backgroundColor}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("PNG to JPG result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🖼️ PNG to JPG Converter"
          description="Convert PNG images to JPG online in your browser with quality control, background color, preview and instant download."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload PNG Image
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose a PNG image and convert it to JPG locally.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {statusLabel}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/png,.png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload PNG
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports .png images.
                  </span>
                </label>

                {originalPreview ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={originalPreview}
                      alt="Original PNG preview"
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

                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                      Output format
                    </p>
                    <p className="mt-2 text-4xl font-extrabold text-blue-300">
                      JPG
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      JPG is useful for smaller photo files, sharing and website
                      uploads.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-slate-300">
                      <span>JPG Quality</span>
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
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Background color
                    </span>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(event) =>
                          setBackgroundColor(event.target.value)
                        }
                        className="h-14 w-16 cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(event) =>
                          setBackgroundColor(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={convertToJpg}>
                      {isConverting ? "⏳ Converting..." : "⚡ Convert to JPG"}
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

                  <div className="rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                    JPG does not support transparency. Transparent PNG areas
                    will use your selected background color.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ JPG Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    PNG
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Input Format
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    JPG
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

              {jpgUrl ? (
                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={jpgUrl}
                      alt="Converted JPG preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <h3 className="text-xl font-bold text-white">
                      📥 Download Ready
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      Your JPG image is ready. Download it and use it for
                      websites, uploads, sharing or documents.
                    </p>

                    <a
                      href={jpgUrl}
                      download={
                        originalFile
                          ? createDownloadName(originalFile.name)
                          : "converted-image.jpg"
                      }
                      className="mt-5 block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download JPG
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload a PNG image and click convert to see the JPG result
                  here.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your PNG image is processed inside your browser.
              This tool does not upload your image to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a PNG to JPG Converter?
                </h2>
                <p className="text-slate-300">
                  A PNG to JPG converter changes a PNG image into a JPG file.
                  JPG is commonly used for photos, website uploads, forms,
                  documents and smaller image file sizes.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 PNG vs JPG
                </h2>
                <p className="text-slate-300">
                  PNG supports transparency and lossless quality. JPG usually
                  creates smaller files but does not support transparency, so a
                  background color is applied during conversion.
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