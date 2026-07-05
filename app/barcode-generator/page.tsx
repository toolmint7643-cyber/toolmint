"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type BarcodeFormat =
  | "CODE128"
  | "EAN13"
  | "UPC"
  | "ITF14"
  | "MSI"
  | "pharmacode";

const barcodeFormats = [
  {
    label: "CODE128",
    value: "CODE128",
    hint: "Best general-purpose barcode for text, numbers and IDs.",
    sample: "TOOLMINT12345",
  },
  {
    label: "EAN-13",
    value: "EAN13",
    hint: "13-digit retail product barcode.",
    sample: "5901234123457",
  },
  {
    label: "UPC",
    value: "UPC",
    hint: "12-digit product barcode used mainly in North America.",
    sample: "123456789999",
  },
  {
    label: "ITF-14",
    value: "ITF14",
    hint: "14-digit shipping and packaging barcode.",
    sample: "10012345000017",
  },
  {
    label: "MSI",
    value: "MSI",
    hint: "Numeric barcode often used for inventory labels.",
    sample: "1234567890",
  },
  {
    label: "Pharmacode",
    value: "pharmacode",
    hint: "Numeric pharmaceutical barcode.",
    sample: "12345",
  },
] as const;

function getFormatInfo(format: BarcodeFormat) {
  return barcodeFormats.find((item) => item.value === format) || barcodeFormats[0];
}

function validateValue(value: string, format: BarcodeFormat) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Please enter a barcode value.";
  }

  if (format === "EAN13" && !/^\d{12,13}$/.test(trimmed)) {
    return "EAN-13 needs 12 or 13 digits.";
  }

  if (format === "UPC" && !/^\d{11,12}$/.test(trimmed)) {
    return "UPC needs 11 or 12 digits.";
  }

  if (format === "ITF14" && !/^\d{14}$/.test(trimmed)) {
    return "ITF-14 needs exactly 14 digits.";
  }

  if ((format === "MSI" || format === "pharmacode") && !/^\d+$/.test(trimmed)) {
    return `${getFormatInfo(format).label} needs numbers only.`;
  }

  return "";
}

export default function BarcodeGeneratorPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [barcodeValue, setBarcodeValue] = useState("TOOLMINT12345");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [barWidth, setBarWidth] = useState("2");
  const [barHeight, setBarHeight] = useState("100");
  const [fontSize, setFontSize] = useState("18");
  const [margin, setMargin] = useState("12");
  const [displayValue, setDisplayValue] = useState(true);
  const [lineColor, setLineColor] = useState("#111827");
  const [background, setBackground] = useState("#ffffff");
  const [error, setError] = useState("");

  const currentFormat = getFormatInfo(format);

  const settingsSummary = useMemo(() => {
    return `${currentFormat.label} • ${barWidth}px width • ${barHeight}px height`;
  }, [currentFormat.label, barWidth, barHeight]);

  useEffect(() => {
    const validationError = validateValue(barcodeValue, format);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!svgRef.current) return;

    try {
      JsBarcode(svgRef.current, barcodeValue.trim(), {
        format,
        width: Number(barWidth) || 2,
        height: Number(barHeight) || 100,
        displayValue,
        fontSize: Number(fontSize) || 18,
        margin: Number(margin) || 12,
        lineColor,
        background,
      });

      setError("");
    } catch {
      setError("This barcode value is not valid for the selected format.");
    }
  }, [
    barcodeValue,
    format,
    barWidth,
    barHeight,
    displayValue,
    fontSize,
    margin,
    lineColor,
    background,
  ]);

  function loadSample() {
    setBarcodeValue(currentFormat.sample);
  }

  function resetTool() {
    setBarcodeValue("TOOLMINT12345");
    setFormat("CODE128");
    setBarWidth("2");
    setBarHeight("100");
    setFontSize("18");
    setMargin("12");
    setDisplayValue(true);
    setLineColor("#111827");
    setBackground("#ffffff");
    setError("");
  }

  async function copyValue() {
    if (!barcodeValue.trim()) {
      alert("Please enter a barcode value first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(barcodeValue.trim());
      alert("Barcode value copied successfully!");
    } catch {
      alert("Unable to copy value. Please try again.");
    }
  }

  async function copyResult() {
    if (error) {
      alert("Please fix the barcode error first.");
      return;
    }

    const text = `Barcode Generator Result

Value: ${barcodeValue.trim()}
Format: ${currentFormat.label}
Bar Width: ${barWidth}
Bar Height: ${barHeight}
Font Size: ${fontSize}
Display Value: ${displayValue ? "Yes" : "No"}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Barcode result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  }

  function getSvgText() {
    if (!svgRef.current) return "";

    return new XMLSerializer().serializeToString(svgRef.current);
  }

  function downloadSvg() {
    if (error) {
      alert("Please fix the barcode error first.");
      return;
    }

    const svgText = getSvgText();

    if (!svgText) {
      alert("Barcode is not ready yet.");
      return;
    }

    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `barcode-${format.toLowerCase()}.svg`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (error) {
      alert("Please fix the barcode error first.");
      return;
    }

    const svgText = getSvgText();

    if (!svgText) {
      alert("Barcode is not ready yet.");
      return;
    }

    const svgBlob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width || 800;
      canvas.height = image.height || 300;

      const context = canvas.getContext("2d");

      if (!context) {
        alert("Canvas is not supported in this browser.");
        URL.revokeObjectURL(svgUrl);
        return;
      }

      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Unable to create PNG.");
          URL.revokeObjectURL(svgUrl);
          return;
        }

        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = pngUrl;
        link.download = `barcode-${format.toLowerCase()}.png`;
        link.click();

        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      alert("Unable to create PNG. Please try SVG download.");
    };

    image.src = svgUrl;
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🏷️ Barcode Generator"
          description="Generate CODE128, EAN-13, UPC, ITF-14, MSI and Pharmacode barcodes online with SVG and PNG download."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      ✍️ Barcode Input
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Enter a value, choose barcode format and customize output.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    Live preview
                  </span>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Barcode value
                    </span>
                    <input
                      type="text"
                      value={barcodeValue}
                      onChange={(event) => setBarcodeValue(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      placeholder="Enter barcode value"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">Format</span>
                    <select
                      value={format}
                      onChange={(event) =>
                        setFormat(event.target.value as BarcodeFormat)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      {barcodeFormats.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs text-slate-500">
                      {currentFormat.hint}
                    </p>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Bar width
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={barWidth}
                        onChange={(event) => setBarWidth(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Bar height
                      </span>
                      <input
                        type="number"
                        min="40"
                        max="220"
                        value={barHeight}
                        onChange={(event) => setBarHeight(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Font size
                      </span>
                      <input
                        type="number"
                        min="10"
                        max="36"
                        value={fontSize}
                        onChange={(event) => setFontSize(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">Margin</span>
                      <input
                        type="number"
                        min="0"
                        max="40"
                        value={margin}
                        onChange={(event) => setMargin(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Line color
                      </span>
                      <input
                        type="color"
                        value={lineColor}
                        onChange={(event) => setLineColor(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Background
                      </span>
                      <input
                        type="color"
                        value={background}
                        onChange={(event) => setBackground(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                    <input
                      type="checkbox"
                      checked={displayValue}
                      onChange={(event) => setDisplayValue(event.target.checked)}
                      className="h-5 w-5"
                    />
                    Show barcode value below bars
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={copyValue}>📋 Copy Value</Button>

                    <button
                      type="button"
                      onClick={loadSample}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🧪 Load Sample
                    </button>

                    <button
                      type="button"
                      onClick={copyResult}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      📊 Copy Result
                    </button>

                    <button
                      type="button"
                      onClick={resetTool}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Barcode Preview
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    {settingsSummary}
                  </p>

                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-700 bg-white p-5">
                    <svg ref={svgRef} />
                  </div>
                </div>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadSvg}
                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                  >
                    ⬇️ Download SVG
                  </button>

                  <button
                    type="button"
                    onClick={downloadPng}
                    className="rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                  >
                    ⬇️ Download PNG
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                  Some barcode formats need exact numeric lengths. Use CODE128
                  for general text and IDs.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {barcodeFormats.slice(0, 3).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFormat(item.value);
                    setBarcodeValue(item.sample);
                  }}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-blue-500"
                >
                  <h3 className="text-xl font-bold text-white">{item.label}</h3>
                  <p className="mt-2 text-sm text-slate-400">{item.hint}</p>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-emerald-700 bg-emerald-950/30 p-5 text-sm text-emerald-100">
              🔒 Privacy note: Your barcode is generated inside your browser.
              This tool does not send your barcode value to a server.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Barcode Generator?
                </h2>
                <p className="text-slate-300">
                  A barcode generator creates scannable barcode images from text
                  or numbers. It is useful for inventory labels, product codes,
                  shipping, retail items and internal tracking.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Barcode Tips
                </h2>
                <p className="text-slate-300">
                  Use CODE128 for general use, EAN-13 and UPC for retail
                  products, ITF-14 for packaging and MSI for numeric inventory
                  labels.
                </p>
              </div>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}