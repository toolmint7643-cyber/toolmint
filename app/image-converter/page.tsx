"use client";

import { ChangeEvent, useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

const outputFormats = [
  { label: "JPG", value: "image/jpeg", extension: "jpg" },
  { label: "PNG", value: "image/png", extension: "png" },
  { label: "WEBP", value: "image/webp", extension: "webp" },
  { label: "AVIF", value: "image/avif", extension: "avif" },
] as const;

const quickFormatTips = [
  {
    title: "JPG",
    text: "Best for photos and small file sizes. Transparency becomes white.",
  },
  {
    title: "PNG",
    text: "Best for transparent graphics, logos and screenshots.",
  },
  {
    title: "WEBP",
    text: "Best modern web format with strong compression.",
  },
  {
    title: "AVIF",
    text: "Very small modern format, but export support depends on browser.",
  },
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

function getOutputLabel(format: OutputFormat) {
  return outputFormats.find((item) => item.value === format)?.label || "JPG";
}

function createDownloadName(fileName: string, format: OutputFormat) {
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "converted-image";
  return `${baseName}-converted.${getOutputExtension(format)}`;
}

function getInputFormat(file: File | null) {
  if (!file) return "Unknown";

  const matched = outputFormats.find((format) => format.value === file.type);

  if (matched) return matched.label;

  return file.type.replace("image/", "").toUpperCase() || "Image";
}

async function browserCanExport(format: OutputFormat) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 2;

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, format, 0.8);
  });

  return Boolean(blob && blob.type === format);
}

export default function ImageConverterPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState("");
  const [convertedUrl, setConvertedUrl] = useState("");
  const [convertedSize, setConvertedSize] = useState(0);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);

  const [outputFormat, setOutputFormat] =
    useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(85);
  const [whiteBackground, setWhiteBackground] = useState(true);

  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const resultReady = Boolean(originalFile && convertedUrl && convertedSize);

  const sizeChangePercent =
    originalFile && convertedSize
      ? ((convertedSize - originalFile.size) / originalFile.size) * 100
      : 0;

  const statusLabel = useMemo(() => {
    if (!originalFile) return "Upload image";
    if (isConverting) return "Converting...";
    if (resultReady) return "Converted";
    return "Ready to convert";
  }, [originalFile, isConverting, resultReady]);

  function clearResult() {
    if (convertedUrl) {
      URL.revokeObjectURL(convertedUrl);
    }

    setConvertedUrl("");
    setConvertedSize(0);
    setWarning("");
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
    };

    image.onerror = () => {
      setError("Unable to read this image. Please try another file.");
    };

    image.src = previewUrl;
  }

  async function convertImage() {
    if (!originalFile || !originalPreview) {
      alert("Please upload an image first.");
      return;
    }

    setError("");
    setWarning("");
    setIsConverting(true);
    clearResult();

    try {
      const canExport = await browserCanExport(outputFormat);

      if (!canExport) {
        setError(
          `${getOutputLabel(
            outputFormat
          )} export is not supported in this browser. Please choose JPG, PNG or WEBP.`
        );
        return;
      }

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

      if (outputFormat === "image/jpeg" && whiteBackground) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputFormat, quality / 100);
      });

      if (!blob) {
        throw new Error("Unable to convert image.");
      }

      if (blob.type !== outputFormat) {
        setWarning(
          `Your browser returned ${blob.type || "a different format"} instead of ${getOutputLabel(
            outputFormat
          )}. Try another output format if needed.`
        );
      }

      setConvertedUrl(URL.createObjectURL(blob));
      setConvertedSize(blob.size);

      if (outputFormat === "image/jpeg") {
        setWarning(
          "JPG does not support transparency. Transparent areas may become white."
        );
      }
    } catch {
      setError("Image conversion failed. Please try another image or format.");
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
    setOriginalWidth(0);
    setOriginalHeight(0);
    setOutputFormat("image/webp");
    setQuality(85);
    setWhiteBackground(true);
    setError("");
    setWarning("");
  }

  async function copyResult() {
    if (!originalFile || !convertedSize) {
      alert("Please convert an image first.");
      return;
    }

    const text = `Image Converter Result

Input Format: ${getInputFormat(originalFile)}
Output Format: ${getOutputLabel(outputFormat)}
Original File Size: ${formatBytes(originalFile.size)}
Converted File Size: ${formatBytes(convertedSize)}
Size Change: ${sizeChangePercent.toFixed(1)}%
Dimensions: ${originalWidth} x ${originalHeight}
Quality: ${quality}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Image conversion result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🔁 Image Converter"
          description="Convert JPG, PNG, WEBP and AVIF images online in your browser with preview, quality control and instant download."
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
                      Upload an image and convert it without sending it to a
                      server.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {statusLabel}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload image
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports browser-readable JPG, PNG, WEBP and AVIF images.
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

                {warning ? (
                  <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                    ⚠️ {warning}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ⚙️ Conversion Settings
                </h2>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Convert to
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
                      onChange={(event) =>
                        setQuality(Number(event.target.value))
                      }
                      className="w-full accent-blue-600"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Quality mainly affects JPG, WEBP and AVIF. PNG may ignore
                      this setting.
                    </p>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={whiteBackground}
                      onChange={(event) =>
                        setWhiteBackground(event.target.checked)
                      }
                      className="h-5 w-5"
                    />
                    Use white background for JPG transparency
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={convertImage}>
                      {isConverting ? "⏳ Converting..." : "⚡ Convert Image"}
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
                ✅ Conversion Result
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {getInputFormat(originalFile)}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Input Format
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {getOutputLabel(outputFormat)}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Output Format
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-400">
                    {convertedSize ? formatBytes(convertedSize) : "0 B"}
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

              {convertedUrl ? (
                <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
                  <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={convertedUrl}
                      alt="Converted preview"
                      className="max-h-[360px] w-full object-contain"
                    />
                  </div>

                  <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                    <h3 className="text-xl font-bold text-white">
                      📥 Download Ready
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      Your converted image is ready. Download it in the selected
                      output format.
                    </p>

                    <a
                      href={convertedUrl}
                      download={
                        originalFile
                          ? createDownloadName(originalFile.name, outputFormat)
                          : `converted-image.${getOutputExtension(
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
                  Upload an image and click convert to see the output here.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {quickFormatTips.map((tip) => (
                <div
                  key={tip.title}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                >
                  <h3 className="text-xl font-bold text-white">{tip.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{tip.text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your image is processed inside your browser. This
              tool does not upload your image to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is an Image Converter?
                </h2>
                <p className="text-slate-300">
                  An image converter changes an image from one format to another,
                  such as JPG to PNG, PNG to WEBP or WEBP to JPG. It is useful
                  for websites, documents, design work and social media uploads.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Best Format Tips
                </h2>
                <p className="text-slate-300">
                  Use JPG for photos, PNG for transparency, WEBP for modern web
                  performance and AVIF when your browser and target platform
                  support it.
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