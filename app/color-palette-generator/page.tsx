"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type HarmonyMode = "random" | "analogous" | "complementary" | "triadic" | "monochrome";

type PaletteColor = {
  hex: string;
  locked: boolean;
};

const harmonyModes = [
  { label: "Random", value: "random" },
  { label: "Analogous", value: "analogous" },
  { label: "Complementary", value: "complementary" },
  { label: "Triadic", value: "triadic" },
  { label: "Monochrome", value: "monochrome" },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function randomHex() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

function normalizeHex(value: string) {
  const clean = value.trim().replace("#", "");

  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toUpperCase()}`;
  }

  return "";
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex) || "#000000";
  const clean = normalized.replace("#", "");

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${clamp(Math.round(r), 0, 255)
    .toString(16)
    .padStart(2, "0")}${clamp(Math.round(g), 0, 255)
    .toString(16)
    .padStart(2, "0")}${clamp(Math.round(b), 0, 255)
    .toString(16)
    .padStart(2, "0")}`.toUpperCase();
}

function rgbToHsl(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }

    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;

  if (s === 0) {
    const gray = l * 255;
    return rgbToHex(gray, gray, gray);
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  function hueToRgb(t: number) {
    let next = t;

    if (next < 0) next += 1;
    if (next > 1) next -= 1;
    if (next < 1 / 6) return p + (q - p) * 6 * next;
    if (next < 1 / 2) return q;
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;

    return p;
  }

  return rgbToHex(
    hueToRgb(h + 1 / 3) * 255,
    hueToRgb(h) * 255,
    hueToRgb(h - 1 / 3) * 255
  );
}

function createPalette(baseHex: string, mode: HarmonyMode) {
  if (mode === "random") {
    return Array.from({ length: 5 }, () => randomHex());
  }

  const base = rgbToHsl(baseHex);

  if (mode === "analogous") {
    return [-40, -20, 0, 20, 40].map((shift) =>
      hslToHex(base.h + shift, base.s, base.l)
    );
  }

  if (mode === "complementary") {
    return [
      hslToHex(base.h, base.s, clamp(base.l - 18, 10, 90)),
      hslToHex(base.h, base.s, base.l),
      hslToHex(base.h + 180, base.s, base.l),
      hslToHex(base.h + 180, base.s, clamp(base.l + 16, 10, 90)),
      hslToHex(base.h + 180, clamp(base.s - 20, 10, 100), clamp(base.l - 8, 10, 90)),
    ];
  }

  if (mode === "triadic") {
    return [
      hslToHex(base.h, base.s, base.l),
      hslToHex(base.h + 120, base.s, base.l),
      hslToHex(base.h + 240, base.s, base.l),
      hslToHex(base.h + 120, clamp(base.s - 15, 10, 100), clamp(base.l + 12, 10, 90)),
      hslToHex(base.h + 240, clamp(base.s - 15, 10, 100), clamp(base.l - 12, 10, 90)),
    ];
  }

  return [18, 32, 46, 60, 74].map((lightness) =>
    hslToHex(base.h, base.s, lightness)
  );
}

function getTextColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness >= 140 ? "#111827" : "#FFFFFF";
}

export default function ColorPaletteGeneratorPage() {
  const [baseColor, setBaseColor] = useState("#2563EB");
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>("analogous");
  const [palette, setPalette] = useState<PaletteColor[]>(
    createPalette("#2563EB", "analogous").map((hex) => ({
      hex,
      locked: false,
    }))
  );
  const [error, setError] = useState("");

  const paletteText = useMemo(() => {
    return palette.map((item) => item.hex).join("\n");
  }, [palette]);

  const cssVariables = useMemo(() => {
    return `:root {
${palette
  .map((item, index) => `  --color-${index + 1}: ${item.hex};`)
  .join("\n")}
}`;
  }, [palette]);

  function generatePalette() {
    const normalizedBase = normalizeHex(baseColor);

    if (!normalizedBase) {
      setError("Please enter a valid 6-digit HEX color like #2563EB.");
      return;
    }

    const generated = createPalette(normalizedBase, harmonyMode);

    setPalette((current) =>
      current.map((item, index) =>
        item.locked ? item : { ...item, hex: generated[index] || randomHex() }
      )
    );
    setError("");
  }

  function updateBaseColor(value: string) {
    const normalized = value.toUpperCase();
    setBaseColor(normalized);

    if (!normalizeHex(normalized)) {
      setError("Please enter a valid 6-digit HEX color like #2563EB.");
      return;
    }

    setError("");
  }

  function updatePaletteColor(index: number, value: string) {
    const normalized = normalizeHex(value);

    setPalette((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, hex: normalized || value.toUpperCase() }
          : item
      )
    );
  }

  function toggleLock(index: number) {
    setPalette((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, locked: !item.locked } : item
      )
    );
  }

  function randomizeAll() {
    setHarmonyMode("random");
    setPalette((current) =>
      current.map((item) =>
        item.locked ? item : { ...item, hex: randomHex() }
      )
    );
    setError("");
  }

  function resetTool() {
    setBaseColor("#2563EB");
    setHarmonyMode("analogous");
    setPalette(
      createPalette("#2563EB", "analogous").map((hex) => ({
        hex,
        locked: false,
      }))
    );
    setError("");
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied successfully!`);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🎨 Color Palette Generator"
          description="Generate random, analogous, complementary, triadic and monochrome color palettes with copy-ready HEX and CSS variables."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🎛️ Palette Controls
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose a base color and harmony mode to generate palettes.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    5 colors
                  </span>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Base color
                    </span>
                    <div className="grid grid-cols-[72px_1fr] gap-3">
                      <input
                        type="color"
                        value={normalizeHex(baseColor) || "#2563EB"}
                        onChange={(event) => updateBaseColor(event.target.value)}
                        className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={baseColor}
                        onChange={(event) => updateBaseColor(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Harmony mode
                    </span>
                    <select
                      value={harmonyMode}
                      onChange={(event) =>
                        setHarmonyMode(event.target.value as HarmonyMode)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      {harmonyModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {error ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                      ❌ {error}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={generatePalette}>⚡ Generate</Button>

                    <button
                      type="button"
                      onClick={randomizeAll}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🎲 Random
                    </button>

                    <button
                      type="button"
                      onClick={() => copyText(paletteText, "Palette")}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      📋 Copy HEX
                    </button>

                    <button
                      type="button"
                      onClick={() => copyText(cssVariables, "CSS variables")}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🎯 Copy CSS
                    </button>

                    <button
                      type="button"
                      onClick={resetTool}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300 sm:col-span-2"
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Palette Preview
                </h2>

                <div className="overflow-hidden rounded-2xl border border-slate-700">
                  {palette.map((item, index) => (
                    <div
                      key={`${item.hex}-${index}`}
                      className="flex min-h-[72px] items-center justify-between gap-4 p-4"
                      style={{
                        backgroundColor: normalizeHex(item.hex) || "#111827",
                        color: getTextColor(normalizeHex(item.hex) || "#111827"),
                      }}
                    >
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide">
                          Color {index + 1}
                        </p>
                        <p className="font-mono text-2xl font-extrabold">
                          {item.hex}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(item.hex, item.hex)}
                        className="rounded-xl border px-4 py-2 text-sm font-bold"
                        style={{
                          borderColor: getTextColor(normalizeHex(item.hex) || "#111827"),
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                🔒 Edit and Lock Colors
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {palette.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-700 bg-slate-800 p-4"
                  >
                    <div
                      className="mb-3 h-24 rounded-xl border border-slate-700"
                      style={{
                        backgroundColor: normalizeHex(item.hex) || "#111827",
                      }}
                    />

                    <input
                      type="text"
                      value={item.hex}
                      onChange={(event) =>
                        updatePaletteColor(index, event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-sm text-white outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      onClick={() => toggleLock(index)}
                      className={`mt-3 w-full rounded-xl border p-3 text-sm font-bold transition ${
                        item.locked
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-200"
                          : "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500"
                      }`}
                    >
                      {item.locked ? "🔒 Locked" : "🔓 Unlocked"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6">
              <h2 className="mb-3 text-2xl font-bold text-white">
                🎯 CSS Variables
              </h2>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-blue-200">
                {cssVariables}
              </pre>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Color Palette Generator?
                </h2>
                <p className="text-slate-300">
                  A color palette generator creates sets of matching colors for
                  websites, apps, branding, dashboards, illustrations and design
                  systems.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Palette Tips
                </h2>
                <p className="text-slate-300">
                  Use analogous palettes for soft harmony, complementary colors
                  for strong contrast, triadic palettes for vibrant designs and
                  monochrome palettes for clean UI systems.
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