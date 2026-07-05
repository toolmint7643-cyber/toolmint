"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type TimeUnit = "years" | "months" | "days";

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

function getTimeInYears(time: number, unit: TimeUnit) {
  if (unit === "months") return time / 12;
  if (unit === "days") return time / 365;
  return time;
}

function calculateSimpleInterest(
  principal: number,
  rate: number,
  time: number,
  unit: TimeUnit
) {
  const years = getTimeInYears(time, unit);
  const interest = (principal * rate * years) / 100;
  const totalAmount = principal + interest;

  return {
    years,
    interest,
    totalAmount,
    monthlyInterest: years > 0 ? interest / (years * 12) : 0,
    yearlyInterest: years > 0 ? interest / years : 0,
  };
}

export default function SimpleInterestCalculatorPage() {
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("10");
  const [time, setTime] = useState("2");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("years");

  const result = useMemo(
    () =>
      calculateSimpleInterest(
        toNumber(principal),
        toNumber(rate),
        toNumber(time),
        timeUnit
      ),
    [principal, rate, time, timeUnit]
  );

  const copyResult = async () => {
    const text = `Simple Interest Calculator Result

Principal Amount: ${formatCurrency(toNumber(principal))}
Annual Interest Rate: ${formatNumber(toNumber(rate))}%
Time Period: ${time} ${timeUnit}
Time in Years: ${formatNumber(result.years)}
Simple Interest: ${formatCurrency(result.interest)}
Total Amount: ${formatCurrency(result.totalAmount)}
Formula: (Principal x Rate x Time) / 100`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Simple interest result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const resetCalculator = () => {
    setPrincipal("100000");
    setRate("10");
    setTime("2");
    setTimeUnit("years");
  };

  const quickExamples = [
    {
      label: "Savings Example",
      principal: "50000",
      rate: "6",
      time: "3",
      unit: "years" as TimeUnit,
    },
    {
      label: "Loan Example",
      principal: "100000",
      rate: "12",
      time: "2",
      unit: "years" as TimeUnit,
    },
    {
      label: "Short Term",
      principal: "25000",
      rate: "10",
      time: "6",
      unit: "months" as TimeUnit,
    },
    {
      label: "Daily Period",
      principal: "10000",
      rate: "8",
      time: "90",
      unit: "days" as TimeUnit,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="💸 Simple Interest Calculator"
          description="Calculate simple interest online using principal amount, annual interest rate and time period in years, months or days."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚙️ Interest Details
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="mb-2 block text-slate-300">
                        Time Period
                      </span>
                      <input
                        type="number"
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">Time Unit</span>
                      <select
                        value={timeUnit}
                        onChange={(event) =>
                          setTimeUnit(event.target.value as TimeUnit)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                        <option value="days">Days</option>
                      </select>
                    </label>
                  </div>
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
                  ✅ Simple Interest Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Simple Interest</p>

                  <div className="mt-3 text-5xl font-extrabold text-blue-300 break-words">
                    {formatCurrency(result.interest)}
                  </div>

                  <p className="mt-3 text-slate-300">
                    Formula: Principal x Rate x Time / 100
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.totalAmount)}
                    </div>
                    <div className="mt-1 text-slate-400">Total Amount</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatNumber(result.years)}
                    </div>
                    <div className="mt-1 text-slate-400">Time in Years</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.yearlyInterest)}
                    </div>
                    <div className="mt-1 text-slate-400">Yearly Interest</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.monthlyInterest)}
                    </div>
                    <div className="mt-1 text-slate-400">Monthly Interest</div>
                  </div>
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
                      setTime(example.time);
                      setTimeUnit(example.unit);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This simple interest calculator provides estimates only. Actual
              interest, fees and terms may vary by bank, lender or financial
              institution.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Simple Interest?
                </h2>
                <p className="text-slate-300">
                  Simple interest is calculated only on the original principal
                  amount. The formula is Principal x Rate x Time divided by 100.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool for savings, short-term loans, personal lending,
                  deposits, education examples and quick interest calculations.
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