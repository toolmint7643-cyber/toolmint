"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const MAX_SELECTED_PAGES = 20;
const DPI_MIN = 72;
const DPI_MAX = 300;

type Quality = "fast" | "balanced" | "high" | "maximum" | "custom";
type OutputMode = "clean" | "pages";
type PageMode = "all" | "selected";
type Direction = "ltr" | "rtl";

type OcrLanguage = {
  code: string;
  name: string;
  native: string;
  group: string;
  rtl?: boolean;
};

type OcrPage = {
  pageNumber: number;
  text: string;
  confidence: number | null;
  characters: number;
  words: number;
  lines: number;
  retryUsed: boolean;
  status: "Completed" | "Failed" | "Cancelled";
  message: string;
};

const languages: OcrLanguage[] = [
  { code: "eng", name: "English", native: "English", group: "Popular" },
  { code: "hin", name: "Hindi", native: "हिन्दी", group: "Popular" },
  { code: "ara", name: "Arabic", native: "العربية", group: "Popular", rtl: true },
  { code: "urd", name: "Urdu", native: "اردو", group: "Popular", rtl: true },
  { code: "ben", name: "Bengali", native: "বাংলা", group: "Indian / South Asian" },
  { code: "guj", name: "Gujarati", native: "ગુજરાતી", group: "Indian / South Asian" },
  { code: "mar", name: "Marathi", native: "मराठी", group: "Indian / South Asian" },
  { code: "tam", name: "Tamil", native: "தமிழ்", group: "Indian / South Asian" },
  { code: "tel", name: "Telugu", native: "తెలుగు", group: "Indian / South Asian" },
  { code: "kan", name: "Kannada", native: "ಕನ್ನಡ", group: "Indian / South Asian" },
  { code: "mal", name: "Malayalam", native: "മലയാളം", group: "Indian / South Asian" },
  { code: "pan", name: "Punjabi", native: "ਪੰਜਾਬੀ", group: "Indian / South Asian" },
  { code: "nep", name: "Nepali", native: "नेपाली", group: "Indian / South Asian" },
  { code: "fra", name: "French", native: "Français", group: "European / International" },
  { code: "deu", name: "German", native: "Deutsch", group: "European / International" },
  { code: "spa", name: "Spanish", native: "Español", group: "European / International" },
  { code: "por", name: "Portuguese", native: "Português", group: "European / International" },
  { code: "ita", name: "Italian", native: "Italiano", group: "European / International" },
  { code: "nld", name: "Dutch", native: "Nederlands", group: "European / International" },
  { code: "rus", name: "Russian", native: "Русский", group: "European / International" },
  { code: "ukr", name: "Ukrainian", native: "Українська", group: "European / International" },
  { code: "tur", name: "Turkish", native: "Türkçe", group: "European / International" },
  { code: "fas", name: "Persian", native: "فارسی", group: "European / International", rtl: true },
  { code: "chi_sim", name: "Simplified Chinese", native: "简体中文", group: "East Asian" },
  { code: "jpn", name: "Japanese", native: "日本語", group: "East Asian" },
  { code: "kor", name: "Korean", native: "한국어", group: "East Asian" },
];

const qualitySettings = {
  fast: {
    label: "Fast",
    dpi: 96,
    description: "Fastest processing, lower OCR accuracy on small text.",
    badge: "",
  },
  balanced: {
    label: "Balanced",
    dpi: 150,
    description: "Recommended for most scanned PDFs.",
    badge: "Recommended",
  },
  high: {
    label: "High Quality",
    dpi: 240,
    description: "Better for small text, slower processing.",
    badge: "",
  },
  maximum: {
    label: "Maximum Quality",
    dpi: 300,
    description: "Best OCR attempt, slowest and memory-heavy.",
    badge: "",
  },
};

function clampDpi(value: number) {
  return Math.min(DPI_MAX, Math.max(DPI_MIN, Math.round(value || 150)));
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function countWords(text: string) {
  return text.trim().match(/\S+/gu)?.length || 0;
}

function countLines(text: string) {
  if (!text.trim()) return 0;
  return text.split(/\r\n|\r|\n/u).length;
}

function cleanText(text: string) {
  return text
    .replace(/\r\n?/gu, "\n")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function safeBaseName(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-") || "document";
}

function parsePageRange(input: string, pageCount: number) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { pages: [] as number[], error: "Enter a page range like 1-3,7,10." };
  }

  const pages = new Set<number>();

  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();

    if (!part) return { pages: [] as number[], error: "Page range contains an empty value." };

    if (part.includes("-")) {
      const range = part.split("-").map((value) => value.trim());

      if (range.length !== 2 || !range[0] || !range[1]) {
        return { pages: [] as number[], error: `Invalid range: ${part}` };
      }

      const start = Number(range[0]);
      const end = Number(range[1]);

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

      for (let page = start; page <= end; page += 1) pages.add(page);
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) return { pages: [] as number[], error: `Invalid page number: ${part}` };
      if (page <= 0) return { pages: [] as number[], error: "Page numbers must be greater than 0." };
      if (page > pageCount) return { pages: [] as number[], error: `Page ${page} is beyond total pages (${pageCount}).` };

      pages.add(page);
    }
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), error: "" };
}

function getFriendlyError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("password") || message.includes("encrypted")) {
    return "This PDF is password-protected or encrypted and cannot be processed by the browser-based OCR tool.";
  }

  if (message.includes("traineddata") || message.includes("language") || message.includes("lang")) {
    return "The selected OCR language model could not be loaded. Choose another language or check your internet connection/model assets.";
  }

  if (message.includes("worker")) {
    return "OCR worker failed to load. Please refresh the page and try again.";
  }

  if (message.includes("memory") || message.includes("allocation") || message.includes("canvas")) {
    return "The browser ran out of memory while processing this PDF. Try fewer pages or a lower DPI preset.";
  }

  if (message.includes("invalid") || message.includes("corrupt") || message.includes("pdf")) {
    return "Unable to read this PDF. It may be corrupt, unsupported, password-protected, or not a valid PDF file.";
  }

  return "OCR failed. The PDF may be unsupported, too large, encrypted, or the OCR model failed to load.";
}

function getOutputText(pages: OcrPage[], mode: OutputMode) {
  if (mode === "clean") {
    return cleanText(pages.map((page) => page.text).join("\n\n"));
  }

  return pages
    .map((page) => {
      const body = page.text.trim() || page.message;
      return `--- Page ${page.pageNumber} ---\n\n${body}`;
    })
    .join("\n\n");
}

function textLooksPoor(text: string, confidence: number | null) {
  const cleaned = text.trim();
  const letters = cleaned.match(/[\p{L}\p{N}]/gu)?.length || 0;
  const replacement = (cleaned.match(/\uFFFD/gu) || []).length;

  if (!cleaned || letters < 8) return true;
  if (replacement > 2) return true;
  if (confidence !== null && confidence < 35) return true;

  return false;
}

function preprocessCanvas(source: HTMLCanvasElement, mode: "balanced" | "retry") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) throw new Error("Canvas preprocessing failed.");

  canvas.width = source.width;
  canvas.height = source.height;
  context.drawImage(source, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    let value = gray;

    if (mode === "balanced") {
      value = Math.min(255, Math.max(0, (gray - 128) * 1.18 + 132));
    } else {
      value = gray > 150 ? 255 : 0;
    }

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Unable to create OCR image.");
  return blob;
}

export default function PdfOcrPage() {
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const cancelRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageMode, setPageMode] = useState<PageMode>("selected");
  const [pageRange, setPageRange] = useState("1");
  const [quality, setQuality] = useState<Quality>("balanced");
  const [customDpi, setCustomDpi] = useState(150);
  const [outputMode, setOutputMode] = useState<OutputMode>("pages");
  const [languageSearch, setLanguageSearch] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["eng"]);
  const [verifiedLanguages, setVerifiedLanguages] = useState<string[]>([]);
  const [results, setResults] = useState<OcrPage[]>([]);
  const [expandedPages, setExpandedPages] = useState<number[]>([]);
  const [status, setStatus] = useState("Upload a scanned PDF to run browser-side OCR.");
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const selectedLanguageDetails = selectedLanguages
    .map((code) => languages.find((language) => language.code === code))
    .filter(Boolean) as OcrLanguage[];

  const direction: Direction = selectedLanguageDetails.some((language) => language.rtl) ? "rtl" : "ltr";

  const activeDpi = quality === "custom" ? clampDpi(customDpi) : qualitySettings[quality].dpi;

  const filteredLanguages = languages.filter((language) => {
    const query = languageSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      language.name.toLowerCase().includes(query) ||
      language.native.toLowerCase().includes(query) ||
      language.code.toLowerCase().includes(query)
    );
  });

  const selectedPages = useMemo(() => {
    if (!pageCount) return [];
    if (pageMode === "all") return Array.from({ length: pageCount }, (_, index) => index + 1);
    return parsePageRange(pageRange, pageCount).pages;
  }, [pageCount, pageMode, pageRange]);

  const outputText = useMemo(() => getOutputText(results, outputMode), [results, outputMode]);

  const performanceWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (activeDpi >= 240) {
      warnings.push("Higher DPI can improve OCR on small text but may use significantly more memory and processing time.");
    }

    if (selectedLanguages.length > 1) {
      warnings.push("High-resolution or multilingual OCR may take longer and use more browser memory.");
    }

    if (selectedPages.length >= 10) {
      warnings.push(`Maximum ${MAX_SELECTED_PAGES} pages per OCR job. You can process another range separately.`);
    }

    return warnings;
  }, [activeDpi, selectedLanguages.length, selectedPages.length]);

  const searchMatches = useMemo(() => {
    const query = search.trim();
    if (!query || !outputText) return 0;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return outputText.match(new RegExp(escaped, "giu"))?.length || 0;
  }, [outputText, search]);

  const stats = useMemo(() => {
    const confidences = results
      .map((page) => page.confidence)
      .filter((value): value is number => typeof value === "number");

    return {
      selected: selectedPages.length,
      completed: results.filter((page) => page.status === "Completed").length,
      failed: results.filter((page) => page.status === "Failed").length,
      characters: outputText.length,
      words: countWords(outputText),
      lines: countLines(outputText),
      retries: results.filter((page) => page.retryUsed).length,
      confidence: confidences.length
        ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
        : null,
      duration: startedAt && finishedAt ? Math.round((finishedAt - startedAt) / 1000) : null,
    };
  }, [finishedAt, outputText, results, selectedPages.length, startedAt]);

  const terminateWorker = async () => {
    if (workerRef.current) {
      await workerRef.current.terminate().catch(() => undefined);
      workerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      void terminateWorker();
    };
  }, []);

  const reset = async () => {
    cancelRef.current = true;
    await terminateWorker();
    setFile(null);
    setBuffer(null);
    setPageCount(0);
    setPageMode("selected");
    setPageRange("1");
    setQuality("balanced");
    setCustomDpi(150);
    setOutputMode("pages");
    setSelectedLanguages(["eng"]);
    setVerifiedLanguages([]);
    setResults([]);
    setExpandedPages([]);
    setSearch("");
    setError("");
    setCopied("");
    setProgress(0);
    setStartedAt(null);
    setFinishedAt(null);
    setRunning(false);
    setStatus("Upload a scanned PDF to run browser-side OCR.");
  };

  const loadPdf = async (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setRunning(true);
    setError("");
    setResults([]);
    setStatus("Loading PDF...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const bytes = await selectedFile.arrayBuffer();
      const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), useWorkerFetch: false });
      const pdf = await task.promise;

      setFile(selectedFile);
      setBuffer(bytes);
      setPageCount(pdf.numPages);
      setPageRange("1");
      setStatus(`PDF loaded. ${pdf.numPages} page(s) found. Maximum ${MAX_SELECTED_PAGES} pages per OCR job.`);
    } catch (loadError) {
      setError(getFriendlyError(loadError));
      setStatus("PDF loading failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) loadPdf(selectedFile);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) loadPdf(selectedFile);
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((current) => {
      if (current.includes(code)) {
        return current.length === 1 ? current : current.filter((item) => item !== code);
      }
      return [...current, code];
    });
    setVerifiedLanguages([]);
  };

  const setQuickPages = (type: "all" | "first" | "first5" | "last") => {
    if (!pageCount) return;

    if (type === "all") {
      setPageMode("all");
      setPageRange("");
    }

    if (type === "first") {
      setPageMode("selected");
      setPageRange("1");
    }

    if (type === "first5") {
      setPageMode("selected");
      setPageRange(`1-${Math.min(5, pageCount)}`);
    }

    if (type === "last") {
      setPageMode("selected");
      setPageRange(String(pageCount));
    }
  };

  const cancelOcr = async () => {
    cancelRef.current = true;
    setStatus("OCR cancelled.");
    setRunning(false);
    await terminateWorker();
  };

  const runOcr = async () => {
    if (!file || !buffer || !pageCount) {
      setError("Upload a PDF first.");
      return;
    }

    const parsed =
      pageMode === "all"
        ? { pages: Array.from({ length: pageCount }, (_, index) => index + 1), error: "" }
        : parsePageRange(pageRange, pageCount);

    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    if (!parsed.pages.length) {
      setError("Select at least one page.");
      return;
    }

    if (parsed.pages.length > MAX_SELECTED_PAGES) {
      setError(`Maximum ${MAX_SELECTED_PAGES} pages per OCR job. You can process another range separately.`);
      return;
    }

    if (!selectedLanguages.length) {
      setError("Select at least one OCR language.");
      return;
    }

    cancelRef.current = false;
    setRunning(true);
    setError("");
    setCopied("");
    setResults([]);
    setVerifiedLanguages([]);
    setProgress(0);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setStatus("Preparing OCR...");

    try {
      const [{ createWorker }, pdfjsLib] = await Promise.all([import("tesseract.js"), import("pdfjs-dist")]);

      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const languageCode = selectedLanguages.join("+");
      const languageNames = selectedLanguageDetails.map((language) => language.name).join(" + ");

      setStatus(`Loading ${languageNames} language model${selectedLanguages.length > 1 ? "s" : ""}...`);

      const worker = await createWorker(languageCode, undefined, {
        logger: (message) => {
          if (message.status === "recognizing text" && typeof message.progress === "number") {
            setProgress(Math.round(message.progress * 100));
          }
        },
      });

      workerRef.current = worker;

      await worker.setParameters({
        preserve_interword_spaces: "1",
        user_defined_dpi: String(activeDpi),
      });

      setVerifiedLanguages(selectedLanguages);

      const pdfTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false });
      const pdf = await pdfTask.promise;
      const nextResults: OcrPage[] = [];

      for (let index = 0; index < parsed.pages.length; index += 1) {
        if (cancelRef.current) break;

        const pageNumber = parsed.pages[index];
        setProgress(0);
        setStatus(`Rendering page ${index + 1} of ${parsed.pages.length}...`);

        try {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: activeDpi / 72 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { willReadFrequently: true });

          if (!context) throw new Error("Canvas rendering failed.");

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          await page.render({ canvas, canvasContext: context, viewport }).promise;

          const preprocessed = preprocessCanvas(canvas, "balanced");
          const firstBlob = await canvasToBlob(preprocessed);

          setStatus(`OCR page ${index + 1} of ${parsed.pages.length}...`);
          const firstResult = await worker.recognize(firstBlob);
          const firstText = cleanText(firstResult.data.text || "");
          const firstConfidence =
            typeof firstResult.data.confidence === "number" ? firstResult.data.confidence : null;

          let finalText = firstText;
          let finalConfidence = firstConfidence;
          let retryUsed = false;

          if (!cancelRef.current && textLooksPoor(firstText, firstConfidence)) {
            setStatus(`Retrying page ${index + 1} with alternate preprocessing...`);
            const retryCanvas = preprocessCanvas(canvas, "retry");
            const retryBlob = await canvasToBlob(retryCanvas);
            const retryResult = await worker.recognize(retryBlob);
            const retryText = cleanText(retryResult.data.text || "");
            const retryConfidence =
              typeof retryResult.data.confidence === "number" ? retryResult.data.confidence : null;

            const firstScore = firstText.length + (firstConfidence || 0);
            const retryScore = retryText.length + (retryConfidence || 0);

            if (retryScore > firstScore) {
              finalText = retryText;
              finalConfidence = retryConfidence;
              retryUsed = true;
            }

            retryCanvas.width = 0;
            retryCanvas.height = 0;
          }

          canvas.width = 0;
          canvas.height = 0;
          preprocessed.width = 0;
          preprocessed.height = 0;

          const pageResult: OcrPage = {
            pageNumber,
            text: finalText,
            confidence: finalConfidence,
            characters: finalText.length,
            words: countWords(finalText),
            lines: countLines(finalText),
            retryUsed,
            status: "Completed",
            message: finalText
              ? retryUsed
                ? "OCR completed. Alternate preprocessing was used for this page."
                : "OCR completed."
              : "No readable text was detected on this page. The scan may be too low-quality, blank, or require different preprocessing.",
          };

          nextResults.push(pageResult);
          setResults([...nextResults]);
          setExpandedPages((current) => (current.includes(pageNumber) ? current : [...current, pageNumber]));
          setStatus(`Completed page ${index + 1} of ${parsed.pages.length}.`);
        } catch (pageError) {
          nextResults.push({
            pageNumber,
            text: "",
            confidence: null,
            characters: 0,
            words: 0,
            lines: 0,
            retryUsed: false,
            status: "Failed",
            message: getFriendlyError(pageError),
          });
          setResults([...nextResults]);
          setStatus(`Page ${pageNumber} failed. Successfully processed pages were kept.`);
        }

        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }

      if (cancelRef.current) {
        setStatus("OCR cancelled.");
      } else {
        setStatus("Finalizing results...");
        window.setTimeout(() => setStatus("OCR completed."), 0);
      }

      setFinishedAt(Date.now());
      await terminateWorker();
    } catch (ocrError) {
      setError(getFriendlyError(ocrError));
      setStatus("OCR failed.");
      await terminateWorker();
    } finally {
      setRunning(false);
      setProgress(0);
    }
  };

  const copyText = async (text: string, message: string) => {
    try {
      if (!text.trim()) {
        setError("There is no OCR text to copy.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(message);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Clipboard copy failed. Please copy the text manually.");
    }
  };

  const downloadTxt = () => {
    if (!file || !outputText.trim()) {
      setError("There is no OCR text to download.");
      return;
    }

    try {
      const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${safeBaseName(file.name)}-ocr.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("TXT download failed.");
    }
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10 text-white">
        <PageTitle
          title="PDF OCR"
          description="Extract editable text from scanned PDFs with real browser-side OCR using PDF.js and Tesseract.js. Your PDF stays on your device."
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Upload PDF</h2>
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center hover:bg-slate-900"
              >
                <span className="text-4xl font-bold text-blue-300">OCR</span>
                <span className="mt-3 text-lg font-bold">Drop a scanned PDF here or choose file</span>
                <span className="mt-1 text-sm text-slate-300">
                  Browser-side OCR. Maximum {MAX_SELECTED_PAGES} selected pages per job.
                </span>
                <input type="file" accept="application/pdf" onChange={handleFile} className="sr-only" />
              </label>

              {file && (
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <p className="break-all font-bold">{file.name}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatBytes(file.size)} - {pageCount} page(s)
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
                {status}
              </p>

              {running && (
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={runOcr}>Start OCR</Button>
                <Button onClick={cancelOcr} variant="danger">
                  Cancel OCR
                </Button>
                <Button onClick={() => reset()} variant="secondary">
                  Reset
                </Button>
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">OCR Languages</h2>

              <input
                value={languageSearch}
                onChange={(event) => setLanguageSearch(event.target.value)}
                placeholder="Search language..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
              />

              <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">
                Languages are loaded on demand. A language is marked as loaded only after its traineddata model loads successfully in this browser. No silent English fallback is used.
              </p>

              <div className="mt-4 max-h-80 space-y-4 overflow-auto pr-1">
                {["Popular", "Indian / South Asian", "European / International", "East Asian"].map((group) => {
                  const groupItems = filteredLanguages.filter((language) => language.group === group);
                  if (!groupItems.length) return null;

                  return (
                    <div key={group}>
                      <h3 className="mb-2 text-sm font-bold text-blue-300">{group}</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupItems.map((language) => (
                          <button
                            key={language.code}
                            type="button"
                            onClick={() => toggleLanguage(language.code)}
                            className={`rounded-xl border p-3 text-left text-sm font-bold transition ${
                              selectedLanguages.includes(language.code)
                                ? "border-blue-500 bg-blue-600 text-white"
                                : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                            }`}
                          >
                            <span className="block">{language.name}</span>
                            <span className="block text-xs opacity-80">
                              {language.native} - {language.code}
                            </span>
                            {verifiedLanguages.includes(language.code) && (
                              <span className="mt-1 block text-xs text-emerald-200">Model loaded this session</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">OCR Settings</h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {(["fast", "balanced", "high", "maximum"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuality(item)}
                    className={`rounded-xl border p-4 text-left font-bold transition ${
                      quality === item
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      {qualitySettings[item].label}
                      {qualitySettings[item].badge && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
                          {qualitySettings[item].badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-blue-200">{qualitySettings[item].dpi} DPI</span>
                    <span className="mt-2 block text-xs font-medium text-slate-300">
                      {qualitySettings[item].description}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setQuality("custom")}
                  className={`rounded-xl border p-4 text-left font-bold transition ${
                    quality === "custom"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Custom DPI
                  <span className="mt-1 block text-sm text-blue-200">{activeDpi} DPI</span>
                  <span className="mt-2 block text-xs font-medium text-slate-300">
                    Choose a safe OCR render resolution from {DPI_MIN} to {DPI_MAX} DPI.
                  </span>
                </button>
              </div>

              {quality === "custom" && (
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Custom DPI: {activeDpi}</span>
                  <input
                    type="range"
                    min={DPI_MIN}
                    max={DPI_MAX}
                    step="1"
                    value={customDpi}
                    onChange={(event) => setCustomDpi(Number(event.target.value))}
                    className="w-full"
                  />
                </label>
              )}

              {performanceWarnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {performanceWarnings.map((warning) => (
                    <p
                      key={warning}
                      className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Page mode</span>
                  <select
                    value={pageMode}
                    onChange={(event) => setPageMode(event.target.value as PageMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="selected">Selected pages</option>
                    <option value="all">All pages</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-300">Output mode</span>
                  <select
                    value={outputMode}
                    onChange={(event) => setOutputMode(event.target.value as OutputMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="pages">Page-separated</option>
                    <option value="clean">Clean text</option>
                  </select>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Page range</span>
                <input
                  value={pageRange}
                  onChange={(event) => {
                    setPageMode("selected");
                    setPageRange(event.target.value);
                  }}
                  disabled={pageMode === "all"}
                  placeholder="Example: 1-3,7,10"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </label>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setQuickPages("all")}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold"
                >
                  All Pages
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPages("first")}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold"
                >
                  First Page
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPages("first5")}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold"
                >
                  First 5
                </button>
                <button
                  type="button"
                  onClick={() => setQuickPages("last")}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-3 font-bold"
                >
                  Last Page
                </button>
              </div>
            </ToolCard>
          </div>

          <div className="space-y-6">
            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">OCR Summary</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Selected pages" value={stats.selected} />
                <Stat label="Completed" value={stats.completed} />
                <Stat label="Failed" value={stats.failed} />
                <Stat label="Characters" value={stats.characters} />
                <Stat label="Words" value={stats.words} />
                <Stat label="Lines" value={stats.lines} />
                <Stat label="Retries used" value={stats.retries} />
                <Stat
                  label="Average OCR confidence"
                  value={stats.confidence === null ? "N/A" : `${stats.confidence}`}
                />
                <Stat label="Duration" value={stats.duration === null ? "N/A" : `${stats.duration}s`} />
              </div>

              <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
                Selected languages:{" "}
                {selectedLanguageDetails.map((language) => `${language.name} (${language.code})`).join(", ")}
              </p>

              <p className="mt-3 rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-sm text-blue-100">
                Average OCR confidence is an OCR engine estimate, not a guarantee of accuracy.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-4 text-2xl font-bold">Search OCR Text</h2>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search OCR output..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
              />
              <p className="mt-3 text-sm text-slate-300">
                Matches: <span className="font-bold text-white">{searchMatches}</span>
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold"
                >
                  Clear Search
                </button>
              )}
            </ToolCard>

            <ToolCard>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold">Combined OCR Result</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => copyText(outputText, "Copied all OCR text.")}
                    className="rounded-xl bg-blue-600 px-4 py-2 font-bold"
                  >
                    Copy All
                  </button>
                  <button
                    type="button"
                    onClick={downloadTxt}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold"
                  >
                    Download TXT
                  </button>
                </div>
              </div>

              {outputText ? (
                <pre
                  dir={direction}
                  className={`max-h-[460px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-7 text-slate-100 ${
                    direction === "rtl" ? "text-right" : "text-left"
                  }`}
                >
                  {outputText}
                </pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                  OCR text will appear here.
                </div>
              )}
            </ToolCard>

            {results.length > 0 && (
              <ToolCard>
                <h2 className="mb-4 text-2xl font-bold">Page Results</h2>
                <div className="space-y-4">
                  {results.map((page) => {
                    const expanded = expandedPages.includes(page.pageNumber);
                    return (
                      <div key={page.pageNumber} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold">
                              Page {page.pageNumber} - {page.status}
                            </p>
                            <p className="text-sm text-slate-300">
                              Characters: {page.characters} - Words: {page.words} - Average OCR confidence:{" "}
                              {page.confidence ?? "N/A"}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">{page.message}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPages((current) =>
                                  expanded
                                    ? current.filter((item) => item !== page.pageNumber)
                                    : [...current, page.pageNumber],
                                )
                              }
                              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-bold"
                            >
                              {expanded ? "Collapse" : "Expand"}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyText(page.text, `Copied page ${page.pageNumber}.`)}
                              className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold"
                            >
                              Copy Page
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <pre
                            dir={direction}
                            className={`mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-7 text-slate-200 ${
                              direction === "rtl" ? "text-right" : "text-left"
                            }`}
                          >
                            {page.text || page.message}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ToolCard>
            )}

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Privacy</h2>
              <p className="text-slate-300">
                Your PDF is processed locally in your browser. Your document is not uploaded to our server. OCR language models may be loaded by Tesseract.js in the browser.
              </p>
            </ToolCard>

            <ToolCard>
              <h2 className="mb-3 text-xl font-bold">Known Limitations</h2>
              <p className="text-slate-300">
                OCR converts scanned page images into editable text. Accuracy depends on scan quality, resolution, language, fonts, layout and document condition. Average OCR confidence is an engine estimate, not a guarantee of accuracy. This tool does not bypass password-protected PDFs.
              </p>
            </ToolCard>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}