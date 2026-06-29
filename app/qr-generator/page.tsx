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
const qrRef = useRef<HTMLDivElement>(null);
const clearAll = () => {
  setText("");
};
const downloadQR = async () => {
  if (!qrRef.current) return;

  try {
    const dataUrl = await toPng(qrRef.current);

    const link = document.createElement("a");
    link.download = "toolmint-qr.png";
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error(err);
  }
};
  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="QR Code Generator"
          description="Generate QR Codes instantly from any text or URL."
        />
<ToolCard>
  <div className="space-y-6">

    <TextArea
  value={text}
  onChange={(e) => setText(e.target.value)}
  placeholder="https://example.com"
/>

    <Button onClick={() => {}}>
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

{text.trim() && (
 <div
  ref={qrRef}
  className="flex justify-center mt-8 bg-white p-6 rounded-xl"
>
    <QRCode
      value={text}
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