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

        <section className="mt-10 grid gap-6 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">Create and download a QR code</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Enter the exact text or URL you want a phone camera or QR reader
              to display, generate the preview, and download the PNG. A QR code
              stores the value you provide; this tool does not create a dynamic
              redirect, track scans or check whether a destination website will
              remain online. If the code points to a web page, test it with a
              second device before printing or sharing it widely.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Make printed codes easier to scan</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Keep strong contrast between the code and its background, leave
              clear space around the edges, and avoid shrinking the image until
              its modules blur. Print a test at the intended size and check it
              under the lighting and camera conditions your audience will use.
              A successful download only confirms that the image was generated;
              scanning tests confirm that the final printed or displayed code
              is readable.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
