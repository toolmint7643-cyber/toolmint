"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type EditMode = "delete" | "keep";
type PageMode = "custom" | "first" | "last" | "odd" | "even" | "all";
type FileStatus = "ready" | "processing" | "success" | "error";

type PdfItem = {
    id: string;
    file: File;
    pageCount: number | null;
    status: FileStatus;
    error?: string;
};

type OutputFile = {
    id: string;
    name: string;
    size: string;
    url: string;
    blob: Blob;
};

type Thumb = {
    page: number;
    url: string;
};


function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function cleanFileName(name: string) {
    return name.replace(/\.pdf$/i, "");
}

function createPdfBlob(bytes: Uint8Array) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: "application/pdf" });
}

async function readPdfPageCount(file: File) {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}

function parsePages(value: string, totalPages: number) {
    const selected = new Set<number>();
    const invalidParts: string[] = [];
    const outOfRange: number[] = [];

    value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((part) => {
            if (part.includes("-")) {
                const [startRaw, endRaw] = part.split("-");
                const start = Number(startRaw);
                const end = Number(endRaw);

                if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
                    invalidParts.push(part);
                    return;
                }

                const from = Math.min(start, end);
                const to = Math.max(start, end);

                for (let page = from; page <= to; page += 1) {
                    if (page > totalPages) outOfRange.push(page);
                    else selected.add(page);
                }

                return;
            }

            const page = Number(part);

            if (!Number.isInteger(page) || page < 1) {
                invalidParts.push(part);
                return;
            }

            if (page > totalPages) outOfRange.push(page);
            else selected.add(page);
        });

    return {
        pages: Array.from(selected).sort((a, b) => a - b),
        invalidParts,
        outOfRange: Array.from(new Set(outOfRange)).sort((a, b) => a - b),
    };
}

function getQuickPages(mode: PageMode, totalPages: number) {
    if (mode === "first") return [1];
    if (mode === "last") return [totalPages];
    if (mode === "odd") return Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => page % 2 !== 0);
    if (mode === "even") return Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => page % 2 === 0);
    if (mode === "all") return Array.from({ length: totalPages }, (_, index) => index + 1);
    return [];
}

function getRemainingPages(totalPages: number, editMode: EditMode, selectedPages: number[]) {
    const selected = new Set(selectedPages);

    if (editMode === "keep") {
        return selectedPages.filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
    }

    return Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => !selected.has(page));
}

async function renderThumbnails(file: File, maxPages: number) {
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.2.108/pdf.worker.min.mjs";

    const buffer = await file.arrayBuffer();
    const task = pdfjsLib.getDocument({ data: buffer });
    const pdf = await task.promise;
    const total = Math.min(pdf.numPages, maxPages);
    const thumbs: Thumb[] = [];

    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.28 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) continue;

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        await page.render({
            canvas,
            canvasContext: context,
            viewport,
        }).promise;

        thumbs.push({
            page: pageNumber,
            url: canvas.toDataURL("image/jpeg", 0.72),
        });
    }

    return thumbs;
}

export default function DeletePdfPagesPage() {
    const [pdfItems, setPdfItems] = useState<PdfItem[]>([]);
    const [activeId, setActiveId] = useState("");
    const [editMode, setEditMode] = useState<EditMode>("delete");
    const [pageMode, setPageMode] = useState<PageMode>("custom");
    const [pageInput, setPageInput] = useState("2,4,7");
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [thumbnails, setThumbnails] = useState<Thumb[]>([]);
    const [thumbStatus, setThumbStatus] = useState("Upload a PDF to preview pages.");
    const [outputs, setOutputs] = useState<OutputFile[]>([]);
    const [status, setStatus] = useState("Upload PDF files and choose pages to delete or keep.");
    const [error, setError] = useState("");
    const [isRenderingThumbs, setIsRenderingThumbs] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const activeFile = useMemo(() => {
        return pdfItems.find((item) => item.id === activeId) || null;
    }, [activeId, pdfItems]);

    const activeTotalPages = activeFile?.pageCount || 0;

    const remainingPages = useMemo(() => {
        if (!activeTotalPages) return [];
        return getRemainingPages(activeTotalPages, editMode, selectedPages);
    }, [activeTotalPages, editMode, selectedPages]);

    const affectedCount = editMode === "delete" ? selectedPages.length : activeTotalPages - remainingPages.length;
    const remainingCount = remainingPages.length;
    const selectedText = selectedPages.length ? selectedPages.join(", ") : "No pages selected";

    useEffect(() => {
        thumbnails.forEach((thumb) => URL.revokeObjectURL(thumb.url));
    }, []);

    function clearOutputs() {
        outputs.forEach((item) => URL.revokeObjectURL(item.url));
        setOutputs([]);
    }

    async function addFiles(files: File[]) {
        setError("");
        clearOutputs();

        const pdfFiles = files.filter(
            (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        );

        if (!pdfFiles.length) {
            setError("Please upload PDF files only.");
            return;
        }

        setStatus("Reading PDF files...");

        const loadedItems = await Promise.all(
            pdfFiles.map(async (file) => {
                try {
                    const pageCount = await readPdfPageCount(file);

                    return {
                        id: createId(),
                        file,
                        pageCount,
                        status: "ready" as const,
                    };
                } catch (readError) {
                    console.error("PDF read error:", readError);

                    return {
                        id: createId(),
                        file,
                        pageCount: null,
                        status: "error" as const,
                        error: "Unable to read this PDF. It may be corrupted, password-protected, or unsupported.",
                    };
                }
            })
        );

        setPdfItems((current) => {
            const next = [...current, ...loadedItems];

            if (!activeId) {
                const firstReady = next.find((item) => item.pageCount);
                if (firstReady) setActiveId(firstReady.id);
            }

            return next;
        });

        setStatus(`${loadedItems.length} PDF file${loadedItems.length > 1 ? "s" : ""} added.`);
    }

    function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
        addFiles(Array.from(event.target.files || []));
        event.target.value = "";
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        addFiles(Array.from(event.dataTransfer.files || []));
    }

    function removeFile(id: string) {
        clearOutputs();

        setPdfItems((current) => {
            const next = current.filter((item) => item.id !== id);

            if (activeId === id) {
                const nextActive = next.find((item) => item.pageCount);
                setActiveId(nextActive?.id || "");
                setSelectedPages([]);
                setThumbnails([]);
            }

            return next;
        });
    }

    function clearAll() {
        clearOutputs();
        thumbnails.forEach((thumb) => URL.revokeObjectURL(thumb.url));
        setPdfItems([]);
        setActiveId("");
        setSelectedPages([]);
        setThumbnails([]);
        setStatus("Upload PDF files and choose pages to delete or keep.");
        setThumbStatus("Upload a PDF to preview pages.");
        setError("");
    }

    function applyPageSelection(mode: PageMode) {
        if (!activeTotalPages) {
            setError("Please select a valid PDF first.");
            return;
        }

        setPageMode(mode);
        setError("");

        if (mode === "custom") {
            const parsed = parsePages(pageInput, activeTotalPages);

            if (parsed.invalidParts.length) {
                setError(`Invalid page input: ${parsed.invalidParts.join(", ")}`);
                return;
            }

            if (parsed.outOfRange.length) {
                setError(`These page numbers are greater than total pages: ${parsed.outOfRange.join(", ")}`);
                return;
            }

            setSelectedPages(parsed.pages);
            return;
        }

        setSelectedPages(getQuickPages(mode, activeTotalPages));
    }

    function togglePage(page: number) {
        setError("");
        setSelectedPages((current) => {
            if (current.includes(page)) {
                return current.filter((item) => item !== page);
            }

            return [...current, page].sort((a, b) => a - b);
        });
    }

    function selectAllPages() {
        if (!activeTotalPages) return;
        setSelectedPages(Array.from({ length: activeTotalPages }, (_, index) => index + 1));
    }

    function deselectAllPages() {
        setSelectedPages([]);
    }

    async function loadThumbnails() {
        if (!activeFile) {
            setError("Please select a PDF first.");
            return;
        }

        try {
            setIsRenderingThumbs(true);
            setThumbStatus("Rendering page thumbnails...");
            thumbnails.forEach((thumb) => URL.revokeObjectURL(thumb.url));

            const rendered = await renderThumbnails(activeFile.file, 60);

            setThumbnails(rendered);
            setThumbStatus(
                activeFile.pageCount && activeFile.pageCount > rendered.length
                    ? `Showing first ${rendered.length} thumbnails. Use page input for remaining pages.`
                    : "Click pages to select or deselect them."
            );
        } catch (thumbError) {
            console.error("Thumbnail render error:", thumbError);
            setThumbnails([]);
            setThumbStatus("Unable to render thumbnails for this PDF. You can still use page numbers manually.");
        } finally {
            setIsRenderingThumbs(false);
        }
    }

    async function processSinglePdf(item: PdfItem) {
        if (!item.pageCount) {
            throw new Error("Unable to read page count for this PDF.");
        }

        const pageCount = item.pageCount;
        const normalizedSelected = selectedPages.filter((page) => page >= 1 && page <= pageCount);
        const outOfRange = selectedPages.filter((page) => page > pageCount);
        if (outOfRange.length) {
            throw new Error(`Selected pages exceed this PDF page count: ${outOfRange.join(", ")}`);
        }

        const keepPages = getRemainingPages(pageCount, editMode, normalizedSelected);

        if (keepPages.length === 0) {
            throw new Error("This action would create an empty PDF. Keep at least one page.");
        }

        if (keepPages.length === item.pageCount && editMode === "delete") {
            throw new Error("No pages selected for deletion.");
        }

        const inputBuffer = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(inputBuffer, { ignoreEncryption: true });
        const outputPdf = await PDFDocument.create();
        const copiedPages = await outputPdf.copyPages(
            sourcePdf,
            keepPages.map((page) => page - 1)
        );

        copiedPages.forEach((page) => outputPdf.addPage(page));

        const bytes = await outputPdf.save();
        const blob = createPdfBlob(bytes);
        const url = URL.createObjectURL(blob);

        return {
            id: createId(),
            name: `${cleanFileName(item.file.name)}-cleaned.pdf`,
            size: formatBytes(blob.size),
            url,
            blob,
        };
    }

    async function processPdfs() {
        setError("");

        const validFiles = pdfItems.filter(
            (item): item is PdfItem & { pageCount: number } => item.pageCount !== null && !item.error
        );

        if (!validFiles.length) {
            setError("Please upload at least one valid PDF file.");
            return;
        }

        if (!selectedPages.length) {
            setError(editMode === "delete" ? "Select pages to delete first." : "Select pages to keep first.");
            return;
        }

        if (activeTotalPages && remainingPages.length === 0) {
            setError("This action would create an empty PDF. Keep at least one page.");
            return;
        }

        clearOutputs();
        setIsProcessing(true);
        setStatus("Processing PDFs one by one...");

        const createdOutputs: OutputFile[] = [];

        for (const item of validFiles) {
            setPdfItems((current) =>
                current.map((pdf) => (pdf.id === item.id ? { ...pdf, status: "processing", error: "" } : pdf))
            );

            try {
                const output = await processSinglePdf(item);
                createdOutputs.push(output);

                setPdfItems((current) =>
                    current.map((pdf) => (pdf.id === item.id ? { ...pdf, status: "success", error: "" } : pdf))
                );
            } catch (processError) {
                console.error("Delete PDF pages error:", processError);

                setPdfItems((current) =>
                    current.map((pdf) =>
                        pdf.id === item.id
                            ? {
                                ...pdf,
                                status: "error",
                                error:
                                    processError instanceof Error && processError.message
                                        ? processError.message
                                        : "Unable to process this PDF. It may be corrupted, password-protected, or unsupported.",
                            }
                            : pdf
                    )
                );
            }
        }

        setOutputs(createdOutputs);
        setStatus(`Finished. ${createdOutputs.length} cleaned PDF file${createdOutputs.length === 1 ? "" : "s"} ready.`);
        setIsProcessing(false);

        if (createdOutputs.length) {
            alert("PDF pages processed successfully.");
        }
    }

    async function downloadAll() {
        if (!outputs.length) {
            alert("No cleaned PDFs to download.");
            return;
        }

        const zip = new JSZip();

        outputs.forEach((file) => {
            zip.file(file.name, file.blob);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "toolmint-cleaned-pdfs.zip";
        link.click();

        URL.revokeObjectURL(url);
    }

    async function copySummary() {
        const summary = `Delete PDF Pages Summary

Mode: ${editMode === "delete" ? "Delete selected pages" : "Keep selected pages"}
Selected pages: ${selectedText}
Pages selected: ${selectedPages.length}
Pages remaining in active PDF: ${remainingCount}
Files: ${pdfItems.length}
Output: New cleaned PDF files`;

        await navigator.clipboard.writeText(summary);
        alert("Summary copied.");
    }

    return (
        <>
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-10 text-white">
                <PageTitle
                    title="🗑️ Delete PDF Pages"
                    description="Delete pages from PDF online for free. Remove selected pages, ranges, odd or even pages with visual thumbnails and browser-side privacy."
                />

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">📄 Upload PDFs</h2>

                            <label
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={handleDrop}
                                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-900 focus-within:border-blue-400"
                            >
                                <span className="text-4xl">📎</span>
                                <span className="mt-3 text-lg font-bold">Drop PDF files here or choose files</span>
                                <span className="mt-1 text-sm text-slate-300">Batch processing supported. Files stay in your browser.</span>
                                <input type="file" accept="application/pdf" multiple onChange={handleFileInput} className="sr-only" />
                            </label>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <label className="cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500">
                                    ➕ Add More Files
                                    <input type="file" accept="application/pdf" multiple onChange={handleFileInput} className="hidden" />
                                </label>

                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700"
                                >
                                    🧹 Clear All
                                </button>
                            </div>

                            {error && (
                                <p className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm font-semibold text-red-200">
                                    {error}
                                </p>
                            )}
                        </ToolCard>

                        {pdfItems.length > 0 && (
                            <ToolCard>
                                <h2 className="mb-4 text-2xl font-bold text-white">📚 Uploaded Files</h2>

                                <div className="space-y-3">
                                    {pdfItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={`rounded-2xl border p-4 transition ${activeId === item.id ? "border-blue-500 bg-blue-950/30" : "border-slate-700 bg-slate-900"
                                                }`}
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveId(item.id);
                                                        setSelectedPages([]);
                                                        setThumbnails([]);
                                                        setThumbStatus("Click Render Thumbnails to preview this PDF.");
                                                    }}
                                                    className="text-left"
                                                >
                                                    <p className="break-all font-bold text-white">{item.file.name}</p>
                                                    <p className="mt-1 text-sm text-slate-300">
                                                        {formatBytes(item.file.size)} · {item.pageCount ? `${item.pageCount} pages` : "Pages unavailable"} ·{" "}
                                                        {item.status}
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(item.id)}
                                                    className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 font-bold text-red-200 transition hover:bg-red-900/60"
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            {item.error && <p className="mt-3 text-sm font-semibold text-red-300">{item.error}</p>}
                                        </div>
                                    ))}
                                </div>
                            </ToolCard>
                        )}

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">⚙️ Selection Settings</h2>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setEditMode("delete")}
                                    className={`rounded-xl border p-4 font-bold transition ${editMode === "delete"
                                        ? "border-red-500 bg-red-600 text-white"
                                        : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                        }`}
                                >
                                    🗑️ Delete Selected Pages
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditMode("keep")}
                                    className={`rounded-xl border p-4 font-bold transition ${editMode === "keep"
                                        ? "border-emerald-500 bg-emerald-600 text-white"
                                        : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                        }`}
                                >
                                    ✅ Keep Selected Pages
                                </button>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Pages or ranges</span>
                                    <input
                                        type="text"
                                        value={pageInput}
                                        onChange={(event) => setPageInput(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                        placeholder="2,4,7 or 3-5 or 2-4,8,11-13"
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => applyPageSelection("custom")}
                                    className="self-end rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-500"
                                >
                                    Apply
                                </button>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                {[
                                    ["first", "Remove first"],
                                    ["last", "Remove last"],
                                    ["odd", "Odd pages"],
                                    ["even", "Even pages"],
                                    ["all", "Select all"],
                                ].map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => applyPageSelection(mode as PageMode)}
                                        className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:border-blue-500 hover:bg-slate-700"
                                    >
                                        {label}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={deselectAllPages}
                                    className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:bg-slate-700"
                                >
                                    Deselect all
                                </button>
                            </div>
                        </ToolCard>
                    </div>

                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">🖼️ Visual Page Selection</h2>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/30 p-4">
                                    <p className="text-sm text-blue-200">Total Pages</p>
                                    <p className="mt-2 text-3xl font-bold text-blue-300">{activeTotalPages || 0}</p>
                                </div>

                                <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4">
                                    <p className="text-sm text-red-200">{editMode === "delete" ? "Will Remove" : "Not Kept"}</p>
                                    <p className="mt-2 text-3xl font-bold text-red-300">{affectedCount}</p>
                                </div>

                                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4">
                                    <p className="text-sm text-emerald-200">Will Remain</p>
                                    <p className="mt-2 text-3xl font-bold text-emerald-300">{remainingCount}</p>
                                </div>
                            </div>

                            <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{thumbStatus}</p>

                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={loadThumbnails}
                                    disabled={!activeFile || isRenderingThumbs}
                                    className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isRenderingThumbs ? "Rendering..." : "🖼️ Render Thumbnails"}
                                </button>

                                <button
                                    type="button"
                                    onClick={selectAllPages}
                                    disabled={!activeTotalPages}
                                    className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-bold transition hover:bg-slate-700 disabled:opacity-60"
                                >
                                    Select all pages
                                </button>
                            </div>

                            <div className="mt-5 max-h-[620px] overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4">
                                {thumbnails.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-300">
                                        Thumbnails will appear here.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                        {thumbnails.map((thumb) => {
                                            const selected = selectedPages.includes(thumb.page);
                                            const willDelete = editMode === "delete" ? selected : !selected;

                                            return (
                                                <button
                                                    key={thumb.page}
                                                    type="button"
                                                    onClick={() => togglePage(thumb.page)}
                                                    className={`relative rounded-xl border p-2 transition ${selected ? "border-red-500 bg-red-950/40" : "border-slate-700 bg-slate-900 hover:border-blue-500"
                                                        }`}
                                                >
                                                    <img src={thumb.url} alt={`PDF page ${thumb.page}`} className="mx-auto rounded bg-white" />
                                                    <span className="mt-2 block text-sm font-bold">Page {thumb.page}</span>
                                                    {willDelete && (
                                                        <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                                                            Delete
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">🚀 Process & Download</h2>

                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                <p className="font-bold text-white">Current selection</p>
                                <p className="mt-2 text-sm text-slate-300">{selectedText}</p>
                                <p className="mt-3 text-sm font-semibold text-emerald-300">
                                    {remainingCount} page{remainingCount === 1 ? "" : "s"} will remain in the active PDF.
                                </p>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={processPdfs}
                                    disabled={isProcessing}
                                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isProcessing ? "Processing..." : "🗑️ Process PDF"}
                                </button>

                                <button
                                    type="button"
                                    onClick={copySummary}
                                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white transition hover:bg-slate-700"
                                >
                                    📋 Copy Summary
                                </button>
                            </div>

                            {outputs.length > 1 && (
                                <button
                                    type="button"
                                    onClick={downloadAll}
                                    className="mt-3 w-full rounded-xl bg-emerald-600 p-4 font-bold text-white transition hover:bg-emerald-500"
                                >
                                    📦 Download All ZIP
                                </button>
                            )}

                            <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{status}</p>

                            <div className="mt-5 space-y-3">
                                {outputs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                                        Cleaned PDFs will appear here.
                                    </div>
                                ) : (
                                    outputs.map((file) => (
                                        <a
                                            key={file.id}
                                            href={file.url}
                                            download={file.name}
                                            className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4 font-bold text-white transition hover:border-blue-500 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <span className="break-all">{file.name}</span>
                                            <span className="text-sm text-slate-300">{file.size} · Download</span>
                                        </a>
                                    ))
                                )}
                            </div>
                        </ToolCard>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <ToolCard>
                        <h2 className="mb-3 text-xl font-bold text-white">🔒 Privacy</h2>
                        <p className="text-slate-300">
                            Your PDFs are processed locally in your browser. Files are not uploaded to our server.
                        </p>
                    </ToolCard>

                    <ToolCard>
                        <h2 className="mb-3 text-xl font-bold text-white">⚠️ Important Notes</h2>
                        <p className="text-slate-300">
                            Password-protected or corrupted PDFs may fail. Very large PDFs can be slower while rendering thumbnails.
                            The tool prevents creating an empty PDF by deleting every page.
                        </p>
                    </ToolCard>
                </div>
            </main>

            <Footer />
        </>
    );
}