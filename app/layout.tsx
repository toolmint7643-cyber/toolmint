import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ToolMint | Free Online Tools",
    template: "%s | ToolMint",
  },
  description:
    "ToolMint offers free online tools for developers, SEO, PDFs, images, calculators, text cleanup, colors, and everyday productivity workflows.",
  keywords: [
    "free online tools",
    "developer tools",
    "PDF tools",
    "image tools",
    "calculator tools",
    "text tools",
    "browser-based tools",
    "ToolMint",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
