"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import JSZip from "jszip";
import {
    degrees,
    PDFDocument,
    PDFImage,
    PDFFont,
    rgb,
    StandardFonts,
} from "pdf-lib";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type WatermarkType = "text" | "image";
type PlacementMode = "single" | "diagonal" | "tile";
type Position =
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
type PageMode = "all" | "range" | "custom" | "odd" | "even";
type FontChoice = "helvetica" | "times" | "courier";

type PdfItem = {
    id: string;
    file: File;
    pageCount: number | null;
    status: "ready" | "processing" | "success" | "error";
    error?: string;
};

type OutputFile = {
    id: string;
    name: string;
    size: string;
    url: string;
    blob: Blob;
};

const positions: { label: string; value: Position }[] = [
    { label: "Top Left", value: "top-left" },
    { label: "Top Center", value: "top-center" },
    { label: "Top Right", value: "top-right" },
    { label: "Center Left", value: "center-left" },
    { label: "Center", value: "center" },
    { label: "Center Right", value: "center-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Bottom Center", value: "bottom-center" },
    { label: "Bottom Right", value: "bottom-right" },
];

const presets = [
    { label: "CONFIDENTIAL", text: "CONFIDENTIAL", color: "#ef4444", opacity: "0.15", rotation: "-35" },
    { label: "DRAFT", text: "DRAFT", color: "#2563eb", opacity: "0.16", rotation: "-35" },
    { label: "SAMPLE", text: "SAMPLE", color: "#64748b", opacity: "0.18", rotation: "-35" },
    { label: "PAID", text: "PAID", color: "#16a34a", opacity: "0.22", rotation: "-20" },
];

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

function parseColor(hex: string) {
    const clean = hex.replace("#", "");
    const full =
        clean.length === 3
            ? clean
                .split("")
                .map((item) => item + item)
                .join("")
            : clean;

    const value = Number.parseInt(full, 16);

    if (Number.isNaN(value) || full.length !== 6) {
        return rgb(0.15, 0.23, 0.42);
    }

    return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function parsePageList(value: string, totalPages: number) {
    const pages = new Set<number>();
    const invalidParts: string[] = [];

    value
        .split(",")
        .map((part) => part.trim())
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
                    if (page <= totalPages) pages.add(page);
                }

                return;
            }

            const page = Number(part);

            if (!Number.isInteger(page) || page < 1) {
                invalidParts.push(part);
                return;
            }

            if (page <= totalPages) pages.add(page);
        });

    return { pages: Array.from(pages).sort((a, b) => a - b), invalidParts };
}

function getSelectedPages({
    mode,
    range,
    custom,
    skipFirst,
    totalPages,
}: {
    mode: PageMode;
    range: string;
    custom: string;
    skipFirst: boolean;
    totalPages: number;
}) {
    let pages: number[] = [];

    if (mode === "all") {
        pages = Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (mode === "range") {
        const parsed = parsePageList(range, totalPages);
        if (parsed.invalidParts.length) return { pages: [], error: `Invalid range: ${parsed.invalidParts.join(", ")}` };
        pages = parsed.pages;
    }

    if (mode === "custom") {
        const parsed = parsePageList(custom, totalPages);
        if (parsed.invalidParts.length) return { pages: [], error: `Invalid pages: ${parsed.invalidParts.join(", ")}` };
        pages = parsed.pages;
    }

    if (mode === "odd") {
        pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => page % 2 !== 0);
    }

    if (mode === "even") {
        pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => page % 2 === 0);
    }

    if (skipFirst) pages = pages.filter((page) => page !== 1);

    if (pages.length === 0) {
        return { pages: [], error: "No valid pages selected." };
    }

    return { pages, error: "" };
}

function getTextPosition({
    position,
    width,
    height,
    textWidth,
    textHeight,
    offsetX,
    offsetY,
}: {
    position: Position;
    width: number;
    height: number;
    textWidth: number;
    textHeight: number;
    offsetX: number;
    offsetY: number;
}) {
    const margin = 42;
    const xMap: Record<Position, number> = {
        "top-left": margin,
        "top-center": width / 2 - textWidth / 2,
        "top-right": width - margin - textWidth,
        "center-left": margin,
        center: width / 2 - textWidth / 2,
        "center-right": width - margin - textWidth,
        "bottom-left": margin,
        "bottom-center": width / 2 - textWidth / 2,
        "bottom-right": width - margin - textWidth,
    };

    const yMap: Record<Position, number> = {
        "top-left": height - margin - textHeight,
        "top-center": height - margin - textHeight,
        "top-right": height - margin - textHeight,
        "center-left": height / 2 - textHeight / 2,
        center: height / 2 - textHeight / 2,
        "center-right": height / 2 - textHeight / 2,
        "bottom-left": margin,
        "bottom-center": margin,
        "bottom-right": margin,
    };

    return {
        x: xMap[position] + offsetX,
        y: yMap[position] + offsetY,
    };
}

function getImagePosition({
    position,
    width,
    height,
    imageWidth,
    imageHeight,
    offsetX,
    offsetY,
}: {
    position: Position;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
    offsetX: number;
    offsetY: number;
}) {
    return getTextPosition({
        position,
        width,
        height,
        textWidth: imageWidth,
        textHeight: imageHeight,
        offsetX,
        offsetY,
    });
}

function getStandardFont(font: FontChoice) {
    if (font === "times") return StandardFonts.TimesRomanBold;
    if (font === "courier") return StandardFonts.CourierBold;
    return StandardFonts.HelveticaBold;
}

async function readPdfPageCount(file: File) {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
}

function createPdfBlob(bytes: Uint8Array) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: "application/pdf" });
}

export default function WatermarkPdfPage() {
    const [pdfItems, setPdfItems] = useState<PdfItem[]>([]);
    const [outputs, setOutputs] = useState<OutputFile[]>([]);
    const [watermarkType, setWatermarkType] = useState<WatermarkType>("text");
    const [placementMode, setPlacementMode] = useState<PlacementMode>("diagonal");
    const [position, setPosition] = useState<Position>("center");
    const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
    const [fontChoice, setFontChoice] = useState<FontChoice>("helvetica");
    const [fontSize, setFontSize] = useState("64");
    const [color, setColor] = useState("#ef4444");
    const [opacity, setOpacity] = useState("0.15");
    const [rotation, setRotation] = useState("-35");
    const [scale, setScale] = useState("1");
    const [offsetX, setOffsetX] = useState("0");
    const [offsetY, setOffsetY] = useState("0");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [imageSize, setImageSize] = useState("180");
    const [pageMode, setPageMode] = useState<PageMode>("all");
    const [pageRange, setPageRange] = useState("1-5");
    const [customPages, setCustomPages] = useState("1,3,5-8");
    const [skipFirst, setSkipFirst] = useState(false);
    const [status, setStatus] = useState("Upload PDF files and choose watermark settings.");
    const [error, setError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const opacityPercent = Math.round((Number(opacity) || 0) * 100);
    const hasFiles = pdfItems.length > 0;
    const readyFiles = pdfItems.filter((item) => !item.error);

    const previewStyle = useMemo(() => {
        return {
            color,
            opacity: Number(opacity) || 0.18,
            transform: `rotate(${Number(rotation) || 0}deg) scale(${Number(scale) || 1})`,
        };
    }, [color, opacity, rotation, scale]);

    function clearOutputs() {
        outputs.forEach((item) => URL.revokeObjectURL(item.url));
        setOutputs([]);
    }

    async function addPdfFiles(files: File[]) {
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

        setPdfItems((current) => [...current, ...loadedItems]);
        setStatus(`${loadedItems.length} PDF file${loadedItems.length > 1 ? "s" : ""} added.`);
    }

    function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files || []);
        addPdfFiles(files);
        event.target.value = "";
    }

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        addPdfFiles(Array.from(event.dataTransfer.files || []));
    }

    function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0];

        if (!selected) return;

        const isSupported =
            selected.type === "image/png" ||
            selected.type === "image/jpeg" ||
            selected.name.toLowerCase().endsWith(".png") ||
            selected.name.toLowerCase().endsWith(".jpg") ||
            selected.name.toLowerCase().endsWith(".jpeg");

        if (!isSupported) {
            setError("Please upload a PNG or JPG image for the watermark.");
            return;
        }

        if (imagePreview) URL.revokeObjectURL(imagePreview);

        setImageFile(selected);
        setImagePreview(URL.createObjectURL(selected));
        setWatermarkType("image");
        setError("");
        event.target.value = "";
    }

    function removePdf(id: string) {
        clearOutputs();
        setPdfItems((current) => current.filter((item) => item.id !== id));
    }

    function clearAll() {
        clearOutputs();
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setPdfItems([]);
        setImageFile(null);
        setImagePreview("");
        setStatus("Upload PDF files and choose watermark settings.");
        setError("");
    }

    function applyPreset(preset: (typeof presets)[number]) {
        setWatermarkType("text");
        setWatermarkText(preset.text);
        setColor(preset.color);
        setOpacity(preset.opacity);
        setRotation(preset.rotation);
        setPlacementMode("diagonal");
        setPosition("center");
        setFontSize("64");
    }

    async function getEmbeddedImage(pdfDoc: PDFDocument) {
        if (!imageFile) return null;

        const imageBytes = await imageFile.arrayBuffer();

        if (imageFile.type === "image/png" || imageFile.name.toLowerCase().endsWith(".png")) {
            return pdfDoc.embedPng(imageBytes);
        }

        return pdfDoc.embedJpg(imageBytes);
    }

    function drawTextWatermark({
        page,
        font,
        pageWidth,
        pageHeight,
    }: {
        page: ReturnType<PDFDocument["getPages"]>[number];
        font: PDFFont;
        pageWidth: number;
        pageHeight: number;
    }) {
        const safeFontSize = Math.max(8, Math.min(Number(fontSize) || 64, 180)) * Math.max(0.2, Number(scale) || 1);
        const safeOpacity = Math.max(0.02, Math.min(Number(opacity) || 0.18, 1));
        const angle = Number(rotation) || 0;
        const xOffset = Number(offsetX) || 0;
        const yOffset = Number(offsetY) || 0;
        const text = watermarkText.trim();
        const textWidth = font.widthOfTextAtSize(text, safeFontSize);
        const textHeight = safeFontSize;

        if (placementMode === "tile") {
            const spacingX = Math.max(textWidth + 120, 220);
            const spacingY = Math.max(textHeight + 100, 150);

            for (let y = -spacingY; y < pageHeight + spacingY; y += spacingY) {
                for (let x = -spacingX; x < pageWidth + spacingX; x += spacingX) {
                    page.drawText(text, {
                        x: x + xOffset,
                        y: y + yOffset,
                        size: safeFontSize,
                        font,
                        color: parseColor(color),
                        opacity: safeOpacity,
                        rotate: degrees(angle),
                    });
                }
            }

            return;
        }

        const basePosition =
            placementMode === "diagonal"
                ? { x: pageWidth / 2 - textWidth / 2 + xOffset, y: pageHeight / 2 - textHeight / 2 + yOffset }
                : getTextPosition({
                    position,
                    width: pageWidth,
                    height: pageHeight,
                    textWidth,
                    textHeight,
                    offsetX: xOffset,
                    offsetY: yOffset,
                });

        page.drawText(text, {
            x: basePosition.x,
            y: basePosition.y,
            size: safeFontSize,
            font,
            color: parseColor(color),
            opacity: safeOpacity,
            rotate: degrees(placementMode === "diagonal" ? angle : angle),
        });
    }

    function drawImageWatermark({
        page,
        image,
        pageWidth,
        pageHeight,
    }: {
        page: ReturnType<PDFDocument["getPages"]>[number];
        image: PDFImage;
        pageWidth: number;
        pageHeight: number;
    }) {
        const maxWidth = Math.max(24, Math.min(Number(imageSize) || 180, pageWidth));
        const imageScale = maxWidth / image.width;
        const safeScale = Math.max(0.1, Number(scale) || 1);
        const drawWidth = image.width * imageScale * safeScale;
        const drawHeight = image.height * imageScale * safeScale;
        const safeOpacity = Math.max(0.02, Math.min(Number(opacity) || 0.18, 1));
        const angle = Number(rotation) || 0;
        const xOffset = Number(offsetX) || 0;
        const yOffset = Number(offsetY) || 0;

        if (placementMode === "tile") {
            const spacingX = Math.max(drawWidth + 90, 180);
            const spacingY = Math.max(drawHeight + 80, 150);

            for (let y = -spacingY; y < pageHeight + spacingY; y += spacingY) {
                for (let x = -spacingX; x < pageWidth + spacingX; x += spacingX) {
                    page.drawImage(image, {
                        x: x + xOffset,
                        y: y + yOffset,
                        width: drawWidth,
                        height: drawHeight,
                        opacity: safeOpacity,
                        rotate: degrees(angle),
                    });
                }
            }

            return;
        }

        const basePosition =
            placementMode === "diagonal"
                ? { x: pageWidth / 2 - drawWidth / 2 + xOffset, y: pageHeight / 2 - drawHeight / 2 + yOffset }
                : getImagePosition({
                    position,
                    width: pageWidth,
                    height: pageHeight,
                    imageWidth: drawWidth,
                    imageHeight: drawHeight,
                    offsetX: xOffset,
                    offsetY: yOffset,
                });

        page.drawImage(image, {
            x: basePosition.x,
            y: basePosition.y,
            width: drawWidth,
            height: drawHeight,
            opacity: safeOpacity,
            rotate: degrees(angle),
        });
    }

    async function processSinglePdf(item: PdfItem) {
        const buffer = await item.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const selected = getSelectedPages({
            mode: pageMode,
            range: pageRange,
            custom: customPages,
            skipFirst,
            totalPages: pages.length,
        });

        if (selected.error) throw new Error(selected.error);

        const selectedPageSet = new Set(selected.pages);
        const font = await pdfDoc.embedFont(getStandardFont(fontChoice));
        const embeddedImage = watermarkType === "image" ? await getEmbeddedImage(pdfDoc) : null;

        pages.forEach((page, index) => {
            const pageNumber = index + 1;

            if (!selectedPageSet.has(pageNumber)) return;

            const { width, height } = page.getSize();

            if (watermarkType === "text") {
                drawTextWatermark({ page, font, pageWidth: width, pageHeight: height });
            }

            if (watermarkType === "image" && embeddedImage) {
                drawImageWatermark({ page, image: embeddedImage, pageWidth: width, pageHeight: height });
            }
        });

        const bytes = await pdfDoc.save();
        const blob = createPdfBlob(bytes);
        const url = URL.createObjectURL(blob);

        return {
            id: createId(),
            name: `${cleanFileName(item.file.name)}-watermarked.pdf`,
            size: formatBytes(blob.size),
            url,
            blob,
        };
    }

    async function processPdfs() {
        setError("");

        if (!readyFiles.length) {
            setError("Please upload at least one valid PDF file.");
            return;
        }

        if (watermarkType === "text" && !watermarkText.trim()) {
            setError("Please enter watermark text.");
            return;
        }

        if (watermarkType === "image" && !imageFile) {
            setError("Please upload a PNG or JPG image watermark.");
            return;
        }

        clearOutputs();
        setIsProcessing(true);
        setStatus("Processing PDFs one by one...");

        const createdOutputs: OutputFile[] = [];

        for (const item of readyFiles) {
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
                console.error("Watermark PDF error:", processError);

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
        setStatus(`Finished. ${createdOutputs.length} file${createdOutputs.length === 1 ? "" : "s"} ready.`);
        setIsProcessing(false);

        if (createdOutputs.length) {
            alert("Watermark added successfully.");
        }
    }

    async function downloadAll() {
        if (!outputs.length) {
            alert("No processed PDFs to download.");
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
        link.download = "toolmint-watermarked-pdfs.zip";
        link.click();

        URL.revokeObjectURL(url);
    }

    async function copySummary() {
        const summary = `Watermark PDF Summary

Watermark type: ${watermarkType === "text" ? "Text" : "Image"}
Watermark: ${watermarkType === "text" ? watermarkText : imageFile?.name || "No image"}
Placement: ${placementMode}
Position: ${position}
Opacity: ${opacityPercent}%
Rotation: ${rotation} degrees
Pages: ${pageMode}${pageMode === "range" ? ` (${pageRange})` : ""}${pageMode === "custom" ? ` (${customPages})` : ""}
Skip first page: ${skipFirst ? "Yes" : "No"}
Files: ${pdfItems.length}`;

        await navigator.clipboard.writeText(summary);
        alert("Summary copied.");
    }

    return (
        <>
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-10 text-white">
                <PageTitle
                    title="💧 Watermark PDF"
                    description="Add text or image watermark to PDF online for free. Choose opacity, rotation, position, tile mode, selected pages and batch process PDFs directly in your browser."
                />

                <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
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
                                <span className="mt-1 text-sm text-slate-300">Multiple PDFs supported. Files stay in your browser.</span>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    onChange={handleFileInput}
                                    className="sr-only"
                                />
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

                        {hasFiles && (
                            <ToolCard>
                                <h2 className="mb-4 text-2xl font-bold text-white">📚 Uploaded Files</h2>

                                <div className="space-y-3">
                                    {pdfItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-[1fr_auto]"
                                        >
                                            <div>
                                                <p className="break-all font-bold text-white">{item.file.name}</p>
                                                <p className="mt-1 text-sm text-slate-300">
                                                    {formatBytes(item.file.size)} · {item.pageCount ? `${item.pageCount} pages` : "Pages unavailable"} ·{" "}
                                                    {item.status}
                                                </p>
                                                {item.error && <p className="mt-2 text-sm font-semibold text-red-300">{item.error}</p>}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removePdf(item.id)}
                                                className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2 font-bold text-red-200 transition hover:bg-red-900/60"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </ToolCard>
                        )}

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">⚙️ Watermark Settings</h2>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => setWatermarkType("text")}
                                    className={`rounded-xl border p-4 font-bold transition ${watermarkType === "text"
                                            ? "border-blue-500 bg-blue-600 text-white"
                                            : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                        }`}
                                >
                                    ✏️ Text Watermark
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setWatermarkType("image")}
                                    className={`rounded-xl border p-4 font-bold transition ${watermarkType === "image"
                                            ? "border-blue-500 bg-blue-600 text-white"
                                            : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                        }`}
                                >
                                    🖼️ Image / Logo Watermark
                                </button>
                            </div>

                            {watermarkType === "text" ? (
                                <div className="mt-5 space-y-5">
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-slate-300">Watermark Text</span>
                                        <input
                                            type="text"
                                            value={watermarkText}
                                            onChange={(event) => setWatermarkText(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            placeholder="CONFIDENTIAL"
                                        />
                                    </label>

                                    <div>
                                        <p className="mb-3 text-sm font-semibold text-slate-300">Quick Presets</p>
                                        <div className="grid gap-3 sm:grid-cols-4">
                                            {presets.map((preset) => (
                                                <button
                                                    key={preset.label}
                                                    type="button"
                                                    onClick={() => applyPreset(preset)}
                                                    className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold transition hover:border-blue-500 hover:bg-slate-700"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <label className="block">
                                            <span className="mb-2 block text-sm font-semibold text-slate-300">Font</span>
                                            <select
                                                value={fontChoice}
                                                onChange={(event) => setFontChoice(event.target.value as FontChoice)}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            >
                                                <option value="helvetica">Helvetica Bold</option>
                                                <option value="times">Times Bold</option>
                                                <option value="courier">Courier Bold</option>
                                            </select>
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 block text-sm font-semibold text-slate-300">Font Size</span>
                                            <input
                                                type="number"
                                                value={fontSize}
                                                onChange={(event) => setFontSize(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 block text-sm font-semibold text-slate-300">Color</span>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={(event) => setColor(event.target.value)}
                                                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 p-2"
                                            />
                                        </label>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 space-y-5">
                                    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center transition hover:border-blue-500">
                                        <span className="text-3xl">🖼️</span>
                                        <span className="mt-2 block font-bold">Upload PNG or JPG watermark image</span>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg"
                                            onChange={handleImageUpload}
                                            className="sr-only"
                                        />
                                    </label>

                                    {imagePreview && (
                                        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                            <p className="mb-3 text-sm font-semibold text-slate-300">{imageFile?.name}</p>
                                            <img src={imagePreview} alt="Watermark preview" className="max-h-28 rounded-xl object-contain" />
                                        </div>
                                    )}

                                    <label className="block">
                                        <span className="mb-2 block text-sm font-semibold text-slate-300">Image Width</span>
                                        <input
                                            type="number"
                                            value={imageSize}
                                            onChange={(event) => setImageSize(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                        />
                                    </label>
                                </div>
                            )}
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">📑 Page Selection</h2>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Pages</span>
                                    <select
                                        value={pageMode}
                                        onChange={(event) => setPageMode(event.target.value as PageMode)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="all">All Pages</option>
                                        <option value="range">Page Range</option>
                                        <option value="custom">Custom Pages</option>
                                        <option value="odd">Odd Pages</option>
                                        <option value="even">Even Pages</option>
                                    </select>
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                                    <input type="checkbox" checked={skipFirst} onChange={(event) => setSkipFirst(event.target.checked)} />
                                    Skip first page
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Range</span>
                                    <input
                                        type="text"
                                        value={pageRange}
                                        onChange={(event) => setPageRange(event.target.value)}
                                        disabled={pageMode !== "range"}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                        placeholder="1-5"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Custom Pages</span>
                                    <input
                                        type="text"
                                        value={customPages}
                                        onChange={(event) => setCustomPages(event.target.value)}
                                        disabled={pageMode !== "custom"}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                        placeholder="1,3,5-8"
                                    />
                                </label>
                            </div>
                        </ToolCard>
                    </div>

                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">👀 Live Preview</h2>

                            <div className="relative mx-auto aspect-[3/4] max-w-sm overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-2xl">
                                <div className="absolute left-8 right-8 top-8 space-y-3">
                                    <div className="h-3 rounded bg-slate-200" />
                                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                                    <div className="mt-6 h-2 rounded bg-slate-100" />
                                    <div className="h-2 rounded bg-slate-100" />
                                    <div className="h-2 w-5/6 rounded bg-slate-100" />
                                </div>

                                {placementMode === "tile" ? (
                                    <div className="absolute inset-0 grid grid-cols-2 place-items-center gap-6 p-8">
                                        {Array.from({ length: 8 }).map((_, index) =>
                                            watermarkType === "text" ? (
                                                <span key={index} className="text-xl font-black" style={previewStyle}>
                                                    {watermarkText || "WATERMARK"}
                                                </span>
                                            ) : imagePreview ? (
                                                <img key={index} src={imagePreview} alt="" className="max-h-16 max-w-24 object-contain" style={previewStyle} />
                                            ) : (
                                                <span key={index} className="text-xl font-black text-slate-300" style={previewStyle}>
                                                    LOGO
                                                </span>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center p-8">
                                        {watermarkType === "text" ? (
                                            <span className="break-all text-center text-4xl font-black" style={previewStyle}>
                                                {watermarkText || "WATERMARK"}
                                            </span>
                                        ) : imagePreview ? (
                                            <img src={imagePreview} alt="Watermark preview" className="max-h-32 max-w-48 object-contain" style={previewStyle} />
                                        ) : (
                                            <span className="text-4xl font-black text-slate-300" style={previewStyle}>
                                                LOGO
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="mt-5 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">{status}</p>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">🎛️ Placement Controls</h2>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Placement Mode</span>
                                    <select
                                        value={placementMode}
                                        onChange={(event) => setPlacementMode(event.target.value as PlacementMode)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="single">Single Position</option>
                                        <option value="diagonal">Diagonal Center</option>
                                        <option value="tile">Tile Across Page</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Position</span>
                                    <select
                                        value={position}
                                        onChange={(event) => setPosition(event.target.value as Position)}
                                        disabled={placementMode !== "single"}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                    >
                                        {positions.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Opacity: {opacityPercent}%</span>
                                    <input
                                        type="range"
                                        min="0.02"
                                        max="1"
                                        step="0.01"
                                        value={opacity}
                                        onChange={(event) => setOpacity(event.target.value)}
                                        className="w-full"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Rotation Angle</span>
                                    <input
                                        type="number"
                                        value={rotation}
                                        onChange={(event) => setRotation(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Scale</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={scale}
                                        onChange={(event) => setScale(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Horizontal Offset</span>
                                    <input
                                        type="number"
                                        value={offsetX}
                                        onChange={(event) => setOffsetX(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Vertical Offset</span>
                                    <input
                                        type="number"
                                        value={offsetY}
                                        onChange={(event) => setOffsetY(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">🚀 Process & Download</h2>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={processPdfs}
                                    disabled={isProcessing}
                                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isProcessing ? "Processing..." : "💧 Add Watermark"}
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

                            <div className="mt-5 space-y-3">
                                {outputs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-center text-slate-300">
                                        Watermarked PDFs will appear here.
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
                        <h2 className="mb-3 text-xl font-bold text-white">⚠️ Limitations</h2>
                        <p className="text-slate-300">
                            Password-protected, corrupted or unsupported PDFs may fail. Watermarks are not tamper-proof and can be
                            removed with PDF editing software. Large PDFs may require more browser memory.
                        </p>
                    </ToolCard>
                </div>
            </main>

            <Footer />
        </>
    );
}