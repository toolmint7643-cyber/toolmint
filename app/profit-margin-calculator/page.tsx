"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type RegionMode = "general" | "india";
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

function ResultRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-slate-700/80 py-3 last:border-0">
      <dt className="min-w-0 flex-1 text-sm text-slate-400">{label}</dt>
      <dd className={`min-w-0 max-w-[58%] break-words text-right text-sm ${emphasize ? "font-bold text-white" : "font-semibold text-slate-200"}`}>{value}</dd>
    </div>
  );
}

export default function ProfitMarginCalculatorPage() {
  const [region, setRegion] = useState<RegionMode>("general");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("100");
  const [unitPrice, setUnitPrice] = useState("150");
  const [expenses, setExpenses] = useState("0");
  const [targetMargin, setTargetMargin] = useState("30");
  const [gstRate, setGstRate] = useState("");
  const [priceIncludesGst, setPriceIncludesGst] = useState(false);
  const [message, setMessage] = useState("");

  const result = useMemo(() => {
    const quantityValue = parseAmount(quantity, 1_000_000_000);
    const unitCostValue = parseAmount(unitCost);
    const unitPriceValue = parseAmount(unitPrice);
    const expensesValue = parseAmount(expenses);
    const targetMarginValue = parseAmount(targetMargin, 100);
    const gstRateValue = region === "india" ? parseAmount(gstRate, 100) : 0;

    const quantityValid = quantityValue !== null && quantityValue > 0;
    const targetValid = targetMarginValue !== null && targetMarginValue < 100;
    const inputsValid = quantityValid && unitCostValue !== null && unitPriceValue !== null &&
      expensesValue !== null && targetValid && (region !== "india" || gstRateValue !== null);

    const units = quantityValue ?? 0;
    const enteredSales = units * (unitPriceValue ?? 0);
    const rate = gstRateValue ?? 0;
    const revenue = region === "india" && priceIncludesGst
      ? enteredSales / (1 + rate / 100)
      : enteredSales;
    const gstAmount = region === "india"
      ? (priceIncludesGst ? enteredSales - revenue : revenue * rate / 100)
      : 0;
    const customerTotal = region === "india" && !priceIncludesGst ? enteredSales + gstAmount : enteredSales;
    const directCosts = units * (unitCostValue ?? 0);
    const totalCosts = directCosts + (expensesValue ?? 0);
    const grossProfit = revenue - directCosts;
    const netProfit = revenue - totalCosts;
    const grossMargin = revenue > 0 ? grossProfit / revenue * 100 : null;
    const netMargin = revenue > 0 ? netProfit / revenue * 100 : null;
    const markup = totalCosts > 0 ? netProfit / totalCosts * 100 : null;
    const targetRatio = (targetMarginValue ?? 0) / 100;
    const targetRevenue = targetValid ? totalCosts / (1 - targetRatio) : 0;
    const targetUnitPrice = units > 0 ? targetRevenue / units : 0;
    const targetCustomerUnitPrice = region === "india" ? targetUnitPrice * (1 + rate / 100) : targetUnitPrice;
    const calculationsFinite = [enteredSales, revenue, gstAmount, customerTotal, directCosts, totalCosts, grossProfit, netProfit, targetRevenue, targetUnitPrice, targetCustomerUnitPrice].every(Number.isFinite);

    let validationMessage = "";
    if (!quantityValid) validationMessage = "Quantity must be greater than zero.";
    else if (unitCostValue === null || unitPriceValue === null || expensesValue === null) validationMessage = "Enter valid non-negative amounts (up to 1 trillion) for cost, price and expenses.";
    else if (!targetValid) validationMessage = "Target net margin must be from 0% up to, but not including, 100%.";
    else if (region === "india" && gstRateValue === null) validationMessage = "Enter your applicable GST rate from 0% to 100%.";
    else if (!calculationsFinite) validationMessage = "These amounts are too large to calculate safely. Reduce the inputs and try again.";

    return {
      inputsValid: Boolean(inputsValid && calculationsFinite),
      validationMessage,
      units,
      revenue,
      gstAmount,
      customerTotal,
      directCosts,
      totalCosts,
      expenses: expensesValue ?? 0,
      grossProfit,
      netProfit,
      grossMargin,
      netMargin,
      markup,
      targetMargin: targetMarginValue ?? 0,
      targetUnitPrice,
      targetCustomerUnitPrice,
      isLoss: netProfit < 0,
    };
  }, [quantity, unitCost, unitPrice, expenses, targetMargin, region, gstRate, priceIncludesGst]);

  const activeCurrency: CurrencyCode = region === "india" ? "INR" : currency;
  const revenueLabel = region === "india" ? "Revenue excluding GST" : "Sales revenue";
  const targetPriceLabel = region === "india" ? "Target price per unit, before GST" : "Target selling price per unit";

  const loadExample = (example: {
    quantity: string; unitCost: string; unitPrice: string; expenses: string;
    targetMargin: string; currency: CurrencyCode;
  }) => {
    setRegion("general");
    setQuantity(example.quantity);
    setUnitCost(example.unitCost);
    setUnitPrice(example.unitPrice);
    setExpenses(example.expenses);
    setTargetMargin(example.targetMargin);
    setCurrency(example.currency);
    setGstRate("");
    setPriceIncludesGst(false);
    setMessage("");
  };

  const copyResult = async () => {
    if (!result.inputsValid) {
      setMessage(result.validationMessage || "Check the entered amounts before copying the estimate.");
      return;
    }

    const text = [
      "Profit Margin Calculator Estimate",
      `Region mode: ${region === "india" ? "India GST pricing" : "General"}`,
      `Currency: ${activeCurrency} (display only; no currency conversion)`,
      `Quantity: ${formatNumber(result.units)}`,
      `${revenueLabel}: ${formatCurrency(result.revenue, activeCurrency)}`,
      `Direct costs: ${formatCurrency(result.directCosts, activeCurrency)}`,
      `Additional expenses: ${formatCurrency(result.expenses, activeCurrency)}`,
      `Gross profit: ${formatCurrency(result.grossProfit, activeCurrency)} (${formatPercent(result.grossMargin)})`,
      `Net profit: ${formatCurrency(result.netProfit, activeCurrency)} (${formatPercent(result.netMargin)} net margin)`,
      `Markup on total costs: ${formatPercent(result.markup)}`,
      `Target net margin: ${formatNumber(result.targetMargin)}%`,
      `${targetPriceLabel}: ${formatCurrency(result.targetUnitPrice, activeCurrency)}`,
      ...(region === "india" ? [`GST amount: ${formatCurrency(result.gstAmount, activeCurrency)}`, `Customer total: ${formatCurrency(result.customerTotal, activeCurrency)}`, `Target customer price per unit: ${formatCurrency(result.targetCustomerUnitPrice, activeCurrency)}`] : []),
      "Estimate only. Currency selection formats amounts; it does not convert currencies. Tax rules are not validated.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Profit estimate copied.");
    } catch {
      setMessage("Unable to copy. Check clipboard permission and try again.");
    }
  };

  const resetCalculator = () => {
    setRegion("general");
    setCurrency("USD");
    setQuantity("1");
    setUnitCost("100");
    setUnitPrice("150");
    setExpenses("0");
    setTargetMargin("30");
    setGstRate("");
    setPriceIncludesGst(false);
    setMessage("");
  };

  const examples = [
    { label: "Small product batch", quantity: "10", unitCost: "15", unitPrice: "25", expenses: "20", targetMargin: "30", currency: "USD" as CurrencyCode },
    { label: "Service project", quantity: "1", unitCost: "300", unitPrice: "750", expenses: "75", targetMargin: "35", currency: "GBP" as CurrencyCode },
    { label: "Retail order", quantity: "24", unitCost: "250", unitPrice: "420", expenses: "1200", targetMargin: "25", currency: "INR" as CurrencyCode },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="💹 Profit Margin Calculator"
          description="Calculate profit, gross and net profit margin, markup and target selling price for products or services. Use optional India GST pricing controls when needed."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="profit-input-heading">
                <h2 id="profit-input-heading" className="mb-5 text-2xl font-bold text-white">⚙️ Sale & Cost Details</h2>

                <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-950 p-1" aria-label="Calculation mode">
                  <button type="button" aria-pressed={region === "general"} onClick={() => { setRegion("general"); setMessage(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${region === "general" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                    General calculator
                  </button>
                  <button type="button" aria-pressed={region === "india"} onClick={() => { setRegion("india"); setCurrency("INR"); setMessage(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${region === "india" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                    India GST pricing
                  </button>
                </div>

                {region === "general" && (
                  <label className="mb-4 block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Display currency</span>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className={inputClass}>
                      {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                    <span className="mt-1 block text-xs text-slate-400">Formatting only. This calculator does not convert exchange rates.</span>
                  </label>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Quantity / units sold</span>
                    <input type="number" min="0.001" max="1000000000" step="any" inputMode="decimal" value={quantity} onChange={(event) => { setQuantity(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Cost per unit</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={unitCost} onChange={(event) => { setUnitCost(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">{region === "india" && priceIncludesGst ? "Selling price per unit (GST included)" : region === "india" ? "Selling price per unit (before GST)" : "Selling price per unit"}</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={unitPrice} onChange={(event) => { setUnitPrice(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Additional expenses (total)</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={expenses} onChange={(event) => { setExpenses(event.target.value); setMessage(""); }} className={inputClass} />
                  </label>
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Target net profit margin (%)</span>
                    <input type="number" min="0" max="99.99" step="any" inputMode="decimal" value={targetMargin} onChange={(event) => { setTargetMargin(event.target.value); setMessage(""); }} className={inputClass} />
                    <span className="mt-1 block text-xs text-slate-400">Used to estimate the selling price needed after entered direct costs and expenses.</span>
                  </label>
                </div>

                {region === "india" && (
                  <div className="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/20 p-4">
                    <h3 className="font-bold text-emerald-100">Optional GST-aware pricing</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">Enter the GST rate applicable to your sale. No rate is assumed or automatically verified.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">Your applicable GST rate (%)</span>
                        <input type="number" min="0" max="100" step="any" inputMode="decimal" value={gstRate} onChange={(event) => { setGstRate(event.target.value); setMessage(""); }} placeholder="Enter rate" className={inputClass} />
                      </label>
                      <fieldset className="min-w-0">
                        <legend className="mb-2 text-sm font-medium text-slate-300">Price entered above</legend>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" aria-pressed={!priceIncludesGst} onClick={() => setPriceIncludesGst(false)} className={`rounded-lg border px-2 py-3 text-sm font-semibold ${!priceIncludesGst ? "border-blue-500 bg-blue-600 text-white" : "border-slate-700 bg-slate-800 text-slate-300"}`}>Before GST</button>
                          <button type="button" aria-pressed={priceIncludesGst} onClick={() => setPriceIncludesGst(true)} className={`rounded-lg border px-2 py-3 text-sm font-semibold ${priceIncludesGst ? "border-blue-500 bg-blue-600 text-white" : "border-slate-700 bg-slate-800 text-slate-300"}`}>GST included</button>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={copyResult}>📋 Copy Result</Button>
                  <button type="button" onClick={resetCalculator} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">🔄 Reset</button>
                </div>
                {message && <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>}
              </section>

              <section className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="profit-result-heading" aria-live="polite">
                <h2 id="profit-result-heading" className="mb-5 text-2xl font-bold text-white">📊 Profit Estimate</h2>
                <div className={`rounded-2xl border p-5 ${result.isLoss ? "border-rose-700 bg-rose-950/30" : "border-emerald-700 bg-emerald-950/25"}`}>
                  <p className="text-sm text-slate-300">{result.isLoss ? "Net loss after entered costs" : "Net profit after entered costs"}</p>
                  <p className={`mt-2 break-words text-3xl font-extrabold sm:text-4xl ${result.isLoss ? "text-rose-300" : "text-emerald-300"}`}>{formatCurrency(result.netProfit, activeCurrency)}</p>
                  <p className="mt-2 text-sm text-slate-300">Net profit margin: <strong className="text-white">{formatPercent(result.netMargin)}</strong></p>
                  {!result.inputsValid && <p className="mt-3 text-sm text-amber-200">{result.validationMessage || "Enter valid amounts to calculate the estimate."}</p>}
                </div>

                <dl className="mt-4">
                  <ResultRow label={revenueLabel} value={formatCurrency(result.revenue, activeCurrency)} />
                  <ResultRow label="Direct costs" value={formatCurrency(result.directCosts, activeCurrency)} />
                  <ResultRow label="Gross profit" value={`${formatCurrency(result.grossProfit, activeCurrency)} · ${formatPercent(result.grossMargin)}`} />
                  <ResultRow label="Additional expenses" value={formatCurrency(result.expenses, activeCurrency)} />
                  <ResultRow label="Total costs" value={formatCurrency(result.totalCosts, activeCurrency)} />
                  <ResultRow label="Markup on total costs" value={formatPercent(result.markup)} />
                  <ResultRow label={targetPriceLabel} value={formatCurrency(result.targetUnitPrice, activeCurrency)} emphasize />
                  {region === "india" && <>
                    <ResultRow label="GST amount on current sale" value={formatCurrency(result.gstAmount, activeCurrency)} />
                    <ResultRow label="Customer total for current sale" value={formatCurrency(result.customerTotal, activeCurrency)} />
                    <ResultRow label="Target customer price per unit, incl. GST" value={formatCurrency(result.targetCustomerUnitPrice, activeCurrency)} emphasize />
                  </>}
                </dl>

                {region === "india" && <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs leading-5 text-slate-400">GST is shown only as a pricing estimate using your entered rate. Costs are assumed to be entered excluding recoverable input GST. This is not a GST liability, input-credit or filing calculation.</p>}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="profit-examples-heading">
              <h2 id="profit-examples-heading" className="mb-4 text-xl font-bold text-white">⚡ Try an example</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {examples.map((example) => (
                  <button key={example.label} type="button" onClick={() => loadExample(example)} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">
                    {example.label}<span className="mt-1 block text-sm font-normal text-slate-400">Load sample inputs</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-amber-700 bg-amber-950/25 p-4 text-sm leading-6 text-amber-100">
              This is a planning estimate, not accounting or tax advice. Results use only the costs, expenses and optional GST rate you enter. Currency selection changes number formatting only; it does not convert currencies.
            </div>
          </div>
        </ToolCard>

        <section className="mt-10 grid gap-7 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">How to use the profit margin calculator</h2>
            <p className="mt-3 leading-7 text-slate-300">Enter the quantity sold, cost per unit, selling price per unit and any additional expenses for the whole sale. Choose a target net margin to estimate the unit price needed to cover the entered costs and reach that margin. The calculator updates profit, margin and markup as you edit the inputs.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Profit margin vs. markup</h2>
            <p className="mt-3 leading-7 text-slate-300">Profit margin is profit divided by revenue, multiplied by 100. Markup is profit divided by total costs, multiplied by 100. They use different denominators, so the percentages are not interchangeable. This page shows gross margin before additional expenses and net margin after the expenses you enter.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Optional India GST pricing</h2>
            <p className="mt-3 leading-7 text-slate-300">For India quotes, switch to India GST pricing, enter the rate applicable to your goods or service, and state whether your entered selling price includes GST. The estimate separates GST from sales revenue for margin math. For a dedicated GST breakdown, use the <Link className="font-semibold text-blue-300 underline decoration-blue-500/50 underline-offset-4 hover:text-blue-200" href="/gst-calculator">GST Calculator</Link>.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Formula and limitations</h2>
            <p className="mt-3 leading-7 text-slate-300">Net profit = sales revenue excluding GST − direct costs − additional expenses. Net margin = net profit ÷ revenue excluding GST × 100. Target unit price = total entered costs ÷ (1 − target margin) ÷ quantity. The tool does not include exchange-rate conversion, income tax, payment fees unless entered, inventory valuation, returns or accounting adjustments.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
