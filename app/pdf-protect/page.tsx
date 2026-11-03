import type { Metadata } from "next";
import PdfToolWorkspace from "@/components/pdf-tools/PdfToolWorkspace";

export const metadata: Metadata = {
  title: "Password Protect PDF - Add Real PDF Encryption | ToolMint",
  description: "Encrypt and password-protect a PDF in your browser using QPDF WebAssembly. Choose AES-128 or AES-256 and optional reader permissions; files are not uploaded.",
};

export default function PdfProtectPage() {
  return <PdfToolWorkspace kind="pdf-protect" />;
}
