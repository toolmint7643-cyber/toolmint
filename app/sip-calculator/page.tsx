"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

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

function calculateSip(monthlyInvestment: number, annualReturn: number, years: number) {
  const months = years * 12;
  const monthlyRate = annualReturn / 12 / 100;

  const maturityValue =
    monthlyRate === 0
      ? monthlyInvestment * months
      : monthlyInvestment *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
        (1 + monthlyRate);

  const investedAmount = monthlyInvestment * months;
  const estimatedReturns = maturityValue - investedAmount;

  const yearlyBreakdown = Array.from({ length: Math.max(years, 0) }, (_, index) => {
    const year = index + 1;
    const monthCount = year * 12;
    const value =
      monthlyRate === 0
        ? monthlyInvestment * monthCount
        : monthlyInvestment *
          ((Math.pow(1 + monthlyRate, monthCount) - 1) / monthlyRate) *
          (1 + monthlyRate);

    return {
      year,
      invested: monthlyInvestment * monthCount,
      value,
      returns: value - monthlyInvestment * monthCount,
    };
  });

  return {
    months,
    investedAmount,
    maturityValue,
    estimatedReturns,
    returnPercentage:
      investedAmount > 0 ? (estimatedReturns / investedAmount) * 100 : 0,
    yearlyBreakdown,
  };
}

export default function SipCalculatorPage() {
  const [monthlyInvestment, setMonthlyInvestment] = useState("5000");
  const [annualReturn, setAnnualReturn] = useState("12");
  const [years, setYears] = useState("10");

  const result = useMemo(
    () =>
      calculateSip(
        toNumber(monthlyInvestment),
        toNumber(annualReturn),
        toNumber(years)
      ),
    [monthlyInvestment, annualReturn, years]
  );

  const copyResult = async () => {
    const text = `SIP Calculator Result

Monthly Investment: ${formatCurrency(toNumber(monthlyInvestment))}
Expected Annual Return: ${formatNumber(toNumber(annualReturn))}%
Investment Duration: ${years} years
Total Invested: ${formatCurrency(result.investedAmount)}
Estimated Returns: ${formatCurrency(result.estimatedReturns)}
Maturity Value: ${formatCurrency(result.maturityValue)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("SIP result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const resetCalculator = () => {
    setMonthlyInvestment("5000");
    setAnnualReturn("12");
    setYears("10");
  };

  const quickExamples = [
    {
      label: "Starter SIP",
      amount: "2000",
      return: "10",
      years: "5",
    },
    {
      label: "Wealth SIP",
      amount: "5000",
      return: "12",
      years: "10",
    },
    {
      label: "Long Term",
      amount: "10000",
      return: "12",
      years: "20",
    },
    {
      label: "Aggressive",
      amount: "15000",
      return: "15",
      years: "15",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📊 SIP Calculator"
          description="Calculate SIP maturity value, total invested amount and estimated returns for monthly mutual fund investments."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚙️ SIP Details
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Monthly Investment
                    </span>
                    <input
                      type="number"
                      value={monthlyInvestment}
                      onChange={(event) => setMonthlyInvestment(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Expected Annual Return (%)
                    </span>
                    <input
                      type="number"
                      value={annualReturn}
                      onChange={(event) => setAnnualReturn(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Investment Duration (Years)
                    </span>
                    <input
                      type="number"
                      value={years}
                      onChange={(event) => setYears(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
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
                  ✅ SIP Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Maturity Value</p>

                  <div className="mt-3 text-5xl font-extrabold text-blue-300 break-words">
                    {formatCurrency(result.maturityValue)}
                  </div>

                  <p className="mt-3 text-slate-300">
                    After {years} years ({result.months} months)
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.investedAmount)}
                    </div>
                    <div className="mt-1 text-slate-400">Total Invested</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.estimatedReturns)}
                    </div>
                    <div className="mt-1 text-slate-400">Estimated Returns</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatNumber(result.returnPercentage)}%
                    </div>
                    <div className="mt-1 text-slate-400">Return on Investment</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {result.months}
                    </div>
                    <div className="mt-1 text-slate-400">Monthly SIPs</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick SIP Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => {
                      setMonthlyInvestment(example.amount);
                      setAnnualReturn(example.return);
                      setYears(example.years);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📅 Yearly Breakdown
              </h2>

              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="bg-slate-800 text-slate-300">
                    <tr>
                      <th className="p-4">Year</th>
                      <th className="p-4">Invested</th>
                      <th className="p-4">Returns</th>
                      <th className="p-4">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearlyBreakdown.map((row) => (
                      <tr
                        key={row.year}
                        className="border-t border-slate-700 bg-slate-900"
                      >
                        <td className="p-4 text-slate-300">{row.year}</td>
                        <td className="p-4 text-blue-400">
                          {formatCurrency(row.invested)}
                        </td>
                        <td className="p-4 text-green-400">
                          {formatCurrency(row.returns)}
                        </td>
                        <td className="p-4 font-bold text-blue-300">
                          {formatCurrency(row.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This SIP calculator provides estimates only. Mutual fund returns are
              market-linked and not guaranteed. Actual returns, taxes and fees may
              vary.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is SIP?
                </h2>
                <p className="text-slate-300">
                  SIP stands for Systematic Investment Plan. It lets you invest a
                  fixed amount regularly, usually every month, in mutual funds or
                  investment plans.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to estimate SIP maturity value, total invested
                  amount, expected returns and long-term wealth growth from
                  monthly investments.
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