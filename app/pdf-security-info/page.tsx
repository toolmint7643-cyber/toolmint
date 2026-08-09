"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type State = "Detected" | "Not detected" | "Unable to determine";
type Check = { label: string; value: string; state: State; note: string };
type Result = {
  fileName: string;
  fileSize: number;
  pages: number;
  version: string;
  encryption: State;
  pdfLib: string;
  pdfjs: string;
  metadata: Check[];
  security: Check[];
  structure: Check[];
  warnings: string[];
};

type TextItem = { str?: string };

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function baseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-") || "document";
}

function decodeStart(buffer: ArrayBuffer) {
  return new TextDecoder("latin1").decode(new Uint8Array(buffer.slice(0, 2048)));
}

function decodeAll(buffer: ArrayBuffer) {
  return new TextDecoder("latin1").decode(new Uint8Array(buffer));
}

function versionFromHeader(buffer: ArrayBuffer) {
  const match = decodeStart(buffer).match(/%PDF-(\d\.\d)/);
  return match ? `PDF ${match[1]}` : "Unable to determine";
}

function present(value?: string) {
  const clean = value?.trim() || "";
  return {
    value: clean || "Missing",
    state: clean ? "Detected" as State : "Not detected" as State,
  };
}

function dateValue(value?: Date) {
  return value ? value.toLocaleString() : "Missing";
}

function friendlyError(error: unknown) {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";
  if (msg.includes("password") || msg.includes("encrypted")) {
    return "This PDF appears password-protected or encrypted. This tool does not bypass passwords.";
  }
  if (msg.includes("worker")) return "PDF.js worker failed. Check public/pdf.worker.min.mjs.";
  return "Unable to inspect this PDF. It may be corrupt, encrypted, unsupported or too large.";
}

function buildReport(result: Result | null) {
  if (!result) return "No PDF security report available.";

  const lines = [
    "ToolMint PDF Security Info Report",
    "",
    `File: ${result.fileName}`,
    `Size: ${formatBytes(result.fileSize)}`,
    `Pages: ${result.pages}`,
    `PDF version: ${result.version}`,
    `Encryption/password status: ${result.encryption}`,
    `pdf-lib compatibility: ${result.pdfLib}`,
    `PDF.js compatibility: ${result.pdfjs}`,
    "",
    "Metadata:",
    ...result.metadata.map((x) => `${x.label}: ${x.state} - ${x.value}`),
    "",
    "Security / Features:",
    ...result.security.map((x) => `${x.label}: ${x.state} - ${x.note}`),
    "",
    "Structure:",
    ...result.structure.map((x) => `${x.label}: ${x.state} - ${x.note}`),
    "",
    "Warnings:",
    ...(result.warnings.length ? result.warnings.map((x) => `- ${x}`) : ["- No major warnings detected by browser-side checks."]),
    "",
    "Limitations:",
    "This is a browser-side inspection tool. It does not bypass passwords, remove encryption, or guarantee complete PDF security analysis.",
  ];

  return lines.join("\n");
}

export default function PdfSecurityInfoPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("Upload a PDF to inspect security and structure information.");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [loading, setLoading] = useState(false);

  const report = useMemo(() => buildReport(result), [result]);

  const reset = () => {
    setResult(null);
    setError("");
    setCopied("");
    setStatus("Upload a PDF to inspect security and structure information.");
  };

  const inspectPdf = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setCopied("");
    setResult(null);
    setStatus("Reading PDF...");

    try {
      const buffer = await file.arrayBuffer();
      const raw = decodeAll(buffer);
      const warnings: string[] = [];
      const metadata: Check[] = [];
      const security: Check[] = [];
      const structure: Check[] = [];
      let pages = 0;
      let encryption: State = "Unable to determine";
      let pdfLib = "Failed";
      let pdfjs = "Failed";

      if (!decodeStart(buffer).startsWith("%PDF-")) {
        warnings.push("Invalid or missing PDF header signature.");
      }

      setStatus("Checking with pdf-lib...");
      try {
        const doc = await PDFDocument.load(buffer.slice(0));
        pages = Math.max(pages, doc.getPageCount());
        pdfLib = "Passed";
        encryption = "Not detected";

        const title = present(doc.getTitle());
        const author = present(doc.getAuthor());
        const subject = present(doc.getSubject());
        const keywords = present(doc.getKeywords());
        const creator = present(doc.getCreator());
        const producer = present(doc.getProducer());

        metadata.push(
          { label: "Title", value: title.value, state: title.state, note: "Document title metadata." },
          { label: "Author", value: author.value, state: author.state, note: "Document author metadata." },
          { label: "Subject", value: subject.value, state: subject.state, note: "Document subject metadata." },
          { label: "Keywords", value: keywords.value, state: keywords.state, note: "Document keywords metadata." },
          { label: "Creator", value: creator.value, state: creator.state, note: "Creator application metadata." },
          { label: "Producer", value: producer.value, state: producer.state, note: "Producer application metadata." },
          { label: "Creation Date", value: dateValue(doc.getCreationDate()), state: doc.getCreationDate() ? "Detected" : "Not detected", note: "Creation date metadata." },
          { label: "Modification Date", value: dateValue(doc.getModificationDate()), state: doc.getModificationDate() ? "Detected" : "Not detected", note: "Modification date metadata." }
        );

        try {
          const fields = doc.getForm().getFields();
          structure.push({
            label: "Form fields",
            value: String(fields.length),
            state: fields.length ? "Detected" : "Not detected",
            note: fields.length ? `${fields.length} AcroForm field(s) detected.` : "No AcroForm fields detected by pdf-lib.",
          });
        } catch {
          structure.push({ label: "Form fields", value: "Unavailable", state: "Unable to determine", note: "Form fields could not be inspected." });
        }
      } catch (e) {
        const msg = friendlyError(e);
        if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
          encryption = "Detected";
        }
        warnings.push(`pdf-lib could not parse this PDF: ${msg}`);
      }

      setStatus("Checking with PDF.js...");
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false });
        const pdf = await task.promise;
        pdfjs = "Passed";
        pages = Math.max(pages, pdf.numPages);

        let pagesWithText = 0;
        let annotationPages = 0;

        for (let i = 1; i <= pdf.numPages; i += 1) {
          setStatus(`Inspecting page ${i} of ${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          const chars = (text.items as TextItem[]).map((x) => x.str || "").join("").trim().length;
          if (chars > 0) pagesWithText += 1;

          try {
            const annotations = await page.getAnnotations();
            if (annotations.length) annotationPages += 1;
          } catch {
            // Annotation inspection is best-effort.
          }

          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        structure.push(
          {
            label: "Extractable text",
            value: `${pagesWithText}/${pdf.numPages} pages`,
            state: pagesWithText ? "Detected" : "Not detected",
            note: pagesWithText ? "Some pages contain embedded/selectable text." : "No extractable text found. The PDF may be scanned/image-only.",
          },
          {
            label: "Annotations",
            value: `${annotationPages} page(s)`,
            state: annotationPages ? "Detected" : "Not detected",
            note: annotationPages ? "PDF.js detected annotations on one or more pages." : "No page annotations detected by PDF.js.",
          }
        );

        if (!pagesWithText && pdf.numPages) {
          warnings.push("No extractable text found. This PDF may be scanned/image-only and may require OCR.");
        }
      } catch (e) {
        const msg = friendlyError(e);
        if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
          encryption = "Detected";
        }
        warnings.push(`PDF.js could not load this PDF: ${msg}`);
      }

      security.push(
        {
          label: "Encryption / password protection",
          value: encryption,
          state: encryption,
          note:
            encryption === "Detected"
              ? "A parser reported encryption/password protection. This tool does not bypass passwords."
              : encryption === "Not detected"
                ? "No encryption was detected by the successful parser."
                : "Encryption status could not be determined reliably by the browser-side parser.",
        },
        {
          label: "JavaScript actions",
          value: raw.includes("/JavaScript") || raw.includes("/JS") ? "Detected" : "Not detected",
          state: raw.includes("/JavaScript") || raw.includes("/JS") ? "Detected" : "Not detected",
          note: "Detected by scanning PDF structure markers. This is a best-effort browser-side check.",
        },
        {
          label: "Embedded files",
          value: raw.includes("/EmbeddedFile") || raw.includes("/Filespec") ? "Detected" : "Not detected",
          state: raw.includes("/EmbeddedFile") || raw.includes("/Filespec") ? "Detected" : "Not detected",
          note: "Detected by scanning PDF embedded-file markers. This is best-effort.",
        },
        {
          label: "XFA forms",
          value: raw.includes("/XFA") ? "Detected" : "Not detected",
          state: raw.includes("/XFA") ? "Detected" : "Not detected",
          note: "Detected by scanning for XFA markers.",
        },
        {
          label: "Permissions",
          value: "Unable to determine",
          state: "Unable to determine",
          note: "Detailed PDF permission flags are not reliably exposed by the current browser-side libraries.",
        }
      );

      if (!pages) warnings.push("No usable pages were detected.");

      setResult({
        fileName: file.name,
        fileSize: file.size,
        pages,
        version: versionFromHeader(buffer),
        encryption,
        pdfLib,
        pdfjs,
        metadata,
        security,
        structure,
        warnings,
      });
      setStatus("Security inspection complete.");
    } catch (e) {
      setError(friendlyError(e));
      setStatus("Security inspection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) inspectPdf(file);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) inspectPdf(file);
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("Copied");
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Clipboard copy failed. Please copy the report manually.");
    }
  };

  const downloadReport = () => {
    if (!result) {
      setError("Inspect a PDF before downloading the report.");
      return;
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName(result.fileName)}-security-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Security Info"
          description="Inspect PDF security, metadata, parser compatibility and structure directly in your browser without uploading your file."
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
                <span className="mt-1 text-sm text-slate-300">Browser-side inspection only. No server upload.</span>
                <input type="file" accept="application/pdf" onChange={handleFile} className="sr-only" />
              </label>

              {error && <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">{error}</p>}
              {copied && <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">{copied}</p>}
              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{loading ? "Working..." : status}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={copyReport}>Copy Report</Button>
                <Button onClick={downloadReport} variant="success">Download Report</Button>
                <Button onClick={reset} variant="secondary">Reset</Button>
              </div>
            </ToolCard>

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">File Summary</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label="File" value={result.fileName} />
                  <Info label="Size" value={formatBytes(result.fileSize)} />
                  <Info label="Pages" value={String(result.pages)} />
                  <Info label="PDF Version" value={result.version} />
                  <Info label="pdf-lib" value={result.pdfLib} />
                  <Info label="PDF.js" value={result.pdfjs} />
                </div>
              </ToolCard>
            )}

            {result && <CheckList title="Metadata" items={result.metadata} />}
          </div>

          <div className="space-y-6">
            {result && <CheckList title="Security Checks" items={result.security} />}
            {result && <CheckList title="Structure Checks" items={result.structure} />}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Warnings</h2>
                <div className="space-y-3">
                  {result.warnings.length ? result.warnings.map((warning) => (
                    <p key={warning} className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">{warning}</p>
                  )) : (
                    <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">
                      No major security warnings detected by browser-side checks.
                    </p>
                  )}
                </div>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Privacy</h2>
              <p className="text-slate-300">Your PDF is inspected locally in your browser. It is not uploaded to our server.</p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Important Limitations</h2>
              <p className="text-slate-300">
                This is not a full forensic PDF security audit. Some permission flags, encryption details and advanced structures may be unavailable in browser-side libraries. This tool does not bypass passwords or modify PDFs.
              </p>
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

function CheckList({ title, items }: { title: string; items: Check[] }) {
  return (
    <ToolCard>
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-bold text-white">{item.label}</p>
              <span className="rounded-full border border-blue-500/40 bg-blue-950/40 px-3 py-1 text-xs font-bold text-blue-200">{item.state}</span>
            </div>
            <p className="mt-2 break-all text-sm text-slate-300">{item.value}</p>
            <p className="mt-2 text-sm text-slate-400">{item.note}</p>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}
