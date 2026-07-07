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

function getRelativeLuminance({ r, g, b }: RgbColor) {
  const values = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function getContrastRatio(foreground: RgbColor, background: RgbColor) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getStatus(passed: boolean) {
  return passed ? "Pass" : "Fail";
}

function getRandomHex() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

function createAccessiblePair() {
  const pairs = [
    { foreground: "#FFFFFF", background: "#111827" },
    { foreground: "#111827", background: "#F8FAFC" },
    { foreground: "#FDE68A", background: "#78350F" },
    { foreground: "#DBEAFE", background: "#1E3A8A" },
    { foreground: "#ECFDF5", background: "#065F46" },
  ];

  return pairs[Math.floor(Math.random() * pairs.length)];
}

export default function ContrastCheckerPage() {
  const [foregroundHex, setForegroundHex] = useState("#FFFFFF");
  const [backgroundHex, setBackgroundHex] = useState("#111827");
  const [error, setError] = useState("");

  const foregroundRgb = useMemo(
    () => hexToRgb(foregroundHex) || { r: 255, g: 255, b: 255 },
    [foregroundHex]
  );

  const backgroundRgb = useMemo(
    () => hexToRgb(backgroundHex) || { r: 17, g: 24, b: 39 },
    [backgroundHex]
  );

  const foregroundNormalized = normalizeHex(foregroundHex) || "#FFFFFF";
  const backgroundNormalized = normalizeHex(backgroundHex) || "#111827";
  const contrastRatio = getContrastRatio(foregroundRgb, backgroundRgb);
  const ratioText = `${contrastRatio.toFixed(2)}:1`;

  const checks = [
    {
      label: "AA Normal Text",
      requirement: "4.5:1",
      passed: contrastRatio >= 4.5,
    },
    {
      label: "AA Large Text",
      requirement: "3:1",
      passed: contrastRatio >= 3,
    },
    {
      label: "AAA Normal Text",
      requirement: "7:1",
      passed: contrastRatio >= 7,
    },
    {
      label: "AAA Large Text",
      requirement: "4.5:1",
      passed: contrastRatio >= 4.5,
    },
  ];

  const overallStatus =
    contrastRatio >= 7
      ? "Excellent"
      : contrastRatio >= 4.5
      ? "Good"
      : contrastRatio >= 3
      ? "Large text only"
      : "Needs improvement";

  function updateColor(type: "foreground" | "background", value: string) {
    if (type === "foreground") {
      setForegroundHex(value);
    } else {
      setBackgroundHex(value);
    }

    const normalized = normalizeHex(value);

    if (!normalized) {
      setError("Please enter valid HEX colors like #FFFFFF or #111827.");
      return;
    }

    setError("");
  }

  function applyColor(type: "foreground" | "background", value: string) {
    const normalized = normalizeHex(value);

    if (!normalized) return;

    if (type === "foreground") {
      setForegroundHex(normalized);
    } else {
      setBackgroundHex(normalized);
    }

    setError("");
  }

  function swapColors() {
    setForegroundHex(backgroundNormalized);
    setBackgroundHex(foregroundNormalized);
    setError("");
  }

  function randomPair() {
    const pair = createAccessiblePair();
    setForegroundHex(pair.foreground);
    setBackgroundHex(pair.background);
    setError("");
  }

  function randomColors() {
    setForegroundHex(getRandomHex());
    setBackgroundHex(getRandomHex());
    setError("");
  }

  function resetTool() {
    setForegroundHex("#FFFFFF");
    setBackgroundHex("#111827");
    setError("");
  }

  async function copyReport() {
    const report = `Contrast Checker Result

Foreground: ${foregroundNormalized}
Background: ${backgroundNormalized}
Contrast Ratio: ${ratioText}
Overall Status: ${overallStatus}

AA Normal Text: ${getStatus(checks[0].passed)} (${checks[0].requirement})
AA Large Text: ${getStatus(checks[1].passed)} (${checks[1].requirement})
AAA Normal Text: ${getStatus(checks[2].passed)} (${checks[2].requirement})
AAA Large Text: ${getStatus(checks[3].passed)} (${checks[3].requirement})`;

    try {
      await navigator.clipboard.writeText(report);
      alert("Contrast report copied successfully!");
    } catch {
      alert("Unable to copy report. Please try again.");
    }
  }

  return (
    <>
      <Header />

      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="♿ Contrast Checker"
          description="Check color contrast ratio for foreground and background colors using WCAG AA and AAA accessibility standards."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🎨 Colors
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose foreground and background colors to test contrast.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    WCAG check
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-slate-300">
                      Foreground color
                    </label>
                    <div className="grid grid-cols-[72px_1fr] gap-3">
                      <input
                        type="color"
                        value={foregroundNormalized}
                        onChange={(event) =>
                          applyColor("foreground", event.target.value)
                        }
                        className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={foregroundHex}
                        onChange={(event) =>
                          updateColor("foreground", event.target.value)
                        }
                        onBlur={() =>
                          applyColor("foreground", foregroundHex)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-slate-300">
                      Background color
                    </label>
                    <div className="grid grid-cols-[72px_1fr] gap-3">
                      <input
                        type="color"
                        value={backgroundNormalized}
                        onChange={(event) =>
                          applyColor("background", event.target.value)
                        }
                        className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                      />
                      <input
                        type="text"
                        value={backgroundHex}
                        onChange={(event) =>
                          updateColor("background", event.target.value)
                        }
                        onBlur={() =>
                          applyColor("background", backgroundHex)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {error ? (
                  <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    ❌ {error}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Button onClick={swapColors}>🔁 Swap Colors</Button>

                  <button
                    type="button"
                    onClick={randomPair}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    ✅ Accessible Pair
                  </button>

                  <button
                    type="button"
                    onClick={randomColors}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🎲 Random Colors
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

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-5 text-2xl font-bold text-white">
                  ✅ Contrast Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-5 text-center">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    Contrast ratio
                  </p>
                  <p className="mt-3 text-6xl font-extrabold text-blue-300">
                    {ratioText}
                  </p>
                  <p className="mt-3 text-lg font-bold text-slate-200">
                    {overallStatus}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {checks.map((check) => (
                    <div
                      key={check.label}
                      className={`rounded-xl border p-4 text-center ${
                        check.passed
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-red-500/50 bg-red-500/10"
                      }`}
                    >
                      <div
                        className={`text-2xl font-extrabold ${
                          check.passed ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {getStatus(check.passed)}
                      </div>
                      <div className="mt-1 font-bold text-white">
                        {check.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        Required {check.requirement}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={copyReport}
                  className="mt-5 w-full rounded-xl bg-blue-600 p-4 font-bold text-white transition hover:bg-blue-500"
                >
                  📋 Copy Report
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl border border-slate-700 p-8"
              style={{
                color: foregroundNormalized,
                backgroundColor: backgroundNormalized,
              }}
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                Preview
              </p>
              <h2 className="mt-3 text-4xl font-extrabold">
                The quick brown fox jumps over the lazy dog.
              </h2>
              <p className="mt-4 text-lg">
                This preview shows how normal text, large text and paragraph
                text look with your selected foreground and background colors.
              </p>
              <button
                type="button"
                className="mt-5 rounded-xl border px-5 py-3 font-bold"
                style={{ borderColor: foregroundNormalized }}
              >
                Sample Button
              </button>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              WCAG contrast checks help improve readability and accessibility.
              Normal text usually needs 4.5:1 for AA and 7:1 for AAA.
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Contrast Checker?
                </h2>
                <p className="text-slate-300">
                  A contrast checker compares text and background colors to make
                  sure content is readable and accessible. It is useful for web
                  design, app interfaces and brand color testing.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 WCAG Guidelines
                </h2>
                <p className="text-slate-300">
                  WCAG AA normal text needs at least 4.5:1 contrast. Large text
                  needs 3:1. AAA requires stronger contrast for better
                  accessibility.
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