import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Compress Images in PDF - Preserve Text and Vectors | ToolMint",
  description: "Optimize eligible embedded PDF images with QPDF in your browser while avoiding page rasterization. Measure the actual result; image compression may not reduce every file.",
};

export default function PdfCompressImagesPage() {
  return <PdfToolWorkspace kind="pdf-compress-images" />;
}
