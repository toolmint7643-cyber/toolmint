"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Mode =
  | "percentOf"
  | "whatPercent"
  | "change"
  | "addPercent"
  | "subtractPercent";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "0";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function PercentageCalculatorPage() {
  const [mode, setMode] = useState<Mode>("percentOf");
  const [firstValue, setFirstValue] = useState("");
  const [secondValue, setSecondValue] = useState("");

  const result = useMemo(() => {
    const first = toNumber(firstValue);
    const second = toNumber(secondValue);

    if (!firstValue || !secondValue) {
      return {
        title: "Result",
        value: "0",
        formula: "Enter values to calculate.",
        detail: "Your result will appear here instantly.",
        status: "",
      };
    }

    if (
      (mode === "whatPercent" || mode === "change") &&
      second === 0
    ) {
      return {
        title: "Invalid Input",
        value: "0",
        formula: "Division by zero is not possible.",
        detail: "Please enter a non-zero value in the second field.",
        status: "error",
      };
    }

    if (mode === "percentOf") {
      const value = (first / 100) * second;

      return {
        title: `${formatNumber(first)}% of ${formatNumber(second)}`,
        value: formatNumber(value),
        formula: `(${formatNumber(first)} / 100) × ${formatNumber(second)}`,
        detail: `${formatNumber(first)} percent of ${formatNumber(
          second
        )} is ${formatNumber(value)}.`,
        status: "success",
      };
    }

    if (mode === "whatPercent") {
      const value = (first / second) * 100;

      return {
        title: `${formatNumber(first)} is what percent of ${formatNumber(
          second
        )}?`,
        value: `${formatNumber(value)}%`,
        formula: `(${formatNumber(first)} / ${formatNumber(second)}) × 100`,
        detail: `${formatNumber(first)} is ${formatNumber(
          value
        )}% of ${formatNumber(second)}.`,
        status: "success",
      };
    }

    if (mode === "change") {
      const value = ((first - second) / second) * 100;
      const direction = value >= 0 ? "increase" : "decrease";

      return {
        title: `Percentage ${direction}`,
        value: `${formatNumber(Math.abs(value))}%`,
        formula: `((${formatNumber(first)} - ${formatNumber(
          second
        )}) / ${formatNumber(second)}) × 100`,
        detail: `The value changed from ${formatNumber(
          second
        )} to ${formatNumber(first)}, which is a ${formatNumber(
          Math.abs(value)
        )}% ${direction}.`,
        status: value >= 0 ? "increase" : "decrease",
      };
    }

    if (mode === "addPercent") {
      const added = first + (first * second) / 100;

      return {
        title: `Add ${formatNumber(second)}% to ${formatNumber(first)}`,
        value: formatNumber(added),
        formula: `${formatNumber(first)} + (${formatNumber(
          first
        )} × ${formatNumber(second)} / 100)`,
        detail: `After adding ${formatNumber(second)}%, the final value is ${formatNumber(
          added
        )}.`,
        status: "success",
      };
    }

    const subtracted = first - (first * second) / 100;

    return {
      title: `Subtract ${formatNumber(second)}% from ${formatNumber(first)}`,
      value: formatNumber(subtracted),
      formula: `${formatNumber(first)} - (${formatNumber(
        first
      )} × ${formatNumber(second)} / 100)`,
      detail: `After subtracting ${formatNumber(
        second
      )}%, the final value is ${formatNumber(subtracted)}.`,
      status: "success",
    };
  }, [firstValue, secondValue, mode]);

  const modeOptions = [
    {
      label: "X% of Y",
      value: "percentOf" as Mode,
      firstLabel: "Percentage",
      secondLabel: "Value",
      firstPlaceholder: "Example: 20",
      secondPlaceholder: "Example: 500",
      hint: "Find what X percent of Y equals.",
    },
    {
      label: "X is % of Y",
      value: "whatPercent" as Mode,
      firstLabel: "Part Value",
      secondLabel: "Total Value",
      firstPlaceholder: "Example: 50",
      secondPlaceholder: "Example: 200",
      hint: "Find what percentage X is of Y.",
    },
    {
      label: "Increase / Decrease",
      value: "change" as Mode,
      firstLabel: "New Value",
      secondLabel: "Old Value",
      firstPlaceholder: "Example: 120",
      secondPlaceholder: "Example: 100",
      hint: "Find percentage change between two values.",
    },
    {
      label: "Add %",
      value: "addPercent" as Mode,
      firstLabel: "Original Value",
      secondLabel: "Percentage to Add",
      firstPlaceholder: "Example: 1000",
      secondPlaceholder: "Example: 18",
      hint: "Add a percentage to a value.",
    },
    {
      label: "Subtract %",
      value: "subtractPercent" as Mode,
      firstLabel: "Original Value",
      secondLabel: "Percentage to Subtract",
      firstPlaceholder: "Example: 1000",
      secondPlaceholder: "Example: 10",
      hint: "Subtract a percentage from a value.",
    },
  ];

  const selectedMode = modeOptions.find((item) => item.value === mode)!;

  const resetCalculator = () => {
    setFirstValue("");
    setSecondValue("");
  };

  const copyResult = async () => {
    const text = `${result.title}
Result: ${result.value}
Formula: ${result.formula}
${result.detail}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧮 Percentage Calculator"
          description="Calculate percentages, percentage change, discounts, increases and decreases instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⚙️ Select Calculation Type
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {modeOptions.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setMode(item.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      mode === item.value
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                    }`}
                  >
                    <span className="block font-bold">{item.label}</span>
                    <span className="mt-1 block text-sm opacity-80">
                      {item.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-slate-300">
                  {selectedMode.firstLabel}
                </span>
                <input
                  type="number"
                  value={firstValue}
                  onChange={(event) => setFirstValue(event.target.value)}
                  placeholder={selectedMode.firstPlaceholder}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  {selectedMode.secondLabel}
                </span>
                <input
                  type="number"
                  value={secondValue}
                  onChange={(event) => setSecondValue(event.target.value)}
                  placeholder={selectedMode.secondPlaceholder}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div
              className={`rounded-2xl border p-6 text-center ${
                result.status === "error"
                  ? "border-red-700 bg-red-950/40"
                  : result.status === "increase"
                  ? "border-green-700 bg-green-950/30"
                  : result.status === "decrease"
                  ? "border-yellow-700 bg-yellow-950/30"
                  : "border-blue-700 bg-slate-900"
              }`}
            >
              <p className="text-slate-400">{result.title}</p>

              <div className="mt-3 text-5xl font-extrabold text-blue-400">
                {result.value}
              </div>

              <p className="mt-4 text-slate-300">{result.detail}</p>

              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                Formula: {result.formula}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button onClick={copyResult}>📋 Copy Result</Button>
              <Button onClick={resetCalculator}>🔄 Reset</Button>
            </div>

           <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
  <h2 className="mb-4 text-2xl font-bold text-white">
    💡 Common Uses
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
      🛒 Calculate discounts while shopping.
    </p>

    <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
      📈 Find profit, loss and percentage growth.
    </p>

    <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
      🧾 Add GST, tax or service charges.
    </p>

    <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
      📉 Compare old and new prices quickly.
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