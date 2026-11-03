"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import {
  AdvancedPdfOptions,
  AdvancedPdfTool,
  AdvancedPdfResult,
  runAdvancedPdfTool,
} from "@/lib/pdfAdvancedTools";

type ToolDefinition = {
  title: string;
  description: string;
  features: string[];
  caution: string;
};

const definitions: Record<AdvancedPdfTool, ToolDefinition> = {
  "pdf-to-excel": {
    title: "PDF to Excel Converter",
    description: "Extract selectable PDF text into an XLSX workbook, with one worksheet per source page.",
    features: ["Real .xlsx workbook", "Page-by-page worksheets", "Browser-side extraction"],
    caution: "PDF text positions are grouped heuristically. Complex tables, multi-column layouts, scanned pages and merged cells may not be reconstructed accurately. Scanned documents need OCR first. Limited to 200 pages per file to control browser memory use.",
  },
  "pdf-protect": {
    title: "Password Protect PDF",
    description: "Encrypt a PDF with a real opening password using QPDF compiled to WebAssembly.",
    features: ["AES-128 or AES-256 encryption", "Separate opening and owner passwords", "Optional print, copy and edit restrictions"],
    caution: "The passwords are not recoverable. Save them securely. Permission restrictions depend on PDF-reader behavior and are not DRM. Files stay in this browser.",
  },
  "pdf-page-counter": {
    title: "PDF Page Counter",
    description: "Count PDF pages and inspect each page's displayed dimensions, orientation and rotation.",
    features: ["Exact page count", "Per-page size and orientation", "Downloadable CSV report"],
    caution: "Password-protected or damaged PDFs may not be readable. Dimensions are reported in PDF points and account for page rotation.",
  },
  "pdf-grayscale": {
    title: "PDF Grayscale Converter",
    description: "Convert every page to grayscale and download a newly generated PDF.",
    features: ["Adjustable rendering DPI", "JPEG quality control", "Sequential page rendering"],
    caution: "This mode rasterizes pages. Searchable text, vectors, forms, annotations, links and original document structure are not preserved. Limited to 30 pages per job with per-page and cumulative render pixel caps to control browser memory.",
  },
  "pdf-extract-images": {
    title: "Extract Images from PDF",
    description: "Find renderable image objects in a PDF and export decoded images as PNG files in a ZIP.",
    features: ["Images organized by source page", "Up to 100 exported images per PDF", "PNG downloads in one ZIP"],
    caution: "Vector drawings are not raster images. Some inline images, masks and unsupported image objects may be skipped. Exported PNGs are decoded visual assets, not byte-for-byte originals. Files are processed locally.",
  },
  "pdf-signature-image": {
    title: "Add Signature Image to PDF",
    description: "Place a transparent PNG or JPG signature image on selected PDF pages.",
    features: ["Page range selection", "Position, size, opacity and rotation", "Original PDF stays unchanged"],
    caution: "This places a visible image stamp only. It is not an electronic or cryptographic digital signature and does not verify identity or document integrity.",
  },
  "pdf-sort-pages": {
    title: "Sort PDF Pages by Size or Orientation",
    description: "Reorder pages by displayed page area or portrait and landscape orientation.",
    features: ["Ascending or descending order", "Stable ordering for ties", "New page order shown before download"],
    caution: "Rebuilding pages can omit interactive forms, signatures, outlines and some document-level structures. Always review the output before replacing an original.",
  },
  "pdf-compress-images": {
    title: "Compress Images in PDF",
    description: "Use QPDF image optimization to recompress eligible embedded images without rasterizing page content.",
    features: ["JPEG quality control", "Text and vector content are not rasterized", "Measured before-and-after file sizes"],
    caution: "Eligible images may be recompressed lossily; unsupported images can be skipped. DPI is not changed. The output may be larger, so savings are never guaranteed.",
  },
  "pdf-form-viewer": {
    title: "PDF Form Field Viewer",
    description: "Inspect supported interactive AcroForm field names, types, values and field flags.",
    features: ["Text, checkbox, dropdown and radio fields", "Required and read-only status", "Downloadable CSV report"],
    caution: "XFA forms and cryptographic signature validation are not supported. Field values can be sensitive; they are processed locally and included in the report you download.",
  },
  "pdf-booklet": {
    title: "PDF Booklet Maker",
    description: "Impose PDF pages in saddle-stitch order, two source pages per landscape sheet side.",
    features: ["Booklet page imposition", "Pads the final signature to a multiple of four", "Vector page content where supported"],
    caution: "Print double-sided and flip on the short edge, then fold. Printer drivers vary; make a test print. The first PDF page sets the sheet size. Limited to 200 source pages per file.",
  },
};

const initialOptions: AdvancedPdfOptions = {
  pageRange: "1",
  signatureImage: null,
  signatureWidth: 24,
  signatureOpacity: 100,
  signatureRotation: 0,
  signaturePosition: "bottom-right",
  grayDpi: 120,
  grayQuality: 82,
  imageQuality: 65,
  password: "",
  passwordConfirmation: "",
  ownerPassword: "",
  sortOrder: "size",
  sortDirection: "ascending",
  keyLength: 256,
  allowPrint: true,
  allowCopy: true,
  allowModify: false,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfToolWorkspace({ kind }: { kind: AdvancedPdfTool }) {
  const definition = definitions[kind];
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [options, setOptions] = useState(initialOptions);
  const [status, setStatus] = useState("Choose one PDF file to begin.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AdvancedPdfResult | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [signaturePreview, setSignaturePreview] = useState("");
  const resultUrlRef = useRef<string | null>(null);
  const signaturePreviewRef = useRef<string | null>(null);

  const fileSize = useMemo(() => file ? formatBytes(file.size) : "No file selected", [file]);

  useEffect(() => () => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    if (signaturePreviewRef.current) URL.revokeObjectURL(signaturePreviewRef.current);
  }, []);

  function clearResult() {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResult(null);
    setResultUrl("");
  }

  function updateSignatureImage(image: File | null) {
    if (signaturePreviewRef.current) URL.revokeObjectURL(signaturePreviewRef.current);
    signaturePreviewRef.current = image ? URL.createObjectURL(image) : null;
    setSignaturePreview(signaturePreviewRef.current ?? "");
    updateOption("signatureImage", image);
  }

  function updateOption<Key extends keyof AdvancedPdfOptions>(key: Key, value: AdvancedPdfOptions[Key]) {
    setOptions((current) => ({ ...current, [key]: value }));
    setError("");
    clearResult();
  }

  async function acceptFile(candidate: File | undefined) {
    if (!candidate) return;
    setError("");
    clearResult();
    if (!candidate.name.toLowerCase().endsWith(".pdf") && candidate.type !== "application/pdf") {
      setError("Choose a PDF file.");
      return;
    }
    if (candidate.size > 80 * 1024 * 1024) {
      setError("This tool currently accepts PDFs up to 80 MB to limit browser memory use.");
      return;
    }
    setFile(candidate);
    setPageCount(null);
    setStatus("PDF selected. Checking page information...");
    try {
      const document = await PDFDocument.load(await candidate.arrayBuffer(), { updateMetadata: false });
      setPageCount(document.getPageCount());
      setStatus("PDF is ready for local processing.");
    } catch {
      setStatus("File selected. Page details could not be read by pdf-lib; processing may still be possible for supported PDFs.");
    }
  }

  function onPdfChange(event: ChangeEvent<HTMLInputElement>) {
    void acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    void acceptFile(event.dataTransfer.files?.[0]);
  }

  async function processPdf() {
    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }
    setBusy(true);
    setError("");
    clearResult();
    setStatus("Processing locally in this browser...");
    try {
      const processed = await runAdvancedPdfTool(kind, file, options);
      resultUrlRef.current = URL.createObjectURL(processed.blob);
      setResultUrl(resultUrlRef.current);
      setResult(processed);
      setStatus("Processing completed. Review the result summary before downloading.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The PDF could not be processed.";
      const lower = message.toLowerCase();
      if (lower.includes("password") || lower.includes("encrypted")) {
        setError("This PDF is encrypted or password-protected. This operation does not bypass existing passwords.");
      } else if (lower.includes("worker")) {
        setError("The local PDF worker could not load. Confirm public/pdf.worker.min.mjs exists, then refresh the page.");
      } else if (lower.includes("memory") || lower.includes("canvas") || lower.includes("allocation")) {
        setError("The browser ran out of processing memory. Try a smaller PDF or lower the rendering DPI.");
      } else {
        setError(message);
      }
      setStatus("Processing did not complete.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-200";
  const isSignature = kind === "pdf-signature-image";
  const isProtect = kind === "pdf-protect";

  return (
    <>
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <PageTitle title={definition.title} description={definition.description} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-xl font-bold text-white">📄 Upload PDF</h2>
              <label
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${isDragging ? "border-emerald-400 bg-emerald-400/10" : "border-blue-500/70 bg-slate-950/50 hover:bg-slate-950"}`}
              >
                <span className="text-2xl" aria-hidden="true">⬆️</span>
                <span className="mt-2 font-bold text-white">Drop your PDF here or choose a file</span>
                <span className="mt-1 text-sm text-slate-400">PDF only · Maximum 80 MB</span>
                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onPdfChange} />
              </label>

              {file && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                  <div className="min-w-0">
                    <p className="break-all font-semibold text-white">{file.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{fileSize}{pageCount === null ? " · Page count unavailable" : ` · ${pageCount} page(s)`}</p>
                  </div>
                  <button type="button" onClick={() => { setFile(null); setPageCount(null); clearResult(); setError(""); setStatus("Choose one PDF file to begin."); }} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-red-400 hover:text-red-200">Remove</button>
                </div>
              )}
              {error && <p role="alert" className="mt-4 rounded-xl border border-red-700/70 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-200">{error}</p>}
              <p aria-live="polite" className="mt-4 rounded-xl bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{status}</p>
            </ToolCard>

            {isSignature && (
              <ToolCard>
                <h2 className="mb-4 text-xl font-bold text-white">✍️ Signature Image</h2>
                <label className={labelClass} htmlFor="signature-image">Upload signature image (PNG or JPG)</label>
                <input id="signature-image" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" className={inputClass} onChange={(event) => updateSignatureImage(event.target.files?.[0] ?? null)} />
                {signaturePreview && <div className="mt-4 rounded-xl border border-slate-700 bg-white p-3"><Image src={signaturePreview} alt="Uploaded signature preview" width={420} height={150} unoptimized className="mx-auto max-h-36 w-auto object-contain" /></div>}
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-4 text-xl font-bold text-white">🛠️ Tool Settings</h2>
              {isSignature && (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="signature-pages">Pages to stamp</label>
                    <input id="signature-pages" value={options.pageRange} onChange={(event) => updateOption("pageRange", event.target.value)} className={inputClass} placeholder="1-3,7" />
                    <p className="mt-1 text-xs text-slate-400">Use page numbers and ranges, such as 1-3,7. Leave blank only after entering a valid selection.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="signature-position">Position</label>
                      <select id="signature-position" value={options.signaturePosition} onChange={(event) => updateOption("signaturePosition", event.target.value)} className={inputClass}>
                        <option value="top-left">Top left</option><option value="top-center">Top center</option><option value="top-right">Top right</option>
                        <option value="center-left">Center left</option><option value="center">Center</option><option value="center-right">Center right</option>
                        <option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="signature-width">Width: {options.signatureWidth}% of page</label>
                      <input id="signature-width" type="range" min="8" max="45" step="1" value={options.signatureWidth} onChange={(event) => updateOption("signatureWidth", Number(event.target.value))} className="w-full accent-blue-500" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="signature-opacity">Opacity: {options.signatureOpacity}%</label>
                      <input id="signature-opacity" type="range" min="15" max="100" step="1" value={options.signatureOpacity} onChange={(event) => updateOption("signatureOpacity", Number(event.target.value))} className="w-full accent-blue-500" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="signature-rotation">Rotation: {options.signatureRotation}°</label>
                      <input id="signature-rotation" type="range" min="-45" max="45" step="1" value={options.signatureRotation} onChange={(event) => updateOption("signatureRotation", Number(event.target.value))} className="w-full accent-blue-500" />
                    </div>
                  </div>
                </div>
              )}

              {kind === "pdf-grayscale" && (
                <div className="space-y-5">
                  <div><label className={labelClass} htmlFor="gray-dpi">Rendering resolution: {options.grayDpi} DPI</label><input id="gray-dpi" type="range" min="72" max="200" step="1" value={options.grayDpi} onChange={(event) => updateOption("grayDpi", Number(event.target.value))} className="w-full accent-blue-500" /></div>
                  <div><label className={labelClass} htmlFor="gray-quality">JPEG quality: {options.grayQuality}%</label><input id="gray-quality" type="range" min="50" max="95" step="1" value={options.grayQuality} onChange={(event) => updateOption("grayQuality", Number(event.target.value))} className="w-full accent-blue-500" /></div>
                </div>
              )}

              {kind === "pdf-compress-images" && <div><label className={labelClass} htmlFor="image-quality">Re-encode quality: {options.imageQuality}%</label><input id="image-quality" type="range" min="35" max="90" step="1" value={options.imageQuality} onChange={(event) => updateOption("imageQuality", Number(event.target.value))} className="w-full accent-blue-500" /><p className="mt-2 text-sm text-slate-400">QPDF may leave images unchanged when converting them would not reduce their size. DPI and page geometry are not changed.</p></div>}

              {kind === "pdf-sort-pages" && <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass} htmlFor="sort-order">Sort by</label><select id="sort-order" value={options.sortOrder} onChange={(event) => updateOption("sortOrder", event.target.value as AdvancedPdfOptions["sortOrder"])} className={inputClass}><option value="size">Displayed page size</option><option value="orientation">Orientation</option></select></div><div><label className={labelClass} htmlFor="sort-direction">Direction</label><select id="sort-direction" value={options.sortDirection} onChange={(event) => updateOption("sortDirection", event.target.value as AdvancedPdfOptions["sortDirection"])} className={inputClass}><option value="ascending">Ascending</option><option value="descending">Descending</option></select></div></div>}

              {isProtect && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className={labelClass} htmlFor="open-password">Opening password</label><input id="open-password" type="password" autoComplete="new-password" value={options.password} onChange={(event) => updateOption("password", event.target.value)} className={inputClass} /></div>
                    <div><label className={labelClass} htmlFor="confirm-password">Confirm opening password</label><input id="confirm-password" type="password" autoComplete="new-password" value={options.passwordConfirmation} onChange={(event) => updateOption("passwordConfirmation", event.target.value)} className={inputClass} /></div>
                  </div>
                  <div><label className={labelClass} htmlFor="owner-password">Owner password (must be different)</label><input id="owner-password" type="password" autoComplete="new-password" value={options.ownerPassword} onChange={(event) => updateOption("ownerPassword", event.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-400">The owner password grants full access and is needed for meaningful permission restrictions.</p></div>
                  <div><label className={labelClass} htmlFor="encryption-level">Encryption strength</label><select id="encryption-level" value={options.keyLength} onChange={(event) => updateOption("keyLength", Number(event.target.value) as 128 | 256)} className={inputClass}><option value={256}>AES-256 (recommended)</option><option value={128}>AES-128</option></select></div>
                  <fieldset className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                    <legend className="px-1 text-sm font-semibold text-slate-200">Reader permission restrictions</legend>
                    <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={options.allowPrint} onChange={(event) => updateOption("allowPrint", event.target.checked)} className="size-4 accent-blue-500" /> Allow printing</label>
                    <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={options.allowCopy} onChange={(event) => updateOption("allowCopy", event.target.checked)} className="size-4 accent-blue-500" /> Allow copying text and images</label>
                    <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={options.allowModify} onChange={(event) => updateOption("allowModify", event.target.checked)} className="size-4 accent-blue-500" /> Allow document modifications</label>
                  </fieldset>
                </div>
              )}

              {!(isSignature || kind === "pdf-grayscale" || kind === "pdf-compress-images" || kind === "pdf-sort-pages" || isProtect) && <p className="text-sm leading-6 text-slate-300">No extra settings are required. The tool will analyze the uploaded PDF and prepare the appropriate report or output.</p>}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-lg font-bold text-white">⚠️ Important Note</h2>
              <p className="text-sm leading-6 text-slate-300">{definition.caution}</p>
            </ToolCard>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <ToolCard>
              <h2 className="mb-4 text-xl font-bold text-white">📊 Job Summary</h2>
              <dl className="divide-y divide-slate-700 text-sm">
                <div className="flex items-start justify-between gap-4 py-3"><dt className="text-slate-400">Source file</dt><dd className="max-w-[65%] break-all text-right font-semibold text-white">{file?.name ?? "Not selected"}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">File size</dt><dd className="font-semibold text-white">{fileSize}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">Pages</dt><dd className="font-semibold text-white">{pageCount ?? "Not detected"}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">Processing</dt><dd className="text-right font-semibold text-emerald-300">In this browser</dd></div>
              </dl>
              <Button onClick={() => void processPdf()} disabled={busy || !file} className="mt-5 w-full">
                {busy ? "Processing..." : definition.title}
              </Button>
              {file && <button type="button" onClick={() => { setError(""); clearResult(); setStatus("PDF is ready for local processing."); }} disabled={busy} className="mt-3 w-full rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-50">Clear result</button>}
            </ToolCard>

            {result && (
              <ToolCard>
                <h2 className="mb-3 text-xl font-bold text-white">✅ Result Ready</h2>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{result.summary}</p>
                <p className="mt-4 break-all rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-emerald-300">{result.fileName}</p>
                <a href={resultUrl} download={result.fileName} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500">⬇️ Download result</a>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-lg font-bold text-white">✨ Included</h2>
              <ul className="space-y-3">
                {definition.features.map((feature) => <li key={feature} className="flex gap-3 text-sm leading-5 text-slate-300"><span className="text-emerald-400" aria-hidden="true">✓</span><span>{feature}</span></li>)}
              </ul>
              <p className="mt-5 border-t border-slate-700 pt-4 text-xs leading-5 text-slate-400">Your selected files are processed in your browser and are not uploaded to ToolMint servers.</p>
            </ToolCard>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
