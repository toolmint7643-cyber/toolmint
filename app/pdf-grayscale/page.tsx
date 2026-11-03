import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Grayscale PDF Converter - Convert PDF Pages to Gray | ToolMint",
  description: "Convert PDF pages to grayscale in your browser with adjustable DPI and JPEG quality. This raster output is not text-searchable; files stay on your device.",
};

export default function PdfGrayscalePage() {
  return <PdfToolWorkspace kind="pdf-grayscale" />;
}
