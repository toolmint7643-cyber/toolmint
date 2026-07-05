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
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "image-base64";
  return `${baseName}-base64.txt`;
}

function getBase64Only(dataUrl: string) {
  return dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
}

export default function ImageToBase64Page() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [base64Only, setBase64Only] = useState("");
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [error, setError] = useState("");

  const base64Size = useMemo(() => {
    return new Blob([base64Only]).size;
  }, [base64Only]);

  const sizeIncreasePercent =
    file && base64Size
      ? ((base64Size - file.size) / file.size) * 100
      : 0;

  const statusLabel = useMemo(() => {
    if (!file) return "Upload image";
    if (dataUrl) return "Base64 ready";
    return "Ready";
  }, [file, dataUrl]);

  function resetTool() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl("");
    setDataUrl("");
    setBase64Only("");
    setImageWidth(0);
    setImageHeight(0);
    setError("");
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    setError("");

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    const image = new window.Image();

    image.onload = () => {
      setImageWidth(image.naturalWidth);
      setImageHeight(image.naturalHeight);
    };

    image.onerror = () => {
      setError("Unable to preview this image. Please try another file.");
    };

    image.src = nextPreviewUrl;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      setDataUrl(result);
      setBase64Only(getBase64Only(result));
    };

    reader.onerror = () => {
      setError("Unable to convert this image to Base64. Please try again.");
    };

    reader.readAsDataURL(selectedFile);
  }

  async function copyText(value: string, successMessage: string) {
    if (!value) {
      alert("Please upload an image first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      alert(successMessage);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  }

  async function copyResult() {
    if (!file || !dataUrl) {
      alert("Please upload an image first.");
      return;
    }

    const text = `Image to Base64 Result

File Name: ${file.name}
MIME Type: ${file.type || "Unknown"}
Original File Size: ${formatBytes(file.size)}
Base64 Size: ${formatBytes(base64Size)}
Size Increase: ${sizeIncreasePercent.toFixed(1)}%
Dimensions: ${imageWidth} x ${imageHeight}
Data URL Length: ${dataUrl.length}
Base64 Length: ${base64Only.length}`;

    await copyText(text, "Image Base64 result copied successfully!");
  }

  function downloadText() {
    if (!file || !dataUrl) {
      alert("Please upload an image first.");
      return;
    }

    const content = `Image to Base64 Result

File Name: ${file.name}
MIME Type: ${file.type || "Unknown"}
Original File Size: ${formatBytes(file.size)}
Base64 Size: ${formatBytes(base64Size)}
Size Increase: ${sizeIncreasePercent.toFixed(1)}%
Dimensions: ${imageWidth} x ${imageHeight}

Data URL:
${dataUrl}

Base64 Only:
${base64Only}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = createDownloadName(file.name);
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🖼️ Image to Base64"
          description="Convert images to Base64 online in your browser, generate Data URL, copy Base64 code and download the result as text."
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
                      Choose an image and generate Base64 or full Data URL.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {statusLabel}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload image
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports JPG, PNG, WEBP, SVG and browser-readable images.
                  </span>
                </label>

                {previewUrl ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <img
                      src={previewUrl}
                      alt="Uploaded image preview"
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
                  ✅ Base64 Result
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {file ? formatBytes(file.size) : "0 B"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Original Size
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {base64Only ? formatBytes(base64Size) : "0 B"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Base64 Size
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-amber-300">
                      {base64Only ? `${sizeIncreasePercent.toFixed(1)}%` : "0%"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Size Increase
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {imageWidth && imageHeight
                        ? `${imageWidth} x ${imageHeight}`
                        : "0 x 0"}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      Dimensions
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    MIME type
                  </p>
                  <p className="mt-2 break-words text-2xl font-extrabold text-blue-300">
                    {file?.type || "No image selected"}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() =>
                      copyText(base64Only, "Base64 code copied successfully!")
                    }
                  >
                    📋 Copy Base64
                  </Button>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(dataUrl, "Data URL copied successfully!")
                    }
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔗 Copy Data URL
                  </button>

                  <button
                    type="button"
                    onClick={copyResult}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    📊 Copy Result
                  </button>

                  <button
                    type="button"
                    onClick={downloadText}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    ⬇️ Download TXT
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetTool}
                  className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                🔗 Data URL Output
              </h2>

              <textarea
                value={dataUrl}
                readOnly
                placeholder="Upload an image to generate Data URL..."
                className="min-h-[180px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              />

              <h2 className="mb-5 mt-6 text-2xl font-bold text-white">
                🧬 Base64 Only
              </h2>

              <textarea
                value={base64Only}
                readOnly
                placeholder="Upload an image to generate Base64 code..."
                className="min-h-[220px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Base64 text is usually larger than the original image file. Use it
              for small images, icons, logos, CSS backgrounds or quick embedding,
              not for large photo galleries.
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your image is converted inside your browser. This
              tool does not upload your image to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Image to Base64?
                </h2>
                <p className="text-slate-300">
                  Image to Base64 converts an image file into text that can be
                  embedded directly inside HTML, CSS, JSON or API payloads. The
                  full Data URL includes the MIME type and Base64 content.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use Base64 images for small icons, email templates, CSS
                  background images, quick prototypes, offline snippets and
                  embedding small assets without separate image files.
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