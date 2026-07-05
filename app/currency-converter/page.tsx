"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";

type Currency = {
  code: string;
  name: string;
  symbol: string;
};

type ApiResult = {
  success: boolean;
  live?: boolean;
  provider?: string;
  amount?: number;
  from?: string;
  to?: string;
  rate?: number;
  converted?: number;
  updated?: string;
  warning?: string;
  error?: string;
};

const currencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "₨" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
];

const fallbackRates: Record<string, number> = {
  USD: 1,
  INR: 83.2,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.52,
  SGD: 1.35,
  JPY: 157.5,
  PKR: 278.5,
  BDT: 117.2,
  NPR: 133.1,
  LKR: 303.4,
  CNY: 7.25,
  CHF: 0.9,
};

const quickExamples = [
  { label: "100 USD to INR", amount: "100", from: "USD", to: "INR" },
  { label: "1000 INR to USD", amount: "1000", from: "INR", to: "USD" },
  { label: "500 AED to INR", amount: "500", from: "AED", to: "INR" },
  { label: "100 EUR to INR", amount: "100", from: "EUR", to: "INR" },
  { label: "100 GBP to USD", amount: "100", from: "GBP", to: "USD" },
];

function getCurrency(code: string) {
  return currencies.find((currency) => currency.code === code) || currencies[0];
}

function getManualRate(from: string, to: string) {
  if (from === to) return 1;

  const fromRate = fallbackRates[from];
  const toRate = fallbackRates[to];

  if (!fromRate || !toRate) return 1;

  return toRate / fromRate;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(value);
}

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${formatNumber(value)} ${currencyCode}`;
  }
}

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [manualRate, setManualRate] = useState(() =>
    getManualRate("USD", "INR").toFixed(4)
  );
  const [useManualRate, setUseManualRate] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const numericAmount = Number(amount);
  const numericManualRate = Number(manualRate);

  const manualResult = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return null;
    }

    if (!Number.isFinite(numericManualRate) || numericManualRate <= 0) {
      return null;
    }

    return {
      converted: numericAmount * numericManualRate,
      rate: numericManualRate,
    };
  }, [numericAmount, numericManualRate]);

  useEffect(() => {
    if (useManualRate) return;

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setResult({
        success: false,
        error: "Please enter a valid amount greater than 0.",
      });
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          amount: String(numericAmount),
          from,
          to,
        });

        const response = await fetch(`/api/currency?${params.toString()}`);
        const data = await response.json();

        setResult(data);
      } catch {
        setResult({
          success: false,
          error:
            "Unable to fetch live currency rate. Please try manual rate mode.",
        });
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [numericAmount, from, to, useManualRate]);

  useEffect(() => {
    setManualRate(getManualRate(from, to).toFixed(4));
  }, [from, to]);

  const activeConverted = useManualRate
    ? manualResult?.converted
    : result?.converted;

  const activeRate = useManualRate ? manualResult?.rate : result?.rate;

  const activeProvider = useManualRate
    ? "Custom manual rate"
    : result?.provider || "Live API";

  const fromCurrency = getCurrency(from);
  const toCurrency = getCurrency(to);

  function handleSwap() {
    setFrom(to);
    setTo(from);
  }

  function handleReset() {
    setAmount("100");
    setFrom("USD");
    setTo("INR");
    setUseManualRate(false);
    setManualRate(getManualRate("USD", "INR").toFixed(4));
  }

  function handleCopy() {
    if (!activeConverted || !activeRate) {
      alert("Nothing to copy yet.");
      return;
    }

    const text = `${amount} ${from} = ${formatNumber(
      activeConverted
    )} ${to}\nRate: 1 ${from} = ${formatNumber(activeRate)} ${to}\nSource: ${activeProvider}`;

    navigator.clipboard.writeText(text);
    alert("Currency result copied.");
  }

  function applyExample(example: (typeof quickExamples)[number]) {
    setAmount(example.amount);
    setFrom(example.from);
    setTo(example.to);
    setUseManualRate(false);
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-6xl">
          <PageTitle
            title="Currency Converter"
            description="Convert USD, INR, EUR, GBP, AED and more currencies with live exchange rates, manual fallback and quick copy result."
          />

          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/40">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    💱 Currency Input
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Enter amount and choose currencies to get a fast conversion.
                  </p>
                </div>

                <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                  Live ready
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Amount
                  </span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    placeholder="Enter amount"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Rate mode
                  </span>
                  <select
                    value={useManualRate ? "manual" : "live"}
                    onChange={(event) =>
                      setUseManualRate(event.target.value === "manual")
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="live">Live API rate</option>
                    <option value="manual">Manual custom rate</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    From
                  </span>
                  <select
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    To
                  </span>
                  <select
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {useManualRate && (
                <label className="mt-4 block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Manual rate
                  </span>
                  <input
                    value={manualRate}
                    onChange={(event) => setManualRate(event.target.value)}
                    type="number"
                    min="0"
                    step="0.0001"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    placeholder={`1 ${from} = ? ${to}`}
                  />
                </label>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={handleSwap}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:border-blue-500 hover:bg-slate-700"
                >
                  🔁 Swap
                </button>

                <button
                  onClick={handleCopy}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500"
                >
                  📋 Copy result
                </button>

                <button
                  onClick={handleReset}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:border-red-400 hover:bg-slate-700"
                >
                  ♻️ Reset
                </button>
              </div>

              <div className="mt-7">
                <h3 className="text-xl font-bold text-white">
                  ⚡ Quick currency examples
                </h3>

                <div className="mt-4 flex flex-wrap gap-3">
                  {quickExamples.map((example) => (
                    <button
                      key={example.label}
                      onClick={() => applyExample(example)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-blue-500 hover:text-white"
                    >
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl shadow-slate-950/40">
              <h2 className="text-2xl font-bold text-white">
                ✅ Converted Result
              </h2>

              <div className="mt-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                  {amount || "0"} {fromCurrency.name}
                </p>

                <p className="mt-3 break-words text-4xl font-black text-blue-300 md:text-5xl">
                  {isLoading
                    ? "Loading..."
                    : activeConverted
                    ? formatMoney(activeConverted, to)
                    : "Enter amount"}
                </p>

                <p className="mt-3 text-slate-300">
                  {activeRate
                    ? `1 ${from} = ${formatNumber(activeRate)} ${to}`
                    : `Select currencies to convert ${from} to ${to}.`}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">From</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {fromCurrency.symbol} {from}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">To</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {toCurrency.symbol} {to}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Rate source</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {activeProvider}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Status</p>
                  <p
                    className={`mt-1 text-lg font-bold ${
                      useManualRate || result?.live === false
                        ? "text-amber-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {useManualRate || result?.live === false
                      ? "Manual rate"
                      : "Live rate"}
                  </p>
                </div>
              </div>

              {!useManualRate && result?.warning && (
                <div className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
                  ⚠️ {result.warning}
                </div>
              )}

              {!useManualRate && result?.success === false && (
                <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-100">
                  ❌ {result.error}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                <strong className="text-white">Important note:</strong>{" "}
                Currency rates change frequently. Use this tool for quick
                estimates, invoices, travel planning and simple conversions.
                Final bank or exchange rates may be different.
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xl font-bold text-white">
                🌍 Popular conversions
              </h3>
              <p className="mt-2 text-slate-400">
                Convert USD to INR, INR to USD, AED to INR, EUR to INR, GBP to
                USD and other common currency pairs.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xl font-bold text-white">
                📈 Live API support
              </h3>
              <p className="mt-2 text-slate-400">
                The tool tries live exchange rates first. If the API is not
                available, fallback mode keeps the converter usable.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xl font-bold text-white">
                🧾 Useful for estimates
              </h3>
              <p className="mt-2 text-slate-400">
                Helpful for shopping, freelancing, travel budgets, invoices and
                quick financial calculations.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}