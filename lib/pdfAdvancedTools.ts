import JSZip from "jszip";
import {
  degrees,
  PDFButton,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFField,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  rgb,
} from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type AdvancedPdfTool =
  | "pdf-to-excel"
  | "pdf-protect"
  | "pdf-page-counter"
  | "pdf-grayscale"
  | "pdf-extract-images"
  | "pdf-signature-image"
  | "pdf-sort-pages"
  | "pdf-compress-images"
  | "pdf-form-viewer"
  | "pdf-booklet";

export type AdvancedPdfOptions = {
  pageRange: string;
  signatureImage: File | null;
  signatureWidth: number;
  signatureOpacity: number;
  signatureRotation: number;
  signaturePosition: string;
  grayDpi: number;
  grayQuality: number;
  imageQuality: number;
  password: string;
  passwordConfirmation: string;
  ownerPassword: string;
  sortOrder: "size" | "orientation";
  sortDirection: "ascending" | "descending";
  keyLength: 128 | 256;
  allowPrint: boolean;
  allowCopy: boolean;
  allowModify: boolean;
};

export type AdvancedPdfResult = {
  blob: Blob;
  fileName: string;
  summary: string;
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
};

function safeName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function pdfBlob(bytes: Uint8Array) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: "application/pdf" });
}

function textBlob(text: string, type = "text/plain;charset=utf-8") {
  return new Blob([`\uFEFF${text}`], { type });
}

function csvValue(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function xmlValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let output = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function createWorkbook(sheets: Array<{ name: string; rows: string[][] }>) {
  const zip = new JSZip();
  const sheetOverrides = sheets
    .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  const sheetEntries = sheets
    .map((sheet, index) => `<sheet name="${xmlValue(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  const relationships = sheets
    .map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
    .join("");

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetOverrides}</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`,
  );

  sheets.forEach((sheet, sheetIndex) => {
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const cells = row
          .map((value, columnIndex) => `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlValue(value)}</t></is></c>`)
          .join("");
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join("");
    zip.file(
      `xl/worksheets/sheet${sheetIndex + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  });
  return zip;
}

function readPageRange(value: string, count: number) {
  const pages = new Set<number>();
  for (const item of value.split(",")) {
    const part = item.trim();
    if (!part) throw new Error("Enter page numbers or ranges, for example 1-3,7.");
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end < start || end > count) throw new Error(`Invalid page range: ${part}. This PDF has ${count} pages.`);
      for (let page = start; page <= end; page += 1) pages.add(page);
    } else {
      if (!/^\d+$/.test(part)) throw new Error(`Invalid page selection: ${part}.`);
      const page = Number(part);
      if (page < 1 || page > count) throw new Error(`Page ${page} is outside this PDF's 1-${count} page range.`);
      pages.add(page);
    }
  }
  if (!pages.size) throw new Error("Select at least one page.");
  return [...pages].sort((a, b) => a - b);
}

type LoadedPdfJs = {
  document: PDFDocumentProxy;
  destroy: () => Promise<void>;
};

async function loadPdfJs(file: File): Promise<LoadedPdfJs> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const document = await loadingTask.promise;
  return { document, destroy: () => loadingTask.destroy() };
}

async function canvasBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The browser could not encode this page image."))), type, quality);
  });
}

function positionForSignature(position: string, pageWidth: number, pageHeight: number, width: number, height: number) {
  const margin = Math.min(pageWidth, pageHeight) * 0.06;
  const horizontal = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
  const vertical = position.startsWith("top") ? "top" : position.startsWith("bottom") ? "bottom" : "center";
  const x = horizontal === "left" ? margin : horizontal === "right" ? pageWidth - width - margin : (pageWidth - width) / 2;
  const y = vertical === "top" ? pageHeight - height - margin : vertical === "bottom" ? margin : (pageHeight - height) / 2;
  return { x, y };
}

async function toPositionedRows(pdf: PDFDocumentProxy) {
  const sheets: Array<{ name: string; rows: string[][] }> = [];
  let pagesWithText = 0;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items: PositionedText[] = content.items.flatMap((item) => {
      const textItem = item as PdfTextItem;
      const text = textItem.str?.trim();
      if (!text || !textItem.transform) return [];
      return [{ text, x: textItem.transform[4] ?? 0, y: textItem.transform[5] ?? 0, width: textItem.width ?? 0 }];
    });
    const rowGroups: Array<{ y: number; items: PositionedText[] }> = [];
    for (const item of items) {
      const row = rowGroups.find((candidate) => Math.abs(candidate.y - item.y) < 3.5);
      if (row) row.items.push(item);
      else rowGroups.push({ y: item.y, items: [item] });
    }
    rowGroups.sort((a, b) => b.y - a.y);
    const rows = rowGroups.map((group) => {
      const sorted = group.items.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let current = "";
      let previousRight = Number.NEGATIVE_INFINITY;
      for (const item of sorted) {
        const gap = item.x - previousRight;
        if (current && gap > 42) {
          cells.push(current.trim());
          current = "";
        }
        current += `${current ? " " : ""}${item.text}`;
        previousRight = item.x + item.width;
      }
      if (current) cells.push(current.trim());
      return cells;
    });
    if (rows.some((row) => row.join("").trim())) pagesWithText += 1;
    sheets.push({ name: `Page ${pageNumber}`, rows: rows.length ? rows : [["No selectable text detected on this page."]] });
    page.cleanup();
  }
  return { sheets, pagesWithText };
}

export async function convertPdfToExcel(file: File): Promise<AdvancedPdfResult> {
  const loaded = await loadPdfJs(file);
  const pdf = loaded.document;
  if (pdf.numPages > 200) {
    await loaded.destroy();
    throw new Error("PDF to Excel is limited to 200 pages per file to keep browser memory use controlled.");
  }
  try {
    const { sheets, pagesWithText } = await toPositionedRows(pdf);
    if (!pagesWithText) throw new Error("No selectable text was found. This PDF may be scanned; run OCR first, then export the OCR text separately.");
    const bytes = await createWorkbook(sheets).generateAsync({ type: "uint8array" });
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    const blob = new Blob([copy], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return {
      blob,
      fileName: `${safeName(file.name)}-text-export.xlsx`,
      summary: `Created an XLSX workbook with ${sheets.length} page sheet(s). ${pagesWithText} page(s) contained selectable text. Text positions are grouped heuristically; this is not guaranteed to reconstruct complex tables or scanned pages.`,
    };
  } finally {
    await loaded.destroy();
  }
}

export async function countPdfPages(file: File): Promise<AdvancedPdfResult> {
  const document = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  const rows = [["Page", "Width (pt)", "Height (pt)", "Orientation", "Rotation"]];
  document.getPages().forEach((page, index) => {
    const width = page.getWidth();
    const height = page.getHeight();
    const rotated = page.getRotation().angle % 180 !== 0;
    const visibleWidth = rotated ? height : width;
    const visibleHeight = rotated ? width : height;
    rows.push([String(index + 1), visibleWidth.toFixed(2), visibleHeight.toFixed(2), visibleWidth > visibleHeight ? "Landscape" : visibleWidth < visibleHeight ? "Portrait" : "Square", String(page.getRotation().angle)]);
  });
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
  return {
    blob: textBlob(csv, "text/csv;charset=utf-8"),
    fileName: `${safeName(file.name)}-page-report.csv`,
    summary: `This PDF contains ${document.getPageCount()} page(s). The CSV report includes displayed page dimensions, orientation, and rotation for every page.`,
  };
}

export async function convertPdfToGrayscale(file: File, dpi: number, quality: number): Promise<AdvancedPdfResult> {
  const loaded = await loadPdfJs(file);
  const pdfjs = loaded.document;
  if (pdfjs.numPages > 30) {
    await loaded.destroy();
    throw new Error("Grayscale conversion is limited to 30 pages per job to keep browser memory use controlled.");
  }
  const output = await PDFDocument.create();
  let totalPixels = 0;
  try {
    for (let pageNumber = 1; pageNumber <= pdfjs.numPages; pageNumber += 1) {
      const sourcePage = await pdfjs.getPage(pageNumber);
      const viewport = sourcePage.getViewport({ scale: dpi / 72 });
      const pixels = Math.ceil(viewport.width) * Math.ceil(viewport.height);
      totalPixels += pixels;
      if (pixels > 12_000_000 || totalPixels > 48_000_000) {
        throw new Error(`Page ${pageNumber} exceeds the browser rendering memory budget at ${dpi} DPI. Lower the DPI or process a shorter PDF.`);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
      await sourcePage.render({ canvas, canvasContext: context, viewport }).promise;
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const gray = Math.round(image.data[index] * 0.2126 + image.data[index + 1] * 0.7152 + image.data[index + 2] * 0.0722);
        image.data[index] = gray;
        image.data[index + 1] = gray;
        image.data[index + 2] = gray;
      }
      context.putImageData(image, 0, 0);
      const jpeg = await canvasBlob(canvas, "image/jpeg", quality / 100);
      const jpegBytes = new Uint8Array(await jpeg.arrayBuffer());
      const embedded = await output.embedJpg(jpegBytes);
      const scale = dpi / 72;
      const page = output.addPage([viewport.width / scale, viewport.height / scale]);
      page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
      canvas.width = 0;
      canvas.height = 0;
      sourcePage.cleanup();
    }
    const bytes = await output.save();
    return {
      blob: pdfBlob(bytes),
      fileName: `${safeName(file.name)}-grayscale.pdf`,
      summary: `Converted ${pdfjs.numPages} page(s) to grayscale at ${dpi} DPI. Pages were rasterized and rebuilt as JPEG images; selectable/searchable text, vectors, forms, annotations, and original document structure are not preserved.`,
    };
  } finally {
    await loaded.destroy();
  }
}

type DecodedPdfImage = {
  width?: unknown;
  height?: unknown;
  data?: unknown;
  bitmap?: unknown;
};

function drawDecodedImage(context: CanvasRenderingContext2D, value: unknown): { width: number; height: number } | null {
  if (typeof ImageBitmap !== "undefined" && value instanceof ImageBitmap) {
    context.canvas.width = value.width;
    context.canvas.height = value.height;
    context.drawImage(value, 0, 0);
    return { width: value.width, height: value.height };
  }
  if (!value || typeof value !== "object") return null;
  const image = value as DecodedPdfImage;
  if (typeof ImageBitmap !== "undefined" && image.bitmap instanceof ImageBitmap) {
    context.canvas.width = image.bitmap.width;
    context.canvas.height = image.bitmap.height;
    context.drawImage(image.bitmap, 0, 0);
    return { width: image.bitmap.width, height: image.bitmap.height };
  }
  if (typeof image.width !== "number" || typeof image.height !== "number" || !image.data) return null;
  const width = Math.floor(image.width);
  const height = Math.floor(image.height);
  if (width < 1 || height < 1 || width * height > 16_000_000) return null;
  const raw = image.data;
  if (!(raw instanceof Uint8Array || raw instanceof Uint8ClampedArray)) return null;
  const rgba = new Uint8ClampedArray(width * height * 4);
  if (raw.length === rgba.length) rgba.set(raw);
  else if (raw.length === width * height * 3) {
    for (let source = 0, target = 0; source < raw.length; source += 3, target += 4) {
      rgba[target] = raw[source];
      rgba[target + 1] = raw[source + 1];
      rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = 255;
    }
  } else return null;
  context.canvas.width = width;
  context.canvas.height = height;
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  return { width, height };
}

export async function extractPdfImages(file: File): Promise<AdvancedPdfResult> {
  const loaded = await loadPdfJs(file);
  const pdf = loaded.document;
  const zip = new JSZip();
  let extracted = 0;
  let skipped = 0;
  try {
    const pdfjs = await import("pdfjs-dist");
    const ops = (pdfjs as unknown as { OPS: Record<string, number> }).OPS;
    const imageOps = new Set([
      ops.paintImageXObject,
      ops.paintJpegXObject,
      ops.paintImageXObjectRepeat,
      ops.paintInlineImageXObject,
      ops.paintInlineImageXObjectGroup,
      ops.paintImageMaskXObject,
    ].filter((value): value is number => typeof value === "number"));
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const list = await page.getOperatorList();
      const argsArray = list.argsArray as unknown as unknown[][];
      const seen = new Set<string>();
      for (let index = 0; index < list.fnArray.length && extracted < 100; index += 1) {
        if (!imageOps.has(list.fnArray[index])) continue;
        const args = argsArray[index];
        const imageId = args?.[0];
        if (typeof imageId !== "string" || seen.has(imageId)) {
          skipped += 1;
          continue;
        }
        seen.add(imageId);
        try {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) throw new Error("Canvas unavailable");
          const imageObject: unknown = page.objs.get(imageId);
          const size = drawDecodedImage(context, imageObject);
          if (!size) {
            skipped += 1;
            continue;
          }
          const blob = await canvasBlob(canvas);
          zip.file(`page-${String(pageNumber).padStart(3, "0")}-image-${String(extracted + 1).padStart(3, "0")}.png`, blob);
          extracted += 1;
          canvas.width = 0;
          canvas.height = 0;
        } catch {
          skipped += 1;
        }
      }
      page.cleanup();
    }
    if (!extracted) throw new Error("No exportable raster image objects were found. Some inline, masked, vector, or unsupported image formats cannot be extracted by this browser renderer.");
    const report = `PDF image extraction report\nSource: ${file.name}\nPages scanned: ${pdf.numPages}\nImages exported as PNG: ${extracted}\nImage objects skipped: ${skipped}\n\nImages are decoded visual assets, not original embedded byte-for-byte streams. Inline images, masks, vector artwork and unsupported formats may not be exported.`;
    zip.file("extraction-report.txt", report);
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    const capNote = extracted >= 100 ? " The 100-image per-file export limit was reached; later images may not be included." : "";
    return { blob, fileName: `${safeName(file.name)}-images.zip`, summary: `Exported ${extracted} image object(s) as PNG from ${pdf.numPages} page(s). ${skipped} object(s) were skipped when the browser renderer could not decode them.${capNote}` };
  } finally {
    await loaded.destroy();
  }
}

export async function addSignatureImage(file: File, options: AdvancedPdfOptions): Promise<AdvancedPdfResult> {
  if (!options.signatureImage) throw new Error("Upload a PNG or JPG signature image first.");
  const document = await PDFDocument.load(await file.arrayBuffer());
  const pages = document.getPages();
  const selectedPages = readPageRange(options.pageRange, pages.length);
  const imageBytes = new Uint8Array(await options.signatureImage.arrayBuffer());
  let image;
  if (options.signatureImage.type === "image/png" || options.signatureImage.name.toLowerCase().endsWith(".png")) image = await document.embedPng(imageBytes);
  else if (options.signatureImage.type === "image/jpeg" || /\.jpe?g$/i.test(options.signatureImage.name)) image = await document.embedJpg(imageBytes);
  else throw new Error("Signature image must be a PNG or JPG file.");
  for (const pageNumber of selectedPages) {
    const page = pages[pageNumber - 1];
    const width = Math.min(page.getWidth() * (options.signatureWidth / 100), page.getWidth() * 0.7);
    const height = width * (image.height / image.width);
    const { x, y } = positionForSignature(options.signaturePosition, page.getWidth(), page.getHeight(), width, height);
    page.drawImage(image, { x, y, width, height, opacity: options.signatureOpacity / 100, rotate: degrees(options.signatureRotation) });
  }
  const bytes = await document.save();
  return {
    blob: pdfBlob(bytes),
    fileName: `${safeName(file.name)}-signature-stamp.pdf`,
    summary: `Placed the uploaded signature image on ${selectedPages.length} selected page(s). This adds a visible image stamp only; it is not a cryptographic digital signature and does not verify signer identity or document integrity.`,
  };
}

export async function sortPdfPages(file: File, order: "size" | "orientation", direction: "ascending" | "descending"): Promise<AdvancedPdfResult> {
  const source = await PDFDocument.load(await file.arrayBuffer());
  const pages = source.getPages();
  const pageMetrics = pages.map((page, index) => {
    const rotation = ((page.getRotation().angle % 360) + 360) % 360;
    const width = rotation % 180 ? page.getHeight() : page.getWidth();
    const height = rotation % 180 ? page.getWidth() : page.getHeight();
    return { index, width, height, area: width * height, landscape: width > height, label: `Page ${index + 1}` };
  });
  const multiplier = direction === "ascending" ? 1 : -1;
  pageMetrics.sort((a, b) => {
    const primary = order === "size" ? a.area - b.area : Number(a.landscape) - Number(b.landscape);
    const secondary = order === "size" ? a.width - b.width || a.height - b.height : a.area - b.area;
    return multiplier * (primary || secondary || a.index - b.index);
  });
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pageMetrics.map((page) => page.index));
  copied.forEach((page) => output.addPage(page));
  const bytes = await output.save();
  const orderSummary = pageMetrics.map((page) => page.index + 1).join(", ");
  return {
    blob: pdfBlob(bytes),
    fileName: `${safeName(file.name)}-sorted.pdf`,
    summary: `Sorted ${pages.length} page(s) by ${order === "size" ? "visible page area" : "portrait/landscape orientation"} (${direction}). New page order: ${orderSummary || "none"}. This rebuilds copied pages; interactive forms, signatures, outlines, and some document-level structures may not be preserved.`,
  };
}

export async function compressPdfImages(file: File, quality: number): Promise<AdvancedPdfResult> {
  const toolkit = await import("pdfstudio").then(({ createPdfToolkit }) => createPdfToolkit({ wasmUrl: "/pdfstudio/qpdf.wasm" }));
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  const outputBytes = await toolkit.raw([inputBytes], [
    "--optimize-images",
    `--jpeg-quality=${quality}`,
    "--oi-min-width=0",
    "--oi-min-height=0",
    "--oi-min-area=0",
    "--object-streams=generate",
    "$in0",
    "$out",
  ]);
  const verified = await PDFDocument.load(outputBytes, { updateMetadata: false });
  const inputSize = file.size;
  const outputSize = outputBytes.byteLength;
  const delta = inputSize ? ((inputSize - outputSize) / inputSize) * 100 : 0;
  const sizeMessage = delta > 0
    ? `Measured file-size reduction: ${delta.toFixed(1)}% (${formatBytes(inputSize)} to ${formatBytes(outputSize)}).`
    : delta < 0
      ? `The output is ${Math.abs(delta).toFixed(1)}% larger (${formatBytes(inputSize)} to ${formatBytes(outputSize)}); no size saving is claimed.`
      : `File size is unchanged (${formatBytes(outputSize)}).`;
  return {
    blob: pdfBlob(outputBytes),
    fileName: `${safeName(file.name)}-images-optimized.pdf`,
    summary: `QPDF optimized eligible embedded images at JPEG quality ${quality} and verified the resulting ${verified.getPageCount()}-page PDF. ${sizeMessage} Page content is not rasterized or resampled; existing images may be recompressed lossily, and unsupported image types may be left unchanged.`,
  };
}

function formFieldValue(field: PDFField) {
  if (field instanceof PDFTextField) return field.getText() ?? "";
  if (field instanceof PDFCheckBox) return field.isChecked() ? "Checked" : "Unchecked";
  if (field instanceof PDFDropdown) return field.getSelected().join("; ");
  if (field instanceof PDFOptionList) return field.getSelected().join("; ");
  if (field instanceof PDFRadioGroup) return field.getSelected() ?? "";
  if (field instanceof PDFSignature) return "Signature field; cryptographic signature not verified";
  if (field instanceof PDFButton) return "Button field";
  return "";
}

export async function inspectPdfFormFields(file: File): Promise<AdvancedPdfResult> {
  const document = await PDFDocument.load(await file.arrayBuffer(), { updateMetadata: false });
  const form = document.getForm();
  const fields = form.getFields();
  const rows = [["Field name", "Field type", "Value", "Required", "Read-only"]];
  for (const field of fields) {
    rows.push([
      field.getName(),
      field.constructor.name.replace(/^PDF/, ""),
      formFieldValue(field),
      String(field.isRequired()),
      String(field.isReadOnly()),
    ]);
  }
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
  const xfaNote = form.hasXFA() ? " XFA data is present, but pdf-lib cannot read XFA fields; the export only covers supported AcroForm fields." : "";
  return {
    blob: textBlob(csv, "text/csv;charset=utf-8"),
    fileName: `${safeName(file.name)}-form-fields.csv`,
    summary: `${fields.length} AcroForm field(s) found.${xfaNote} Signature fields are listed but this tool does not validate cryptographic signatures. Field values remain in your browser and are included in the CSV you download.`,
  };
}

export async function createPdfBooklet(file: File): Promise<AdvancedPdfResult> {
  const source = await PDFDocument.load(await file.arrayBuffer());
  const pages = source.getPages();
  if (pages.length > 200) throw new Error("Booklet imposition is limited to 200 source pages per file to keep browser memory use controlled.");
  const first = pages[0];
  if (!first) throw new Error("The uploaded PDF has no pages.");
  const pageWidth = first.getWidth();
  const pageHeight = first.getHeight();
  const paddedCount = Math.ceil(pages.length / 4) * 4;
  const output = await PDFDocument.create();
  const embedded = await Promise.all(pages.map((page) => output.embedPage(page)));
  const getEmbedded = (oneBased: number) => oneBased >= 1 && oneBased <= pages.length ? embedded[oneBased - 1] : null;
  const sheetCount = paddedCount / 4;
  for (let sheet = 0; sheet < sheetCount; sheet += 1) {
    const front = [paddedCount - sheet * 2, sheet * 2 + 1];
    const back = [sheet * 2 + 2, paddedCount - sheet * 2 - 1];
    for (const side of [front, back]) {
      const page = output.addPage([pageWidth * 2, pageHeight]);
      for (let slot = 0; slot < 2; slot += 1) {
        const sourcePage = getEmbedded(side[slot]);
        if (!sourcePage) continue;
        const scale = Math.min(pageWidth / sourcePage.width, pageHeight / sourcePage.height);
        const width = sourcePage.width * scale;
        const height = sourcePage.height * scale;
        const x = slot * pageWidth + (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;
        page.drawPage(sourcePage, { x, y, width, height });
      }
      page.drawLine({ start: { x: pageWidth, y: 0 }, end: { x: pageWidth, y: pageHeight }, thickness: 0.5, color: rgb(0.82, 0.82, 0.82) });
    }
  }
  const bytes = await output.save();
  return {
    blob: pdfBlob(bytes),
    fileName: `${safeName(file.name)}-booklet-imposed.pdf`,
    summary: `Imposed ${pages.length} source page(s) into ${paddedCount} booklet positions across ${sheetCount * 2} landscape side(s). Blank positions pad the final signature to a multiple of four. Print double-sided, flip on the short edge, then fold; verify printer settings with a test copy. Output uses the first page's size and keeps page content vector-based where supported.`,
  };
}

export async function protectPdf(file: File, options: AdvancedPdfOptions): Promise<AdvancedPdfResult> {
  if (options.password.length < 8) throw new Error("Use an opening password with at least 8 characters.");
  if (options.password !== options.passwordConfirmation) throw new Error("The opening password and confirmation do not match.");
  if (options.ownerPassword.length < 8) throw new Error("Use a separate owner password with at least 8 characters.");
  if (options.password === options.ownerPassword) throw new Error("The owner password must differ from the opening password so permission controls remain meaningful.");
  const { createPdfToolkit } = await import("pdfstudio");
  const toolkit = await createPdfToolkit({ wasmUrl: "/pdfstudio/qpdf.wasm" });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const protectedBytes = await toolkit.lock(bytes, {
    userPassword: options.password,
    ownerPassword: options.ownerPassword,
    keyLength: options.keyLength,
    permissions: {
      print: options.allowPrint ? "full" : "none",
      extract: options.allowCopy,
      modify: options.allowModify ? "all" : "none",
    },
  });
  const info = await toolkit.getInfo(protectedBytes, { password: options.password });
  if (!info.encrypted || !info.encryption?.userPasswordMatched) throw new Error("QPDF could not confirm that the output is encrypted and opens with the supplied password.");
  return {
    blob: pdfBlob(protectedBytes),
    fileName: `${safeName(file.name)}-protected.pdf`,
    summary: `QPDF confirmed ${info.encryption.bits}-bit ${info.encryption.method} encryption and verified the opening password. ${info.pageCount} page(s) are present. Permission restrictions are reader-enforced and are not DRM; some PDF software may ignore them. Keep the password safe because the tool cannot recover it.`,
  };
}

export async function runAdvancedPdfTool(kind: AdvancedPdfTool, file: File, options: AdvancedPdfOptions): Promise<AdvancedPdfResult> {
  switch (kind) {
    case "pdf-to-excel":
      return convertPdfToExcel(file);
    case "pdf-protect":
      return protectPdf(file, options);
    case "pdf-page-counter":
      return countPdfPages(file);
    case "pdf-grayscale":
      return convertPdfToGrayscale(file, options.grayDpi, options.grayQuality);
    case "pdf-extract-images":
      return extractPdfImages(file);
    case "pdf-signature-image":
      return addSignatureImage(file, options);
    case "pdf-sort-pages":
      return sortPdfPages(file, options.sortOrder, options.sortDirection);
    case "pdf-compress-images":
      return compressPdfImages(file, options.imageQuality);
    case "pdf-form-viewer":
      return inspectPdfFormFields(file);
    case "pdf-booklet":
      return createPdfBooklet(file);
  }
}
