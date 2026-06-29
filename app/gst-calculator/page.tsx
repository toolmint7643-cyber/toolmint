"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type GstMode = "exclusive" | "inclusive";

const gstRates = [0, 3, 5, 12, 18, 28];

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function GstCalculatorPage() {
  const [mode, setMode] = useState<GstMode>("exclusive");
  const [amount, setAmount] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [customRate, setCustomRate] = useState("");

  const selectedRate = customRate ? toNumber(customRate) : toNumber(gstRate);

  const result = useMemo(() => {
    const value = toNumber(amount);
    const rate = selectedRate;

    if (!amount || value < 0 || rate < 0) {
      return {
        baseAmount: 0,
        gstAmount: 0,
        totalAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        rate,
      };
    }

    if (mode === "exclusive") {
      const gstAmount = (value * rate) / 100;
      const totalAmount = value + gstAmount;

      return {
        baseAmount: value,
        gstAmount,
        totalAmount,
        cgst: gstAmount / 2,
        sgst: gstAmount / 2,
        igst: gstAmount,
        rate,
      };
    }

    const baseAmount = value / (1 + rate / 100);
    const gstAmount = value - baseAmount;

    return {
      baseAmount,
      gstAmount,
      totalAmount: value,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: gstAmount,
      rate,
    };
  }, [amount, selectedRate, mode]);

  const resetCalculator = () => {
    setMode("exclusive");
    setAmount("");
    setGstRate("18");
    setCustomRate("");
  };

  const copyResult = async () => {
    const text = `GST Calculator Result

Mode: ${mode === "exclusive" ? "Exclusive GST" : "Inclusive GST"}
GST Rate: ${formatNumber(result.rate)}%

Base Amount: ${formatCurrency(result.baseAmount)}
GST Amount: ${formatCurrency(result.gstAmount)}
Total Amount: ${formatCurrency(result.totalAmount)}

CGST: ${formatCurrency(result.cgst)}
SGST: ${formatCurrency(result.sgst)}
IGST: ${formatCurrency(result.igst)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("GST result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const summaryCards = [
    {
      label: "Base Amount",
      value: formatCurrency(result.baseAmount),
      icon: "💰",
    },
    {
      label: "GST Amount",
      value: formatCurrency(result.gstAmount),
      icon: "🧾",
    },
    {
      label: "Total Amount",
      value: formatCurrency(result.totalAmount),
      icon: "✅",
    },
  ];

  const splitCards = [
    {
      label: "CGST",
      value: formatCurrency(result.cgst),
      note: "Central GST",
    },
    {
      label: "SGST",
      value: formatCurrency(result.sgst),
      note: "State GST",
    },
    {
      label: "IGST",
      value: formatCurrency(result.igst),
      note: "Integrated GST",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🧾 GST Calculator"
          description="Calculate GST inclusive and exclusive amounts with CGST, SGST and IGST split instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⚙️ Select GST Calculation Type
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode("exclusive")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "exclusive"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Exclusive GST</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Add GST to base amount.
                  </span>
                </button>

                <button
                  onClick={() => setMode("inclusive")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "inclusive"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Inclusive GST</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Extract GST from total amount.
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-slate-300">
                  {mode === "exclusive"
                    ? "Base Amount"
                    : "GST Inclusive Amount"}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={
                    mode === "exclusive"
                      ? "Example: 1000"
                      : "Example: 1180"
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Custom GST Rate %
                </span>
                <input
                  type="number"
                  value={customRate}
                  onChange={(event) => setCustomRate(event.target.value)}
                  placeholder="Optional custom rate"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">
                📌 Common GST Rates
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {gstRates.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setGstRate(rate.toString());
                      setCustomRate("");
                    }}
                    className={`rounded-xl border p-4 text-center font-bold transition ${
                      !customRate && gstRate === rate.toString()
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaryCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>

                  <div className="text-3xl font-extrabold text-blue-400">
                    {item.value}
                  </div>

                  <div className="mt-2 text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📊 GST Split
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {splitCards.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-center"
                  >
                    <div className="text-2xl font-extrabold text-blue-400">
                      {item.value}
                    </div>

                    <div className="mt-2 font-bold text-white">
                      {item.label}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {item.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                💡 Common GST Rates in India
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  0% GST: Essential goods and exempt items.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  5% GST: Basic household items and transport services.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  12% GST: Processed foods and selected goods.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  18% GST: Most services, electronics and standard goods.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  28% GST: Luxury goods and selected premium items.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  Custom rate: Useful for special invoices or calculations.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This GST calculator is for quick estimation only. For official tax
              filing or business compliance, please verify rates with a tax
              professional or official GST sources.
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