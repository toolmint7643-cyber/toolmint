"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type InputMode = "page" | "image" | "upload";
type ImageCheck = {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  bytes?: number;
  format: string;
  scalable: boolean;
  source: "webpage" | "image-url" | "upload";
};
type OgPageResponse = { image?: string; sourceUrl?: string; error?: string };

const MAX_FILES = 20;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

function validateHttpUrl(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error(`Use a public HTTP or HTTPS ${label} URL without embedded credentials.`);
  }
  return url;
}

function getImageFormat(value: string, fileType = "") {
  const normalizedType = fileType.toLowerCase();
  if (normalizedType.includes("svg") || /\.svg(?:$|[?#])/i.test(value)) return { format: "SVG", scalable: true };
  const match = value.split(/[?#]/, 1)[0].match(/\.([a-z0-9]+)$/i);
  const extension = match?.[1]?.toUpperCase();
  const format = normalizedType.startsWith("image/")
    ? normalizedType.slice("image/".length).toUpperCase().replace("JPEG", "JPG")
    : extension || "Image";
  return { format, scalable: false };
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeDimensionTags(item: ImageCheck, alt: string) {
  const lines = [
    `<meta property="og:image:width" content="${item.width}" />`,
    `<meta property="og:image:height" content="${item.height}" />`,
  ];
  if (alt.trim()) lines.push(`<meta property="og:image:alt" content="${alt.trim().replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}" />`);
  return lines.join("\n");
}

function downloadReport(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function OpenGraphImageSizeCheckerPage() {
  const [mode, setMode] = useState<InputMode>("page");
  const [pageUrl, setPageUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [checks, setChecks] = useState<ImageCheck[]>([]);
  const [targetWidth, setTargetWidth] = useState(1200);
  const [targetHeight, setTargetHeight] = useState(630);
  const [altText, setAltText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pageSource, setPageSource] = useState("");
  const [imageInputRef, setImageInputRef] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const pageAbort = useRef<AbortController | null>(null);
  const cancelImageLoads = useRef(new Set<() => void>());
  const objectUrls = useRef(new Set<string>());

  useEffect(() => () => {
    requestId.current += 1;
    pageAbort.current?.abort();
    for (const cancel of cancelImageLoads.current) cancel();
    cancelImageLoads.current.clear();
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3000);
  }

  function clearChecks() {
    requestId.current += 1;
    pageAbort.current?.abort();
    pageAbort.current = null;
    for (const cancel of cancelImageLoads.current) cancel();
    cancelImageLoads.current.clear();
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
    setChecks([]);
    setPageSource("");
    setImageInputRef("");
    setProgress("");
    setError("");
    setLoading(false);
    if (uploadRef.current) uploadRef.current.value = "";
  }

  function changeMode(nextMode: InputMode) {
    clearChecks();
    setMode(nextMode);
  }

  function cancelWork() {
    requestId.current += 1;
    pageAbort.current?.abort();
    pageAbort.current = null;
    for (const cancel of cancelImageLoads.current) cancel();
    cancelImageLoads.current.clear();
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
    objectUrls.current.clear();
    setChecks([]);
    if (uploadRef.current) uploadRef.current.value = "";
    setLoading(false);
    setProgress("Check cancelled.");
  }

  function measureImage(src: string, name: string, source: ImageCheck["source"], bytes?: number, fileType = "") {
    return new Promise<ImageCheck>((resolve, reject) => {
      const image = new window.Image();
      const { format, scalable } = getImageFormat(fileType ? name : src, fileType);
      let settled = false;
      let cancelLoad = () => {};
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cancelImageLoads.current.delete(cancelLoad);
        if (error) reject(error);
        else if (image.naturalWidth > 0 && image.naturalHeight > 0) {
          resolve({ id: createId(), name, src, width: image.naturalWidth, height: image.naturalHeight, bytes, format, scalable, source });
        } else reject(new Error("The browser could not read image dimensions."));
      };
      cancelLoad = () => {
        image.src = "";
        finish(new Error("Image check cancelled."));
      };
      const timer = setTimeout(() => finish(new Error("Image loading timed out. Check the URL or try another image.")), 20_000);
      image.decoding = "async";
      image.onload = () => finish();
      image.onerror = () => finish(new Error("The image could not be loaded. It may be unavailable, unsupported, or blocked by its host."));
      cancelImageLoads.current.add(cancelLoad);
      image.src = src;
    });
  }

  async function checkImageUrl() {
    const operation = ++requestId.current;
    setError("");
    setProgress("");
    setChecks([]);
    try {
      const url = validateHttpUrl(imageUrl, "image");
      setLoading(true);
      setProgress("Loading image in your browser and reading its intrinsic dimensions…");
      const result = await measureImage(url.toString(), url.pathname.split("/").pop() || url.hostname, "image-url");
      if (requestId.current === operation) {
        setChecks([result]);
        setImageInputRef(url.toString());
        showNotice("Image dimensions measured.");
      }
    } catch (checkError) {
      if (requestId.current === operation) setError(checkError instanceof Error ? checkError.message : "Unable to inspect this image.");
    } finally {
      if (requestId.current === operation) {
        setLoading(false);
        setProgress("");
      }
    }
  }

  async function checkPageOgImage() {
    setError("");
    setProgress("");
    setChecks([]);
    let controller: AbortController | null = null;
    const operation = ++requestId.current;
    try {
      const url = validateHttpUrl(pageUrl, "webpage");
      controller = new AbortController();
      pageAbort.current = controller;
      setLoading(true);
      setProgress("Fetching Open Graph image URL…");
      const response = await fetch(`/api/og-preview?url=${encodeURIComponent(url.toString())}`, { signal: controller.signal });
      const payload = await response.json() as OgPageResponse;
      if (!response.ok) throw new Error(payload.error || "Unable to inspect Open Graph tags on this page.");
      if (!payload.image) throw new Error("No og:image or twitter:image URL was found on this page.");
      const ogImage = validateHttpUrl(payload.image, "Open Graph image");
      setPageSource(url.toString());
      setImageInputRef(ogImage.toString());
      setProgress("Open Graph image found. Loading the image in your browser…");
      const result = await measureImage(ogImage.toString(), ogImage.pathname.split("/").pop() || ogImage.hostname, "webpage");
      if (requestId.current === operation) {
        setChecks([result]);
        showNotice("Open Graph image measured.");
      }
    } catch (checkError) {
      if (!controller?.signal.aborted && requestId.current === operation) {
        setError(checkError instanceof Error ? checkError.message : "Unable to inspect this page's image.");
      }
    } finally {
      if (pageAbort.current === controller) pageAbort.current = null;
      if (requestId.current === operation) {
        setLoading(false);
        setProgress("");
      }
    }
  }

  async function checkUploads(files: FileList | File[]) {
    setError("");
    setProgress("");
    clearChecks();
    const selected = Array.from(files);
    if (!selected.length) return;
    if (selected.length > MAX_FILES) {
      setError(`Choose up to ${MAX_FILES} images per batch.`);
      return;
    }
    const unsupported = selected.find((file) => !file.type.startsWith("image/") || file.type === "image/svg+xml");
    if (unsupported) {
      setError(`${unsupported.name} is not a supported raster image. Upload JPG, PNG, WebP, GIF or another browser-decodable raster format; SVG has no fixed pixel size.`);
      return;
    }
    const tooLarge = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (tooLarge) {
      setError(`${tooLarge.name} exceeds the 25 MB per-image limit.`);
      return;
    }
    const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      setError("The selected batch exceeds the 100 MB total limit.");
      return;
    }

    const operation = ++requestId.current;
    setLoading(true);
    const results: ImageCheck[] = [];
    const failures: string[] = [];
    for (const [index, file] of selected.entries()) {
      if (requestId.current !== operation) break;
      setProgress(`Reading image ${index + 1} of ${selected.length}…`);
      const objectUrl = URL.createObjectURL(file);
      objectUrls.current.add(objectUrl);
      try {
        results.push(await measureImage(objectUrl, file.name, "upload", file.size, file.type));
      } catch (fileError) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(objectUrl);
        failures.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "Unable to read image."}`);
      }
    }
    if (requestId.current === operation) {
      setChecks(results);
      setError(failures.length ? failures.join(" ") : "");
      setProgress(results.length ? `Measured ${results.length} of ${selected.length} image(s).` : "");
      if (results.length) showNotice(`Measured ${results.length} image${results.length === 1 ? "" : "s"}.`);
      setLoading(false);
    }
    if (uploadRef.current) uploadRef.current.value = "";
  }

  function getReferenceStatus(item: ImageCheck) {
    if (item.scalable) return "SVG has no fixed raster dimensions";
    const aspect = item.width / item.height;
    const targetAspect = targetWidth / targetHeight;
    const ratioMatches = Math.abs(aspect - targetAspect) / targetAspect <= 0.03;
    const pixelsMeet = item.width >= targetWidth && item.height >= targetHeight;
    if (ratioMatches && pixelsMeet) return "Matches selected reference";
    if (!pixelsMeet && ratioMatches) return "Below selected pixel dimensions";
    if (!pixelsMeet) return "Below size and ratio reference";
    return "Aspect ratio differs from reference";
  }

  const tabs: { id: InputMode; label: string }[] = [
    { id: "page", label: "Find on webpage" },
    { id: "image", label: "Image URL" },
    { id: "upload", label: "Upload images" },
  ];

  return (
    <>
      <Header />
      {notice && <div role="status" className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-emerald-950 px-5 py-3 text-sm font-semibold text-emerald-100 shadow-xl">{notice}</div>}
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageTitle
            title="🖼️ Open Graph Image Size Checker"
            description="Find a page's og:image or inspect image URLs and local files. Check browser-reported dimensions, aspect ratio and a configurable share-image reference, then copy optional Open Graph dimension tags."
          />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <ToolCard>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">Choose an image source</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Image source method">
                  {tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={mode === tab.id} onClick={() => changeMode(tab.id)} className={`rounded-lg border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${mode === tab.id ? "border-blue-400 bg-blue-600 text-white" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-blue-400"}`}>{tab.label}</button>)}
                </div>
              </div>

              {mode === "page" && <div>
                <label htmlFor="og-page-url" className="mb-2 block font-semibold text-slate-200">Webpage URL</label>
                <input id="og-page-url" type="url" inputMode="url" value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !loading) void checkPageOgImage(); }} placeholder="https://example.com/article" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
                <p className="mt-2 text-sm leading-6 text-slate-400">ToolMint&apos;s protected endpoint reads the page&apos;s Open Graph image URL. Your browser then loads that image to measure its dimensions.</p>
                <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => void checkPageOgImage()} disabled={loading}>{loading ? "Checking…" : "Find & Check og:image"}</Button><Button variant="secondary" onClick={clearChecks} disabled={loading}>Reset results</Button></div>
              </div>}

              {mode === "image" && <div>
                <label htmlFor="og-image-url" className="mb-2 block font-semibold text-slate-200">Public image URL</label>
                <input id="og-image-url" type="url" inputMode="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !loading) void checkImageUrl(); }} placeholder="https://example.com/share-image.jpg" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
                <p className="mt-2 text-sm leading-6 text-slate-400">The image host receives a direct browser request. The image file is not uploaded to ToolMint.</p>
                <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => void checkImageUrl()} disabled={loading}>{loading ? "Checking…" : "Check image URL"}</Button><Button variant="secondary" onClick={clearChecks} disabled={loading}>Reset results</Button></div>
              </div>}

              {mode === "upload" && <div>
                <label htmlFor="og-image-files" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void checkUploads(event.dataTransfer.files); }} className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-500/60 bg-slate-950 px-5 text-center transition hover:border-blue-300 hover:bg-slate-900">
                  <span className="text-4xl" aria-hidden="true">📁</span>
                  <span className="mt-3 text-lg font-bold">Drop images here or choose files</span>
                  <span className="mt-1 text-sm text-slate-400">Up to {MAX_FILES} files · 25 MB each · 100 MB total · browser-side</span>
                  <input ref={uploadRef} id="og-image-files" type="file" multiple accept="image/*" className="sr-only" onChange={(event) => { if (event.target.files) void checkUploads(event.target.files); }} />
                </label>
              </div>}

              {loading && <div className="mt-4 flex items-center gap-3 text-sm font-semibold text-blue-200" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200/30 border-t-blue-200" aria-hidden="true" />{progress || "Checking image…"}<button type="button" onClick={cancelWork} className="ml-auto rounded-md border border-slate-600 px-3 py-1.5 text-xs hover:border-blue-400">Cancel</button></div>}
              {!loading && progress && <p role="status" className="mt-4 text-sm text-slate-300">{progress}</p>}
              {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-950/50 p-3 text-sm leading-6 text-red-200">{error}</p>}
              {pageSource && <p className="mt-3 break-all text-xs text-slate-500">Page checked: {pageSource}</p>}
              {imageInputRef && <p className="mt-2 break-all text-xs text-slate-500">Image checked: {imageInputRef}</p>}
            </ToolCard>

            <ToolCard>
              <h2 className="text-2xl font-bold">Comparison reference</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">Choose pixel dimensions to compare against. This is a configurable reference, not a platform acceptance guarantee.</p>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold text-slate-200">Reference width (px)<input type="number" min={1} max={10000} value={targetWidth} onChange={(event) => setTargetWidth(Math.max(1, Math.min(10000, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" /></label>
                <label className="block text-sm font-semibold text-slate-200">Reference height (px)<input type="number" min={1} max={10000} value={targetHeight} onChange={(event) => setTargetHeight(Math.max(1, Math.min(10000, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" /></label>
              </div>
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                <p className="text-sm font-semibold text-cyan-100">Common wide-share reference</p>
                <p className="mt-1 text-sm text-slate-300">1200 × 630 px · about 1.91:1</p>
                <p className="mt-1 text-xs text-slate-400">Ratio comparison accepts a difference within 3% of the selected reference.</p>
                <button type="button" onClick={() => { setTargetWidth(1200); setTargetHeight(630); }} className="mt-3 rounded-md border border-cyan-300/30 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/10">Use this reference</button>
              </div>
              <label htmlFor="og-alt-text" className="mb-2 mt-5 block font-semibold text-slate-200">Optional image alt text</label>
              <input id="og-alt-text" value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image content" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500" />
            </ToolCard>
          </div>

          <section aria-labelledby="image-results-title" className="mt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 id="image-results-title" className="text-2xl font-bold">Image results</h2><p className="mt-1 text-sm text-slate-400">{checks.length ? `${checks.length} image${checks.length === 1 ? "" : "s"} measured` : "No images checked yet"}</p></div>
              {checks.length > 0 && <Button variant="secondary" onClick={() => downloadReport("open-graph-image-check.txt", checks.map((item) => `${item.name}\n${item.width} × ${item.height} px\nAspect ratio: ${(item.width / item.height).toFixed(3)}:1\nSelected reference: ${targetWidth} × ${targetHeight} px\nAssessment: ${getReferenceStatus(item)}\nSource: ${item.source === "upload" ? "Local file" : item.src}\n`).join("\n"))}>Download report</Button>}
            </div>

            {checks.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm text-slate-400">Choose a webpage, image URL or local image to inspect actual dimensions.</div> : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {checks.map((item) => {
                  const aspect = item.width / item.height;
                  const status = getReferenceStatus(item);
                  const meets = status === "Matches selected reference";
                  return <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                    <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-950 p-3">
                      {/* Native image decoding allows dimensions to be read without canvas access or CORS permission. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt={altText || item.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="space-y-3 p-4">
                      <div><h3 className="break-all font-bold text-white">{item.name}</h3><p className="mt-1 text-xs text-slate-400">{item.format}{item.bytes !== undefined ? ` · ${(item.bytes / 1024).toFixed(1)} KB` : ""} · {item.source === "upload" ? "Local file" : "Remote image"}</p></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3"><p className="text-xs text-slate-400">Dimensions</p><p className="mt-1 font-bold">{item.width} × {item.height}</p></div>
                        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3"><p className="text-xs text-slate-400">Aspect ratio</p><p className="mt-1 font-bold">{aspect.toFixed(3)}:1</p></div>
                      </div>
                      <p className={`rounded-lg border p-3 text-sm font-semibold ${meets ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>{status}</p>
                      {item.scalable && <p className="text-xs leading-5 text-amber-100/80">SVG is scalable; its browser-reported intrinsic size is not a fixed raster-pixel measurement.</p>}
                      <Button variant="secondary" className="w-full" onClick={async () => { try { await navigator.clipboard.writeText(makeDimensionTags(item, altText)); showNotice("Open Graph dimension tags copied."); } catch { setError("Clipboard access was blocked. You can use the report instead."); } }}>Copy dimension tags</Button>
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <ToolCard><h2 className="mb-2 text-xl font-bold">📐 What this checks</h2><p className="text-sm leading-6 text-slate-300">The browser decodes the image and reports its intrinsic width and height. The configurable reference compares pixel dimensions and aspect ratio; it does not emulate every social platform&apos;s crawler, crop, cache or acceptance rules.</p></ToolCard>
            <ToolCard><h2 className="mb-2 text-xl font-bold">🔐 Privacy and limits</h2><p className="text-sm leading-6 text-slate-300">Uploaded files stay in your browser. For image URLs, your browser requests the image host directly; webpage mode uses ToolMint&apos;s protected metadata endpoint and then loads the image in your browser. Open Graph width/height are optional structured properties, not proof that a social platform will display an image as expected. <Link href="/open-graph-preview-generator" className="font-semibold text-cyan-300 underline decoration-cyan-300/40 underline-offset-4">Open Graph Preview Generator</Link></p></ToolCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
