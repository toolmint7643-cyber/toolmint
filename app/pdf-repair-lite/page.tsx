"use client";

import { ChangeEvent, DragEvent, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type PageCheck = { page: number; readable: boolean; message: string };
type Output = {
  name: string;
  url: string;
  originalSize: number;
  rebuiltSize: number;
  originalPages: number;
  rebuiltPages: number;
  beforeStatus: string;
  afterStatus: string;
  pageChecks: PageCheck[];
  notes: string[];
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function baseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-") || "document";
}

function friendlyError(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes("password") || msg.includes("encrypted")) {
    return "This PDF appears password-protected or encrypted. Repair Lite cannot bypass passwords.";
  }
  if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("missing")) {
    return "This PDF could not be parsed. It may be corrupt, unsupported or not a valid PDF.";
  }
  if (msg.includes("worker")) return "PDF.js worker failed. Check public/pdf.worker.min.mjs.";
  return "Unable to rebuild this PDF in the browser.";
}

async function validateWithPdfJs(buffer: ArrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false });
  const pdf = await task.promise;
  const checks: PageCheck[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    try {
      await pdf.getPage(i);
      checks.push({ page: i, readable: true, message: "Page loaded successfully with PDF.js." });
    } catch {
      checks.push({ page: i, readable: false, message: "Page could not be loaded with PDF.js." });
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  return { pages: pdf.numPages, checks };
}

export default function PdfRepairLitePage() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [status, setStatus] = useState("Upload a PDF to rebuild accessible pages into a fresh PDF.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setFile(null);
    setBuffer(null);
    setOutput(null);
    setError("");
    setStatus("Upload a PDF to rebuild accessible pages into a fresh PDF.");
  };

  const loadFile = async (selected: File) => {
    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setOutput(null);
    setStatus("Reading PDF...");

    try {
      const bytes = await selected.arrayBuffer();
      setFile(selected);
      setBuffer(bytes);
      setStatus("PDF loaded. Click Rebuild PDF to attempt browser-side repair.");
    } catch {
      setError("Unable to read this file.");
      setStatus("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) loadFile(selected);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const selected = event.dataTransfer.files?.[0];
    if (selected) loadFile(selected);
  };

  const rebuildPdf = async () => {
    if (!file || !buffer) {
      setError("Upload a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setOutput(null);
    setStatus("Checking page accessibility...");

    try {
      let beforeStatus = "PDF.js check unavailable.";
      let pageChecks: PageCheck[] = [];

      try {
        const pdfjs = await validateWithPdfJs(buffer);
        beforeStatus = `PDF.js loaded ${pdfjs.pages} page(s).`;
        pageChecks = pdfjs.checks;
      } catch (e) {
        beforeStatus = `PDF.js could not fully load this file: ${friendlyError(e)}`;
      }

      setStatus("Loading PDF with pdf-lib...");
      const source = await PDFDocument.load(buffer.slice(0));
      const sourcePages = source.getPageCount();

      if (!sourcePages) {
        setError("This PDF has no pages to rebuild.");
        return;
      }

      setStatus("Rebuilding PDF structure...");
      const rebuilt = await PDFDocument.create();
      const copiedPages = await rebuilt.copyPages(source, Array.from({ length: sourcePages }, (_, i) => i));

      for (let i = 0; i < copiedPages.length; i += 1) {
        setStatus(`Rebuilding page ${i + 1} of ${copiedPages.length}...`);
        rebuilt.addPage(copiedPages[i]);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      rebuilt.setTitle(`${file.name} rebuilt by ToolMint`);
      rebuilt.setProducer("ToolMint PDF Repair Lite");
      rebuilt.setModificationDate(new Date());

      const rebuiltBytes = await rebuilt.save();
      const validation = await PDFDocument.load(rebuiltBytes.slice(0));
      const rebuiltPages = validation.getPageCount();
      const blob = new Blob([new Uint8Array(rebuiltBytes).buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setOutput({
        name: `${baseName(file.name)}-rebuilt.pdf`,
        url,
        originalSize: file.size,
        rebuiltSize: blob.size,
        originalPages: sourcePages,
        rebuiltPages,
        beforeStatus,
        afterStatus: `Rebuilt PDF validated with pdf-lib. ${rebuiltPages} page(s) available.`,
        pageChecks,
        notes: [
          "Repair Lite rebuilds pages that pdf-lib can parse and copy.",
          "It does not guarantee recovery of severely corrupt PDFs.",
          "It does not bypass passwords or encryption.",
          "Original PDF remains untouched.",
        ],
      });

      setStatus(`Rebuild completed. ${rebuiltPages}/${sourcePages} page(s) rebuilt.`);
    } catch (e) {
      setError(friendlyError(e));
      setStatus("Repair Lite could not rebuild this PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Repair Lite"
          description="Rebuild accessible PDF pages into a fresh PDF directly in your browser. No upload, no password bypass, no fake repair claims."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Upload PDF</h2>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center hover:bg-slate-900"
              >
                <span className="text-4xl font-bold text-blue-300">PDF</span>
                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">Attempts a browser-side rebuild. Original PDF is untouched.</span>
                <input type="file" accept="application/pdf" onChange={handleFile} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{formatBytes(file.size)}</p>
                </div>
              )}

              {error && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">{error}</p>}
              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{loading ? "Working..." : status}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={rebuildPdf}>Rebuild PDF</Button>
                <Button onClick={reset} variant="secondary">Reset</Button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">What Repair Lite Does</h2>
              <p className="text-slate-300">
                This tool tries to load the PDF, copy accessible pages into a new PDF, and save a fresh rebuilt file. It is useful for some structural issues, but it is not a guaranteed repair engine.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Important Limits</h2>
              <p className="text-slate-300">
                Severely corrupt, encrypted, password-protected or unsupported PDFs may fail. This tool does not recover missing content, bypass security, or claim 100% repair.
              </p>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Repair Result</h2>

              {output ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Info label="Original size" value={formatBytes(output.originalSize)} />
                    <Info label="Rebuilt size" value={formatBytes(output.rebuiltSize)} />
                    <Info label="Original pages" value={String(output.originalPages)} />
                    <Info label="Rebuilt pages" value={String(output.rebuiltPages)} />
                  </div>

                  <p className="rounded-xl border border-blue-500/40 bg-blue-950/40 p-4 text-sm text-blue-100">{output.beforeStatus}</p>
                  <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm text-emerald-100">{output.afterStatus}</p>

                  <a href={output.url} download={output.name} className="block rounded-xl border border-blue-500/50 bg-blue-950/40 p-4 font-bold text-white hover:bg-blue-900/50">
                    Download {output.name}
                  </a>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
                  Rebuilt PDF result will appear here.
                </div>
              )}
            </ToolCard>

            {output && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Page Accessibility</h2>
                <div className="max-h-[360px] space-y-3 overflow-auto">
                  {output.pageChecks.length ? output.pageChecks.map((page) => (
                    <div key={page.page} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <p className="font-bold">Page {page.page}: {page.readable ? "Readable" : "Problem"}</p>
                      <p className="mt-2 text-sm text-slate-300">{page.message}</p>
                    </div>
                  )) : (
                    <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">Page accessibility details were unavailable.</p>
                  )}
                </div>
              </ToolCard>
            )}

            {output && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Repair Notes</h2>
                <ul className="space-y-3">
                  {output.notes.map((note) => (
                    <li key={note} className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{note}</li>
                  ))}
                </ul>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Privacy</h2>
              <p className="text-slate-300">Your PDF is processed locally in your browser. It is not uploaded to our server.</p>
            </ToolCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-all font-bold text-white">{value}</p>
    </div>
  );
}