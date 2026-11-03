"use client";

import { useMemo, useState } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type Frequency = "annual" | "monthly" | "semiMonthly" | "biweekly" | "weekly";
type CurrencyCode =
  | "INR"
  | "USD"
  | "GBP"
  | "EUR"
  | "AED"
  | "CAD"
  | "AUD"
  | "NZD"
  | "SGD"
  | "SAR"
  | "PKR";

const frequencies: { value: Frequency; label: string; periods: number }[] = [
  { value: "annual", label: "Annual", periods: 1 },
  { value: "monthly", label: "Monthly", periods: 12 },
  { value: "semiMonthly", label: "Semi-monthly (twice a month)", periods: 24 },
  { value: "biweekly", label: "Biweekly (every 2 weeks)", periods: 26 },
  { value: "weekly", label: "Weekly", periods: 52 },
];

const currencies: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "INR", label: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "USD", label: "US Dollar (USD)", locale: "en-US" },
  { code: "GBP", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "EUR", label: "Euro (EUR)", locale: "de-DE" },
  { code: "AED", label: "UAE Dirham (AED)", locale: "en-AE" },
  { code: "CAD", label: "Canadian Dollar (CAD)", locale: "en-CA" },
  { code: "AUD", label: "Australian Dollar (AUD)", locale: "en-AU" },
  { code: "NZD", label: "New Zealand Dollar (NZD)", locale: "en-NZ" },
  { code: "SGD", label: "Singapore Dollar (SGD)", locale: "en-SG" },
  { code: "SAR", label: "Saudi Riyal (SAR)", locale: "en-SA" },
  { code: "PKR", label: "Pakistani Rupee (PKR)", locale: "en-PK" },
];

const numberInputClass =
  "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function parseAmount(value: string) {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
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
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}

export default function SalaryCalculatorPage() {
  const [salary, setSalary] = useState("1200000");
  const [frequency, setFrequency] = useState<Frequency>("annual");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [tax, setTax] = useState("0");
  const [retirement, setRetirement] = useState("0");
  const [insurance, setInsurance] = useState("0");
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [message, setMessage] = useState("");

  const result = useMemo(() => {
    const grossPay = parseAmount(salary);
    const deductionValues = [tax, retirement, insurance, otherDeductions].map(parseAmount);
    const selectedFrequency = frequencies.find((item) => item.value === frequency)!;
    const inputsValid = grossPay !== null && deductionValues.every((value) => value !== null);
    const gross = grossPay ?? 0;
    const deductions = deductionValues.reduce<number>((total, value) => total + (value ?? 0), 0);
    const takeHome = gross - deductions;
    const annualGross = gross * selectedFrequency.periods;
    const annualDeductions = deductions * selectedFrequency.periods;
    const annualTakeHome = takeHome * selectedFrequency.periods;

    return {
      gross,
      deductions,
      takeHome,
      annualGross,
      annualDeductions,
      annualTakeHome,
      monthlyTakeHome: annualTakeHome / 12,
      deductionRate: gross > 0 ? (deductions / gross) * 100 : 0,
      inputsValid,
      deductionsExceedPay: deductions > gross,
      periodLabel: selectedFrequency.label,
      periodsPerYear: selectedFrequency.periods,
    };
  }, [salary, frequency, tax, retirement, insurance, otherDeductions]);

  const updateExample = (example: {
    salary: string;
    frequency: Frequency;
    currency: CurrencyCode;
    tax: string;
    retirement: string;
    insurance: string;
    other: string;
  }) => {
    setSalary(example.salary);
    setFrequency(example.frequency);
    setCurrency(example.currency);
    setTax(example.tax);
    setRetirement(example.retirement);
    setInsurance(example.insurance);
    setOtherDeductions(example.other);
    setMessage("");
  };

  const examples = [
    {
      label: "Annual salary",
      salary: "1200000",
      frequency: "annual" as Frequency,
      currency: "INR" as CurrencyCode,
      tax: "120000",
      retirement: "60000",
      insurance: "24000",
      other: "0",
    },
    {
      label: "Monthly salary",
      salary: "75000",
      frequency: "monthly" as Frequency,
      currency: "INR" as CurrencyCode,
      tax: "0",
      retirement: "3000",
      insurance: "1500",
      other: "500",
    },
    {
      label: "Biweekly pay",
      salary: "2500",
      frequency: "biweekly" as Frequency,
      currency: "USD" as CurrencyCode,
      tax: "300",
      retirement: "100",
      insurance: "50",
      other: "0",
    },
  ];

  const copyResult = async () => {
    if (!result.inputsValid) {
      setMessage("Enter a valid non-negative salary and valid deduction amounts first.");
      return;
    }

    const text = `Salary Calculator Estimate\nCurrency: ${currency}\nPay frequency: ${result.periodLabel}\nGross pay per period: ${formatCurrency(result.gross, currency)}\nTotal deductions per period: ${formatCurrency(result.deductions, currency)}\nEstimated take-home per period: ${formatCurrency(result.takeHome, currency)}\nEstimated annual gross: ${formatCurrency(result.annualGross, currency)}\nEstimated annual deductions: ${formatCurrency(result.annualDeductions, currency)}\nEstimated annual take-home: ${formatCurrency(result.annualTakeHome, currency)}\nEstimated monthly take-home: ${formatCurrency(result.monthlyTakeHome, currency)}\nDeduction share: ${formatNumber(result.deductionRate)}%\nNote: deductions are user-entered; income tax and payroll rules are not calculated automatically.`;

    try {
      await navigator.clipboard.writeText(text);
      setMessage("Salary estimate copied.");
    } catch {
      setMessage("Unable to copy. Check clipboard permission and try again.");
    }
  };

  const resetCalculator = () => {
    setSalary("1200000");
    setFrequency("annual");
    setCurrency("INR");
    setTax("0");
    setRetirement("0");
    setInsurance("0");
    setOtherDeductions("0");
    setMessage("");
  };

  const deductionInputs = [
    { label: "Tax withholding entered by you", value: tax, setValue: setTax },
    { label: "Retirement / PF contribution", value: retirement, setValue: setRetirement },
    { label: "Health or other insurance", value: insurance, setValue: setInsurance },
    { label: "Other deductions", value: otherDeductions, setValue: setOtherDeductions },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="💰 Salary Calculator"
          description="Estimate take-home salary from your gross pay and entered deductions. Compare annual, monthly, semi-monthly, biweekly and weekly pay in your preferred currency."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="salary-input-heading">
                <h2 id="salary-input-heading" className="mb-5 text-2xl font-bold text-white">
                  ⚙️ Pay Details
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Gross salary per pay period</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      inputMode="decimal"
                      value={salary}
                      onChange={(event) => { setSalary(event.target.value); setMessage(""); }}
                      className={numberInputClass}
                      aria-label="Gross salary amount per pay period"
                    />
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Pay frequency</span>
                    <select value={frequency} onChange={(event) => setFrequency(event.target.value as Frequency)} className={numberInputClass}>
                      {frequencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>

                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Currency</span>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)} className={numberInputClass}>
                      {currencies.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-6 border-t border-slate-700 pt-5">
                  <h3 className="mb-1 text-lg font-bold text-white">Pay-period deductions</h3>
                  <p className="mb-4 text-sm leading-6 text-slate-400">Enter the amount withheld from each pay period selected above. Leave a field at zero if it does not apply.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {deductionInputs.map((item) => (
                      <label key={item.label} className="block min-w-0">
                        <span className="mb-2 block text-sm font-medium text-slate-300">{item.label}</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          value={item.value}
                          onChange={(event) => { item.setValue(event.target.value); setMessage(""); }}
                          className={numberInputClass}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button onClick={copyResult}>📋 Copy Result</Button>
                  <button type="button" onClick={resetCalculator} className="rounded-xl border border-slate-700 bg-slate-800 p-3 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">
                    🔄 Reset
                  </button>
                </div>
                {message && <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>}
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="salary-result-heading">
                <h2 id="salary-result-heading" className="mb-5 text-2xl font-bold text-white">📊 Salary Estimate</h2>
                <div className={`rounded-2xl border p-5 sm:p-6 ${result.deductionsExceedPay ? "border-amber-700 bg-amber-950/30" : "border-blue-700 bg-blue-950/30"}`}>
                  <p className="text-sm text-slate-300">Estimated take-home per pay period</p>
                  <p className="mt-2 break-words text-3xl font-extrabold text-blue-300 sm:text-4xl">{formatCurrency(result.takeHome, currency)}</p>
                  {!result.inputsValid && <p className="mt-3 text-sm text-amber-200">Enter valid non-negative amounts to get a reliable estimate.</p>}
                  {result.deductionsExceedPay && <p className="mt-3 text-sm text-amber-100">Entered deductions exceed gross pay for this period. Check the amounts and their pay frequency.</p>}
                </div>

                <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4"><dt className="text-sm text-slate-400">Gross per period</dt><dd className="mt-1 break-words text-lg font-bold text-white">{formatCurrency(result.gross, currency)}</dd></div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4"><dt className="text-sm text-slate-400">Deductions per period</dt><dd className="mt-1 break-words text-lg font-bold text-white">{formatCurrency(result.deductions, currency)}</dd></div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4"><dt className="text-sm text-slate-400">Estimated monthly take-home</dt><dd className="mt-1 break-words text-lg font-bold text-white">{formatCurrency(result.monthlyTakeHome, currency)}</dd></div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4"><dt className="text-sm text-slate-400">Estimated annual take-home</dt><dd className="mt-1 break-words text-lg font-bold text-white">{formatCurrency(result.annualTakeHome, currency)}</dd></div>
                </dl>

                <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                  Estimated deductions: <strong className="text-white">{formatNumber(result.deductionRate)}%</strong> of gross pay. Annual figures use {result.periodsPerYear} {result.periodsPerYear === 1 ? "pay period" : "pay periods"} per year.
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="salary-examples-heading">
              <h2 id="salary-examples-heading" className="mb-4 text-xl font-bold text-white">⚡ Try an example</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {examples.map((example) => (
                  <button key={example.label} type="button" onClick={() => updateExample(example)} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">
                    {example.label}<span className="mt-1 block text-sm font-normal text-slate-400">Load sample inputs</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="rounded-2xl border border-amber-700 bg-amber-950/30 p-5 text-sm leading-6 text-amber-100">
              This is an estimate, not a payroll or tax calculation. ToolMint does not automatically calculate income tax, statutory contributions, benefits, bonuses or employer-side CTC. Enter the deductions shown by your own payroll or estimate them separately; actual take-home pay depends on your employer and local rules.
            </div>
          </div>
        </ToolCard>

        <section className="mt-10 grid gap-7 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">How to use the salary calculator</h2>
            <p className="mt-3 leading-7 text-slate-300">Enter gross pay, choose how often it is paid, and select the currency. Add tax withholding, retirement or PF, insurance and other deductions as amounts for that same pay period. The calculator subtracts those entries and shows estimated take-home pay for each period, plus monthly and annual estimates.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">How the estimate works</h2>
            <p className="mt-3 leading-7 text-slate-300">Estimated take-home per period equals gross pay minus the deductions you enter. Annual estimates use 1 annual, 12 monthly, 24 semi-monthly, 26 biweekly or 52 weekly pay periods. Monthly take-home is annual take-home divided by 12. No tax slab, contribution rate or exchange-rate conversion is applied automatically.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">What counts as a deduction?</h2>
            <p className="mt-3 leading-7 text-slate-300">You can enter payroll withholding, employee retirement or provident-fund contributions, insurance premiums and any other recurring deduction. Use the amount actually deducted each selected pay period. Employer contributions are not subtracted unless you include them yourself.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Salary calculator FAQ</h2>
            <p className="mt-3 leading-7 text-slate-300"><strong className="text-white">Does this calculate income tax?</strong> No. Enter your estimated or payroll tax withholding in its field. <strong className="text-white">Does it convert currencies?</strong> No; currency changes formatting only. <strong className="text-white">Why can my payslip differ?</strong> Employers may include variable pay, benefits, local deductions, tax adjustments or different pay-period rules.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
