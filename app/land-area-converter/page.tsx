"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RegionKey = "north_india" | "west_bengal" | "rajasthan";

type UnitKey =
  | "square_feet"
  | "square_meter"
  | "square_yard"
  | "acre"
  | "hectare"
  | "guntha"
  | "marla"
  | "kanal"
  | "bigha"
  | "biswa";

type Unit = {
  label: string;
  short: string;
  sqFeet: number;
};

const regionUnits: Record<
  RegionKey,
  { label: string; bigha: number; biswa: number }
> = {
  north_india: {
    label: "North India / Standard",
    bigha: 27225,
    biswa: 1361.25,
  },
  west_bengal: {
    label: "West Bengal",
    bigha: 14400,
    biswa: 720,
  },
  rajasthan: {
    label: "Rajasthan",
    bigha: 27225,
    biswa: 1361.25,
  },
};

const baseUnits: Record<Exclude<UnitKey, "bigha" | "biswa">, Unit> = {
  square_feet: { label: "Square Feet", short: "sq ft", sqFeet: 1 },
  square_meter: {
    label: "Square Meter",
    short: "sq m",
    sqFeet: 10.7639104167,
  },
  square_yard: { label: "Square Yard", short: "sq yd", sqFeet: 9 },
  acre: { label: "Acre", short: "acre", sqFeet: 43560 },
  hectare: { label: "Hectare", short: "ha", sqFeet: 107639.104167 },
  guntha: { label: "Guntha", short: "guntha", sqFeet: 1089 },
  marla: { label: "Marla", short: "marla", sqFeet: 272.25 },
  kanal: { label: "Kanal", short: "kanal", sqFeet: 5445 },
};

const quickExamples: Array<{ label: string; value: number; unit: UnitKey }> = [
  { label: "100 sq yd", value: 100, unit: "square_yard" },
  { label: "200 sq yd", value: 200, unit: "square_yard" },
  { label: "500 sq yd", value: 500, unit: "square_yard" },
  { label: "1 acre", value: 1, unit: "acre" },
  { label: "1 bigha", value: 1, unit: "bigha" },
  { label: "1 kanal", value: 1, unit: "kanal" },
];

function formatNumber(value: number, digits = 4) {
  if (!Number.isFinite(value)) return "0";

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: value >= 1000 ? 2 : digits,
  }).format(value);
}

export default function LandAreaConverterPage() {
  const [amount, setAmount] = useState("100");
  const [fromUnit, setFromUnit] = useState<UnitKey>("square_meter");
  const [toUnit, setToUnit] = useState<UnitKey>("square_yard");
  const [region, setRegion] = useState<RegionKey>("north_india");
  const [copied, setCopied] = useState(false);

  const units = useMemo<Record<UnitKey, Unit>>(() => {
    const selectedRegion = regionUnits[region];

    return {
      ...baseUnits,
      bigha: {
        label: `Bigha (${selectedRegion.label})`,
        short: "bigha",
        sqFeet: selectedRegion.bigha,
      },
      biswa: {
        label: `Biswa (${selectedRegion.label})`,
        short: "biswa",
        sqFeet: selectedRegion.biswa,
      },
    };
  }, [region]);

  const result = useMemo(() => {
    const numericAmount = Number(amount);
    const safeAmount =
      Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;

    const totalSqFeet = safeAmount * units[fromUnit].sqFeet;
    const converted = totalSqFeet / units[toUnit].sqFeet;
    const rate = units[fromUnit].sqFeet / units[toUnit].sqFeet;

    return {
      numericAmount: safeAmount,
      totalSqFeet,
      converted,
      rate,
      equivalents: [
        { label: "Square Feet", value: totalSqFeet, suffix: "sq ft", icon: "📏" },
        {
          label: "Square Meter",
          value: totalSqFeet / units.square_meter.sqFeet,
          suffix: "sq m",
          icon: "📐",
        },
        {
          label: "Square Yard",
          value: totalSqFeet / units.square_yard.sqFeet,
          suffix: "sq yd",
          icon: "🏡",
        },
        {
          label: "Acre",
          value: totalSqFeet / units.acre.sqFeet,
          suffix: "acre",
          icon: "🌾",
        },
        {
          label: "Hectare",
          value: totalSqFeet / units.hectare.sqFeet,
          suffix: "ha",
          icon: "🗺️",
        },
        {
          label: "Marla",
          value: totalSqFeet / units.marla.sqFeet,
          suffix: "marla",
          icon: "📍",
        },
      ],
    };
  }, [amount, fromUnit, toUnit, units]);

 const copyResult = async () => {
  const text = `Land Area Converter Result

Input: ${formatNumber(result.numericAmount)} ${units[fromUnit].label}
Result: ${formatNumber(result.converted)} ${units[toUnit].label}
Region: ${regionUnits[region].label}
Formula: ${formatNumber(result.numericAmount)} ${units[fromUnit].short} x ${formatNumber(
    result.rate
  )}`;

  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    alert("Land area result copied successfully!");
    setTimeout(() => setCopied(false), 1500);
  } catch {
    alert("Unable to copy result. Please try again.");
  }
};

  const resetConverter = () => {
    setAmount("100");
    setFromUnit("square_meter");
    setToUnit("square_yard");
    setRegion("north_india");
    setCopied(false);
  };

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🏡 Land Area Converter"
          description="Convert plot area between square feet, square meter, square yard, acre, hectare, guntha, marla, kanal, bigha and biswa."
        />

        <ToolCard>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                📐 Area Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-slate-300">Area value</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Example: 100"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Region</span>
                  <select
                    value={region}
                    onChange={(event) =>
                      setRegion(event.target.value as RegionKey)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    {Object.entries(regionUnits).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">From</span>
                  <select
                    value={fromUnit}
                    onChange={(event) =>
                      setFromUnit(event.target.value as UnitKey)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    {Object.entries(units).map(([key, unit]) => (
                      <option key={key} value={key}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">To</span>
                  <select
                    value={toUnit}
                    onChange={(event) =>
                      setToUnit(event.target.value as UnitKey)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    {Object.entries(units).map(([key, unit]) => (
                      <option key={key} value={key}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={swapUnits}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  ⇄ Swap
                </button>

                <Button onClick={copyResult}>
                  {copied ? "✅ Copied" : "📋 Copy Result"}
                </Button>

                <button
                  type="button"
                  onClick={resetConverter}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  🔄 Reset
                </button>
              </div>

              <div className="mt-8">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚡ Quick Plot Examples
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {quickExamples.map((example) => (
                    <button
                      key={example.label}
                      type="button"
                      onClick={() => {
                        setAmount(String(example.value));
                        setFromUnit(example.unit);
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-5 text-2xl font-bold text-white">
                ✅ Converted Result
              </h2>

              <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                <p className="text-slate-300">
                  {formatNumber(result.numericAmount)} {units[fromUnit].label}
                </p>

                <div className="mt-3 text-5xl font-extrabold text-blue-300 break-words">
                  {formatNumber(result.converted)} {units[toUnit].short}
                </div>

                <p className="mt-4 text-slate-300">
                  Formula: {formatNumber(result.numericAmount)}{" "}
                  {units[fromUnit].short} x {formatNumber(result.rate)}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="mb-4 text-xl font-bold text-white">
                  📊 Popular Equivalents
                </h3>

                <div className="space-y-3">
                  {result.equivalents.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-800 p-4"
                    >
                      <div className="flex items-center gap-3 text-slate-300">
                        <span className="text-2xl">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>

                      <span className="text-right font-bold text-blue-400">
                        {formatNumber(item.value)} {item.suffix}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-3 text-2xl font-bold text-white">
                📌 Common Land Area Conversions
              </h2>
              <p className="text-slate-300">
                Use this converter for square meter to square yard, square feet
                to acre, acre to hectare, marla to square feet and bigha to acre
                conversions.
              </p>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-6">
              <h2 className="mb-3 text-2xl font-bold text-yellow-100">
                ⚠️ Bigha and Biswa Note
              </h2>
              <p className="text-yellow-100">
                Bigha and biswa values change by region, so choose the closest
                region before converting local land units.
              </p>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}