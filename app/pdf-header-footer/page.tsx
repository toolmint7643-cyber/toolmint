"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Alignment = "left" | "center" | "right";
type PageMode = "all" | "selected";
type DateFormat = "short" | "long" | "iso";

type SectionConfig = {
  enabled: boolean;
  text: string;
  alignment: Alignment;
  fontSize: string;
  color: string;
  margin: string;
  pageMode: PageMode;
  pageRange: string;
  skipFirst: boolean;
  skipLast: boolean;
};

type PdfInfo = {
  fileName: string;
  fileSize: number;
  pageCount: number;
};

type OutputFile = {
  name: string;
  size: string;
  url: string;
};

const defaultHeader: SectionConfig = {
  enabled: false,
  text: "{filename}",
  alignment: "center",
  fontSize: "12",
  color: "#111827",
  margin: "28",
  pageMode: "all",
  pageRange: "",
  skipFirst: false,
  skipLast: false,
};

const defaultFooter: SectionConfig = {
  enabled: true,
  text: "Page {page} of {total}",
  alignment: "center",
  fontSize: "12",
  color: "#111827",
  margin: "28",
  pageMode: "all",
  pageRange: "",
  skipFirst: false,
  skipLast: false,
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function cleanBaseName(name: string) {
  return name.replace(/\.pdf$/i, "");
}

function safeOutputName(name: string) {
  return `${cleanBaseName(name).replace(/[^\w.-]+/g, "-") || "document"}-header-footer.pdf`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return rgb(0, 0, 0);
  }

  const red = parseInt(normalized.slice(0, 2), 16) / 255;
  const green = parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = parseInt(normalized.slice(4, 6), 16) / 255;

  return rgb(red, green, blue);
}

function parsePageRange(input: string, pageCount: number) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { pages: [] as number[], error: "Enter a page range like 1-3,7,10." };
  }

  const selected = new Set<number>();

  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();

    if (!part) {
      return { pages: [] as number[], error: "Page range contains an empty value." };
    }

    if (part.includes("-")) {
      const rangeParts = part.split("-").map((value) => value.trim());

      if (rangeParts.length !== 2 || !rangeParts[0] || !rangeParts[1]) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      const start = Number(rangeParts[0]);
      const end = Number(rangeParts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      if (start <= 0 || end <= 0) {
        return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      }

      if (start > end) {
        return { pages: [] as number[], error: `Range start cannot be greater than end: ${part}` };
      }

      if (end > pageCount) {
        return { pages: [] as number[], error: `Page ${end} is beyond total pages (${pageCount}).` };
      }

      for (let page = start; page <= end; page += 1) {
        selected.add(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) {
        return { pages: [] as number[], error: `Invalid page number: ${part}` };
      }

      if (page <= 0) {
        return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      }

      if (page > pageCount) {
        return { pages: [] as number[], error: `Page ${page} is beyond total pages (${pageCount}).` };
      }

      selected.add(page);
    }
  }

  return { pages: Array.from(selected).sort((a, b) => a - b), error: "" };
}

function formatLocalDate(format: DateFormat) {
  const now = new Date();

  if (format === "iso") {
    return now.toISOString().slice(0, 10);
  }

  if (format === "long") {
    return now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return now.toLocaleDateString();
}

function formatLocalTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderTemplate(
  template: string,
  pageNumber: number,
  totalPages: number,
  fileName: string,
  dateFormat: DateFormat
) {
  return template
    .replaceAll("{page}", String(pageNumber))
    .replaceAll("{total}", String(totalPages))
    .replaceAll("{filename}", cleanBaseName(fileName))
    .replaceAll("{date}", formatLocalDate(dateFormat))
    .replaceAll("{time}", formatLocalTime());
}

function getPagesForSection(config: SectionConfig, pageCount: number) {
  if (!config.enabled) {
    return { pages: [] as number[], error: "" };
  }

  if (config.pageMode === "all") {
    return {
      pages: Array.from({ length: pageCount }, (_, index) => index + 1),
      error: "",
    };
  }

  return parsePageRange(config.pageRange, pageCount);
}

function shouldDrawOnPage(pageNumber: number, totalPages: number, pages: Set<number>, config: SectionConfig) {
  if (!config.enabled) return false;
  if (config.skipFirst && pageNumber === 1) return false;
  if (config.skipLast && pageNumber === totalPages) return false;
  return pages.has(pageNumber);
}

function getTextX(
  alignment: Alignment,
  pageWidth: number,
  margin: number,
  text: string,
  font: PDFFont,
  fontSize: number
) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  if (alignment === "left") {
    return margin;
  }

  if (alignment === "right") {
    return pageWidth - margin - textWidth;
  }

  return (pageWidth - textWidth) / 2;
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("encrypted") || message.includes("password")) {
    return "This PDF is password-protected or encrypted and cannot be processed in the browser.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("missing")) {
    return "Unable to read this PDF. It may be corrupt, unsupported or not a valid PDF file.";
  }

  return "Unable to add header/footer to this PDF. It may be corrupt, encrypted, unsupported or too large for this browser.";
}

function validateSection(config: SectionConfig, label: string) {
  if (!config.enabled) return "";

  if (!config.text.trim()) {
    return `${label} text is required when ${label.toLowerCase()} is enabled.`;
  }

  const fontSize = Number(config.fontSize);
  const margin = Number(config.margin);

  if (!Number.isFinite(fontSize) || fontSize < 6 || fontSize > 72) {
    return `${label} font size must be between 6 and 72.`;
  }

  if (!Number.isFinite(margin) || margin < 0 || margin > 200) {
    return `${label} margin must be between 0 and 200 points.`;
  }

  return "";
}

export default function PdfHeaderFooterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [header, setHeader] = useState<SectionConfig>(defaultHeader);
  const [footer, setFooter] = useState<SectionConfig>(defaultFooter);
  const [dateFormat, setDateFormat] = useState<DateFormat>("short");
  const [outputFile, setOutputFile] = useState<OutputFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to add headers or footers.");
  const [error, setError] = useState("");

  const totalEnabled = Number(header.enabled) + Number(footer.enabled);

  const preview = useMemo(() => {
    const fileName = pdfInfo?.fileName || "document.pdf";
    const total = pdfInfo?.pageCount || 5;

    return {
      header: header.enabled ? renderTemplate(header.text, 1, total, fileName, dateFormat) : "Header disabled",
      footer: footer.enabled ? renderTemplate(footer.text, 1, total, fileName, dateFormat) : "Footer disabled",
    };
  }, [dateFormat, footer.enabled, footer.text, header.enabled, header.text, pdfInfo]);

  const updateHeader = (changes: Partial<SectionConfig>) => {
    setHeader((current) => ({ ...current, ...changes }));
    setOutputFile(null);
  };

  const updateFooter = (changes: Partial<SectionConfig>) => {
    setFooter((current) => ({ ...current, ...changes }));
    setOutputFile(null);
  };

  const resetTool = () => {
    setFile(null);
    setBuffer(null);
    setPdfInfo(null);
    setHeader(defaultHeader);
    setFooter(defaultFooter);
    setDateFormat("short");
    setOutputFile(null);
    setError("");
    setStatus("Upload a PDF to add headers or footers.");
  };

  const loadPdfFile = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setOutputFile(null);
    setStatus("Reading PDF...");

    try {
      const selectedBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(selectedBuffer.slice(0));
      const pageCount = pdfDoc.getPageCount();

      if (!pageCount) {
        setError("This PDF has no pages.");
        setFile(null);
        setBuffer(null);
        setPdfInfo(null);
        return;
      }

      setFile(selectedFile);
      setBuffer(selectedBuffer);
      setPdfInfo({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        pageCount,
      });
      setStatus(`PDF loaded successfully. ${pageCount} page(s) found.`);
    } catch (loadError) {
      setFile(null);
      setBuffer(null);
      setPdfInfo(null);
      setError(getFriendlyError(loadError));
      setStatus("Unable to load PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      loadPdfFile(selectedFile);
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) {
      loadPdfFile(selectedFile);
    }
  };

  const applyPreset = (preset: "page" | "confidential" | "draft" | "date" | "filename") => {
    if (preset === "page") {
      updateFooter({ enabled: true, text: "Page {page} of {total}", alignment: "center" });
    }

    if (preset === "confidential") {
      updateHeader({ enabled: true, text: "CONFIDENTIAL", alignment: "center", color: "#dc2626" });
    }

    if (preset === "draft") {
      updateHeader({ enabled: true, text: "DRAFT", alignment: "center", color: "#2563eb" });
    }

    if (preset === "date") {
      updateFooter({ enabled: true, text: "Generated on {date}", alignment: "right" });
    }

    if (preset === "filename") {
      updateFooter({ enabled: true, text: "{filename} - Page {page} of {total}", alignment: "center" });
    }
  };

  const addHeaderFooter = async () => {
    if (!file || !buffer || !pdfInfo) {
      setError("Upload a valid PDF first.");
      return;
    }

    if (!header.enabled && !footer.enabled) {
      setError("Enable at least one header or footer.");
      return;
    }

    const headerValidation = validateSection(header, "Header");
    if (headerValidation) {
      setError(headerValidation);
      return;
    }

    const footerValidation = validateSection(footer, "Footer");
    if (footerValidation) {
      setError(footerValidation);
      return;
    }

    const headerPages = getPagesForSection(header, pdfInfo.pageCount);
    if (headerPages.error) {
      setError(`Header page range error: ${headerPages.error}`);
      return;
    }

    const footerPages = getPagesForSection(footer, pdfInfo.pageCount);
    if (footerPages.error) {
      setError(`Footer page range error: ${footerPages.error}`);
      return;
    }

    setLoading(true);
    setError("");
    setOutputFile(null);
    setStatus("Preparing PDF...");

    try {
      const pdfDoc = await PDFDocument.load(buffer.slice(0));
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      const headerPageSet = new Set(headerPages.pages);
      const footerPageSet = new Set(footerPages.pages);

      for (let index = 0; index < pages.length; index += 1) {
        const pageNumber = index + 1;
        const page = pages[index];
        const { width, height } = page.getSize();

        setStatus(`Processing page ${pageNumber} of ${totalPages}...`);

        if (shouldDrawOnPage(pageNumber, totalPages, headerPageSet, header)) {
          const fontSize = Number(header.fontSize);
          const margin = Number(header.margin);
          const text = renderTemplate(header.text, pageNumber, totalPages, file.name, dateFormat);
          const x = getTextX(header.alignment, width, margin, text, font, fontSize);
          const y = height - margin - fontSize;

          page.drawText(text, {
            x: Math.max(0, x),
            y: Math.max(0, y),
            size: fontSize,
            font,
            color: hexToRgb(header.color),
          });
        }

        if (shouldDrawOnPage(pageNumber, totalPages, footerPageSet, footer)) {
          const fontSize = Number(footer.fontSize);
          const margin = Number(footer.margin);
          const text = renderTemplate(footer.text, pageNumber, totalPages, file.name, dateFormat);
          const x = getTextX(footer.alignment, width, margin, text, font, fontSize);
          const y = margin;

          page.drawText(text, {
            x: Math.max(0, x),
            y: Math.max(0, y),
            size: fontSize,
            font,
            color: hexToRgb(footer.color),
          });
        }

        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setOutputFile({
        name: safeOutputName(file.name),
        size: formatBytes(blob.size),
        url,
      });
      setStatus("Header/footer PDF generated successfully.");
    } catch (processError) {
      setError(getFriendlyError(processError));
      setStatus("PDF processing failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Header/Footer"
          description="Add headers, footers, dates, filenames and page numbers to PDF pages directly in your browser."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Upload PDF</h2>

              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-900 focus-within:border-blue-400"
              >
                <span className="text-4xl font-bold text-blue-300">PDF</span>
                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">
                  Your PDF is processed locally in your browser. No server upload.
                </span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {pdfInfo && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold text-white">{pdfInfo.fileName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(pdfInfo.fileSize)} - {pdfInfo.pageCount} page(s)
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300" aria-live="polite">
                {loading ? "Working..." : status}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={addHeaderFooter}>Add Header/Footer</Button>
                <Button onClick={resetTool} variant="secondary">Reset</Button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Quick Presets</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => applyPreset("page")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white hover:bg-slate-700">
                  Page {"{page}"} of {"{total}"}
                </button>
                <button type="button" onClick={() => applyPreset("confidential")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white hover:bg-slate-700">
                  Confidential
                </button>
                <button type="button" onClick={() => applyPreset("draft")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white hover:bg-slate-700">
                  Draft
                </button>
                <button type="button" onClick={() => applyPreset("date")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white hover:bg-slate-700">
                  Generated on {"{date}"}
                </button>
                <button type="button" onClick={() => applyPreset("filename")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white hover:bg-slate-700 sm:col-span-2">
                  {"{filename}"} - Page {"{page}"} of {"{total}"}
                </button>
              </div>
            </ToolCard>

            <SectionEditor
              title="Header Settings"
              config={header}
              onChange={updateHeader}
            />

            <SectionEditor
              title="Footer Settings"
              config={footer}
              onChange={updateFooter}
            />
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Placeholder Settings</h2>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Date format</span>
                <select
                  value={dateFormat}
                  onChange={(event) => setDateFormat(event.target.value as DateFormat)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                >
                  <option value="short">Local short date</option>
                  <option value="long">Long date</option>
                  <option value="iso">ISO date</option>
                </select>
              </label>

              <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                <p className="font-bold text-white">Supported placeholders:</p>
                <p className="mt-2">{"{page}"}, {"{total}"}, {"{filename}"}, {"{date}"}, {"{time}"}</p>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Configuration Preview</h2>

              <div className="rounded-2xl border border-slate-700 bg-white p-5 text-slate-900">
                <div className="border-b border-slate-300 pb-4 text-center text-sm font-bold">
                  {preview.header}
                </div>

                <div className="py-20 text-center text-sm text-slate-400">
                  PDF content area
                </div>

                <div className="border-t border-slate-300 pt-4 text-center text-sm font-bold">
                  {preview.footer}
                </div>
              </div>

              <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                Header/footer text is added on top of the existing PDF content. Increase the margin if content overlaps.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold text-white">Output</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                  <p className="text-sm text-blue-200">Pages</p>
                  <p className="mt-2 text-2xl font-bold text-blue-300">{pdfInfo?.pageCount || 0}</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                  <p className="text-sm text-emerald-200">Sections</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-300">{totalEnabled}</p>
                </div>

                <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4">
                  <p className="text-sm text-purple-200">Output size</p>
                  <p className="mt-2 text-xl font-bold text-purple-300">{outputFile?.size || "0 B"}</p>
                </div>
              </div>

              {outputFile ? (
                <a
                  href={outputFile.url}
                  download={outputFile.name}
                  className="mt-5 block rounded-xl border border-blue-500/50 bg-blue-950/40 p-4 font-bold text-white transition hover:bg-blue-900/50"
                >
                  Download {outputFile.name}
                </a>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                  Generated PDF download will appear here.
                </div>
              )}
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Privacy</h2>
              <p className="text-slate-300">
                Your PDF is processed locally in your browser. It is not uploaded to our server or any external PDF processing service.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Known Limitations</h2>
              <p className="text-slate-300">
                Header/footer text is drawn over existing content and cannot automatically detect every overlap. Standard built-in PDF fonts support common characters best. Password-protected or encrypted PDFs may fail.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

type SectionEditorProps = {
  title: string;
  config: SectionConfig;
  onChange: (changes: Partial<SectionConfig>) => void;
};

function SectionEditor({ title, config, onChange }: SectionEditorProps) {
  return (
    <ToolCard>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">{title}</h2>

        <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold text-white">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
          />
          Enabled
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-300">Text</span>
        <input
          value={config.text}
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="Example: Page {page} of {total}"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
        />
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Alignment</span>
          <select
            value={config.alignment}
            onChange={(event) => onChange({ alignment: event.target.value as Alignment })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Page mode</span>
          <select
            value={config.pageMode}
            onChange={(event) => onChange({ pageMode: event.target.value as PageMode })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
          >
            <option value="all">All pages</option>
            <option value="selected">Selected pages</option>
          </select>
        </label>
      </div>

      {config.pageMode === "selected" && (
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Page range</span>
          <input
            value={config.pageRange}
            onChange={(event) => onChange({ pageRange: event.target.value })}
            placeholder="Example: 1-3,7,10"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
          />
        </label>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Font size</span>
          <input
            type="number"
            min="6"
            max="72"
            value={config.fontSize}
            onChange={(event) => onChange({ fontSize: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Color</span>
          <input
            type="color"
            value={config.color}
            onChange={(event) => onChange({ color: event.target.value })}
            className="h-[58px] w-full rounded-xl border border-slate-700 bg-slate-900 p-2"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-300">Margin</span>
          <input
            type="number"
            min="0"
            max="200"
            value={config.margin}
            onChange={(event) => onChange({ margin: event.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 font-semibold text-white">
          <input
            type="checkbox"
            checked={config.skipFirst}
            onChange={(event) => onChange({ skipFirst: event.target.checked })}
          />
          Skip first page
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 p-4 font-semibold text-white">
          <input
            type="checkbox"
            checked={config.skipLast}
            onChange={(event) => onChange({ skipLast: event.target.checked })}
          />
          Skip last page
        </label>
      </div>
    </ToolCard>
  );
}