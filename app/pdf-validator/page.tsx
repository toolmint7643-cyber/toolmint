"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Severity = "Error" | "Warning" | "Information";
type OverallStatus = "Valid" | "Valid with warnings" | "Error";
type CheckStatus = "Passed" | "Failed" | "Warning" | "Information" | "Unavailable";
type EncryptionStatus = "Not encrypted" | "Encrypted/password protected" | "Unable to determine";

type TextContentItem = {
  str?: string;
  hasEOL?: boolean;
};

type Issue = {
  severity: Severity;
  title: string;
  explanation: string;
  pageNumber?: number;
  recommendation?: string;
};

type MetadataField = {
  label: string;
  value: string;
  status: "Present" | "Missing" | "Unavailable";
};

type PageValidation = {
  pageNumber: number;
  status: CheckStatus;
  textStatus: "Text found" | "No extractable text" | "Unable to check";
  characterCount: number;
  message: string;
};

type ParserCheck = {
  name: string;
  status: CheckStatus;
  message: string;
};

type ValidationResult = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  extension: string;
  pdfVersion: string;
  pageCount: number;
  overallStatus: OverallStatus;
  overallMessage: string;
  encryptionStatus: EncryptionStatus;
  parserChecks: ParserCheck[];
  metadata: MetadataField[];
  pages: PageValidation[];
  issues: Issue[];
  recommendations: string[];
  pagesWithText: number;
  pagesWithoutText: number;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getExtension(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "No extension";
  return `.${parts.pop()?.toLowerCase() || ""}`;
}

function safeBaseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-") || "document";
}

function cleanValue(value: string | undefined) {
  return value?.trim() || "";
}

function formatDate(value: Date | undefined) {
  if (!value) return "";
  return value.toLocaleString();
}

function getMetadataStatus(value: string): MetadataField["status"] {
  return value.trim() ? "Present" : "Missing";
}

function metadataValue(value: string) {
  return value.trim() || "Missing";
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is password-protected or encrypted and cannot be processed by the browser-side validator.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("missing")) {
    return "The PDF could not be parsed. It may be corrupt, unsupported or not a valid PDF file.";
  }

  if (message.includes("worker")) {
    return "PDF.js worker failed to load. Please make sure public/pdf.worker.min.mjs exists and refresh the page.";
  }

  return "The PDF could not be validated by the browser-side parser.";
}

function detectPdfVersion(buffer: ArrayBuffer) {
  const firstBytes = new Uint8Array(buffer.slice(0, 32));
  const header = new TextDecoder("latin1").decode(firstBytes);
  const match = header.match(/%PDF-(\d\.\d)/);

  return match ? `PDF ${match[1]}` : "PDF version could not be determined.";
}

function hasPdfSignature(buffer: ArrayBuffer) {
  const firstBytes = new Uint8Array(buffer.slice(0, 8));
  const header = new TextDecoder("latin1").decode(firstBytes);

  return header.startsWith("%PDF-");
}

function pageTextFromItems(items: TextContentItem[]) {
  const parts: string[] = [];

  for (const item of items) {
    const value = typeof item.str === "string" ? item.str : "";
    if (!value.trim()) continue;
    parts.push(value);
    parts.push(item.hasEOL ? "\n" : " ");
  }

  return parts.join("").replace(/[ \t]{2,}/g, " ").trim();
}

function deriveOverallStatus(issues: Issue[], parserChecks: ParserCheck[], pageCount: number): OverallStatus {
  const hasError = issues.some((issue) => issue.severity === "Error");
  const hasParserSuccess = parserChecks.some((check) => check.status === "Passed");

  if (hasError || !hasParserSuccess || pageCount <= 0) {
    return "Error";
  }

  if (issues.some((issue) => issue.severity === "Warning")) {
    return "Valid with warnings";
  }

  return "Valid";
}

function buildReport(result: ValidationResult | null) {
  if (!result) {
    return "No PDF validation report available.";
  }

  const metadataLines = result.metadata
    .map((field) => `${field.label}: ${field.status}${field.value ? ` (${field.value})` : ""}`)
    .join("\n");

  const parserLines = result.parserChecks
    .map((check) => `${check.name}: ${check.status} - ${check.message}`)
    .join("\n");

  const pageLines = result.pages
    .map(
      (page) =>
        `Page ${page.pageNumber}: ${page.status} - ${page.textStatus} - Characters: ${page.characterCount}`
    )
    .join("\n");

  const issueLines = result.issues.length
    ? result.issues
        .map((issue) => {
          const page = issue.pageNumber ? `Page ${issue.pageNumber}: ` : "";
          const recommendation = issue.recommendation ? `\nRecommendation: ${issue.recommendation}` : "";
          return `${issue.severity}: ${page}${issue.title}\n${issue.explanation}${recommendation}`;
        })
        .join("\n\n")
    : "No issues detected by browser-side checks.";

  const recommendationLines = result.recommendations.length
    ? result.recommendations.map((item) => `- ${item}`).join("\n")
    : "- No additional recommendations.";

  return `ToolMint PDF Validation Report

PDF:
${result.fileName}

File size:
${formatBytes(result.fileSize)}

MIME type:
${result.mimeType || "Unavailable"}

File extension:
${result.extension}

PDF version:
${result.pdfVersion}

Pages:
${result.pageCount}

Overall status:
${result.overallStatus}

Overall message:
${result.overallMessage}

Encryption status:
${result.encryptionStatus}

Parser checks:
${parserLines}

Text:
Pages with extractable text: ${result.pagesWithText}
Pages without extractable text: ${result.pagesWithoutText}

Metadata:
${metadataLines}

Page validation:
${pageLines}

Issues:
${issueLines}

Recommendations:
${recommendationLines}

Limitations:
This is a browser-side practical PDF validator, not a full PDF standards validator or Adobe Preflight replacement.`;
}

export default function PdfValidatorPage() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Upload a PDF to validate it in your browser.");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const report = useMemo(() => buildReport(result), [result]);

  const severityCounts = useMemo(() => {
    const issues = result?.issues || [];

    return {
      errors: issues.filter((issue) => issue.severity === "Error").length,
      warnings: issues.filter((issue) => issue.severity === "Warning").length,
      information: issues.filter((issue) => issue.severity === "Information").length,
    };
  }, [result]);

  const resetTool = () => {
    setResult(null);
    setFileName("");
    setStatus("Upload a PDF to validate it in your browser.");
    setError("");
    setCopied("");
  };

  const validatePdf = async (file: File) => {
    setLoading(true);
    setError("");
    setCopied("");
    setResult(null);
    setFileName(file.name);
    setStatus("Reading PDF file...");

    try {
      if (!file.size) {
        setError("This file is empty. Please upload a valid PDF file.");
        setStatus("Validation stopped.");
        return;
      }

      const buffer = await file.arrayBuffer();
      const extension = getExtension(file.name);
      const mimeType = file.type || "Unavailable";
      const issues: Issue[] = [];
      const parserChecks: ParserCheck[] = [];
      const pages: PageValidation[] = [];
      const metadata: MetadataField[] = [];
      const recommendations: string[] = [];
      let pageCount = 0;
      let encryptionStatus: EncryptionStatus = "Unable to determine";
      let pdfLibLoaded = false;
      let pdfJsLoaded = false;
      let pdfLibPageCount = 0;
      let pdfJsPageCount = 0;

      setStatus("Checking file signature...");

      if (!hasPdfSignature(buffer)) {
        issues.push({
          severity: "Error",
          title: "Invalid PDF signature",
          explanation: "The file does not start with the expected %PDF- header.",
          recommendation: "Upload a real PDF file, not a renamed or unsupported file.",
        });
      } else {
        issues.push({
          severity: "Information",
          title: "PDF signature found",
          explanation: "The file starts with a valid PDF header signature.",
        });
      }

      const pdfVersion = hasPdfSignature(buffer)
        ? detectPdfVersion(buffer)
        : "PDF version could not be determined.";

      if (file.type && file.type !== "application/pdf") {
        issues.push({
          severity: "Warning",
          title: "Unexpected MIME type",
          explanation: `The browser reports this file as ${file.type}, not application/pdf.`,
          recommendation: "This may still be a PDF, but MIME type metadata is unusual.",
        });
      }

      setStatus("Checking with pdf-lib...");

      try {
        const pdfDoc = await PDFDocument.load(buffer.slice(0));
        pdfLibLoaded = true;
        pdfLibPageCount = pdfDoc.getPageCount();
        pageCount = Math.max(pageCount, pdfLibPageCount);
        encryptionStatus = "Not encrypted";

        parserChecks.push({
          name: "pdf-lib",
          status: "Passed",
          message: `pdf-lib parsed this PDF and found ${pdfLibPageCount} page(s).`,
        });

        const title = cleanValue(pdfDoc.getTitle());
        const author = cleanValue(pdfDoc.getAuthor());
        const subject = cleanValue(pdfDoc.getSubject());
        const keywords = cleanValue(pdfDoc.getKeywords());
        const creator = cleanValue(pdfDoc.getCreator());
        const producer = cleanValue(pdfDoc.getProducer());
        const creationDate = formatDate(pdfDoc.getCreationDate());
        const modificationDate = formatDate(pdfDoc.getModificationDate());

        metadata.push(
          { label: "Title", value: metadataValue(title), status: getMetadataStatus(title) },
          { label: "Author", value: metadataValue(author), status: getMetadataStatus(author) },
          { label: "Subject", value: metadataValue(subject), status: getMetadataStatus(subject) },
          { label: "Keywords", value: metadataValue(keywords), status: getMetadataStatus(keywords) },
          { label: "Creator", value: metadataValue(creator), status: getMetadataStatus(creator) },
          { label: "Producer", value: metadataValue(producer), status: getMetadataStatus(producer) },
          { label: "Creation Date", value: metadataValue(creationDate), status: getMetadataStatus(creationDate) },
          { label: "Modification Date", value: metadataValue(modificationDate), status: getMetadataStatus(modificationDate) }
        );
      } catch (pdfLibError) {
        const message = getFriendlyError(pdfLibError);
        const lowerMessage = pdfLibError instanceof Error ? pdfLibError.message.toLowerCase() : "";

        parserChecks.push({
          name: "pdf-lib",
          status: "Failed",
          message,
        });

        if (lowerMessage.includes("encrypted") || lowerMessage.includes("password")) {
          encryptionStatus = "Encrypted/password protected";
          issues.push({
            severity: "Warning",
            title: "Encryption or password protection detected",
            explanation: "pdf-lib could not parse this PDF because it appears encrypted or password-protected.",
            recommendation: "Use an unlocked PDF for browser-side validation. This tool will not bypass passwords.",
          });
        } else {
          issues.push({
            severity: "Warning",
            title: "pdf-lib parser could not fully parse this PDF",
            explanation: message,
            recommendation: "If PDF.js can still read this document, it may be partially compatible with browser PDF tools.",
          });
        }
      }

      setStatus("Checking with PDF.js...");

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer.slice(0)),
          useWorkerFetch: false,
        });

        const pdf = await loadingTask.promise;
        pdfJsLoaded = true;
        pdfJsPageCount = pdf.numPages;
        pageCount = Math.max(pageCount, pdfJsPageCount);

        parserChecks.push({
          name: "PDF.js",
          status: "Passed",
          message: `PDF.js loaded this PDF and found ${pdfJsPageCount} page(s).`,
        });

        if (!pdfJsPageCount) {
          issues.push({
            severity: "Error",
            title: "No usable pages",
            explanation: "PDF.js loaded the document but reported zero pages.",
            recommendation: "Use a PDF with at least one page.",
          });
        }

        for (let index = 1; index <= pdfJsPageCount; index += 1) {
          setStatus(`Checking page ${index} of ${pdfJsPageCount}...`);

          try {
            const page = await pdf.getPage(index);
            const textContent = await page.getTextContent();
            const text = pageTextFromItems(textContent.items as TextContentItem[]);

            if (text.trim()) {
              pages.push({
                pageNumber: index,
                status: "Passed",
                textStatus: "Text found",
                characterCount: text.length,
                message: "Extractable embedded text was found on this page.",
              });
            } else {
              pages.push({
                pageNumber: index,
                status: "Warning",
                textStatus: "No extractable text",
                characterCount: 0,
                message:
                  "This page contains no extractable embedded text. It may be scanned/image-only or use an unsupported text structure.",
              });

              issues.push({
                severity: "Warning",
                title: "Page has no extractable text",
                explanation:
                  "This page contains no extractable embedded text. It may be scanned/image-only or use an unsupported text structure.",
                pageNumber: index,
                recommendation: "Use a PDF OCR tool if you need editable or searchable text from this page.",
              });
            }
          } catch {
            pages.push({
              pageNumber: index,
              status: "Failed",
              textStatus: "Unable to check",
              characterCount: 0,
              message: "This page could not be loaded by PDF.js.",
            });

            issues.push({
              severity: "Warning",
              title: "Page could not be parsed",
              explanation: "PDF.js could not load or inspect this page.",
              pageNumber: index,
              recommendation: "Try opening the PDF in another reader or repair the PDF if this page is important.",
            });
          }

          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      } catch (pdfJsError) {
        const message = getFriendlyError(pdfJsError);
        const lowerMessage = pdfJsError instanceof Error ? pdfJsError.message.toLowerCase() : "";

        parserChecks.push({
          name: "PDF.js",
          status: "Failed",
          message,
        });

        if (lowerMessage.includes("encrypted") || lowerMessage.includes("password")) {
          encryptionStatus = "Encrypted/password protected";
          issues.push({
            severity: "Warning",
            title: "PDF.js reports encryption/password protection",
            explanation: "PDF.js could not load this PDF because it appears encrypted or password-protected.",
            recommendation: "Use an unlocked PDF. This tool does not bypass PDF security.",
          });
        } else {
          issues.push({
            severity: "Warning",
            title: "PDF.js parser could not load this PDF",
            explanation: message,
            recommendation: "This PDF may still open in some readers, but browser-side parsing failed.",
          });
        }
      }

      if (!metadata.length) {
        metadata.push(
          { label: "Title", value: "Unavailable", status: "Unavailable" },
          { label: "Author", value: "Unavailable", status: "Unavailable" },
          { label: "Subject", value: "Unavailable", status: "Unavailable" },
          { label: "Keywords", value: "Unavailable", status: "Unavailable" },
          { label: "Creator", value: "Unavailable", status: "Unavailable" },
          { label: "Producer", value: "Unavailable", status: "Unavailable" },
          { label: "Creation Date", value: "Unavailable", status: "Unavailable" },
          { label: "Modification Date", value: "Unavailable", status: "Unavailable" }
        );

        issues.push({
          severity: "Information",
          title: "Metadata unavailable",
          explanation: "Metadata could not be inspected because pdf-lib did not parse the PDF metadata.",
        });
      } else {
        for (const field of metadata) {
          if (field.status === "Missing") {
            issues.push({
              severity: "Information",
              title: `${field.label} metadata is not present`,
              explanation: `The ${field.label.toLowerCase()} metadata field is missing. Missing metadata does not mean the PDF is invalid.`,
            });
          }
        }
      }

      if (pdfLibLoaded && pdfJsLoaded && pdfLibPageCount !== pdfJsPageCount) {
        issues.push({
          severity: "Warning",
          title: "Parser page count disagreement",
          explanation: `pdf-lib found ${pdfLibPageCount} page(s), while PDF.js found ${pdfJsPageCount} page(s).`,
          recommendation: "This PDF may use a structure that different parsers handle differently.",
        });
      }

      if (!pdfLibLoaded && !pdfJsLoaded) {
        issues.push({
          severity: "Error",
          title: "PDF could not be parsed",
          explanation: "Neither pdf-lib nor PDF.js could parse this PDF.",
          recommendation: "The file may be corrupt, encrypted, unsupported or not a valid PDF.",
        });
      }

      if (pageCount <= 0 && (pdfLibLoaded || pdfJsLoaded)) {
        issues.push({
          severity: "Error",
          title: "Empty PDF",
          explanation: "The document appears to have no usable pages.",
          recommendation: "Use a PDF with at least one page.",
        });
      }

      const pagesWithText = pages.filter((page) => page.textStatus === "Text found").length;
      const pagesWithoutText = pages.filter((page) => page.textStatus === "No extractable text").length;

      if (pages.length && pagesWithText === 0 && pagesWithoutText === pages.length) {
        issues.push({
          severity: "Warning",
          title: "No extractable embedded text found",
          explanation: "This PDF contains no extractable embedded text. It may be a scanned/image-only document and may require OCR.",
          recommendation: "Use a separate PDF OCR tool if you need editable or searchable text.",
        });
      }

      if (pdfLibLoaded || pdfJsLoaded) {
        recommendations.push("This PDF can be parsed by at least one browser-side PDF library.");
      }

      if (pagesWithoutText > 0) {
        recommendations.push("Some pages may be scanned/image-only or use unsupported text structures. OCR may be required for those pages.");
      }

      if (metadata.some((field) => field.status === "Missing")) {
        recommendations.push("Some metadata fields are missing. Add metadata if the PDF needs better document organization or SEO-like discoverability in document systems.");
      }

      if (encryptionStatus === "Encrypted/password protected") {
        recommendations.push("Use an unlocked copy if you want browser-side tools to inspect or process this PDF.");
      }

      if (!recommendations.length) {
        recommendations.push("This PDF appears valid based on available browser-side checks.");
      }

      const overallStatus = deriveOverallStatus(issues, parserChecks, pageCount);
      const overallMessage =
        overallStatus === "Valid"
          ? "The PDF appears valid and can be parsed by the available browser-side PDF libraries."
          : overallStatus === "Valid with warnings"
            ? "The PDF can be parsed, but some compatibility or content warnings were detected."
            : "The PDF could not be reliably parsed by the available browser-side validators.";

      const validationResult: ValidationResult = {
        fileName: file.name,
        fileSize: file.size,
        mimeType,
        extension,
        pdfVersion,
        pageCount,
        overallStatus,
        overallMessage,
        encryptionStatus,
        parserChecks,
        metadata,
        pages,
        issues,
        recommendations,
        pagesWithText,
        pagesWithoutText,
      };

      setResult(validationResult);
      setStatus("Validation complete.");
    } catch (validationError) {
      setResult(null);
      setError(getFriendlyError(validationError));
      setStatus("Validation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      validatePdf(file);
    }

    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      validatePdf(file);
    }
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied("Copied");
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Clipboard copy failed. Please copy the report manually.");
    }
  };

  const downloadReport = () => {
    if (!result) {
      setError("Validate a PDF before downloading the report.");
      return;
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${safeBaseName(result.fileName)}-validation-report.txt`;
    link.click();

    URL.revokeObjectURL(url);
    setStatus("Validation report downloaded.");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF Validator"
          description="Validate and inspect PDF files directly in your browser. Check parsing, pages, metadata, text extraction and common PDF issues without uploading your file."
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
                  One PDF at a time. Your file stays in your browser.
                </span>
                <input type="file" accept="application/pdf" onChange={handleFileInput} className="sr-only" />
              </label>

              {fileName && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold text-white">{fileName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Status: {result?.overallStatus || "Checking"}
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                  {error}
                </p>
              )}

              {copied && (
                <p className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-semibold text-emerald-200">
                  {copied}
                </p>
              )}

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300" aria-live="polite">
                {loading ? "Working..." : status}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={copyReport}>Copy Report</Button>
                <Button onClick={downloadReport} variant="success">Download Report</Button>
                <Button onClick={resetTool} variant="secondary">Reset</Button>
              </div>
            </ToolCard>

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">File Information</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoRow label="File name" value={result.fileName} />
                  <InfoRow label="File size" value={formatBytes(result.fileSize)} />
                  <InfoRow label="MIME type" value={result.mimeType} />
                  <InfoRow label="Extension" value={result.extension} />
                  <InfoRow label="PDF version" value={result.pdfVersion} />
                  <InfoRow label="Page count" value={String(result.pageCount)} />
                  <InfoRow label="Encryption status" value={result.encryptionStatus} />
                  <InfoRow label="Overall status" value={result.overallStatus} />
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Parser Compatibility Checks</h2>

                <div className="space-y-3">
                  {result.parserChecks.map((check) => (
                    <div key={check.name} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-white">{check.name}</p>
                        <SeverityBadge status={check.status} />
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{check.message}</p>
                    </div>
                  ))}
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Metadata</h2>

                <div className="space-y-3">
                  {result.metadata.map((field) => (
                    <div key={field.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-white">{field.label}</p>
                        <SeverityBadge status={field.status === "Present" ? "Passed" : "Information"} />
                      </div>
                      <p className="mt-2 break-all text-sm text-slate-300">{field.value}</p>
                    </div>
                  ))}
                </div>
              </ToolCard>
            )}
          </div>

          <div className="space-y-6">
            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Overall Validation Status</h2>

                <div
                  className={`rounded-2xl border p-5 ${
                    result.overallStatus === "Error"
                      ? "border-red-500/40 bg-red-950/40"
                      : result.overallStatus === "Valid with warnings"
                        ? "border-amber-500/40 bg-amber-950/40"
                        : "border-emerald-500/40 bg-emerald-950/40"
                  }`}
                >
                  <p className="text-3xl font-bold text-white">{result.overallStatus}</p>
                  <p className="mt-3 text-slate-200">{result.overallMessage}</p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <StatCard label="Errors" value={severityCounts.errors} tone="red" />
                  <StatCard label="Warnings" value={severityCounts.warnings} tone="amber" />
                  <StatCard label="Info" value={severityCounts.information} tone="blue" />
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">PDF Statistics</h2>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Pages" value={result.pageCount} tone="blue" />
                  <StatCard label="Pages with text" value={result.pagesWithText} tone="emerald" />
                  <StatCard label="No text pages" value={result.pagesWithoutText} tone="amber" />
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Page Validation</h2>

                {result.pages.length ? (
                  <div className="max-h-[420px] space-y-3 overflow-auto pr-1">
                    {result.pages.map((page) => (
                      <div key={page.pageNumber} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-white">Page {page.pageNumber}</p>
                            <p className="text-sm text-slate-300">
                              {page.textStatus} - Characters: {page.characterCount}
                            </p>
                          </div>
                          <SeverityBadge status={page.status} />
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{page.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                    Page-level validation was not available for this PDF.
                  </p>
                )}
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Issues & Warnings</h2>

                <div className="space-y-3">
                  {result.issues.map((issue, index) => (
                    <div key={`${issue.title}-${index}`} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-white">
                          {issue.pageNumber ? `Page ${issue.pageNumber}: ` : ""}
                          {issue.title}
                        </p>
                        <SeverityBadge status={issue.severity} />
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{issue.explanation}</p>
                      {issue.recommendation && (
                        <p className="mt-2 rounded-lg bg-slate-800 p-3 text-sm text-slate-200">
                          Recommendation: {issue.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ToolCard>
            )}

            {result && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold text-white">Recommendations</h2>

                <ul className="space-y-3">
                  {result.recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                      {item}
                    </li>
                  ))}
                </ul>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Privacy</h2>
              <p className="text-slate-300">
                Your PDF is analyzed locally in your browser. It is not uploaded to our server or any external PDF processing service.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold text-white">Important Limitations</h2>
              <p className="text-slate-300">
                This is a browser-side practical PDF validator, not a full PDF standards validator or Adobe Preflight replacement. Different PDF parsers may handle unusual PDFs differently. Encryption detection may not always be available. Scanned/image-only detection is heuristic. Missing metadata does not mean the PDF is invalid. No OCR is performed.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-all font-bold text-white">{value}</p>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone: "red" | "amber" | "blue" | "emerald";
};

function StatCard({ label, value, tone }: StatCardProps) {
  const styles = {
    red: "border-red-500/40 bg-red-950/30 text-red-300",
    amber: "border-amber-500/40 bg-amber-950/30 text-amber-300",
    blue: "border-blue-500/40 bg-blue-950/30 text-blue-300",
    emerald: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
  };

  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <p className="text-sm text-slate-200">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

type SeverityBadgeProps = {
  status: CheckStatus | Severity;
};

function SeverityBadge({ status }: SeverityBadgeProps) {
  const styles =
    status === "Error" || status === "Failed"
      ? "border-red-500/40 bg-red-950/40 text-red-200"
      : status === "Warning"
        ? "border-amber-500/40 bg-amber-950/40 text-amber-200"
        : status === "Passed"
          ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
          : "border-blue-500/40 bg-blue-950/40 text-blue-200";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}