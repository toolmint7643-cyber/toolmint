"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type GradientType = "linear" | "radial";

const presets = [
  { name: "Ocean", from: "#0EA5E9", to: "#2563EB", type: "linear" as GradientType, angle: 135 },
  { name: "Sunset", from: "#F97316", to: "#EC4899", type: "linear" as GradientType, angle: 120 },
  { name: "Forest", from: "#10B981", to: "#065F46", type: "linear" as GradientType, angle: 145 },
  { name: "Royal", from: "#8B5CF6", to: "#1D4ED8", type: "linear" as GradientType, angle: 135 },
  { name: "Fire", from: "#EF4444", to: "#F59E0B", type: "linear" as GradientType, angle: 90 },
  { name: "Aurora", from: "#22C55E", to: "#A855F7", type: "radial" as GradientType, angle: 135 },
];

function randomHex() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase()}`;
}

function isValidHex(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export default function GradientGeneratorPage() {
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [fromColor, setFromColor] = useState("#0EA5E9");
  const [toColor, setToColor] = useState("#2563EB");
  const [angle, setAngle] = useState(135);
  const [error, setError] = useState("");

  const cssGradient = useMemo(() => {
    if (gradientType === "radial") {
      return `radial-gradient(circle, ${fromColor}, ${toColor})`;
    }

    return `linear-gradient(${angle}deg, ${fromColor}, ${toColor})`;
  }, [gradientType, fromColor, toColor, angle]);

  const cssCode = `background: ${cssGradient};`;
  const tailwindStyle = `style={{ background: "${cssGradient}" }}`;

  function updateColor(type: "from" | "to", value: string) {
    const normalized = value.toUpperCase();

    if (type === "from") {
      setFromColor(normalized);
    } else {
      setToColor(normalized);
    }

    if (!isValidHex(normalized)) {
      setError("Please enter valid 6-digit HEX colors like #2563EB.");
      return;
    }

    setError("");
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setGradientType(preset.type);
    setFromColor(preset.from);
    setToColor(preset.to);
    setAngle(preset.angle);
    setError("");
  }

  function swapColors() {
    setFromColor(toColor);
    setToColor(fromColor);
  }

  function randomGradient() {
    setFromColor(randomHex());
    setToColor(randomHex());
    setAngle(Math.floor(Math.random() * 361));
    setGradientType(Math.random() > 0.25 ? "linear" : "radial");
    setError("");
  }

  function resetTool() {
    setGradientType("linear");
    setFromColor("#0EA5E9");
    setToColor("#2563EB");
    setAngle(135);
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
          title="🌈 Gradient Generator"
          description="Create CSS linear and radial gradients online with live preview, presets, random gradients and copy-ready CSS code."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      🎛️ Gradient Controls
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Pick colors, choose gradient type and copy CSS instantly.
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                    Live CSS
                  </span>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Gradient type
                    </span>
                    <select
                      value={gradientType}
                      onChange={(event) =>
                        setGradientType(event.target.value as GradientType)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      <option value="linear">Linear gradient</option>
                      <option value="radial">Radial gradient</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Start color
                      </span>
                      <div className="grid grid-cols-[64px_1fr] gap-3">
                        <input
                          type="color"
                          value={fromColor}
                          onChange={(event) =>
                            updateColor("from", event.target.value)
                          }
                          className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                        />
                        <input
                          type="text"
                          value={fromColor}
                          onChange={(event) =>
                            updateColor("from", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        End color
                      </span>
                      <div className="grid grid-cols-[64px_1fr] gap-3">
                        <input
                          type="color"
                          value={toColor}
                          onChange={(event) =>
                            updateColor("to", event.target.value)
                          }
                          className="h-14 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-1"
                        />
                        <input
                          type="text"
                          value={toColor}
                          onChange={(event) =>
                            updateColor("to", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </label>
                  </div>

                  {gradientType === "linear" ? (
                    <label className="block">
                      <span className="mb-2 flex items-center justify-between text-slate-300">
                        <span>Angle</span>
                        <strong className="text-blue-300">{angle}°</strong>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={angle}
                        onChange={(event) => setAngle(Number(event.target.value))}
                        className="w-full accent-blue-600"
                      />
                    </label>
                  ) : null}

                  {error ? (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                      ❌ {error}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button onClick={() => copyText(cssCode, "CSS")}>
                      📋 Copy CSS
                    </Button>

                    <button
                      type="button"
                      onClick={() => copyText(tailwindStyle, "React style")}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      ⚛️ Copy Style
                    </button>

                    <button
                      type="button"
                      onClick={swapColors}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🔁 Swap Colors
                    </button>

                    <button
                      type="button"
                      onClick={randomGradient}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      🎲 Random
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
                  ✅ Gradient Preview
                </h2>

                <div
                  className="flex min-h-[330px] items-end rounded-2xl border border-slate-700 p-6"
                  style={{ background: cssGradient }}
                >
                  <div className="rounded-2xl bg-black/35 p-5 text-white backdrop-blur">
                    <p className="text-sm font-semibold uppercase tracking-wide">
                      Preview
                    </p>
                    <h3 className="mt-2 text-4xl font-extrabold">
                      ToolMint Gradient
                    </h3>
                    <p className="mt-2 text-sm text-white/85">
                      Live CSS gradient preview for websites, apps and UI cards.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-blue-700 bg-blue-950/30 p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                    CSS output
                  </p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-blue-200">
                    {cssCode}
                  </pre>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ⚡ Gradient Presets
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presets.map((preset) => {
                  const background =
                    preset.type === "radial"
                      ? `radial-gradient(circle, ${preset.from}, ${preset.to})`
                      : `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`;

                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 text-left transition hover:border-blue-500"
                    >
                      <div className="h-28" style={{ background }} />
                      <div className="p-4">
                        <h3 className="font-bold text-white">{preset.name}</h3>
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {preset.from} → {preset.to}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Gradient Generator?
                </h2>
                <p className="text-slate-300">
                  A gradient generator creates CSS gradients from selected
                  colors. You can use gradients for hero sections, cards,
                  buttons, backgrounds and modern UI themes.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🚀 Gradient Tips
                </h2>
                <p className="text-slate-300">
                  Use linear gradients for directional backgrounds and radial
                  gradients for glowing effects. Keep contrast high when placing
                  text over gradients.
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