"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type CurrencyCode =
  | "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD" | "NZD" | "SGD"
  | "AED" | "SAR" | "PKR" | "JPY" | "CNY" | "CHF" | "ZAR" | "BDT" | "NPR" | "LKR";
type Mode = "annual-rate" | "cpi-index";

const currencies: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "USD", label: "US Dollar (USD)", locale: "en-US" },
  { code: "EUR", label: "Euro (EUR)", locale: "de-DE" },
  { code: "GBP", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "INR", label: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "CAD", label: "Canadian Dollar (CAD)", locale: "en-CA" },
  { code: "AUD", label: "Australian Dollar (AUD)", locale: "en-AU" },
  { code: "NZD", label: "New Zealand Dollar (NZD)", locale: "en-NZ" },
  { code: "SGD", label: "Singapore Dollar (SGD)", locale: "en-SG" },
  { code: "AED", label: "UAE Dirham (AED)", locale: "en-AE" },
  { code: "SAR", label: "Saudi Riyal (SAR)", locale: "en-SA" },
  { code: "PKR", label: "Pakistani Rupee (PKR)", locale: "en-PK" },
  { code: "JPY", label: "Japanese Yen (JPY)", locale: "ja-JP" },
  { code: "CNY", label: "Chinese Yuan (CNY)", locale: "zh-CN" },
  { code: "CHF", label: "Swiss Franc (CHF)", locale: "de-CH" },
  { code: "ZAR", label: "South African Rand (ZAR)", locale: "en-ZA" },
  { code: "BDT", label: "Bangladeshi Taka (BDT)", locale: "en-BD" },
  { code: "NPR", label: "Nepalese Rupee (NPR)", locale: "ne-NP" },
  { code: "LKR", label: "Sri Lankan Rupee (LKR)", locale: "en-LK" },
];

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function parseNumber(value: string, minimum = 0, maximum = 1_000_000_000_000) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function formatCurrency(value: number, currency: CurrencyCode) {
  const locale = currencies.find((item) => item.code === currency)?.locale ?? "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatPercent(value: number) {
  return `${formatNumber(value)}%`;
}

function SummaryRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-slate-700/80 py-3 last:border-0">
      <dt className="min-w-0 flex-1 text-sm text-slate-400">{label}</dt>
      <dd className={`min-w-0 max-w-[58%] break-words text-right text-sm ${emphasize ? "font-bold text-white" : "font-semibold text-slate-200"}`}>
        {value}
      </dd>
    </div>
  );
}

export default function InflationCalculatorPage() {
  const [mode, setMode] = useState<Mode>("annual-rate");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [amount, setAmount] = useState("1000");
  const [annualRate, setAnnualRate] = useState("3");
  const [durationYears, setDurationYears] = useState("10");
  const [startCpi, setStartCpi] = useState("");
  const [endCpi, setEndCpi] = useState("");
  const [startYear, setStartYear] = useState("2019");
  const [endYear, setEndYear] = useState("2024");
  const [message, setMessage] = useState("");

  const result = useMemo(() => {
    const amountValue = parseNumber(amount);
    if (amountValue === null) {
      return { valid: false as const, error: "Enter an amount from 0 to 1 trillion." };
    }

    let years: number;
    let factor: number;
    let rate: number | null = null;
    let sourceLabel: string;

    if (mode === "annual-rate") {
      const rateValue = parseNumber(annualRate, -99.99, 1000);
      const yearsValue = parseNumber(durationYears, 0, 200);
      if (rateValue === null) {
        return { valid: false as const, error: "Enter an annual rate greater than -100% and no more than 1,000%." };
      }
      if (yearsValue === null) {
        return { valid: false as const, error: "Enter a time period from 0 to 200 years." };
      }
      years = yearsValue;
      rate = rateValue;
      factor = Math.pow(1 + rateValue / 100, yearsValue);
      sourceLabel = "User-entered annual rate";
    } else {
      const startIndex = parseNumber(startCpi, 0.000001);
      const endIndex = parseNumber(endCpi, 0.000001);
      const startYearValue = parseNumber(startYear, 1, 9999);
      const endYearValue = parseNumber(endYear, 1, 9999);
      if (startIndex === null || endIndex === null) {
        return { valid: false as const, error: "Enter positive start and end CPI index values." };
      }
      if (startYearValue === null || endYearValue === null ||
          !Number.isInteger(startYearValue) || !Number.isInteger(endYearValue) || endYearValue <= startYearValue) {
        return { valid: false as const, error: "Enter valid whole years, with the comparison year later than the base year." };
      }
      years = endYearValue - startYearValue;
      factor = endIndex / startIndex;
      rate = (Math.pow(factor, 1 / years) - 1) * 100;
      sourceLabel = "User-entered CPI indexes";
    }

    const projectedAmount = amountValue * factor;
    const changeAmount = projectedAmount - amountValue;
    const cumulativeChange = (factor - 1) * 100;
    const purchasingPowerToday = amountValue / factor;
    const purchasingPowerChange = purchasingPowerToday - amountValue;
    const values = [factor, projectedAmount, changeAmount, cumulativeChange, purchasingPowerToday, purchasingPowerChange, rate ?? 0];

    if (!values.every(Number.isFinite)) {
      return { valid: false as const, error: "The result is outside the calculator's safe numeric range. Reduce the amount, rate or time period." };
    }

    return {
      valid: true as const,
      amount: amountValue,
      years,
      factor,
      projectedAmount,
      changeAmount,
      cumulativeChange,
      purchasingPowerToday,
      purchasingPowerChange,
      annualizedRate: rate,
      sourceLabel,
    };
  }, [amount, annualRate, durationYears, endCpi, endYear, mode, startCpi, startYear]);

  const projectionPoints = useMemo(() => {
    if (!result.valid) return [];

    if (mode === "cpi-index") {
      return [
        { label: startYear, value: result.amount },
        { label: endYear, value: result.projectedAmount },
      ];
    }

    const checkpoints = new Set<number>([0]);
    const wholeYears = Math.floor(result.years);
    for (let year = 1; year <= Math.min(wholeYears, 10); year += 1) checkpoints.add(year);
    checkpoints.add(result.years);

    return [...checkpoints]
      .sort((left, right) => left - right)
      .map((year) => ({
        label: year === result.years ? `${formatNumber(year, 2)} yr` : `${formatNumber(year, 0)} yr`,
        value: result.amount * Math.pow(1 + (parseNumber(annualRate, -99.99, 1000) ?? 0) / 100, year),
      }));
  }, [annualRate, endYear, mode, result, startYear]);

  const maxProjection = Math.max(...projectionPoints.map((point) => point.value), 0);

  const loadRateExample = (rate: string, years: string) => {
    setMode("annual-rate");
    setCurrency("USD");
    setAmount("1000");
    setAnnualRate(rate);
    setDurationYears(years);
    setMessage("");
  };

  const loadCpiExample = () => {
    setMode("cpi-index");
    setCurrency("USD");
    setAmount("1000");
    setStartCpi("100");
    setEndCpi("125");
    setStartYear("2019");
    setEndYear("2024");
    setMessage("Sample CPI values loaded. They are illustrative, not official country data.");
  };

  const copyResult = async () => {
    if (!result.valid) {
      setMessage(result.error);
      return;
    }

    const lines = [
      "Inflation Calculator Estimate",
      `Mode: ${mode === "annual-rate" ? "Annual rate projection" : "CPI index comparison"}`,
      `Display currency: ${currency} (formatting only; no currency conversion)`,
      `Starting amount: ${formatCurrency(result.amount, currency)}`,
      `Period: ${formatNumber(result.years)} years`,
      ...(mode === "annual-rate"
        ? [`Annual rate entered: ${annualRate}%`]
        : [`Base CPI index (${startYear}): ${startCpi}`, `Comparison CPI index (${endYear}): ${endCpi}`]),
      `Data source: ${result.sourceLabel}`,
      `Equivalent amount at the end: ${formatCurrency(result.projectedAmount, currency)}`,
      `Cumulative price change: ${formatPercent(result.cumulativeChange)}`,
      `Change in amount: ${formatCurrency(result.changeAmount, currency)}`,
      `Value of the unchanged starting amount in base-period money: ${formatCurrency(result.purchasingPowerToday, currency)}`,
      ...(result.annualizedRate === null ? [] : [`Annualized rate: ${formatPercent(result.annualizedRate)}`]),
      "Estimates use only the rate or CPI indexes entered by the user. They are not official forecasts or investment advice.",
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setMessage("Inflation estimate copied.");
    } catch {
      setMessage("Unable to copy. Check clipboard permission and try again.");
    }
  };

  const resetCalculator = () => {
    setMode("annual-rate");
    setCurrency("USD");
    setAmount("1000");
    setAnnualRate("3");
    setDurationYears("10");
    setStartCpi("");
    setEndCpi("");
    setStartYear("2019");
    setEndYear("2024");
    setMessage("");
  };

  const changeInput = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setter(event.target.value);
    setMessage("");
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="📈 Inflation Calculator"
          description="Estimate how inflation changes prices and purchasing power using an annual rate you enter or CPI index values you provide. No country rates are assumed or fetched."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2" role="group" aria-label="Calculation method">
              <button
                type="button"
                aria-pressed={mode === "annual-rate"}
                onClick={() => { setMode("annual-rate"); setMessage(""); }}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "annual-rate" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                Annual rate projection
              </button>
              <button
                type="button"
                aria-pressed={mode === "cpi-index"}
                onClick={() => { setMode("cpi-index"); setMessage(""); }}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm font-bold transition ${mode === "cpi-index" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                CPI index comparison
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="inflation-input-heading">
                <h2 id="inflation-input-heading" className="mb-5 text-2xl font-bold text-white">⚙️ Inflation inputs</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Display currency</span>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className={inputClass}>
                      {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                    <span className="mt-1 block text-xs text-slate-400">Formatting only. This calculator does not convert exchange rates.</span>
                  </label>

                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Starting amount</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={amount} onChange={changeInput(setAmount)} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-400">The price or amount at the beginning of the comparison.</span>
                  </label>

                  {mode === "annual-rate" ? (
                    <>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Average annual inflation rate (%)</span>
                        <input type="number" min="-99.99" max="1000" step="any" inputMode="decimal" value={annualRate} onChange={changeInput(setAnnualRate)} className={inputClass} />
                        <span className="mt-1 block text-xs text-slate-400">3% is an editable example, not a country rate or forecast.</span>
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Time period (years)</span>
                        <input type="number" min="0" max="200" step="any" inputMode="decimal" value={durationYears} onChange={changeInput(setDurationYears)} className={inputClass} />
                        <span className="mt-1 block text-xs text-slate-400">Fractional years are allowed.</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Base-period CPI index</span>
                        <input type="number" min="0.000001" max="1000000000000" step="any" inputMode="decimal" value={startCpi} onChange={changeInput(setStartCpi)} className={inputClass} placeholder="e.g. 100" />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Comparison-period CPI index</span>
                        <input type="number" min="0.000001" max="1000000000000" step="any" inputMode="decimal" value={endCpi} onChange={changeInput(setEndCpi)} className={inputClass} placeholder="e.g. 125" />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Base year</span>
                        <input type="number" min="1" max="9999" step="1" inputMode="numeric" value={startYear} onChange={changeInput(setStartYear)} className={inputClass} />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Comparison year</span>
                        <input type="number" min="1" max="9999" step="1" inputMode="numeric" value={endYear} onChange={changeInput(setEndYear)} className={inputClass} />
                      </label>
                    </>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={copyResult}>📋 Copy Result</Button>
                  <button type="button" onClick={resetCalculator} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">🔄 Reset</button>
                </div>
                {message && <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>}
              </section>

              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="inflation-result-heading" aria-live="polite">
                <h2 id="inflation-result-heading" className="mb-5 text-2xl font-bold text-white">📊 Inflation estimate</h2>
                {!result.valid ? (
                  <div role="alert" className="rounded-2xl border border-amber-700 bg-amber-950/25 p-5 text-sm leading-6 text-amber-100">{result.error}</div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-blue-700 bg-blue-950/35 p-5">
                      <p className="text-sm text-slate-300">Equivalent amount at the end of the period</p>
                      <p className="mt-2 break-words text-3xl font-extrabold text-blue-300 sm:text-4xl">{formatCurrency(result.projectedAmount, currency)}</p>
                      <p className="mt-2 text-sm text-slate-300">{formatCurrency(result.amount, currency)} changes by <strong className={result.changeAmount < 0 ? "text-emerald-300" : "text-white"}>{formatCurrency(result.changeAmount, currency)}</strong>.</p>
                    </div>

                    <dl className="mt-4">
                      <SummaryRow label="Cumulative price change" value={formatPercent(result.cumulativeChange)} emphasize />
                      {result.annualizedRate === null ? null : <SummaryRow label={mode === "cpi-index" ? "Annualized CPI change" : "Annual rate entered"} value={formatPercent(result.annualizedRate)} />}
                      <SummaryRow label="Value change" value={formatCurrency(result.changeAmount, currency)} />
                      <SummaryRow label="Unchanged amount's value in base-period money" value={formatCurrency(result.purchasingPowerToday, currency)} />
                      <SummaryRow label="Purchasing-power change" value={formatCurrency(result.purchasingPowerChange, currency)} />
                      <SummaryRow label="Comparison period" value={`${formatNumber(result.years)} years`} />
                    </dl>
                  </>
                )}
              </section>
            </div>

            {result.valid && (
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="inflation-timeline-heading">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 id="inflation-timeline-heading" className="text-xl font-bold text-white">📈 Price-level comparison</h2>
                    <p className="mt-1 text-sm text-slate-400">Based only on the values entered above.</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-300">{result.sourceLabel}</span>
                </div>
                <div className="mt-5 space-y-3">
                  {projectionPoints.map((point) => (
                    <div key={`${point.label}-${point.value}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[5rem_minmax(0,1fr)_10rem]">
                      <span className="text-xs font-semibold text-slate-400 sm:text-sm">{point.label}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800" role="img" aria-label={`${point.label}: ${formatCurrency(point.value, currency)}`}>
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${maxProjection > 0 ? Math.max(2, point.value / maxProjection * 100) : 0}%` }} />
                      </div>
                      <span className="col-start-2 text-right text-sm font-semibold text-slate-200 sm:col-start-auto">{formatCurrency(point.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="inflation-examples-heading">
              <h2 id="inflation-examples-heading" className="mb-4 text-xl font-bold text-white">⚡ Try an example</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button type="button" onClick={() => loadRateExample("3", "10")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">3% for 10 years<span className="mt-1 block text-sm font-normal text-slate-400">Illustrative annual-rate projection</span></button>
                <button type="button" onClick={() => loadRateExample("8", "5")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">8% for 5 years<span className="mt-1 block text-sm font-normal text-slate-400">Illustrative annual-rate projection</span></button>
                <button type="button" onClick={() => loadRateExample("-1", "5")} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">-1% for 5 years<span className="mt-1 block text-sm font-normal text-slate-400">Illustrative deflation scenario</span></button>
                <button type="button" onClick={loadCpiExample} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">CPI 100 to 125<span className="mt-1 block text-sm font-normal text-slate-400">Illustrative index comparison</span></button>
              </div>
            </section>

            <div className="rounded-xl border border-amber-700 bg-amber-950/25 p-4 text-sm leading-6 text-amber-100">
              This calculator does not fetch official CPI data or predict future inflation. Results depend entirely on the rate or index values you enter. CPI conventions can differ by country and index series; use matching values from a reliable source. This is an estimate, not financial advice.
            </div>
          </div>
        </ToolCard>

        <section className="mt-10 grid gap-7 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">How to use the inflation calculator</h2>
            <p className="mt-3 leading-7 text-slate-300">Choose annual rate projection to estimate a future price from an average yearly rate you enter. Choose CPI index comparison to compare two index values and years. Enter the starting amount and select a display currency; the currency is only a number format and is not converted.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Inflation calculator formula</h2>
            <p className="mt-3 leading-7 text-slate-300">For an annual rate, future equivalent amount = starting amount × (1 + annual rate ÷ 100)<sup>years</sup>. For CPI comparison, future equivalent amount = starting amount × comparison CPI ÷ base CPI. The annualized CPI change is derived from the ratio of the two index values over the year difference.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Inflation and purchasing power</h2>
            <p className="mt-3 leading-7 text-slate-300">When the price level rises, the same unchanged cash amount buys less. The calculator estimates the base-period value of that unchanged amount by dividing it by the price-level factor. Negative rates represent a decreasing modeled price level; they are scenarios, not a claim that deflation is occurring.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Inflation vs. compound growth</h2>
            <p className="mt-3 leading-7 text-slate-300">Inflation estimates price-level change, while investment returns estimate an asset&apos;s growth. Compare your assumptions with the <Link className="font-semibold text-blue-300 underline decoration-blue-500/50 underline-offset-4 hover:text-blue-200" href="/compound-interest-calculator">Compound Interest Calculator</Link>; neither tool fetches or guarantees a future rate.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
