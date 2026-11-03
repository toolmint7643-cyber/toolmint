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

function parseAmount(value: string, maximum = 1_000_000_000_000) {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= maximum ? amount : null;
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

function formatPercent(value: number | null) {
  return value === null ? "Not available" : `${formatNumber(value)}%`;
}

function SummaryRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-slate-700/80 py-3 last:border-0">
      <dt className="min-w-0 flex-1 text-sm text-slate-400">{label}</dt>
      <dd className={`min-w-0 max-w-[58%] break-words text-right text-sm ${emphasize ? "font-bold text-white" : "font-semibold text-slate-200"}`}>{value}</dd>
    </div>
  );
}

export default function BreakEvenCalculatorPage() {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [fixedCosts, setFixedCosts] = useState("5000");
  const [sellingPrice, setSellingPrice] = useState("50");
  const [variableCost, setVariableCost] = useState("30");
  const [targetProfit, setTargetProfit] = useState("2000");
  const [expectedUnits, setExpectedUnits] = useState("400");
  const [message, setMessage] = useState("");

  const result = useMemo(() => {
    const fixed = parseAmount(fixedCosts);
    const price = parseAmount(sellingPrice);
    const variable = parseAmount(variableCost);
    const target = parseAmount(targetProfit);
    const expected = expectedUnits.trim() ? parseAmount(expectedUnits, 1_000_000_000) : null;
    const inputsValid = fixed !== null && price !== null && variable !== null && target !== null &&
      (!expectedUnits.trim() || expected !== null);

    const fixedValue = fixed ?? 0;
    const priceValue = price ?? 0;
    const variableValue = variable ?? 0;
    const targetValue = target ?? 0;
    const contribution = priceValue - variableValue;
    const contributionMargin = priceValue > 0 ? contribution / priceValue * 100 : null;
    const canBreakEven = inputsValid && contribution > 0;
    const exactBreakEvenUnits = canBreakEven ? fixedValue / contribution : null;
    const wholeBreakEvenUnits = exactBreakEvenUnits === null ? null : Math.ceil(exactBreakEvenUnits);
    const breakEvenRevenue = canBreakEven && contributionMargin !== null
      ? fixedValue / (contributionMargin / 100)
      : null;
    const wholeUnitBreakEvenRevenue = wholeBreakEvenUnits === null ? null : wholeBreakEvenUnits * priceValue;
    const exactTargetUnits = canBreakEven ? (fixedValue + targetValue) / contribution : null;
    const wholeTargetUnits = exactTargetUnits === null ? null : Math.ceil(exactTargetUnits);
    const targetSalesRevenue = wholeTargetUnits === null ? null : wholeTargetUnits * priceValue;
    const forecastRevenue = expected === null ? null : expected * priceValue;
    const forecastVariableCosts = expected === null ? null : expected * variableValue;
    const forecastProfit = expected === null ? null : (forecastRevenue ?? 0) - (forecastVariableCosts ?? 0) - fixedValue;
    const marginOfSafetyUnits = expected === null || exactBreakEvenUnits === null ? null : expected - exactBreakEvenUnits;
    const marginOfSafetyRevenue = forecastRevenue === null || breakEvenRevenue === null ? null : forecastRevenue - breakEvenRevenue;
    const marginOfSafetyPercent = forecastRevenue !== null && forecastRevenue > 0 && marginOfSafetyRevenue !== null
      ? marginOfSafetyRevenue / forecastRevenue * 100
      : null;
    const calculationsFinite = [
      contribution, fixedValue, priceValue, variableValue, targetValue,
      ...(exactBreakEvenUnits === null ? [] : [exactBreakEvenUnits]),
      ...(breakEvenRevenue === null ? [] : [breakEvenRevenue]),
      ...(exactTargetUnits === null ? [] : [exactTargetUnits]),
      ...(forecastProfit === null ? [] : [forecastProfit]),
    ].every(Number.isFinite);

    let validationMessage = "";
    if (!inputsValid) validationMessage = "Enter valid non-negative amounts (up to 1 trillion). Expected units may be left blank.";
    else if (!calculationsFinite) validationMessage = "These amounts are too large to calculate safely. Reduce the inputs and try again.";
    else if (contribution <= 0) validationMessage = "Selling price must be greater than variable cost per unit for sales to contribute toward fixed costs.";

    return {
      inputsValid: Boolean(inputsValid && calculationsFinite),
      validationMessage,
      fixedCosts: fixedValue,
      sellingPrice: priceValue,
      variableCost: variableValue,
      contribution,
      contributionMargin,
      exactBreakEvenUnits,
      wholeBreakEvenUnits,
      breakEvenRevenue,
      wholeUnitBreakEvenRevenue,
      targetProfit: targetValue,
      exactTargetUnits,
      wholeTargetUnits,
      targetSalesRevenue,
      expectedUnits: expected,
      forecastRevenue,
      forecastProfit,
      marginOfSafetyUnits,
      marginOfSafetyRevenue,
      marginOfSafetyPercent,
      isBelowBreakEven: marginOfSafetyUnits !== null && marginOfSafetyUnits < 0,
    };
  }, [fixedCosts, sellingPrice, variableCost, targetProfit, expectedUnits]);

  const loadExample = (example: {
    currency: CurrencyCode; fixedCosts: string; sellingPrice: string;
    variableCost: string; targetProfit: string; expectedUnits: string;
  }) => {
    setCurrency(example.currency);
    setFixedCosts(example.fixedCosts);
    setSellingPrice(example.sellingPrice);
    setVariableCost(example.variableCost);
    setTargetProfit(example.targetProfit);
    setExpectedUnits(example.expectedUnits);
    setMessage("");
  };

  const examples = [
    { label: "Product launch", currency: "USD" as CurrencyCode, fixedCosts: "5000", sellingPrice: "50", variableCost: "30", targetProfit: "2000", expectedUnits: "400" },
    { label: "Service business", currency: "GBP" as CurrencyCode, fixedCosts: "1800", sellingPrice: "120", variableCost: "20", targetProfit: "3000", expectedUnits: "50" },
    { label: "Retail order", currency: "EUR" as CurrencyCode, fixedCosts: "2400", sellingPrice: "36", variableCost: "18", targetProfit: "1800", expectedUnits: "300" },
  ];

  const copyResult = async () => {
    if (!result.inputsValid || result.exactBreakEvenUnits === null || result.wholeBreakEvenUnits === null || result.breakEvenRevenue === null) {
      setMessage(result.validationMessage || "Check the entered amounts before copying the estimate.");
      return;
    }

    const text = [
      "Break-even Calculator Estimate",
      `Currency: ${currency} (display only; no currency conversion)`,
      `Fixed costs: ${formatCurrency(result.fixedCosts, currency)}`,
      `Selling price per unit: ${formatCurrency(result.sellingPrice, currency)}`,
      `Variable cost per unit: ${formatCurrency(result.variableCost, currency)}`,
      `Contribution per unit: ${formatCurrency(result.contribution, currency)}`,
      `Contribution margin ratio: ${formatPercent(result.contributionMargin)}`,
      `Break-even units (exact): ${formatNumber(result.exactBreakEvenUnits)}`,
      `Break-even units (rounded up): ${formatNumber(result.wholeBreakEvenUnits, 0)}`,
      `Break-even sales revenue: ${formatCurrency(result.breakEvenRevenue, currency)}`,
      `Target profit: ${formatCurrency(result.targetProfit, currency)}`,
      `Units for target profit (rounded up): ${result.wholeTargetUnits === null ? "Not available" : formatNumber(result.wholeTargetUnits, 0)}`,
      `Forecast operating profit: ${result.forecastProfit === null ? "Not entered" : formatCurrency(result.forecastProfit, currency)}`,
      `Margin of safety: ${result.marginOfSafetyPercent === null ? "Not available" : formatPercent(result.marginOfSafetyPercent)}`,
      "Estimate assumes one product or service with stable price and variable cost. Taxes and other unentered costs are excluded.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Break-even estimate copied.");
    } catch {
      setMessage("Unable to copy. Check clipboard permission and try again.");
    }
  };

  const resetCalculator = () => {
    setCurrency("USD");
    setFixedCosts("5000");
    setSellingPrice("50");
    setVariableCost("30");
    setTargetProfit("2000");
    setExpectedUnits("400");
    setMessage("");
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="⚖️ Break-even Calculator"
          description="Calculate break-even units and sales revenue from fixed costs, variable cost per unit and selling price. Estimate target-profit sales and margin of safety."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="break-even-input-heading">
                <h2 id="break-even-input-heading" className="mb-5 text-2xl font-bold text-white">⚙️ Business Inputs</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Display currency</span>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className={inputClass}>
                      {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                    <span className="mt-1 block text-xs text-slate-400">Formatting only. This calculator does not convert exchange rates.</span>
                  </label>
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Fixed costs for this period</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={fixedCosts} onChange={(event) => { setFixedCosts(event.target.value); setMessage(""); }} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-400">Examples: rent, salaries, subscriptions and equipment costs allocated to the period.</span>
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Selling price per unit</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={sellingPrice} onChange={(event) => { setSellingPrice(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Variable cost per unit</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={variableCost} onChange={(event) => { setVariableCost(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Target operating profit</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={targetProfit} onChange={(event) => { setTargetProfit(event.target.value); setMessage(""); }} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-400">Amount above break-even, before tax.</span>
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Expected units sold (optional)</span>
                    <input type="number" min="0" max="1000000000" step="any" inputMode="decimal" value={expectedUnits} onChange={(event) => { setExpectedUnits(event.target.value); setMessage(""); }} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-400">Clear this field to hide the forecast and margin-of-safety estimate.</span>
                  </label>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={copyResult}>📋 Copy Result</Button>
                  <button type="button" onClick={resetCalculator} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">🔄 Reset</button>
                </div>
                {message && <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>}
              </section>

              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="break-even-result-heading" aria-live="polite">
                <h2 id="break-even-result-heading" className="mb-5 text-2xl font-bold text-white">📊 Break-even Estimate</h2>
                <div className={`rounded-2xl border p-5 ${!result.inputsValid || result.exactBreakEvenUnits === null ? "border-amber-700 bg-amber-950/25" : result.isBelowBreakEven ? "border-rose-700 bg-rose-950/25" : "border-emerald-700 bg-emerald-950/25"}`}>
                  <p className="text-sm text-slate-300">Break-even units (rounded up)</p>
                  <p className="mt-2 break-words text-3xl font-extrabold text-blue-300 sm:text-4xl">{result.wholeBreakEvenUnits === null ? "Not attainable" : formatNumber(result.wholeBreakEvenUnits, 0)}</p>
                  <p className="mt-2 text-sm text-slate-300">Break-even sales revenue: <strong className="text-white">{result.breakEvenRevenue === null ? "Not available" : formatCurrency(result.breakEvenRevenue, currency)}</strong></p>
                  {result.validationMessage && <p className="mt-3 text-sm text-amber-200">{result.validationMessage}</p>}
                  {result.isBelowBreakEven && <p className="mt-3 text-sm text-rose-200">Expected sales are below the estimated break-even point.</p>}
                </div>

                <dl className="mt-4">
                  <SummaryRow label="Contribution per unit" value={formatCurrency(result.contribution, currency)} />
                  <SummaryRow label="Contribution margin ratio" value={formatPercent(result.contributionMargin)} />
                  <SummaryRow label="Exact break-even units" value={result.exactBreakEvenUnits === null ? "Not available" : formatNumber(result.exactBreakEvenUnits)} />
                  <SummaryRow label="Sales revenue at whole-unit break-even" value={result.wholeUnitBreakEvenRevenue === null ? "Not available" : formatCurrency(result.wholeUnitBreakEvenRevenue, currency)} />
                  <SummaryRow label="Target-profit units (rounded up)" value={result.wholeTargetUnits === null ? "Not available" : formatNumber(result.wholeTargetUnits, 0)} emphasize />
                  <SummaryRow label="Sales revenue at target-profit units" value={result.targetSalesRevenue === null ? "Not available" : formatCurrency(result.targetSalesRevenue, currency)} />
                  <SummaryRow label="Forecast operating profit" value={result.forecastProfit === null ? "Not entered" : formatCurrency(result.forecastProfit, currency)} emphasize />
                  <SummaryRow label="Margin of safety (units)" value={result.marginOfSafetyUnits === null ? "Not available" : formatNumber(result.marginOfSafetyUnits)} />
                  <SummaryRow label="Margin of safety (sales)" value={result.marginOfSafetyRevenue === null ? "Not available" : formatCurrency(result.marginOfSafetyRevenue, currency)} />
                  <SummaryRow label="Margin of safety (%)" value={formatPercent(result.marginOfSafetyPercent)} />
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="break-even-examples-heading">
              <h2 id="break-even-examples-heading" className="mb-4 text-xl font-bold text-white">⚡ Try an example</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {examples.map((example) => (
                  <button key={example.label} type="button" onClick={() => loadExample(example)} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">
                    {example.label}<span className="mt-1 block text-sm font-normal text-slate-400">Load sample inputs</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-amber-700 bg-amber-950/25 p-4 text-sm leading-6 text-amber-100">
              This is a planning estimate, not accounting or tax advice. It assumes one product or service with a stable selling price and variable cost per unit. Taxes, commissions, discounts, returns, financing costs and other amounts are excluded unless included in your inputs.
            </div>
          </div>
        </ToolCard>

        <section className="mt-10 grid gap-7 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">How to use the break-even calculator</h2>
            <p className="mt-3 leading-7 text-slate-300">Enter the fixed costs for the period you are planning, the selling price per unit and the variable cost to deliver or make one unit. Add a target operating profit and an expected sales quantity to see the units needed for that target, a forecast profit and the margin of safety. Choose any supported display currency; amounts are not converted.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Break-even formula</h2>
            <p className="mt-3 leading-7 text-slate-300">Contribution per unit = selling price − variable cost. Break-even units = fixed costs ÷ contribution per unit. Since units are usually sold whole, the tool also rounds the required units up. Break-even sales revenue = fixed costs ÷ contribution margin ratio, where the ratio is contribution per unit ÷ selling price.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Target profit and margin of safety</h2>
            <p className="mt-3 leading-7 text-slate-300">Units for a target operating profit = (fixed costs + target profit) ÷ contribution per unit, rounded up to the next whole unit. Margin of safety compares expected sales with break-even sales; a negative value means the forecast is below break-even. These estimates use the expected units you enter, not a prediction of actual demand.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Break-even vs. profit margin</h2>
            <p className="mt-3 leading-7 text-slate-300">Break-even estimates the sales volume needed to cover fixed and variable costs. Profit margin describes profit as a share of revenue. Use this calculator for unit and sales targets, or the <Link className="font-semibold text-blue-300 underline decoration-blue-500/50 underline-offset-4 hover:text-blue-200" href="/profit-margin-calculator">Profit Margin Calculator</Link> for gross/net margin, markup and target selling price.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
