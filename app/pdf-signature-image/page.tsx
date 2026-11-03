import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Add Signature Image to PDF - Sign PDF Pages | ToolMint",
  description: "Place a PNG or JPG signature image on selected PDF pages. Adjust position, size, opacity and rotation; this visual stamp is not a cryptographic digital signature.",
};

export default function PdfSignatureImagePage() {
  return <PdfToolWorkspace kind="pdf-signature-image" />;
}
