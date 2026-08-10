"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const MAX_CANVAS_PIXELS = 28000000;
const MAX_CANVAS_SIDE = 12000;

type FlattenMode = "preserve" | "visual";
type PageMode = "all" | "custom";
type ProgressState = {
    stage: string;
    percent: number;
};

type FieldInfo = {
    name: string;
    type: string;
};

type AnnotationSummary = {
    total: number | null;
    pages: string;
    note: string;
};

type Analysis = {
    fileName: string;
    fileSize: number;
    pageCount: number;
    pdfVersion: string;
    formFieldCount: number;
    fieldTypes: Record<string, number>;
    fields: FieldInfo[];
    annotationSummary: AnnotationSummary;
    metadata: string[];
    encrypted: "Not detected" | "Unable to determine";
};

type FlattenOutput = {
    name: string;
    url: string;
    mode: FlattenMode;
    size: number;
    originalPages: number;
    outputPages: number;
    originalFields: number;
    outputFields: number | null;
    flattenedFields: number;
    verification: string[];
    warnings: string[];
};

const dpiOptions = [
    { label: "72 DPI", value: 72 },
    { label: "96 DPI", value: 96 },
    { label: "150 DPI", value: 150 },
    { label: "200 DPI", value: 200 },
    { label: "240 DPI Recommended", value: 240 },
    { label: "300 DPI High Resolution", value: 300 },
];

function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function safeBaseName(name: string) {
    return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "document";
}

function parsePageRange(input: string, pageCount: number) {
    const trimmed = input.trim();

    if (!trimmed) return { pages: [] as number[], error: "Enter a page range like 1-3,7,10." };

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

            if (!Number.isInteger(start) || !Number.isInteger(end)) return { pages: [] as number[], error: `Invalid range: ${part}` };
            if (start <= 0 || end <= 0) return { pages: [] as number[], error: "Page numbers must be greater than 0." };
            if (start > end) return { pages: [] as number[], error: `Range start cannot be greater than end: ${part}` };
            if (end > pageCount) return { pages: [] as number[], error: `Page ${end} is beyond total pages (${pageCount}).` };

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

function getPdfVersion(buffer: ArrayBuffer) {
    const header = new TextDecoder("latin1").decode(new Uint8Array(buffer.slice(0, 32)));
    const match = header.match(/%PDF-(\d\.\d)/);
    return match ? `PDF ${match[1]}` : "Unable to determine";
}
function uint8ToArrayBuffer(bytes: Uint8Array) {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return copy.buffer;
}

function getFieldType(field: unknown) {
    const name = field && typeof field === "object" && "constructor" in field ? field.constructor?.name : "";
    if (!name) return "Unknown";
    return name.replace(/^PDF/, "").replace(/Field$/, "") || "Unknown";
}

function getFriendlyError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

    if (message.includes("password") || message.includes("encrypted")) {
        return "This PDF is password-protected or encrypted and cannot be processed in the current browser-side mode.";
    }

    if (message.includes("invalid") || message.includes("corrupt") || message.includes("pdf")) {
        return "This PDF could not be opened. It may be corrupted, unsupported, encrypted, or not a valid PDF file.";
    }

    if (message.includes("canvas") || message.includes("memory") || message.includes("allocation")) {
        return "Visual flattening needs too much browser memory. Try a lower DPI or fewer selected pages.";
    }

    return "PDF flattening failed. Try another file, lower DPI, or fewer selected pages.";
}

async function canvasToPngBlob(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Unable to create raster image.");
    return blob;
}

export default function PdfFlattenPage() {
    const resultUrlRef = useRef("");

    const [file, setFile] = useState<File | null>(null);
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [mode, setMode] = useState<FlattenMode>("preserve");
    const [pageMode, setPageMode] = useState<PageMode>("all");
    const [pageRange, setPageRange] = useState("1");
    const [dpi, setDpi] = useState(240);
    const [visualWarningAccepted, setVisualWarningAccepted] = useState(false);
    const [output, setOutput] = useState<FlattenOutput | null>(null);
    const [status, setStatus] = useState("Upload a PDF to analyze form fields and flatten supported content.");
    const [progress, setProgress] = useState<ProgressState>({ stage: "Idle", percent: 0 });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const selectedPages = useMemo(() => {
        if (!analysis) return [];
        if (pageMode === "all") return Array.from({ length: analysis.pageCount }, (_, index) => index + 1);
        return parsePageRange(pageRange, analysis.pageCount).pages;
    }, [analysis, pageMode, pageRange]);

    const highDpiWarning = mode === "visual" && (dpi >= 240 || selectedPages.length >= 15);

    useEffect(() => {
        return () => {
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        };
    }, []);

    function clearOutput() {
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = "";
        setOutput(null);
    }

    function reset() {
        clearOutput();
        setFile(null);
        setBuffer(null);
        setAnalysis(null);
        setMode("preserve");
        setPageMode("all");
        setPageRange("1");
        setDpi(240);
        setVisualWarningAccepted(false);
        setStatus("Upload a PDF to analyze form fields and flatten supported content.");
        setProgress({ stage: "Idle", percent: 0 });
        setError("");
        setLoading(false);
    }

    async function detectAnnotations(bytes: ArrayBuffer) {
        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)), useWorkerFetch: false }).promise;

            let total = 0;
            const pagesWithAnnotations: number[] = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                const annotations = await page.getAnnotations();

                if (annotations.length) {
                    total += annotations.length;
                    pagesWithAnnotations.push(pageNumber);
                }

                await new Promise((resolve) => window.setTimeout(resolve, 0));
            }

            return {
                total,
                pages: pagesWithAnnotations.length ? pagesWithAnnotations.join(", ") : "Not detected",
                note:
                    total > 0
                        ? "Annotations/widgets were detected. Preserve Quality mode reliably flattens supported form fields, not every arbitrary annotation/comment."
                        : "No page annotations were detected by PDF.js.",
            };
        } catch {
            return {
                total: null,
                pages: "Unable to determine",
                note: "Annotation detection could not be completed in this browser.",
            };
        }
    }

    async function analyzePdf(selectedFile: File) {
        if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
            setError("Please upload a valid PDF file.");
            return;
        }

        setLoading(true);
        setError("");
        clearOutput();
        setStatus("Analyzing PDF...");
        setProgress({ stage: "Reading PDF...", percent: 10 });

        try {
            const bytes = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
            const form = pdfDoc.getForm();
            const fields = form.getFields();

            const fieldInfos = fields.map((field) => {
                const fieldWithName = field as { getName?: () => string };
                const type = getFieldType(field);

                return {
                    name: fieldWithName.getName?.() || "Unnamed field",
                    type,
                };
            });

            const fieldTypes = fieldInfos.reduce<Record<string, number>>((acc, field) => {
                acc[field.type] = (acc[field.type] || 0) + 1;
                return acc;
            }, {});

            setProgress({ stage: "Detecting annotations...", percent: 45 });
            const annotationSummary = await detectAnnotations(bytes);

            const metadata = [
                pdfDoc.getTitle() ? `Title: ${pdfDoc.getTitle()}` : "",
                pdfDoc.getAuthor() ? `Author: ${pdfDoc.getAuthor()}` : "",
                pdfDoc.getSubject() ? `Subject: ${pdfDoc.getSubject()}` : "",
                pdfDoc.getCreator() ? `Creator: ${pdfDoc.getCreator()}` : "",
                pdfDoc.getProducer() ? `Producer: ${pdfDoc.getProducer()}` : "",
            ].filter(Boolean);

            const nextAnalysis: Analysis = {
                fileName: selectedFile.name,
                fileSize: selectedFile.size,
                pageCount: pdfDoc.getPageCount(),
                pdfVersion: getPdfVersion(bytes),
                formFieldCount: fields.length,
                fieldTypes,
                fields: fieldInfos,
                annotationSummary,
                metadata: metadata.length ? metadata : ["No common metadata detected"],
                encrypted: "Not detected",
            };

            setFile(selectedFile);
            setBuffer(bytes);
            setAnalysis(nextAnalysis);
            setPageRange(`1-${Math.min(5, nextAnalysis.pageCount)}`);
            setStatus(
                fields.length
                    ? `PDF analyzed. ${fields.length} form field(s) detected.`
                    : "PDF analyzed. No fillable form fields were detected.",
            );
            setProgress({ stage: "Analysis completed.", percent: 100 });
        } catch (analyzeError) {
            setAnalysis(null);
            setError(getFriendlyError(analyzeError));
            setStatus("PDF analysis failed.");
            setProgress({ stage: "Failed.", percent: 0 });
        } finally {
            setLoading(false);
        }
    }

    function handleUpload(event: ChangeEvent<HTMLInputElement>) {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) analyzePdf(selectedFile);
        event.target.value = "";
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        const selectedFile = event.dataTransfer.files?.[0];
        if (selectedFile) analyzePdf(selectedFile);
    }

    async function verifyOutput(bytes: Uint8Array, originalPages: number) {
        const verifiedDoc = await PDFDocument.load(uint8ToArrayBuffer(bytes));
        const outputFields = verifiedDoc.getForm().getFields().length;
        const outputPages = verifiedDoc.getPageCount();

        const verification = ["Output PDF generated", "PDF reopened successfully"];

        if (outputPages === originalPages) {
            verification.push("Page count preserved");
        } else {
            verification.push(`Page count changed: ${originalPages} to ${outputPages}`);
        }

        verification.push(`Remaining form fields: ${outputFields}`);

        return { outputFields, outputPages, verification };
    }

    async function flattenPreserveQuality() {
        if (!buffer || !file || !analysis) return;

        setStatus("Flattening supported form fields...");
        setProgress({ stage: "Reading form fields...", percent: 25 });

        const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: false });
        const form = pdfDoc.getForm();
        const originalFields = form.getFields().length;

        setProgress({ stage: "Flattening form fields...", percent: 50 });

        if (originalFields > 0) {
            form.flatten({ updateFieldAppearances: true });
        }

        setProgress({ stage: "Saving PDF...", percent: 75 });

        const saved = await pdfDoc.save();
        setProgress({ stage: "Verifying output...", percent: 90 });

        const verified = await verifyOutput(saved, analysis.pageCount);
        const blob = new Blob([uint8ToArrayBuffer(saved)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = url;

        setOutput({
            name: `${safeBaseName(file.name)}-flattened.pdf`,
            url,
            mode: "preserve",
            size: blob.size,
            originalPages: analysis.pageCount,
            outputPages: verified.outputPages,
            originalFields,
            outputFields: verified.outputFields,
            flattenedFields: Math.max(0, originalFields - verified.outputFields),
            verification: verified.verification,
            warnings:
                originalFields === 0
                    ? ["No fillable form fields were detected, so Preserve Quality mode had nothing to flatten."]
                    : [
                        "Normal PDF text/searchability is preserved where supported by the original PDF structure.",
                        "Arbitrary comments/highlights may remain because browser-side annotation flattening is not universally supported.",
                    ],
        });
    }

    async function flattenVisual() {
        if (!buffer || !file || !analysis) return;

        const parsed = pageMode === "all"
            ? { pages: Array.from({ length: analysis.pageCount }, (_, index) => index + 1), error: "" }
            : parsePageRange(pageRange, analysis.pageCount);

        if (parsed.error) {
            setError(parsed.error);
            return;
        }

        if (!parsed.pages.length) {
            setError("Select at least one page for visual flattening.");
            return;
        }

        const selected = new Set(parsed.pages);

        setStatus("Preparing visual flatten...");
        setProgress({ stage: "Loading PDF renderer...", percent: 5 });

        const [pdfjsLib, originalDoc] = await Promise.all([
            import("pdfjs-dist"),
            PDFDocument.load(buffer.slice(0), { ignoreEncryption: false }),
        ]);

        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false }).promise;
        const outputDoc = await PDFDocument.create();
        const scale = dpi / 72;

        for (let pageNumber = 1; pageNumber <= analysis.pageCount; pageNumber += 1) {
            const percent = Math.round((pageNumber / analysis.pageCount) * 80) + 5;

            if (!selected.has(pageNumber)) {
                setStatus(`Copying original page ${pageNumber} of ${analysis.pageCount}...`);
                const [copiedPage] = await outputDoc.copyPages(originalDoc, [pageNumber - 1]);
                outputDoc.addPage(copiedPage);
                setProgress({ stage: `Copied page ${pageNumber}.`, percent });
                continue;
            }

            setStatus(`Rendering page ${pageNumber} of ${analysis.pageCount}...`);
            setProgress({ stage: `Rendering page ${pageNumber} of ${analysis.pageCount}...`, percent });

            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale });
            const width = Math.ceil(viewport.width);
            const height = Math.ceil(viewport.height);
            const pixels = width * height;

            if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE || pixels > MAX_CANVAS_PIXELS) {
                throw new Error(`Page ${pageNumber} canvas size would be too large. Lower the DPI.`);
            }

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) throw new Error("Canvas rendering failed.");

            canvas.width = width;
            canvas.height = height;

            await page.render({ canvas, canvasContext: context, viewport }).promise;

            setStatus(`Creating flattened output page ${pageNumber} of ${analysis.pageCount}...`);

            const pngBlob = await canvasToPngBlob(canvas);
            const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
            const image = await outputDoc.embedPng(pngBytes);

            const originalPage = originalDoc.getPage(pageNumber - 1);
            const originalSize = originalPage.getSize();
            const outputPage = outputDoc.addPage([originalSize.width, originalSize.height]);

            outputPage.drawImage(image, {
                x: 0,
                y: 0,
                width: originalSize.width,
                height: originalSize.height,
            });

            canvas.width = 0;
            canvas.height = 0;

            await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        setStatus("Saving visual flattened PDF...");
        setProgress({ stage: "Saving PDF...", percent: 90 });

        const saved = await outputDoc.save();
        const verified = await verifyOutput(saved, analysis.pageCount);
        const blob = new Blob([uint8ToArrayBuffer(saved)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        resultUrlRef.current = url;

        setOutput({
            name: `${safeBaseName(file.name)}-visual-flattened.pdf`,
            url,
            mode: "visual",
            size: blob.size,
            originalPages: analysis.pageCount,
            outputPages: verified.outputPages,
            originalFields: analysis.formFieldCount,
            outputFields: verified.outputFields,
            flattenedFields: selected.size,
            verification: verified.verification,
            warnings: [
                "Visual Flatten rasterizes selected pages into images.",
                "Text on rasterized pages may no longer be selectable or searchable.",
                "Vector content on rasterized pages becomes image content.",
                "File size may increase depending on DPI and page content.",
            ],
        });
    }

    async function runFlatten() {
        if (!file || !buffer || !analysis) {
            setError("Upload and analyze a PDF first.");
            return;
        }

        if (mode === "visual" && !visualWarningAccepted) {
            setError("Please confirm the Visual Flatten warning before processing.");
            return;
        }

        setLoading(true);
        setError("");
        clearOutput();
        setProgress({ stage: "Starting...", percent: 5 });

        try {
            if (mode === "preserve") {
                await flattenPreserveQuality();
            } else {
                await flattenVisual();
            }

            setStatus("PDF flattening completed.");
            setProgress({ stage: "Completed.", percent: 100 });
        } catch (flattenError) {
            setError(getFriendlyError(flattenError));
            setStatus("PDF flattening failed.");
            setProgress({ stage: "Failed.", percent: 0 });
        } finally {
            setLoading(false);
        }
    }

    function downloadOutput() {
        if (!output) return;

        const link = document.createElement("a");
        link.href = output.url;
        link.download = output.name;
        link.click();
    }

    return (
        <>
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-10 text-white">
                <PageTitle
                    title="PDF Flatten"
                    description="Flatten PDF form fields online in your browser. Preserve text where possible or use visual flattening for rasterized static pages."
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
                                <span className="text-4xl font-bold text-blue-300">Flatten PDF</span>
                                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                                <span className="mt-1 text-sm text-slate-300">
                                    Your PDF is processed locally in your browser. Your file is not uploaded to our server.
                                </span>
                                <input type="file" accept="application/pdf,.pdf" onChange={handleUpload} className="sr-only" />
                            </label>

                            {file && (
                                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                    <p className="break-all font-bold">{file.name}</p>
                                    <p className="mt-1 text-sm text-slate-300">{formatBytes(file.size)}</p>
                                </div>
                            )}

                            {error && (
                                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                                    {error}
                                </p>
                            )}

                            <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300" aria-live="polite">
                                {status}
                            </p>

                            {loading && (
                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress.percent}%` }} />
                                </div>
                            )}

                            <p className="mt-3 text-sm text-slate-300">{progress.stage}</p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">PDF Analysis</h2>

                            {analysis ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Stat label="File size" value={formatBytes(analysis.fileSize)} />
                                    <Stat label="Pages" value={analysis.pageCount} />
                                    <Stat label="PDF version" value={analysis.pdfVersion} />
                                    <Stat label="Encrypted" value={analysis.encrypted} />
                                    <Stat label="Form fields" value={analysis.formFieldCount} />
                                    <Stat label="Annotations" value={analysis.annotationSummary.total === null ? "Unable to determine" : analysis.annotationSummary.total} />
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                                    PDF analysis will appear after upload.
                                </p>
                            )}

                            {analysis && (
                                <>
                                    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                        <h3 className="font-bold">Form Field Inventory</h3>
                                        {analysis.fields.length ? (
                                            <div className="mt-3 max-h-52 overflow-auto space-y-2">
                                                {analysis.fields.map((field, index) => (
                                                    <div key={`${field.name}-${index}`} className="rounded-xl bg-slate-950 p-3 text-sm">
                                                        <span className="font-bold text-blue-200">{field.type}</span> - {field.name}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-300">No fillable form fields were detected.</p>
                                        )}
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                        <h3 className="font-bold">Annotation Analysis</h3>
                                        <p className="mt-2 text-sm text-slate-300">Pages: {analysis.annotationSummary.pages}</p>
                                        <p className="mt-2 text-sm text-slate-300">{analysis.annotationSummary.note}</p>
                                    </div>
                                </>
                            )}
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Flatten Mode</h2>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setMode("preserve")}
                                    className={`rounded-xl border p-4 text-left font-bold ${mode === "preserve" ? "border-blue-500 bg-blue-600" : "border-slate-700 bg-slate-900"
                                        }`}
                                >
                                    Preserve Quality
                                    <span className="mt-2 block text-xs font-medium text-slate-200">
                                        Flattens supported form fields without rasterizing the full document.
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setMode("visual")}
                                    className={`rounded-xl border p-4 text-left font-bold ${mode === "visual" ? "border-blue-500 bg-blue-600" : "border-slate-700 bg-slate-900"
                                        }`}
                                >
                                    Visual / Image Flatten
                                    <span className="mt-2 block text-xs font-medium text-slate-200">
                                        Rasterizes selected pages into images inside a new PDF.
                                    </span>
                                </button>
                            </div>

                            {mode === "visual" && (
                                <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4">
                                    <p className="font-semibold text-amber-100">
                                        Visual Flatten converts PDF pages into raster images. Text may no longer be selectable or searchable,
                                        vector content may be rasterized, and output file size may increase.
                                    </p>

                                    <label className="mt-3 flex items-center gap-3 text-sm font-bold text-amber-100">
                                        <input
                                            type="checkbox"
                                            checked={visualWarningAccepted}
                                            onChange={(event) => setVisualWarningAccepted(event.target.checked)}
                                        />
                                        I understand the visual flattening limitations.
                                    </label>
                                </div>
                            )}
                        </ToolCard>

                        {mode === "visual" && (
                            <ToolCard>
                                <h2 className="mb-4 text-2xl font-bold">Visual Flatten Settings</h2>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-slate-300">Pages</span>
                                        <select
                                            value={pageMode}
                                            onChange={(event) => setPageMode(event.target.value as PageMode)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All pages</option>
                                            <option value="custom">Selected pages</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-slate-300">Page range</span>
                                        <input
                                            value={pageRange}
                                            onChange={(event) => {
                                                setPageRange(event.target.value);
                                                setPageMode("custom");
                                            }}
                                            placeholder="Example: 1-3,7,10"
                                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                        />
                                    </label>
                                </div>

                                <label className="mt-4 block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">DPI</span>
                                    <select
                                        value={dpi}
                                        onChange={(event) => setDpi(Number(event.target.value))}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        {dpiOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                    <span className="mt-2 block text-xs text-slate-400">
                                        DPI controls rasterized output resolution. It does not change the original PDF quality.
                                    </span>
                                </label>

                                {highDpiWarning && (
                                    <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-sm font-semibold text-amber-200">
                                        Visual flattening is resource-intensive. High DPI and large PDFs may use significant CPU and RAM.
                                    </p>
                                )}
                            </ToolCard>
                        )}

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Flatten PDF</h2>

                            <div className="flex flex-wrap gap-3">
                                <Button onClick={runFlatten}>Flatten PDF</Button>
                                <Button onClick={downloadOutput} variant="secondary">Download Flattened PDF</Button>
                                <Button onClick={reset} variant="danger">Reset</Button>
                            </div>
                        </ToolCard>
                    </div>

                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Before / After Report</h2>

                            {analysis ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Stat label="Original pages" value={analysis.pageCount} />
                                    <Stat label="Original fields" value={analysis.formFieldCount} />
                                    <Stat label="Original size" value={formatBytes(analysis.fileSize)} />
                                    <Stat label="Annotations" value={analysis.annotationSummary.total === null ? "Unable to determine" : analysis.annotationSummary.total} />
                                    <Stat label="Output pages" value={output?.outputPages ?? "N/A"} />
                                    <Stat label="Output fields" value={output?.outputFields ?? "N/A"} />
                                    <Stat label="Flattened fields/pages" value={output?.flattenedFields ?? "N/A"} />
                                    <Stat label="Output size" value={output ? formatBytes(output.size) : "N/A"} />
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                                    Upload a PDF to see the before and after report.
                                </p>
                            )}
                        </ToolCard>

                        {output && (
                            <ToolCard>
                                <h2 className="mb-4 text-2xl font-bold">Flattened PDF Ready</h2>

                                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                                    <p className="break-all font-bold text-emerald-100">{output.name}</p>
                                    <p className="mt-2 text-sm text-emerald-100">
                                        Mode: {output.mode === "preserve" ? "Preserve Quality" : "Visual / Image Flatten"} - Size: {formatBytes(output.size)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={downloadOutput}
                                    className="mt-4 rounded-xl bg-blue-600 px-4 py-3 font-bold"
                                >
                                    Download Flattened PDF
                                </button>

                                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                    <h3 className="font-bold">Verification</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                        {output.verification.map((item) => (
                                            <li key={item}>- {item}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4">
                                    <h3 className="font-bold text-amber-100">Important Notes</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-amber-100">
                                        {output.warnings.map((item) => (
                                            <li key={item}>- {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </ToolCard>
                        )}

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">What is PDF Flattening?</h2>
                            <p className="text-slate-300">
                                PDF flattening converts interactive form content into static PDF content. It is useful when sharing completed forms, archiving final documents, or preventing accidental edits to fillable fields.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Preserve Quality vs Visual Flatten</h2>
                            <p className="text-slate-300">
                                Preserve Quality flattens supported form fields while keeping normal PDF content searchable where possible. Visual Flatten renders selected pages as images inside a new PDF, which creates a more visually static file but may remove text searchability on those pages.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Privacy</h2>
                            <p className="text-slate-300">
                                Your PDF is processed locally in your browser. ToolMint does not upload your file to a server. Visual flattening happens on your device and may use significant CPU and RAM.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Limitations</h2>
                            <p className="text-slate-300">
                                Browser-side Preserve Quality mode reliably targets supported AcroForm fields. Arbitrary PDF comments, highlights, links or custom annotations may remain. Flattening is not encryption, DRM, password protection or redaction.
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
            <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
        </div>
    );
}