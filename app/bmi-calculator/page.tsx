"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type UnitMode = "metric" | "imperial";
type WeightMode = "kg" | "pounds";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

function getBmiCategory(bmi: number) {
  if (bmi <= 0) {
    return {
      label: "Enter your details",
      color: "text-slate-300",
      border: "border-slate-700",
      bg: "bg-slate-900",
      message: "Your BMI result will appear here.",
    };
  }

  if (bmi < 18.5) {
    return {
      label: "Underweight",
      color: "text-yellow-300",
      border: "border-yellow-700",
      bg: "bg-yellow-950/30",
      message: "Your BMI is below the healthy range.",
    };
  }

  if (bmi < 25) {
    return {
      label: "Normal Weight",
      color: "text-green-300",
      border: "border-green-700",
      bg: "bg-green-950/30",
      message: "Your BMI is in the healthy range.",
    };
  }

  if (bmi < 30) {
    return {
      label: "Overweight",
      color: "text-orange-300",
      border: "border-orange-700",
      bg: "bg-orange-950/30",
      message: "Your BMI is above the healthy range.",
    };
  }

  return {
    label: "Obese",
    color: "text-red-300",
    border: "border-red-700",
    bg: "bg-red-950/30",
    message: "Your BMI is significantly above the healthy range.",
  };
}

function getWeightInKg(weight: string, weightMode: WeightMode) {
  return weightMode === "kg"
    ? toNumber(weight)
    : toNumber(weight) * 0.45359237;
}

export default function BmiCalculatorPage() {
  const [unitMode, setUnitMode] = useState<UnitMode>("metric");

  const [heightCm, setHeightCm] = useState("");
  const [feet, setFeet] = useState("");
  const [inches, setInches] = useState("");

  const [weight, setWeight] = useState("");
  const [weightMode, setWeightMode] = useState<WeightMode>("kg");

  const result = useMemo(() => {
    let heightMeters = 0;

    if (unitMode === "metric") {
      heightMeters = toNumber(heightCm) / 100;
    } else {
      const totalInches = toNumber(feet) * 12 + toNumber(inches);
      heightMeters = totalInches * 0.0254;
    }

    const weightInKg = getWeightInKg(weight, weightMode);

    const bmi =
      heightMeters > 0 && weightInKg > 0
        ? weightInKg / (heightMeters * heightMeters)
        : 0;

    const minHealthyWeight = 18.5 * heightMeters * heightMeters;
    const maxHealthyWeight = 24.9 * heightMeters * heightMeters;
    const idealWeight = 22 * heightMeters * heightMeters;

    return {
      bmi,
      weightInKg,
      heightMeters,
      minHealthyWeight,
      maxHealthyWeight,
      idealWeight,
      category: getBmiCategory(bmi),
    };
  }, [unitMode, heightCm, feet, inches, weight, weightMode]);

  const resetCalculator = () => {
    setUnitMode("metric");
    setHeightCm("");
    setFeet("");
    setInches("");
    setWeight("");
    setWeightMode("kg");
  };

  const copyResult = async () => {
    const text = `BMI Calculator Result

Unit Mode: ${unitMode === "metric" ? "Metric" : "Imperial"}
Weight Unit: ${weightMode === "kg" ? "Kilograms" : "Pounds"}

BMI: ${formatNumber(result.bmi)}
Category: ${result.category.label}
Weight Used: ${formatNumber(result.weightInKg)} kg
Healthy Weight Range: ${formatNumber(result.minHealthyWeight)} kg - ${formatNumber(
      result.maxHealthyWeight
    )} kg
Ideal Weight Estimate: ${formatNumber(result.idealWeight)} kg`;

    try {
      await navigator.clipboard.writeText(text);
      alert("BMI result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const summaryCards = [
    {
      label: "BMI Score",
      value: formatNumber(result.bmi),
      icon: "📊",
    },
    {
      label: "Category",
      value: result.category.label,
      icon: "🏷️",
    },
    {
      label: "Ideal Weight",
      value: `${formatNumber(result.idealWeight)} kg`,
      icon: "🎯",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="⚖️ BMI Calculator"
          description="Calculate your Body Mass Index with metric and imperial height, kg or pounds weight, healthy range and ideal weight estimate."
        />

        <ToolCard>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⚙️ Select Height Unit
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setUnitMode("metric")}
                  className={`rounded-xl border p-4 text-left transition ${
                    unitMode === "metric"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Metric Height</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Height in centimeters.
                  </span>
                </button>

                <button
                  onClick={() => setUnitMode("imperial")}
                  className={`rounded-xl border p-4 text-left transition ${
                    unitMode === "imperial"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Imperial Height</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Height in feet and inches.
                  </span>
                </button>
              </div>
            </div>

            {unitMode === "metric" ? (
              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Height in cm
                </span>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(event) => setHeightCm(event.target.value)}
                  placeholder="Example: 170"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-2 block text-slate-300">Feet</span>
                  <input
                    type="number"
                    value={feet}
                    onChange={(event) => setFeet(event.target.value)}
                    placeholder="Example: 5"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Inches</span>
                  <input
                    type="number"
                    value={inches}
                    onChange={(event) => setInches(event.target.value)}
                    placeholder="Example: 8"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⚖️ Select Weight Unit
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setWeightMode("kg")}
                  className={`rounded-xl border p-4 text-left transition ${
                    weightMode === "kg"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Kilograms</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Use kg as weight unit.
                  </span>
                </button>

                <button
                  onClick={() => setWeightMode("pounds")}
                  className={`rounded-xl border p-4 text-left transition ${
                    weightMode === "pounds"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Pounds</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Use pounds as weight unit.
                  </span>
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-slate-300">
                Weight in {weightMode === "kg" ? "kg" : "pounds"}
              </span>
              <input
                type="number"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                placeholder={weightMode === "kg" ? "Example: 65" : "Example: 150"}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
              />
            </label>

            <div
              className={`rounded-2xl border p-6 text-center ${result.category.border} ${result.category.bg}`}
            >
              <p className="text-slate-300">Your BMI</p>

              <div
                className={`mt-3 text-6xl font-extrabold ${result.category.color}`}
              >
                {formatNumber(result.bmi)}
              </div>

              <h2 className={`mt-4 text-2xl font-bold ${result.category.color}`}>
                {result.category.label}
              </h2>

              <p className="mt-3 text-slate-300">{result.category.message}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaryCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>

                  <div className="text-3xl font-extrabold text-blue-400 break-words">
                    {item.value}
                  </div>

                  <div className="mt-2 text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📌 Healthy Weight Range
              </h2>

              <p className="text-slate-300">
                For your height, the healthy BMI weight range is approximately:
              </p>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-5 text-center">
                <span className="text-3xl font-extrabold text-blue-400">
                  {formatNumber(result.minHealthyWeight)} kg -{" "}
                  {formatNumber(result.maxHealthyWeight)} kg
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📊 BMI Categories
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-yellow-100">
                  Underweight: Below 18.5
                </div>

                <div className="rounded-xl border border-green-700 bg-green-950/30 p-4 text-green-100">
                  Normal: 18.5 - 24.9
                </div>

                <div className="rounded-xl border border-orange-700 bg-orange-950/30 p-4 text-orange-100">
                  Overweight: 25 - 29.9
                </div>

                <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 text-red-100">
                  Obese: 30 or above
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              BMI is a general screening tool and does not directly measure body
              fat, muscle mass, or overall health. For medical advice, please
              consult a qualified healthcare professional.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={copyResult}>📋 Copy Result</Button>
              <Button onClick={resetCalculator}>🔄 Reset</Button>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}