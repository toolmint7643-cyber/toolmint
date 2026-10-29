"use client";

import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import TextArea from "@/components/TextArea";

export default function QRGeneratorPage() {
  const [text, setText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  const generateQR = () => {
    const value = text.trim();
    if (!value) {
      alert("Enter text or a URL to generate a QR code.");
      return;
    }

    setGeneratedText(value);
  };

  const clearAll = () => {
    setText("");
    setGeneratedText("");
  };

  const downloadQR = async () => {
    if (!qrRef.current) {
      alert("Generate a QR code before downloading.");
      return;
    }

    try {
      const dataUrl = await toPng(qrRef.current);

      const link = document.createElement("a");
      link.download = "toolmint-qr.png";
      link.href = dataUrl;
      link.click();
    } catch {
      alert("Unable to download this QR code. Please try again.");
    }
  };
  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="QR Code Generator"
          description="Create a QR code from text or a URL, preview it, and download it as a PNG in your browser."
        />
<ToolCard>
  <div className="space-y-6">

    <TextArea
  value={text}
  onChange={(e) => {
    setText(e.target.value);
    setGeneratedText("");
  }}
  placeholder="https://example.com"
/>

    <Button onClick={generateQR}>
  Generate QR Code
</Button>

<Button
  onClick={clearAll}
  variant="danger"
>
  Clear
</Button>

<Button
  onClick={downloadQR}
  variant="success"
>
  Download QR
</Button>

{generatedText && (
 <div
  ref={qrRef}
  className="flex justify-center mt-8 bg-white p-6 rounded-xl"
>
    <QRCode
      value={generatedText}
      size={220}
    />
  </div>
)}
  </div>
</ToolCard>
      </main>

      <Footer />
    </>
  );
}
