import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "PDF Page Counter - Count and Inspect PDF Pages | ToolMint",
  description: "Count pages in a PDF and inspect each page's displayed dimensions, orientation and rotation. Download a per-page CSV report with local browser processing.",
};

export default function PdfPageCounterPage() {
  return <PdfToolWorkspace kind="pdf-page-counter" />;
}
