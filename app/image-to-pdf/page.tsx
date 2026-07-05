"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { PDFDocument, PDFImage, rgb } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

type PageSizeMode = "auto" | "a4" | "letter";
type OrientationMode = "auto" | "portrait" | "landscape";
type FitMode = "fit" | "fill";

const pageSizes = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  letter: { width: 612, height: 792, label: "Letter" },
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const sizeIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const safeIndex = Math.min(sizeIndex, units.length - 1);
  const size = bytes / Math.pow(1024, safeIndex);

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[safeIndex]}`;
}

function getBaseName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "") || "images";
}

function bytesToBlob(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(bytes);

  return new Blob([arrayBuffer], { type: "application/pdf" });
}

function loadImageInfo(file: File) {
  return new Promise<{ previewUrl: string; width: number; height: number }>(
    (resolve, reject) => {
      const previewUrl = URL.createObjectURL(file);
      const image = new window.Image();

      image.onload = () => {
        resolve({
          previewUrl,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };

      image.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        reject(new Error("Unable to read image."));
      };

      image.src = previewUrl;
    }
  );
}

async function convertImageToJpegBytes(file: File) {
  const imageInfo = await loadImageInfo(file);
  const image = new window.Image();

  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to convert image."));
  });

  image.src = imageInfo.previewUrl;
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(imageInfo.previewUrl);
    throw new Error("Canvas is not supported.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  URL.revokeObjectURL(imageInfo.previewUrl);

  if (!blob) {
    throw new Error("Unable to convert image to JPG.");
  }

  return new Uint8Array(await blob.arrayBuffer());
}

async function embedImage(pdfDoc: PDFDocument, file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const lowerName = file.name.toLowerCase();

  if (file.type === "image/jpeg" || lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
    return pdfDoc.embedJpg(bytes);
  }

  if (file.type === "image/png" || lowerName.endsWith(".png")) {
    return pdfDoc.embedPng(bytes);
  }

  const jpegBytes = await convertImageToJpegBytes(file);
  return pdfDoc.embedJpg(jpegBytes);
}

function getPageDimensions(
  image: PDFImage,
  pageSizeMode: PageSizeMode,
  orientationMode: OrientationMode,
  margin: number
) {
  if (pageSizeMode === "auto") {
    return {
      width: image.width + margin * 2,
      height: image.height + margin * 2,
    };
  }

  const baseSize = pageSizes[pageSizeMode];
  const shouldLandscape =
    orientationMode === "landscape" ||
    (orientationMode === "auto" && image.width > image.height);

  if (shouldLandscape) {
    return {
      width: baseSize.height,
      height: baseSize.width,
    };
  }

  return {
    width: baseSize.width,
    height: baseSize.height,
  };
}

export default function ImageToPdfPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSizeMode, setPageSizeMode] = useState<PageSizeMode>("a4");
  const [orientationMode, setOrientationMode] = useState<OrientationMode>("auto");
  const [fitMode, setFitMode] = useState<FitMode>("fit");
  const [margin, setMargin] = useState("24");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfSize, setPdfSize] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const totalInputSize = useMemo(() => {
    return images.reduce((total, item) => total + item.file.size, 0);
  }, [images]);

  const totalPixels = useMemo(() => {
    return images.reduce((total, item) => total + item.width * item.height, 0);
  }, [images]);

  function clearPdfResult() {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setPdfUrl("");
    setPdfSize(0);
  }

  async function handleImagesUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    setError("");
    clearPdfResult();

    if (!files.length) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (!imageFiles.length) {
      setError("Please upload image files only.");
      return;
    }

    try {
      const loadedImages = await Promise.all(
        imageFiles.map(async (file) => {
          const imageInfo = await loadImageInfo(file);

          return {
            id: createId(),
            file,
            previewUrl: imageInfo.previewUrl,
            width: imageInfo.width,
            height: imageInfo.height,
          };
        })
      );

      setImages((current) => [...current, ...loadedImages]);
    } catch {
      setError("Unable to read one or more images. Please try again.");
    }

    event.target.value = "";
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((current) => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    clearPdfResult();
  }

  function removeImage(id: string) {
    setImages((current) => {
      const removed = current.find((item) => item.id === id);

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });

    clearPdfResult();
  }

  function resetTool() {
    images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    clearPdfResult();
    setImages([]);
    setPageSizeMode("a4");
    setOrientationMode("auto");
    setFitMode("fit");
    setMargin("24");
    setIsCreating(false);
    setError("");
  }

  async function createPdf() {
    if (!images.length) {
      alert("Please upload at least one image.");
      return;
    }

    const marginValue = Number(margin);

    if (!Number.isFinite(marginValue) || marginValue < 0) {
      alert("Please enter a valid margin.");
      return;
    }

    setError("");
    setIsCreating(true);
    clearPdfResult();

    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of images) {
        const pdfImage = await embedImage(pdfDoc, item.file);
        const pageDimensions = getPageDimensions(
          pdfImage,
          pageSizeMode,
          orientationMode,
          marginValue
        );

        const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height]);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageDimensions.width,
          height: pageDimensions.height,
          color: rgb(1, 1, 1),
        });

        const availableWidth = Math.max(1, pageDimensions.width - marginValue * 2);
        const availableHeight = Math.max(1, pageDimensions.height - marginValue * 2);

        const widthRatio = availableWidth / pdfImage.width;
        const heightRatio = availableHeight / pdfImage.height;
        const scale = fitMode === "fit"
          ? Math.min(widthRatio, heightRatio)
          : Math.max(widthRatio, heightRatio);

        const drawWidth = pdfImage.width * scale;
        const drawHeight = pdfImage.height * scale;
        const x = (pageDimensions.width - drawWidth) / 2;
        const y = (pageDimensions.height - drawHeight) / 2;

        page.drawImage(pdfImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const bytes = await pdfDoc.save();
      const blob = bytesToBlob(bytes);
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      setPdfSize(blob.size);
    } catch {
      setError("Unable to create PDF. Please try different images.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyResult() {
    if (!pdfSize) {
      alert("Please create a PDF first.");
      return;
    }

    const text = `Image to PDF Result

Images: ${images.length}
Input Size: ${formatBytes(totalInputSize)}
PDF Size: ${formatBytes(pdfSize)}
Page Size: ${pageSizeMode.toUpperCase()}
Orientation: ${orientationMode}
Fit Mode: ${fitMode}
Margin: ${margin}px
Total Pixels: ${totalPixels.toLocaleString()}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Image to PDF result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🖼️ Image to PDF"
          description="Convert JPG, PNG and WEBP images to PDF online in your browser, arrange image order and download one PDF file."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      📤 Upload Images
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Select one or more images. Each image becomes a PDF page.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    {images.length ? `${images.length} images` : "Upload images"}
                  </span>
                </div>

                <label className="flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950 p-6 text-center transition hover:border-blue-500">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesUpload}
                    className="hidden"
                  />

                  <span className="text-5xl">🖼️</span>
                  <span className="mt-3 text-lg font-bold text-white">
                    Click to upload images
                  </span>
                  <span className="mt-1 text-sm text-slate-400">
                    Supports JPG, PNG, WEBP and browser-readable image files.
                  </span>
                </label>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ⚙️ PDF Settings
                </h2>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">Page size</span>
                    <select
                      value={pageSizeMode}
                      onChange={(event) =>
                        setPageSizeMode(event.target.value as PageSizeMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="auto">Auto image size</option>
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Orientation
                    </span>
                    <select
                      value={orientationMode}
                      onChange={(event) =>
                        setOrientationMode(event.target.value as OrientationMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="auto">Auto</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">Fit mode</span>
                    <select
                      value={fitMode}
                      onChange={(event) =>
                        setFitMode(event.target.value as FitMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="fit">Fit page</option>
                      <option value="fill">Fill page</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">Margin</span>
                    <input
                      type="number"
                      min="0"
                      value={margin}
                      onChange={(event) => setMargin(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={createPdf}>
                      {isCreating ? "⏳ Creating..." : "⚡ Create PDF"}
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

                  {pdfUrl ? (
                    <a
                      href={pdfUrl}
                      download={`${getBaseName(images[0]?.file.name || "images")}.pdf`}
                      className="block rounded-xl bg-blue-600 p-4 text-center font-bold text-white transition hover:bg-blue-500"
                    >
                      ⬇️ Download PDF
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ PDF Summary
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {images.length}
                  </div>
                  <div className="mt-1 text-slate-400">Images</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {formatBytes(totalInputSize)}
                  </div>
                  <div className="mt-1 text-slate-400">Input Size</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {pdfSize ? formatBytes(pdfSize) : "0 B"}
                  </div>
                  <div className="mt-1 text-slate-400">PDF Size</div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <div className="text-3xl font-extrabold text-blue-400">
                    {pageSizeMode.toUpperCase()}
                  </div>
                  <div className="mt-1 text-slate-400">Page Size</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                📚 Image Order
              </h2>

              {images.length ? (
                <div className="space-y-3">
                  {images.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4 md:grid-cols-[92px_1fr_auto]"
                    >
                      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-20 w-full object-contain"
                        />
                      </div>

                      <div>
                        <p className="break-words font-bold text-white">
                          {index + 1}. {item.file.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.width} x {item.height} • {formatBytes(item.file.size)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => moveImage(index, "up")}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          ↑ Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveImage(index, "down")}
                          className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          ↓ Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeImage(item.id)}
                          className="rounded-lg border border-red-500/50 px-3 py-2 text-sm font-bold text-red-200 transition hover:border-red-400 hover:text-red-100"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-400">
                  Upload images to arrange their order before creating the PDF.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Large images can create large PDF files. For smaller PDFs, compress
              or resize images before converting them to PDF.
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your images are converted to PDF inside your
              browser. This tool does not upload your images to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is an Image to PDF Tool?
                </h2>
                <p className="text-slate-300">
                  An image to PDF tool converts photos, screenshots, scanned
                  pages and graphics into a PDF document. It is useful for forms,
                  assignments, receipts, documents and sharing multiple images as
                  one file.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 PDF Tips
                </h2>
                <p className="text-slate-300">
                  Use A4 for documents, auto size for original image dimensions,
                  fit mode to avoid cropping and fill mode when you want the
                  image to cover the full page.
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