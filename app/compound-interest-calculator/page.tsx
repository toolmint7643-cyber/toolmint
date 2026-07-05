"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Frequency = "yearly" | "half-yearly" | "quarterly" | "monthly" | "daily";

const frequencyMap: Record<Frequency, { label: string; value: number }> = {
  yearly: { label: "Yearly", value: 1 },
  "half-yearly": { label: "Half-Yearly", value: 2 },
  quarterly: { label: "Quarterly", value: 4 },
  monthly: { label: "Monthly", value: 12 },
  daily: { label: "Daily", value: 365 },
};

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value || 0);
}

function calculateCompoundInterest(
  principal: number,
  rate: number,
  years: number,
  frequency: Frequency
) {
  const n = frequencyMap[frequency].value;
  const maturityAmount = principal * Math.pow(1 + rate / 100 / n, n * years);
  const compoundInterest = maturityAmount - principal;
  const simpleInterest = (principal * rate * years) / 100;
  const extraEarned = compoundInterest - simpleInterest;

  return {
    n,
    maturityAmount,
    compoundInterest,
    simpleInterest,
    extraEarned,
    growthPercentage: principal > 0 ? (compoundInterest / principal) * 100 : 0,
  };
}

export default function CompoundInterestCalculatorPage() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("10");
  const [years, setYears] = useState("5");
  const [frequency, setFrequency] = useState<Frequency>("yearly");

  const result = useMemo(
    () =>
      calculateCompoundInterest(
        toNumber(principal),
        toNumber(rate),
        toNumber(years),
        frequency
      ),
    [principal, rate, years, frequency]
  );

  const copyResult = async () => {
    const text = `Compound Interest Calculator Result

Principal Amount: ${formatCurrency(toNumber(principal))}
Annual Interest Rate: ${formatNumber(toNumber(rate))}%
Time Period: ${years} years
Compounding Frequency: ${frequencyMap[frequency].label}
Maturity Amount: ${formatCurrency(result.maturityAmount)}
Compound Interest: ${formatCurrency(result.compoundInterest)}
Simple Interest Comparison: ${formatCurrency(result.simpleInterest)}
Extra Earned vs Simple Interest: ${formatCurrency(result.extraEarned)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Compound interest result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const resetCalculator = () => {
    setPrincipal("100000");
    setRate("10");
    setYears("5");
    setFrequency("yearly");
  };

  const quickExamples = [
    {
      label: "Savings",
      principal: "100000",
      rate: "8",
      years: "5",
      frequency: "yearly" as Frequency,
    },
    {
      label: "Monthly Compound",
      principal: "200000",
      rate: "10",
      years: "10",
      frequency: "monthly" as Frequency,
    },
    {
      label: "Long Term",
      principal: "500000",
      rate: "12",
      years: "15",
      frequency: "quarterly" as Frequency,
    },
    {
      label: "Daily Compound",
      principal: "50000",
      rate: "6",
      years: "3",
      frequency: "daily" as Frequency,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📈 Compound Interest Calculator"
          description="Calculate compound interest online, maturity amount, total interest and compare compound interest with simple interest instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚙️ Investment Details
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Principal Amount
                    </span>
                    <input
                      type="number"
                      value={principal}
                      onChange={(event) => setPrincipal(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Annual Interest Rate (%)
                    </span>
                    <input
                      type="number"
                      value={rate}
                      onChange={(event) => setRate(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Time Period (Years)
                    </span>
                    <input
                      type="number"
                      value={years}
                      onChange={(event) => setYears(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Compounding Frequency
                    </span>
                    <select
                      value={frequency}
                      onChange={(event) =>
                        setFrequency(event.target.value as Frequency)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    >
                      {Object.entries(frequencyMap).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={copyResult}>📋 Copy Result</Button>

                  <button
                    type="button"
                    onClick={resetCalculator}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Compound Interest Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Maturity Amount</p>

                  <div className="mt-3 text-5xl font-extrabold text-blue-300 break-words">
                    {formatCurrency(result.maturityAmount)}
                  </div>

                  <p className="mt-3 text-slate-300">
                    Compounded {frequencyMap[frequency].label.toLowerCase()}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.compoundInterest)}
                    </div>
                    <div className="mt-1 text-slate-400">Compound Interest</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.simpleInterest)}
                    </div>
                    <div className="mt-1 text-slate-400">Simple Interest</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.extraEarned)}
                    </div>
                    <div className="mt-1 text-slate-400">Extra Earned</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatNumber(result.growthPercentage)}%
                    </div>
                    <div className="mt-1 text-slate-400">Growth</div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-green-700 bg-green-950/30 p-4 text-center">
                  <p className="text-green-100">
                    Formula: A = P(1 + r/n)^(nt)
                  </p>
                  <p className="mt-2 text-green-300">
                    n = {result.n} compounding periods per year
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => {
                      setPrincipal(example.principal);
                      setRate(example.rate);
                      setYears(example.years);
                      setFrequency(example.frequency);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This compound interest calculator provides estimates only. Actual
              returns, bank interest, taxes, fees and investment performance may
              vary.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Compound Interest?
                </h2>
                <p className="text-slate-300">
                  Compound interest is interest earned on both the original
                  principal and previously earned interest. It helps money grow
                  faster over time compared to simple interest.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool for savings, deposits, investments, financial
                  planning, education examples and comparing simple interest with
                  compound interest.
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