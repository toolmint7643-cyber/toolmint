"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RedactionMode = "raster" | "visual";
type RedactionColor = "black" | "white";
type LabelMode = "none" | "redacted";
type Quality = "standard" | "high" | "very-high";
type ToolAction = "draw" | "move" | "resize" | "none";

type RedactionRegion = {
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

type PdfInfo = {
    name: string;
    size: number;
    pages: number;
    currentPageWidth: number;
    currentPageHeight: number;
};

type Output = {
    name: string;
    url: string;
    size: number;
    mode: RedactionMode;
    pages: number;
    regions: number;
    verification: string[];
};

type PdfJsViewport = {
    width: number;
    height: number;
};

type PdfJsPage = {
    getViewport: (options: { scale: number }) => PdfJsViewport;
    render: (params: {
        canvas: HTMLCanvasElement;
        canvasContext: CanvasRenderingContext2D;
        viewport: PdfJsViewport;
    }) => { promise: Promise<void> };
};

type PdfJsDocument = {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PdfJsPage>;
};

const qualitySettings = {
    standard: { label: "Standard", dpi: 150 },
    high: { label: "High", dpi: 200 },
    "very-high": { label: "Very High", dpi: 300 },
};

function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function safeBaseName(name: string) {
    return name.replace(/\.pdf$/i, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "document";
}

function uint8ToArrayBuffer(bytes: Uint8Array) {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return copy.buffer;
}

function friendlyError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error || "").toLowerCase();

    if (message.includes("password") || message.includes("encrypted")) {
        return "This PDF is password-protected or encrypted and cannot be processed in the current browser-side mode.";
    }

    if (message.includes("invalid") || message.includes("corrupt") || message.includes("pdf")) {
        return "This PDF could not be opened. It may be corrupted, unsupported, encrypted, or not a valid PDF file.";
    }

    if (message.includes("canvas") || message.includes("memory") || message.includes("allocation")) {
        return "Redaction needs too much browser memory. Try fewer pages or lower DPI.";
    }

    return "PDF redaction failed. Try another PDF, fewer redactions, or lower DPI.";
}

function regionCountByPage(regions: RedactionRegion[], page: number) {
    return regions.filter((region) => region.page === page).length;
}

function clamp(value: number, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

async function canvasToPngBlob(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Unable to create PNG image.");
    return blob;
}

export default function PdfRedactionPage() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pdfRef = useRef<PdfJsDocument | null>(null);
    const outputUrlRef = useRef("");
    const renderQueueRef = useRef(Promise.resolve());
    const renderIdRef = useRef(0);
    const dragStartRef = useRef<{ x: number; y: number; region?: RedactionRegion; action: ToolAction } | null>(null);
    const cancelRef = useRef(false);

    const [file, setFile] = useState<File | null>(null);
    const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
    const [info, setInfo] = useState<PdfInfo | null>(null);
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [mode, setMode] = useState<RedactionMode>("raster");
    const [quality, setQuality] = useState<Quality>("high");
    const [color, setColor] = useState<RedactionColor>("black");
    const [labelMode, setLabelMode] = useState<LabelMode>("redacted");
    const [regions, setRegions] = useState<RedactionRegion[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [, setHistory] = useState<RedactionRegion[][]>([]);
    const [, setFuture] = useState<RedactionRegion[][]>([]);
    const [output, setOutput] = useState<Output | null>(null);
    const [showRedactedPreview, setShowRedactedPreview] = useState(true);
    const [acceptedWarning, setAcceptedWarning] = useState(true);
    const [status, setStatus] = useState("Upload a PDF and draw rectangles over sensitive visible information.");
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [processing, setProcessing] = useState(false);

    const affectedPages = useMemo(() => new Set(regions.map((region) => region.page)).size, [regions]);
    const currentRegions = useMemo(() => regions.filter((region) => region.page === page), [page, regions]);


    function pushHistory(current = regions) {
        setHistory((items) => [...items.slice(-29), current.map((region) => ({ ...region }))]);
        setFuture([]);
    }

    function updateRegions(next: RedactionRegion[]) {
        setRegions(next);
    }

    function resetOutput() {
        if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = "";
        setOutput(null);
    }

    function reset() {
        resetOutput();
        pdfRef.current = null;
        cancelRef.current = false;
        setFile(null);
        setBuffer(null);
        setInfo(null);
        setPage(1);
        setZoom(1);
        setMode("raster");
        setQuality("high");
        setColor("black");
        setLabelMode("redacted");
        setRegions([]);
        setSelectedId("");
        setHistory([]);
        setFuture([]);
        setShowRedactedPreview(true);
        setAcceptedWarning(true);
        setStatus("Upload a PDF and draw rectangles over sensitive visible information.");
        setProgress(0);
        setError("");
        setProcessing(false);
    }

    useEffect(() => {
        return () => {
            if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
        };
    }, []);

    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Delete" && selectedId) {
                deleteSelected();
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
                event.preventDefault();
                undo();
            }

            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z") {
                event.preventDefault();
                redo();
            }

            if (event.key === "Escape") {
                dragStartRef.current = null;
                setSelectedId("");
                renderCurrentPage();
            }
        }

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    });

    useEffect(() => {
        if (pdfRef.current) renderCurrentPage();
    }, [page, zoom, regions, showRedactedPreview, selectedId]);

    async function loadPdf(selectedFile: File) {
        if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
            setError("Please upload a valid PDF file.");
            return;
        }

        setError("");
        resetOutput();
        setProcessing(true);
        setStatus("Reading PDF...");
        setProgress(10);

        try {
            const pdfjsLib = await import("pdfjs-dist");
            pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

            const bytes = await selectedFile.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({
                data: new Uint8Array(bytes.slice(0)),
                useWorkerFetch: false,
            }).promise;

            if (!pdf.numPages) throw new Error("Empty PDF");

            pdfRef.current = pdf as unknown as PdfJsDocument;
            setFile(selectedFile);
            setBuffer(bytes);
            setInfo({
                name: selectedFile.name,
                size: selectedFile.size,
                pages: pdf.numPages,
                currentPageWidth: 0,
                currentPageHeight: 0,
            });
            setPage(1);
            setRegions([]);
            setSelectedId("");
            setHistory([]);
            setFuture([]);
            setStatus(`PDF loaded. ${pdf.numPages} page(s). Draw redaction rectangles on the preview.`);
            setProgress(100);
            await renderPage(pdf as unknown as PdfJsDocument, 1, zoom);
        } catch (loadError) {
            setError(friendlyError(loadError));
            setStatus("PDF loading failed.");
            setProgress(0);
        } finally {
            setProcessing(false);
        }
    }

    function handleUpload(event: ChangeEvent<HTMLInputElement>) {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) loadPdf(selectedFile);
        event.target.value = "";
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        const selectedFile = event.dataTransfer.files?.[0];
        if (selectedFile) loadPdf(selectedFile);
    }

    async function renderCurrentPage() {
        if (!pdfRef.current) return;
        await renderPage(pdfRef.current, page, zoom);
    }

    async function renderPage(pdf: PdfJsDocument, pageNumber: number, zoomValue: number) {
        const requestId = renderIdRef.current + 1;
        renderIdRef.current = requestId;

        const job = renderQueueRef.current.then(async () => {
            if (requestId !== renderIdRef.current) return;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const pdfPage = await pdf.getPage(pageNumber);
            if (requestId !== renderIdRef.current) return;

            const baseViewport = pdfPage.getViewport({ scale: 1 });
            const fitScale = Math.min(1.35, 820 / baseViewport.width);
            const scale = fitScale * zoomValue;
            const viewport = pdfPage.getViewport({ scale });
            const context = canvas.getContext("2d");

            if (!context) throw new Error("Canvas is not supported in this browser.");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            canvas.style.width = `${Math.ceil(viewport.width)}px`;
            canvas.style.height = `${Math.ceil(viewport.height)}px`;

            const renderTask = pdfPage.render({ canvas, canvasContext: context, viewport });
            await renderTask.promise;

            if (requestId !== renderIdRef.current) return;

            setInfo((current) =>
                current
                    ? {
                        ...current,
                        currentPageWidth: Math.round(baseViewport.width),
                        currentPageHeight: Math.round(baseViewport.height),
                    }
                    : current,
            );

            if (showRedactedPreview) {
                drawRegions(context, canvas.width, canvas.height, currentRegions, selectedId);
            }
        });

        renderQueueRef.current = job.catch(() => undefined);
        await job;
    }

    function drawRegions(
        context: CanvasRenderingContext2D,
        width: number,
        height: number,
        items: RedactionRegion[],
        activeId: string,
    ) {
        items.forEach((region) => {
            const x = region.x * width;
            const y = region.y * height;
            const w = region.width * width;
            const h = region.height * height;

            context.fillStyle = color === "black" ? "#000000" : "#ffffff";
            context.fillRect(x, y, w, h);

            if (labelMode === "redacted") {
                context.fillStyle = color === "black" ? "#ffffff" : "#000000";
                context.font = `${Math.max(12, Math.min(22, h * 0.24))}px Arial`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText("REDACTED", x + w / 2, y + h / 2);
            }

            context.strokeStyle = region.id === activeId ? "#38bdf8" : "#f97316";
            context.lineWidth = region.id === activeId ? 4 : 2;
            context.strokeRect(x, y, w, h);

            if (region.id === activeId) {
                context.fillStyle = "#38bdf8";
                context.fillRect(x + w - 10, y + h - 10, 10, 10);
            }
        });
    }

    function pointerToNormalized(event: PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: clamp((event.clientX - rect.left) / rect.width),
            y: clamp((event.clientY - rect.top) / rect.height),
        };
    }

    function findRegionAt(point: { x: number; y: number }) {
        return [...currentRegions].reverse().find((region) => {
            return point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height;
        });
    }

    function isResizeHandle(region: RedactionRegion, point: { x: number; y: number }) {
        const handleSize = 0.035;
        return (
            Math.abs(point.x - (region.x + region.width)) < handleSize &&
            Math.abs(point.y - (region.y + region.height)) < handleSize
        );
    }

    function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
        if (!pdfRef.current || processing) return;

        const point = pointerToNormalized(event);
        const hit = findRegionAt(point);

        if (hit) {
            setSelectedId(hit.id);
            dragStartRef.current = {
                x: point.x,
                y: point.y,
                region: { ...hit },
                action: isResizeHandle(hit, point) ? "resize" : "move",
            };
            return;
        }

        pushHistory();
        const id = crypto.randomUUID();
        const nextRegion: RedactionRegion = {
            id,
            page,
            x: point.x,
            y: point.y,
            width: 0.001,
            height: 0.001,
        };

        setSelectedId(id);
        updateRegions([...regions, nextRegion]);
        dragStartRef.current = { x: point.x, y: point.y, region: nextRegion, action: "draw" };
    }

    function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
        const drag = dragStartRef.current;
        if (!drag || !drag.region) return;

        const point = pointerToNormalized(event);
        const dx = point.x - drag.x;
        const dy = point.y - drag.y;

        setRegions((current) =>
            current.map((region) => {
                if (region.id !== drag.region?.id) return region;

                if (drag.action === "draw") {
                    const x = Math.min(drag.x, point.x);
                    const y = Math.min(drag.y, point.y);
                    return {
                        ...region,
                        x,
                        y,
                        width: Math.max(0.01, Math.abs(point.x - drag.x)),
                        height: Math.max(0.01, Math.abs(point.y - drag.y)),
                    };
                }

                if (drag.action === "move") {
                    return {
                        ...region,
                        x: clamp(drag.region.x + dx, 0, 1 - drag.region.width),
                        y: clamp(drag.region.y + dy, 0, 1 - drag.region.height),
                    };
                }

                if (drag.action === "resize") {
                    return {
                        ...region,
                        width: clamp(drag.region.width + dx, 0.01, 1 - drag.region.x),
                        height: clamp(drag.region.height + dy, 0.01, 1 - drag.region.y),
                    };
                }

                return region;
            }),
        );
    }

    function handlePointerUp() {
        dragStartRef.current = null;
    }

    function deleteSelected() {
        if (!selectedId) return;
        pushHistory();
        setRegions((current) => current.filter((region) => region.id !== selectedId));
        setSelectedId("");
    }

    function clearCurrentPage() {
        if (!currentRegions.length) return;
        pushHistory();
        setRegions((current) => current.filter((region) => region.page !== page));
        setSelectedId("");
    }

    function clearAllRedactions() {
        if (!regions.length) return;
        pushHistory();
        setRegions([]);
        setSelectedId("");
    }

    function undo() {
        setHistory((current) => {
            if (!current.length) return current;
            const previous = current[current.length - 1];
            setFuture((items) => [regions.map((region) => ({ ...region })), ...items.slice(0, 29)]);
            setRegions(previous.map((region) => ({ ...region })));
            setSelectedId("");
            return current.slice(0, -1);
        });
    }

    function redo() {
        setFuture((current) => {
            if (!current.length) return current;
            const next = current[0];
            setHistory((items) => [...items.slice(-29), regions.map((region) => ({ ...region }))]);
            setRegions(next.map((region) => ({ ...region })));
            setSelectedId("");
            return current.slice(1);
        });
    }

    function goPage(nextPage: number) {
        if (!info) return;
        setPage(Math.min(info.pages, Math.max(1, nextPage)));
        setSelectedId("");
    }

    async function exportPdf() {
        if (!file || !buffer || !info || !pdfRef.current) {
            setError("Upload a PDF first.");
            return;
        }

        if (!regions.length) {
            setError("No redaction areas selected. Add at least one area before exporting.");
            return;
        }

        resetOutput();
        cancelRef.current = false;
        setProcessing(true);
        setError("");
        setProgress(0);

        try {
            if (mode === "visual") {
                await exportVisualOverlay();
            } else {
                await exportRasterized();
            }
        } catch (exportError) {
            setError(friendlyError(exportError));
            setStatus("PDF redaction failed.");
            setProgress(0);
        } finally {
            setProcessing(false);
            cancelRef.current = false;
        }
    }

    async function exportVisualOverlay() {
        if (!buffer || !file || !info) return;

        setStatus("Creating visual redaction overlay...");
        setProgress(20);

        const pdfDoc = await PDFDocument.load(buffer.slice(0), { ignoreEncryption: false });
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        regions.forEach((region) => {
            const pdfPage = pdfDoc.getPage(region.page - 1);
            const size = pdfPage.getSize();
            const x = region.x * size.width;
            const width = region.width * size.width;
            const height = region.height * size.height;
            const y = size.height - region.y * size.height - height;

            pdfPage.drawRectangle({
                x,
                y,
                width,
                height,
                color: color === "black" ? rgb(0, 0, 0) : rgb(1, 1, 1),
                borderColor: color === "black" ? rgb(0, 0, 0) : rgb(1, 1, 1),
                borderWidth: 0,
            });

            if (labelMode === "redacted") {
                const fontSize = Math.max(8, Math.min(18, height * 0.22));
                pdfPage.drawText("REDACTED", {
                    x: x + Math.max(4, width * 0.12),
                    y: y + height / 2 - fontSize / 2,
                    size: fontSize,
                    font,
                    color: color === "black" ? rgb(1, 1, 1) : rgb(0, 0, 0),
                    maxWidth: width - 8,
                });
            }
        });

        setStatus("Saving visual redacted PDF...");
        setProgress(75);

        const saved = await pdfDoc.save();
        const verified = await verifyOutput(saved, info.pages);
        const blob = new Blob([uint8ToArrayBuffer(saved)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        outputUrlRef.current = url;
        setOutput({
            name: `${safeBaseName(file.name)}-visual-redacted.pdf`,
            url,
            size: blob.size,
            mode: "visual",
            pages: verified.pages,
            regions: regions.length,
            verification: verified.messages,
        });

        setStatus("Visual redaction PDF generated. Remember: underlying PDF content may remain accessible.");
        setProgress(100);
    }

    async function exportRasterized() {
        if (!buffer || !file || !info || !pdfRef.current) return;

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)), useWorkerFetch: false }).promise;
        const outputDoc = await PDFDocument.create();
        const dpi = qualitySettings[quality].dpi;
        const scale = dpi / 72;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            if (cancelRef.current) {
                setStatus("PDF redaction cancelled.");
                return;
            }

            setStatus(`Rendering page ${pageNumber} of ${pdf.numPages}...`);
            setProgress(Math.round(((pageNumber - 1) / pdf.numPages) * 85));

            const pdfPage = await pdf.getPage(pageNumber);
            const viewport = pdfPage.getViewport({ scale });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) throw new Error("Canvas rendering failed.");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;

            const pageRegions = regions.filter((region) => region.page === pageNumber);

            drawRegions(context, canvas.width, canvas.height, pageRegions, "");

            setStatus(`Building redacted output page ${pageNumber} of ${pdf.numPages}...`);

            const pngBlob = await canvasToPngBlob(canvas);
            const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
            const image = await outputDoc.embedPng(pngBytes);

            const pageWidth = viewport.width / scale;
            const pageHeight = viewport.height / scale;
            const outputPage = outputDoc.addPage([pageWidth, pageHeight]);

            outputPage.drawImage(image, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            });

            canvas.width = 0;
            canvas.height = 0;

            await new Promise((resolve) => window.setTimeout(resolve, 0));
        }

        setStatus("Saving rasterized redacted PDF...");
        setProgress(92);

        const saved = await outputDoc.save();
        const verified = await verifyOutput(saved, info.pages);
        const blob = new Blob([uint8ToArrayBuffer(saved)], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        outputUrlRef.current = url;
        setOutput({
            name: `${safeBaseName(file.name)}-redacted.pdf`,
            url,
            size: blob.size,
            mode: "raster",
            pages: verified.pages,
            regions: regions.length,
            verification: verified.messages,
        });

        setStatus("Rasterized redaction output generated successfully.");
        setProgress(100);
    }

    async function verifyOutput(saved: Uint8Array, expectedPages: number) {
        setStatus("Verifying output PDF...");

        const doc = await PDFDocument.load(uint8ToArrayBuffer(saved));
        const pages = doc.getPageCount();
        const messages = ["Output PDF can be loaded", `Output page count: ${pages}`];

        if (pages === expectedPages) {
            messages.push("Output page count matches the original PDF");
        } else {
            messages.push(`Output page count differs from original: ${expectedPages} to ${pages}`);
        }

        if (saved.length > 0) {
            messages.push("Output PDF is non-empty");
        }

        if (regions.length > 0) {
            messages.push(`${regions.length} redaction area(s) were applied`);
        }

        return { pages, messages };
    }

    function cancelExport() {
        cancelRef.current = true;
        setStatus("Stopping after current processing step...");
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
                    title="PDF Redaction Lite"
                    description="Redact visible sensitive information from PDF files in your browser. Draw regions, choose rasterized output, and download a redacted PDF without uploading files."
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
                                <span className="text-4xl font-bold text-blue-300">Redact PDF</span>
                                <span className="mt-3 text-lg font-bold">Drop a PDF here or choose file</span>
                                <span className="mt-1 text-sm text-slate-300">
                                    Your PDF is processed locally in your browser. The file is not uploaded to ToolMint servers.
                                </span>
                                <input type="file" accept="application/pdf,.pdf" onChange={handleUpload} className="sr-only" />
                            </label>

                            {info && (
                                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                    <p className="break-all font-bold">{info.name}</p>
                                    <p className="mt-1 text-sm text-slate-300">
                                        {formatBytes(info.size)} - {info.pages} page(s)
                                    </p>
                                    <p className="mt-1 text-sm text-slate-300">
                                        Current page size: {info.currentPageWidth || "Loading"} x {info.currentPageHeight || "Loading"}
                                    </p>
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

                            {processing && (
                                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-900">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                            )}
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">PDF Viewer</h2>

                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <button type="button" onClick={() => goPage(page - 1)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Previous
                                </button>
                                <span className="rounded-xl bg-slate-900 px-4 py-2 font-bold">
                                    Page {page} / {info?.pages || 0}
                                </span>
                                <button type="button" onClick={() => goPage(page + 1)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Next
                                </button>
                                <button type="button" onClick={() => setZoom((value) => Math.max(0.6, value - 0.15))} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Zoom Out
                                </button>
                                <button type="button" onClick={() => setZoom((value) => Math.min(2.2, value + 0.15))} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Zoom In
                                </button>
                                <button type="button" onClick={() => setZoom(1)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Fit Page
                                </button>
                            </div>

                            <div className="overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
                                <canvas
                                    ref={canvasRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerLeave={handlePointerUp}
                                    className="mx-auto block cursor-crosshair rounded-xl bg-white"
                                    aria-label="PDF page redaction canvas"
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button type="button" onClick={() => setShowRedactedPreview((value) => !value)} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    {showRedactedPreview ? "Show Original" : "Show Redacted Preview"}
                                </button>
                                <button type="button" onClick={deleteSelected} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Delete Selected
                                </button>
                                <button type="button" onClick={clearCurrentPage} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Clear Current Page
                                </button>
                                <button type="button" onClick={clearAllRedactions} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Clear All
                                </button>
                                <button type="button" onClick={undo} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Undo
                                </button>
                                <button type="button" onClick={redo} className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold">
                                    Redo
                                </button>
                            </div>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Redaction Tools</h2>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Redaction Mode</span>
                                    <select
                                        value={mode}
                                        onChange={(event) => setMode(event.target.value as RedactionMode)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="raster">Rasterized Redaction</option>
                                        <option value="visual">Visual Redaction Overlay</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Output Quality</span>
                                    <select
                                        value={quality}
                                        onChange={(event) => setQuality(event.target.value as Quality)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="standard">Standard - 150 DPI</option>
                                        <option value="high">High - 200 DPI</option>
                                        <option value="very-high">Very High - 300 DPI</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Redaction Color</span>
                                    <select
                                        value={color}
                                        onChange={(event) => setColor(event.target.value as RedactionColor)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="black">Black</option>
                                        <option value="white">White</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Label</span>
                                    <select
                                        value={labelMode}
                                        onChange={(event) => setLabelMode(event.target.value as LabelMode)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="redacted">REDACTED</option>
                                        <option value="none">None</option>
                                    </select>
                                </label>
                            </div>

                            {mode === "visual" && (
                                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                                    Visual redaction may not remove the original underlying PDF content. Use rasterized redaction for safer visible-output redaction.
                                </p>
                            )}

                            {mode === "raster" && (
                                <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                                    <p>
                                        Rasterized redaction converts output pages into images. Text search/copy and some accessibility features may be lost on those pages.
                                    </p>
                                    <label className="mt-3 flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={acceptedWarning}
                                            onChange={(event) => setAcceptedWarning(event.target.checked)}
                                        />
                                        I understand and want rasterized redaction output.
                                    </label>
                                </div>
                            )}

                            <div className="mt-5 flex flex-wrap gap-3">
                                <Button onClick={exportPdf}>Export Redacted PDF</Button>
                                {processing && <Button onClick={cancelExport} variant="danger">Cancel</Button>}
                                <Button onClick={downloadOutput} variant="secondary">Download</Button>
                                <Button onClick={reset} variant="danger">Reset</Button>
                            </div>
                        </ToolCard>
                    </div>

                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Redaction Summary</h2>

                            <div className="space-y-3">
                                <SummaryRow label="Pages affected" value={affectedPages} />
                                <SummaryRow label="Redaction areas" value={regions.length} />
                                <SummaryRow label="Current page areas" value={currentRegions.length} />
                                <SummaryRow label="Mode" value={mode === "raster" ? "Rasterized" : "Visual"} />
                                <SummaryRow label="DPI" value={qualitySettings[quality].dpi} />
                                <SummaryRow label="Selected region" value={selectedId ? "Yes" : "None"} />
                            </div>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold">Redaction List</h2>

                            {regions.length ? (
                                <div className="space-y-4">
                                    {Array.from(new Set(regions.map((region) => region.page))).map((pageNumber) => (
                                        <div key={pageNumber} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                            <button
                                                type="button"
                                                onClick={() => goPage(pageNumber)}
                                                className="font-bold text-blue-200"
                                            >
                                                Page {pageNumber} - {regionCountByPage(regions, pageNumber)} redaction(s)
                                            </button>

                                            <div className="mt-3 space-y-2">
                                                {regions
                                                    .filter((region) => region.page === pageNumber)
                                                    .map((region, index) => (
                                                        <button
                                                            key={region.id}
                                                            type="button"
                                                            onClick={() => {
                                                                goPage(region.page);
                                                                setSelectedId(region.id);
                                                            }}
                                                            className={`w-full rounded-xl border p-3 text-left text-sm ${selectedId === region.id ? "border-blue-500 bg-blue-950/50" : "border-slate-700 bg-slate-950"
                                                                }`}
                                                        >
                                                            Region {index + 1} - x {(region.x * 100).toFixed(1)}%, y {(region.y * 100).toFixed(1)}%
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-8 text-center text-slate-300">
                                    Draw redaction rectangles on the PDF preview.
                                </p>
                            )}
                        </ToolCard>

                        {output && (
                            <ToolCard>
                                <h2 className="mb-4 text-2xl font-bold">Redacted PDF Ready</h2>

                                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                                    <p className="break-all font-bold text-emerald-100">{output.name}</p>
                                    <p className="mt-2 text-sm text-emerald-100">
                                        {formatBytes(output.size)} - {output.pages} page(s) - {output.regions} redaction area(s)
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={downloadOutput}
                                    className="mt-4 rounded-xl bg-blue-600 px-4 py-3 font-bold"
                                >
                                    Download Redacted PDF
                                </button>

                                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                    <h3 className="font-bold">Verification</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-300">
                                        {output.verification.map((item) => (
                                            <li key={item}>- {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </ToolCard>
                        )}

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Important Security Disclaimer</h2>
                            <p className="text-slate-300">
                                Redaction removes visible information from the generated rasterized output, but this tool is not a legal or compliance redaction certification system. Always verify the final document before sharing sensitive information.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Why is a Black Rectangle Not Enough?</h2>
                            <p className="text-slate-300">
                                A normal PDF overlay can leave original text or objects underneath. Rasterized redaction renders the page into an image and applies the redaction to that image, so the original page content is not retained under the redacted rasterized page.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Privacy</h2>
                            <p className="text-slate-300">
                                Your PDF is processed locally in your browser. No backend, no upload, and no external redaction API is used.
                            </p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-3 text-xl font-bold">Limitations</h2>
                            <p className="text-slate-300">
                                This tool does not provide legal/compliance certification. Rasterized pages may lose text selection, search and accessibility features. Visual overlay mode is not secure redaction because underlying PDF content may remain accessible.
                            </p>
                        </ToolCard>
                    </div>
                </div>
            </main>

            <Footer />
        </>
    );
}
function SummaryRow({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-sm font-semibold text-slate-300">{label}</p>
            <p className="shrink-0 text-right text-xl font-bold text-white">{value}</p>
        </div>
    );
}


