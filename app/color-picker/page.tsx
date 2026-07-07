"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function componentToHex(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function normalizeHex(value: string) {
  const clean = value.trim().replace("#", "");

  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split("")
      .map((character) => character + character)
      .join("")}`.toUpperCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean}`.toUpperCase();
  }

  return "";
}

function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);

  if (!normalized) return null;

  const clean = normalized.replace("#", "");

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: RgbColor) {
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

function rgbToHsv({ r, g, b }: RgbColor) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  if (hue < 0) hue += 360;

  return {
    h: Math.round(hue),
    s: Math.round(max === 0 ? 0 : (delta / max) * 100),
    v: Math.round(max * 100),
  };
}

function rgbToCmyk({ r, g, b }: RgbColor) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;

  const black = 1 - Math.max(red, green, blue);

  if (black === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  return {
    c: Math.round(((1 - red - black) / (1 - black)) * 100),
    m: Math.round(((1 - green - black) / (1 - black)) * 100),
    y: Math.round(((1 - blue - black) / (1 - black)) * 100),
    k: Math.round(black * 100),
  };
}

function getContrastText({ r, g, b }: RgbColor) {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 140 ? "Dark text" : "Light text";
}

function getRandomHex() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

function shiftColor(rgb: RgbColor, amount: number) {
  return rgbToHex({
    r: clamp(rgb.r + amount, 0, 255),
    g: clamp(rgb.g + amount, 0, 255),
    b: clamp(rgb.b + amount, 0, 255),
  });
}

export default function ColorPickerPage() {
  const [hex, setHex] = useState("#2563EB");
  const [recentColors, setRecentColors] = useState<string[]>([
    "#2563EB",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
  ]);
  const [error, setError] = useState("");

  const rgb = useMemo(() => hexToRgb(hex) || { r: 37, g: 99, b: 235 }, [hex]);
  const normalizedHex = rgbToHex(rgb).toUpperCase();
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const cmyk = rgbToCmyk(rgb);

  const colorValues = {
    hex: normalizedHex,
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
  };

  const palette = [
    shiftColor(rgb, -60),
    shiftColor(rgb, -30),
    normalizedHex,
    shiftColor(rgb, 30),
    shiftColor(rgb, 60),
  ];

  function updateHex(value: string) {
    setHex(value);

    const normalized = normalizeHex(value);

    if (!normalized) {
      setError("Please enter a valid HEX color like #2563EB or #fff.");
      return;
    }

    setError("");
  }

  function applyColor(value: string) {
    const normalized = normalizeHex(value);

    if (!normalized) return;

    setHex(normalized);
    setError("");
    setRecentColors((current) => [
      normalized,
      ...current.filter((color) => color !== normalized),
    ].slice(0, 8));
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied successfully!`);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  }

  function randomColor() {
    applyColor(getRandomHex());
  }

  function resetTool() {
    setHex("#2563EB");
    setError("");
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🎨 Color Picker"
          description="Pick colors and convert HEX to RGB, HSL, HSV and CMYK online with copy-ready color values."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🎯 Pick Color
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose a color or enter HEX value manually.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    Live convert
                  </span>
                </div>

                <div
                  className="mb-5 h-44 rounded-2xl border border-slate-700"
                  style={{ backgroundColor: normalizedHex }}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[96px_1fr]">
                  <input
                    type="color"
                    value={normalizedHex}
                    onChange={(event) => applyColor(event.target.value)}
                    className="h-16 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                  />

                  <input
                    type="text"
                    value={hex}
                    onChange={(event) => updateHex(event.target.value)}
                    onBlur={() => {
                      const normalized = normalizeHex(hex);
                      if (normalized) applyColor(normalized);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                    placeholder="#2563EB"
                  />
                </div>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={() => copyText(normalizedHex, "HEX")}>
                    📋 Copy HEX
                  </Button>

                  <button
                    type="button"
                    onClick={randomColor}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🎲 Random Color
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `${colorValues.hex}\n${colorValues.rgb}\n${colorValues.hsl}\n${colorValues.hsv}\n${colorValues.cmyk}`,
                        "Color values"
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    📊 Copy All
                  </button>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                  >
                    🔄 Reset
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="mb-3 text-lg font-bold text-white">
                    🕘 Recent Colors
                  </h3>

                  <div className="flex flex-wrap gap-3">
                    {recentColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => applyColor(color)}
                        className="h-12 w-12 rounded-xl border border-slate-600"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Color Values
                </h2>

                <div className="space-y-3">
                  {[
                    ["HEX", colorValues.hex],
                    ["RGB", colorValues.rgb],
                    ["HSL", colorValues.hsl],
                    ["HSV", colorValues.hsv],
                    ["CMYK", colorValues.cmyk],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 sm:grid-cols-[80px_1fr_auto]"
                    >
                      <div className="font-bold text-blue-300">{label}</div>
                      <div className="break-words font-mono text-slate-100">
                        {value}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(value, label)}
                        className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    Contrast suggestion
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-blue-300">
                    {getContrastText(rgb)}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Suggested readable text color on this background.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                🌈 Quick Palette
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {palette.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyColor(color)}
                    className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 text-left transition hover:border-blue-500"
                  >
                    <div className="h-24" style={{ backgroundColor: color }} />
                    <div className="p-3 font-mono text-sm font-bold text-slate-200">
                      {color}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Color Picker?
                </h2>
                <p className="text-slate-300">
                  A color picker helps you select a color and convert it into
                  HEX, RGB, HSL, HSV and CMYK values for websites, apps, design
                  systems and graphics.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool for CSS colors, Tailwind design work, UI themes,
                  brand palettes, contrast checks, graphics and quick color
                  conversions.
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