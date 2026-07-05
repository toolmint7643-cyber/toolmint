"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type TermMode = "years" | "months";

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

function calculateLoan(
  amount: number,
  annualRate: number,
  term: number,
  termMode: TermMode,
  extraPayment: number
) {
  const months = termMode === "years" ? term * 12 : term;
  const monthlyRate = annualRate / 12 / 100;

  if (amount <= 0 || months <= 0) {
    return {
      months,
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      interestShare: 0,
      principalShare: 100,
      payoffMonths: 0,
      payoffSavings: 0,
    };
  }

  const monthlyPayment =
    monthlyRate === 0
      ? amount / months
      : (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - amount;

  let payoffMonths = months;
  let payoffSavings = 0;

  if (extraPayment > 0) {
    let balance = amount;
    let paidInterest = 0;
    let count = 0;

    while (balance > 0 && count < months * 2) {
      const interest = balance * monthlyRate;
      const principal = Math.min(monthlyPayment + extraPayment - interest, balance);

      if (principal <= 0) break;

      paidInterest += interest;
      balance -= principal;
      count += 1;
    }

    payoffMonths = count;
    payoffSavings = Math.max(totalInterest - paidInterest, 0);
  }

  return {
    months,
    monthlyPayment,
    totalPayment,
    totalInterest,
    interestShare: totalPayment ? (totalInterest / totalPayment) * 100 : 0,
    principalShare: totalPayment ? (amount / totalPayment) * 100 : 100,
    payoffMonths,
    payoffSavings,
  };
}

export default function LoanCalculatorPage() {
  const [amount, setAmount] = useState("500000");
  const [rate, setRate] = useState("10");
  const [term, setTerm] = useState("5");
  const [termMode, setTermMode] = useState<TermMode>("years");
  const [extraPayment, setExtraPayment] = useState("0");

  const result = useMemo(
    () =>
      calculateLoan(
        toNumber(amount),
        toNumber(rate),
        toNumber(term),
        termMode,
        toNumber(extraPayment)
      ),
    [amount, rate, term, termMode, extraPayment]
  );

  const copyResult = async () => {
    const text = `Loan Calculator Result

Loan Amount: ${formatCurrency(toNumber(amount))}
Interest Rate: ${formatNumber(toNumber(rate))}% per year
Loan Term: ${term} ${termMode}
Monthly Payment: ${formatCurrency(result.monthlyPayment)}
Total Interest: ${formatCurrency(result.totalInterest)}
Total Payment: ${formatCurrency(result.totalPayment)}
Extra Monthly Payment: ${formatCurrency(toNumber(extraPayment))}
Estimated Payoff Time: ${result.payoffMonths} months
Interest Savings: ${formatCurrency(result.payoffSavings)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Loan result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const resetCalculator = () => {
    setAmount("500000");
    setRate("10");
    setTerm("5");
    setTermMode("years");
    setExtraPayment("0");
  };

  const quickExamples = [
    {
      label: "Personal Loan",
      amount: "300000",
      rate: "12",
      term: "3",
      mode: "years" as TermMode,
    },
    {
      label: "Home Loan",
      amount: "5000000",
      rate: "8.5",
      term: "20",
      mode: "years" as TermMode,
    },
    {
      label: "Car Loan",
      amount: "800000",
      rate: "9",
      term: "5",
      mode: "years" as TermMode,
    },
    {
      label: "Short Loan",
      amount: "100000",
      rate: "15",
      term: "12",
      mode: "months" as TermMode,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="💰 Loan Calculator"
          description="Calculate loan monthly payment, total interest, total payment and payoff estimate with extra monthly payment options."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ⚙️ Loan Details
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">Loan Amount</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
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
                      <span className="mb-2 block text-slate-300">Loan Term</span>
                      <input
                        type="number"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-slate-300">Term Mode</span>
                      <select
                        value={termMode}
                        onChange={(event) => setTermMode(event.target.value as TermMode)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                      >
                        <option value="years">Years</option>
                        <option value="months">Months</option>
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">
                      Extra Monthly Payment
                    </span>
                    <input
                      type="number"
                      value={extraPayment}
                      onChange={(event) => setExtraPayment(event.target.value)}
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
                  ✅ Loan Result
                </h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Monthly Payment</p>

                  <div className="mt-3 text-5xl font-extrabold text-blue-300 break-words">
                    {formatCurrency(result.monthlyPayment)}
                  </div>

                  <p className="mt-3 text-slate-300">
                    For {result.months} monthly payments
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.totalInterest)}
                    </div>
                    <div className="mt-1 text-slate-400">Total Interest</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatCurrency(result.totalPayment)}
                    </div>
                    <div className="mt-1 text-slate-400">Total Payment</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatNumber(result.interestShare)}%
                    </div>
                    <div className="mt-1 text-slate-400">Interest Share</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-400">
                      {formatNumber(result.principalShare)}%
                    </div>
                    <div className="mt-1 text-slate-400">Principal Share</div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-green-700 bg-green-950/30 p-4 text-center">
                  <p className="text-green-100">
                    With extra payment, estimated payoff time:
                  </p>
                  <p className="mt-2 text-2xl font-bold text-green-300">
                    {result.payoffMonths} months
                  </p>
                  <p className="mt-1 text-green-100">
                    Interest savings: {formatCurrency(result.payoffSavings)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Loan Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => {
                      setAmount(example.amount);
                      setRate(example.rate);
                      setTerm(example.term);
                      setTermMode(example.mode);
                      setExtraPayment("0");
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This loan calculator provides estimates only. Actual loan payments,
              fees, taxes and terms may vary by lender, bank and location.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Loan Calculator?
                </h2>
                <p className="text-slate-300">
                  A loan calculator estimates monthly payments, total interest and
                  total repayment based on loan amount, interest rate and term.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool for personal loans, car loans, home loans, short
                  term loans and comparing extra monthly payment savings.
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