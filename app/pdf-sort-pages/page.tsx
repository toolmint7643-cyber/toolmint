import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Sort PDF Pages by Size or Orientation | ToolMint",
  description: "Reorder PDF pages by displayed page size or portrait and landscape orientation, then download a newly sorted PDF processed in your browser.",
};

export default function PdfSortPagesPage() {
  return <PdfToolWorkspace kind="pdf-sort-pages" />;
}
