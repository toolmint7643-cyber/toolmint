import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { getOgImageUrl, siteName, siteUrl } from "@/data/toolMetadata";

const GA_MEASUREMENT_ID = "G-VGQ8D60JG0";
const homeOgImage = getOgImageUrl("ToolMint", "Free Online Tools");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  openGraph: {
    title: "ToolMint | Free Online Tools",
    description:
      "Use ToolMint free online tools for PDFs, images, SEO, developers, calculators, text cleanup, colors and everyday productivity workflows.",
    url: "/",
    siteName,
    type: "website",
    images: [
      {
        url: homeOgImage,
        width: 1200,
        height: 630,
        alt: "ToolMint free online tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToolMint | Free Online Tools",
    description:
      "Free online tools for PDFs, images, SEO, developers, calculators, text cleanup, colors and productivity workflows.",
    images: [homeOgImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">
        {children}

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}