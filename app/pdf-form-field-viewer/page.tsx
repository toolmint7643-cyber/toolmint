import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "PDF Form Field Viewer - Inspect PDF AcroForms | ToolMint",
  description: "View supported PDF AcroForm field names, types, values, required status and read-only status. Export a CSV report with local browser processing.",
};

export default function PdfFormFieldViewerPage() {
  return <PdfToolWorkspace kind="pdf-form-viewer" />;
}
