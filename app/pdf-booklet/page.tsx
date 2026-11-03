import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "PDF Booklet Maker - Arrange Pages for Booklet Printing | ToolMint",
  description: "Impose PDF pages in saddle-stitch booklet order, two pages per landscape sheet side. Browser-side PDF booklet maker with four-page padding and print guidance.",
};

export default function PdfBookletPage() {
  return <PdfToolWorkspace kind="pdf-booklet" />;
}
