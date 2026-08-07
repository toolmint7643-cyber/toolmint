"use client";

import { useMemo, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type Position =
    | "bottom-center"
    | "bottom-left"
    | "bottom-right"
    | "top-center"
    | "top-left"
    | "top-right";

type NumberStyle = "number" | "roman-lower" | "roman-upper" | "alpha-upper" | "alpha-lower";
type PageMode = "all" | "range" | "odd" | "even";

type DownloadFile = {
    name: string;
    url: string;
    size: string;
};

const positions: { label: string; value: Position }[] = [
    { label: "Bottom Center", value: "bottom-center" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Bottom Right", value: "bottom-right" },
    { label: "Top Center", value: "top-center" },
    { label: "Top Left", value: "top-left" },
    { label: "Top Right", value: "top-right" },
];

const quickStyles = [
  { label: "Page 1", prefix: "Page ", suffix: "" },
  { label: "1 / Total", prefix: "", suffix: " / {total}" },
  { label: "- 1 -", prefix: "- ", suffix: " -" },
  { label: "Clean Resume", prefix: "", suffix: "" },
];

function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function toRoman(value: number) {
    if (value <= 0) return String(value);

    const map: [number, string][] = [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
    ];

    let number = value;
    let output = "";

    for (const [amount, symbol] of map) {
        while (number >= amount) {
            output += symbol;
            number -= amount;
        }
    }

    return output;
}

function toAlphabet(value: number) {
    if (value <= 0) return String(value);

    let number = value;
    let output = "";

    while (number > 0) {
        number -= 1;
        output = String.fromCharCode(65 + (number % 26)) + output;
        number = Math.floor(number / 26);
    }

    return output;
}

function formatPageNumber(value: number, style: NumberStyle) {
    if (style === "roman-lower") return toRoman(value).toLowerCase();
    if (style === "roman-upper") return toRoman(value);
    if (style === "alpha-upper") return toAlphabet(value);
    if (style === "alpha-lower") return toAlphabet(value).toLowerCase();
    return String(value);
}

function parseHexColor(hex: string) {
    const clean = hex.replace("#", "");
    const full =
        clean.length === 3
            ? clean
                .split("")
                .map((char) => char + char)
                .join("")
            : clean;

    const value = Number.parseInt(full, 16);

    if (Number.isNaN(value) || full.length !== 6) {
        return rgb(0.15, 0.39, 0.92);
    }

    return rgb(
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255
    );
}

function parsePageRange(range: string, totalPages: number) {
    const pages = new Set<number>();
    const chunks = range
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    for (const chunk of chunks) {
        if (chunk.includes("-")) {
            const [startRaw, endRaw] = chunk.split("-");
            const start = Number(startRaw);
            const end = Number(endRaw);

            if (!Number.isInteger(start) || !Number.isInteger(end)) continue;

            const safeStart = Math.max(1, Math.min(start, totalPages));
            const safeEnd = Math.max(1, Math.min(end, totalPages));

            for (let page = Math.min(safeStart, safeEnd); page <= Math.max(safeStart, safeEnd); page += 1) {
                pages.add(page);
            }
        } else {
            const page = Number(chunk);

            if (Number.isInteger(page) && page >= 1 && page <= totalPages) {
                pages.add(page);
            }
        }
    }

    return pages;
}

function shouldNumberPage({
    pageNumber,
    totalPages,
    pageMode,
    pageRange,
    skipFirst,
    skipLast,
}: {
    pageNumber: number;
    totalPages: number;
    pageMode: PageMode;
    pageRange: string;
    skipFirst: boolean;
    skipLast: boolean;
}) {
    if (skipFirst && pageNumber === 1) return false;
    if (skipLast && pageNumber === totalPages) return false;
    if (pageMode === "odd" && pageNumber % 2 === 0) return false;
    if (pageMode === "even" && pageNumber % 2 !== 0) return false;

    if (pageMode === "range") {
        const selectedPages = parsePageRange(pageRange, totalPages);
        return selectedPages.has(pageNumber);
    }

    return true;
}

function getPosition({
    position,
    pageWidth,
    pageHeight,
    textWidth,
    fontSize,
    margin,
}: {
    position: Position;
    pageWidth: number;
    pageHeight: number;
    textWidth: number;
    fontSize: number;
    margin: number;
}) {
    const topY = pageHeight - margin - fontSize;
    const bottomY = margin;
    const centerX = pageWidth / 2 - textWidth / 2;
    const leftX = margin;
    const rightX = pageWidth - margin - textWidth;

    if (position === "top-left") return { x: leftX, y: topY };
    if (position === "top-center") return { x: centerX, y: topY };
    if (position === "top-right") return { x: rightX, y: topY };
    if (position === "bottom-left") return { x: leftX, y: bottomY };
    if (position === "bottom-right") return { x: rightX, y: bottomY };

    return { x: centerX, y: bottomY };
}

export default function PdfPageNumberAdderPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [position, setPosition] = useState<Position>("bottom-center");
    const [startNumber, setStartNumber] = useState("1");
    const [fontSize, setFontSize] = useState("10");
    const [color, setColor] = useState("#64748b");
    const [margin, setMargin] = useState("24");
    const [prefix, setPrefix] = useState("Page ");
    const [suffix, setSuffix] = useState("");
    const [numberStyle, setNumberStyle] = useState<NumberStyle>("number");
    const [pageMode, setPageMode] = useState<PageMode>("all");
    const [pageRange, setPageRange] = useState("1-5");
    const [skipFirst, setSkipFirst] = useState(false);
    const [skipLast, setSkipLast] = useState(false);
    const [includeDate, setIncludeDate] = useState(false);
    const [opacity, setOpacity] = useState("1");
    const [backgroundBox, setBackgroundBox] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("#ffffff");
    const [backgroundOpacity, setBackgroundOpacity] = useState("0.85");
    const [downloads, setDownloads] = useState<DownloadFile[]>([]);
    const [status, setStatus] = useState("Upload one or more PDFs and choose your page number style.");
    const [isProcessing, setIsProcessing] = useState(false);

    const previewText = useMemo(() => {
        const number = formatPageNumber(Number(startNumber) || 1, numberStyle);
        const totalSuffix = suffix.replace("{total}", "10");
        const date = includeDate ? ` | ${new Date().toLocaleDateString()}` : "";
        return `${prefix}${number}${totalSuffix}${date}`;
    }, [includeDate, numberStyle, prefix, startNumber, suffix]);

    const selectedFileText = useMemo(() => {
        if (files.length === 0) return "No PDF selected";
        if (files.length === 1) return `${files[0].name} (${formatBytes(files[0].size)})`;
        return `${files.length} PDFs selected`;
    }, [files]);

    const positionWarning = useMemo(() => {
        if (position.startsWith("top")) {
            return "Top positions may overlap existing document text. For resumes, invoices and reports, Bottom Center is usually safer.";
        }

        if (includeDate && position !== "bottom-center") {
            return "Date with page number can become wider, so Bottom Center is recommended for cleaner placement.";
        }

        return "";
    }, [includeDate, position]);

    function handleFiles(selected: FileList | null) {
        const pdfFiles = Array.from(selected || []).filter((file) => file.type === "application/pdf");

        if (pdfFiles.length === 0) {
            setStatus("Please select valid PDF files.");
            return;
        }

        downloads.forEach((file) => URL.revokeObjectURL(file.url));
        setDownloads([]);
        setFiles(pdfFiles);
        setStatus(`${pdfFiles.length} PDF file${pdfFiles.length > 1 ? "s" : ""} ready.`);
    }

    async function addNumbersToPdf(file: File) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();

        const totalPages = pages.length;
        const safeStartNumber = Number(startNumber) || 1;
        const safeFontSize = Math.max(6, Math.min(Number(fontSize) || 14, 72));
        const safeMargin = Math.max(0, Math.min(Number(margin) || 36, 200));
        const safeOpacity = Math.max(0.05, Math.min(Number(opacity) || 1, 1));
        const safeBackgroundOpacity = Math.max(0.05, Math.min(Number(backgroundOpacity) || 0.85, 1));

        let visibleIndex = 0;

        pages.forEach((page, index) => {
            const pageNumber = index + 1;
            const addToThisPage = shouldNumberPage({
                pageNumber,
                totalPages,
                pageMode,
                pageRange,
                skipFirst,
                skipLast,
            });

            if (!addToThisPage) return;

            const displayNumber = safeStartNumber + visibleIndex;
            visibleIndex += 1;

            const formattedNumber = formatPageNumber(displayNumber, numberStyle);
            const resolvedSuffix = suffix.replace("{total}", String(totalPages));
            const dateText = includeDate ? ` | ${new Date().toLocaleDateString()}` : "";
            const text = `${prefix}${formattedNumber}${resolvedSuffix}${dateText}`;

            const { width, height } = page.getSize();
            const textWidth = font.widthOfTextAtSize(text, safeFontSize);
            const textHeight = safeFontSize;

            const { x, y } = getPosition({
                position,
                pageWidth: width,
                pageHeight: height,
                textWidth,
                fontSize: safeFontSize,
                margin: safeMargin,
            });

            if (backgroundBox) {
                page.drawRectangle({
                    x: x - 8,
                    y: y - 5,
                    width: textWidth + 16,
                    height: textHeight + 10,
                    color: parseHexColor(backgroundColor),
                    opacity: safeBackgroundOpacity,
                });
            }

            page.drawText(text, {
                x,
                y,
                size: safeFontSize,
                font,
                color: parseHexColor(color),
                opacity: safeOpacity,
            });
        });

        const bytes = await pdfDoc.save();
        const safeBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const blob = new Blob([safeBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const cleanName = file.name.replace(/\.pdf$/i, "");
        return {
            name: `${cleanName}-numbered.pdf`,
            url,
            size: formatBytes(blob.size),
        };
    }

    async function processFiles() {
        if (files.length === 0) {
            alert("Please upload at least one PDF file.");
            return;
        }

        try {
            setIsProcessing(true);
            setStatus("Adding page numbers to your PDF files...");
            downloads.forEach((file) => URL.revokeObjectURL(file.url));

            const outputFiles: DownloadFile[] = [];

            for (const file of files) {
                const numberedPdf = await addNumbersToPdf(file);
                outputFiles.push(numberedPdf);
            }

            setDownloads(outputFiles);
            setStatus(`Done. ${outputFiles.length} numbered PDF file${outputFiles.length > 1 ? "s" : ""} ready.`);
            alert("Page numbers added successfully.");
        } catch (error) {
            setStatus("Could not process this PDF. Password-protected or damaged PDFs may fail.");
            alert("Failed to add page numbers. Please try another PDF.");
        } finally {
            setIsProcessing(false);
        }
    }

    function copySummary() {
        const summary = `PDF Page Number Settings
Files: ${files.length}
Position: ${position}
Start number: ${startNumber}
Style: ${numberStyle}
Font size: ${fontSize}
Color: ${color}
Margin: ${margin}
Prefix: ${prefix}
Suffix: ${suffix || "none"}
Page mode: ${pageMode}
Range: ${pageMode === "range" ? pageRange : "not used"}
Skip first page: ${skipFirst ? "yes" : "no"}
Skip last page: ${skipLast ? "yes" : "no"}
Date included: ${includeDate ? "yes" : "no"}
Background box: ${backgroundBox ? "yes" : "no"}`;

        navigator.clipboard.writeText(summary);
        alert("Summary copied.");
    }

    function resetTool() {
        downloads.forEach((file) => URL.revokeObjectURL(file.url));
        setFiles([]);
        setDownloads([]);
        setPosition("bottom-center");
        setStartNumber("1");
        setFontSize("10");
        setColor("#64748b");
        setMargin("24");
        setPrefix("Page ");
        setSuffix("");
        setNumberStyle("number");
        setPageMode("all");
        setPageRange("1-5");
        setSkipFirst(false);
        setSkipLast(false);
        setIncludeDate(false);
        setOpacity("1");
        setBackgroundBox(false);
        setBackgroundColor("#ffffff");
        setBackgroundOpacity("0.85");
        setStatus("Upload one or more PDFs and choose your page number style.");
    }

    return (
        <>
            <Header />

            <main className="mx-auto max-w-7xl px-4 py-10 text-white">
                <PageTitle
                    title="🔢 PDF Page Number Adder"
                    description="Add page numbers to PDF online for free. Choose position, style, color, margin, prefix, suffix, page range, odd/even pages and batch process PDFs directly in your browser."
                />

                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                    <ToolCard>
                        <div className="space-y-5">
                            <div>
                                <h2 className="mb-3 text-2xl font-bold text-white">📄 Upload PDF</h2>
                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/70 bg-slate-900/70 p-8 text-center transition hover:border-blue-400 hover:bg-slate-800">
                                    <span className="text-4xl">📎</span>
                                    <span className="mt-3 text-lg font-bold">Choose PDF files</span>
                                    <span className="mt-1 text-sm text-slate-300">Batch mode supported. Files stay in your browser.</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={(event) => handleFiles(event.target.files)}
                                    />
                                </label>
                                <p className="mt-3 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">{selectedFileText}</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Position</span>
                                    <select
                                        value={position}
                                        onChange={(event) => setPosition(event.target.value as Position)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        {positions.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Number Style</span>
                                    <select
                                        value={numberStyle}
                                        onChange={(event) => setNumberStyle(event.target.value as NumberStyle)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="number">1, 2, 3</option>
                                        <option value="roman-lower">i, ii, iii</option>
                                        <option value="roman-upper">I, II, III</option>
                                        <option value="alpha-upper">A, B, C</option>
                                        <option value="alpha-lower">a, b, c</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Start Number</span>
                                    <input
                                        type="number"
                                        value={startNumber}
                                        onChange={(event) => setStartNumber(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
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

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Margin</span>
                                    <input
                                        type="number"
                                        value={margin}
                                        onChange={(event) => setMargin(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Prefix</span>
                                    <input
                                        type="text"
                                        value={prefix}
                                        onChange={(event) => setPrefix(event.target.value)}
                                        placeholder="Page "
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Suffix</span>
                                    <input
                                        type="text"
                                        value={suffix}
                                        onChange={(event) => setSuffix(event.target.value)}
                                        placeholder=" / {total}"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>
                            </div>

                            <div>
                                <h3 className="mb-3 text-xl font-bold text-white">⚡ Quick Styles</h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {quickStyles.map((style) => (
                                        <button
                                            key={style.label}
                                            type="button"
                                            onClick={() => {
                                                setPrefix(style.prefix);
                                                setSuffix(style.suffix);
                                            }}
                                            className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:bg-slate-700"
                                        >
                                            {style.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Page Mode</span>
                                    <select
                                        value={pageMode}
                                        onChange={(event) => setPageMode(event.target.value as PageMode)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="all">All pages</option>
                                        <option value="range">Selected range</option>
                                        <option value="odd">Odd pages only</option>
                                        <option value="even">Even pages only</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Selected Pages</span>
                                    <input
                                        type="text"
                                        value={pageRange}
                                        onChange={(event) => setPageRange(event.target.value)}
                                        placeholder="1-5, 8, 10-12"
                                        disabled={pageMode !== "range"}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                                    <input type="checkbox" checked={skipFirst} onChange={(event) => setSkipFirst(event.target.checked)} />
                                    Skip first page
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                                    <input type="checkbox" checked={skipLast} onChange={(event) => setSkipLast(event.target.checked)} />
                                    Skip last page
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                                    <input type="checkbox" checked={includeDate} onChange={(event) => setIncludeDate(event.target.checked)} />
                                    Add date
                                </label>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold">
                                    <input
                                        type="checkbox"
                                        checked={backgroundBox}
                                        onChange={(event) => setBackgroundBox(event.target.checked)}
                                    />
                                    Background box
                                </label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Text Opacity</span>
                                    <input
                                        type="number"
                                        step="0.05"
                                        min="0.05"
                                        max="1"
                                        value={opacity}
                                        onChange={(event) => setOpacity(event.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Box Color</span>
                                    <input
                                        type="color"
                                        value={backgroundColor}
                                        onChange={(event) => setBackgroundColor(event.target.value)}
                                        disabled={!backgroundBox}
                                        className="h-14 w-full rounded-xl border border-slate-700 bg-slate-800 p-2 disabled:opacity-50"
                                    />
                                </label>

                                <label className="block">
                                    <span className="mb-2 block text-sm font-semibold text-slate-300">Box Opacity</span>
                                    <input
                                        type="number"
                                        step="0.05"
                                        min="0.05"
                                        max="1"
                                        value={backgroundOpacity}
                                        onChange={(event) => setBackgroundOpacity(event.target.value)}
                                        disabled={!backgroundBox}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500 disabled:opacity-50"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={processFiles}
                                    disabled={isProcessing}
                                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isProcessing ? "Processing..." : "🔢 Add Numbers"}
                                </button>

                                <button
                                    type="button"
                                    onClick={copySummary}
                                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white transition hover:bg-slate-700"
                                >
                                    📋 Copy Summary
                                </button>

                                <button
                                    type="button"
                                    onClick={resetTool}
                                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-white transition hover:bg-slate-700"
                                >
                                    🔄 Reset
                                </button>
                            </div>
                        </div>
                    </ToolCard>

                    <div className="space-y-6">
                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">👀 Live Text Preview</h2>
                            <div className="rounded-2xl border border-blue-500/40 bg-slate-950 p-6">
                                <p className="text-sm text-slate-400">Preview text</p>
                                <p className="mt-2 break-words text-3xl font-bold" style={{ color }}>
                                    {previewText || "1"}
                                </p>
                            </div>

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-5">
                                    <p className="text-sm text-emerald-200">Current Position</p>
                                    <p className="mt-2 text-2xl font-bold text-emerald-300">{position.replace("-", " ")}</p>
                                </div>

                                <div className="rounded-2xl border border-blue-500/40 bg-blue-950/40 p-5">
                                    <p className="text-sm text-blue-200">Page Selection</p>
                                    <p className="mt-2 text-2xl font-bold text-blue-300">{pageMode}</p>
                                </div>
                            </div>

                            <p className="mt-5 rounded-xl bg-slate-800 p-4 text-slate-300">{status}</p>
                            {positionWarning && (
                                <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm font-semibold text-amber-200">
                                    ⚠️ {positionWarning}
                                </p>
                            )}
                        </ToolCard>

                        <ToolCard>
                            <h2 className="mb-4 text-2xl font-bold text-white">⬇️ Download Files</h2>

                            {downloads.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center text-slate-300">
                                    Numbered PDFs will appear here after processing.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {downloads.map((file) => (
                                        <a
                                            key={file.url}
                                            href={file.url}
                                            download={file.name}
                                            className="flex flex-col justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-white transition hover:border-blue-500 hover:bg-slate-700 sm:flex-row sm:items-center"
                                        >
                                            <span>{file.name}</span>
                                            <span className="text-sm text-slate-300">{file.size} · Download</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </ToolCard>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-3">
                    <ToolCard>
                        <h2 className="mb-3 text-xl font-bold text-white">⭐ SEO Use Cases</h2>
                        <p className="text-slate-300">
                            Add page numbers to PDF online, insert footer numbers, create PDF pagination, add headers, add
                            Bates-style numbering and number selected PDF pages.
                        </p>
                    </ToolCard>

                    <ToolCard>
                        <h2 className="mb-3 text-xl font-bold text-white">🔒 Privacy</h2>
                        <p className="text-slate-300">
                            Your PDF is processed in the browser with pdf-lib. Files are not uploaded to a server.
                        </p>
                    </ToolCard>

                    <ToolCard>
                        <h2 className="mb-3 text-xl font-bold text-white">⚠️ Important Note</h2>
                        <p className="text-slate-300">
                            Password-protected or damaged PDFs may fail. Very large PDFs can be slower on mobile devices.
                        </p>
                    </ToolCard>
                </div>
            </main>

            <Footer />
        </>
    );
}