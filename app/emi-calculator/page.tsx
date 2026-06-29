"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type TenureMode = "years" | "months";

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function EmiCalculatorPage() {
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenure, setTenure] = useState("");
  const [tenureMode, setTenureMode] = useState<TenureMode>("years");

  const result = useMemo(() => {
    const principal = toNumber(loanAmount);
    const annualRate = toNumber(interestRate);
    const tenureValue = toNumber(tenure);
    const months = tenureMode === "years" ? tenureValue * 12 : tenureValue;
    const monthlyRate = annualRate / 12 / 100;

    if (principal <= 0 || months <= 0) {
      return {
        emi: 0,
        totalPayment: 0,
        totalInterest: 0,
        principal,
        months,
        monthlyRate,
        interestShare: 0,
        principalShare: 0,
      };
    }

    if (monthlyRate === 0) {
      const emi = principal / months;

      return {
        emi,
        totalPayment: principal,
        totalInterest: 0,
        principal,
        months,
        monthlyRate,
        interestShare: 0,
        principalShare: 100,
      };
    }

    const emi =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const totalPayment = emi * months;
    const totalInterest = totalPayment - principal;
    const interestShare = (totalInterest / totalPayment) * 100;
    const principalShare = (principal / totalPayment) * 100;

    return {
      emi,
      totalPayment,
      totalInterest,
      principal,
      months,
      monthlyRate,
      interestShare,
      principalShare,
    };
  }, [loanAmount, interestRate, tenure, tenureMode]);

  const resetCalculator = () => {
    setLoanAmount("");
    setInterestRate("");
    setTenure("");
    setTenureMode("years");
  };

  const setExample = (
    amount: string,
    rate: string,
    time: string,
    mode: TenureMode
  ) => {
    setLoanAmount(amount);
    setInterestRate(rate);
    setTenure(time);
    setTenureMode(mode);
  };

  const copyResult = async () => {
    const text = `EMI Calculator Result

Loan Amount: ${formatCurrency(result.principal)}
Interest Rate: ${formatNumber(toNumber(interestRate))}% per year
Tenure: ${formatNumber(result.months)} months

Monthly EMI: ${formatCurrency(result.emi)}
Total Interest: ${formatCurrency(result.totalInterest)}
Total Payment: ${formatCurrency(result.totalPayment)}

Principal Share: ${formatNumber(result.principalShare)}%
Interest Share: ${formatNumber(result.interestShare)}%`;

    try {
      await navigator.clipboard.writeText(text);
      alert("EMI result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const summaryCards = [
    {
      label: "Monthly EMI",
      value: formatCurrency(result.emi),
      icon: "📅",
    },
    {
      label: "Total Interest",
      value: formatCurrency(result.totalInterest),
      icon: "📈",
    },
    {
      label: "Total Payment",
      value: formatCurrency(result.totalPayment),
      icon: "💳",
    },
    {
      label: "Tenure",
      value: `${formatNumber(result.months)} months`,
      icon: "⏳",
    },
  ];

  const examples = [
    {
      title: "Home Loan",
      amount: "5000000",
      rate: "8.5",
      tenure: "20",
      mode: "years" as TenureMode,
    },
    {
      title: "Car Loan",
      amount: "800000",
      rate: "9.5",
      tenure: "5",
      mode: "years" as TenureMode,
    },
    {
      title: "Personal Loan",
      amount: "300000",
      rate: "12",
      tenure: "3",
      mode: "years" as TenureMode,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🏦 EMI Calculator"
          description="Calculate monthly EMI, total interest and total payment for home loans, car loans and personal loans."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Loan Amount
                </span>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(event) => setLoanAmount(event.target.value)}
                  placeholder="Example: 500000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Interest Rate % per year
                </span>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(event) => setInterestRate(event.target.value)}
                  placeholder="Example: 8.5"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">Tenure</span>
                <input
                  type="number"
                  value={tenure}
                  onChange={(event) => setTenure(event.target.value)}
                  placeholder={tenureMode === "years" ? "Example: 20" : "Example: 240"}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⏱️ Tenure Type
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setTenureMode("years")}
                  className={`rounded-xl border p-4 text-left transition ${
                    tenureMode === "years"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Years</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Use loan tenure in years.
                  </span>
                </button>

                <button
                  onClick={() => setTenureMode("months")}
                  className={`rounded-xl border p-4 text-left transition ${
                    tenureMode === "months"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  <span className="block font-bold">Months</span>
                  <span className="mt-1 block text-sm opacity-80">
                    Use loan tenure in months.
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                📊 Loan Breakdown
              </h2>

              <div className="space-y-3 text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Principal Amount</span>
                  <span className="font-bold text-white">
                    {formatCurrency(result.principal)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Total Interest</span>
                  <span className="font-bold text-yellow-400">
                    {formatCurrency(result.totalInterest)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Total Payment</span>
                  <span className="font-bold text-blue-400">
                    {formatCurrency(result.totalPayment)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Principal Share</span>
                  <span className="font-bold text-green-400">
                    {formatNumber(result.principalShare)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Interest Share</span>
                  <span className="font-bold text-red-400">
                    {formatNumber(result.interestShare)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {examples.map((item) => (
                  <button
                    key={item.title}
                    onClick={() =>
                      setExample(
                        item.amount,
                        item.rate,
                        item.tenure,
                        item.mode
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left text-slate-100 transition hover:border-blue-500"
                  >
                    <span className="block font-bold">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-400">
                      {formatCurrency(toNumber(item.amount))} at {item.rate}% for{" "}
                      {item.tenure} years
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              EMI results are estimates based on standard monthly reducing
              balance calculation. Actual EMI may vary depending on lender fees,
              processing charges, compounding rules and loan terms.
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