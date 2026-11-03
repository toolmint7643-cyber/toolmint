import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "PDF to Excel Converter - Export PDF Text to XLSX | ToolMint",
  description: "Convert selectable PDF text into an XLSX workbook with one sheet per page. Free browser-side PDF to Excel export; scanned pages and complex table layouts may need OCR or manual review.",
};

export default function PdfToExcelPage() {
  return <PdfToolWorkspace kind="pdf-to-excel" />;
}
