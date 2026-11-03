import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Extract Images from PDF - Download PDF Images | ToolMint",
  description: "Extract renderable raster image objects from a PDF and download decoded PNG assets in a ZIP. Browser-side processing with clear unsupported-image reporting.",
};

export default function PdfExtractImagesPage() {
  return <PdfToolWorkspace kind="pdf-extract-images" />;
}
