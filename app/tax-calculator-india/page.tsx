"use client";

import { useMemo, useState } from "react";

import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import {
  AgeGroup,
  calculateIndiaTax,
  INDIA_TAX_RULES,
  IndiaTaxResult,
  TaxRegime,
} from "@/lib/indiaTax";

type DisplayRegime = TaxRegime | "compare";

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function parseAmount(value: string) {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000_000 ? amount : null;
}

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}%`;
}

type RegimeEstimate = {
  regime: TaxRegime;
  standardDeduction: number;
  additionalDeductions: number;
  result: IndiaTaxResult;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-700/80 py-2 last:border-0">
      <dt className="min-w-0 text-sm text-slate-400">{label}</dt>
      <dd className="shrink-0 text-right text-sm font-semibold text-slate-100">{value}</dd>
    </div>
  );
}

function EstimatePanel({ estimate, recommended }: { estimate: RegimeEstimate; recommended: boolean }) {
  const { result } = estimate;
  const title = estimate.regime === "new" ? "New tax regime" : "Old tax regime";

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-label={`${title} estimate`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {recommended && <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-200">Lower estimate</span>}
      </div>

      <div className="mt-4 rounded-xl border border-blue-800 bg-blue-950/30 p-4">
        <p className="text-sm text-slate-300">Estimated annual income tax</p>
        <p className="mt-1 break-words text-3xl font-extrabold text-blue-300">{formatINR(result.totalTax)}</p>
        <p className="mt-2 text-sm text-slate-400">About {formatINR(result.totalTax / 12)} per month · effective rate {formatPercent(result.effectiveRate)}</p>
      </div>

      <dl className="mt-4">
        <SummaryRow label="Taxable income" value={formatINR(result.taxableIncome)} />
        <SummaryRow label="Salary standard deduction" value={formatINR(estimate.standardDeduction)} />
        {estimate.additionalDeductions > 0 && <SummaryRow label="Other entered deductions / exemptions" value={formatINR(estimate.additionalDeductions)} />}
        <SummaryRow label="Tax before rebate" value={formatINR(result.slabTax)} />
        <SummaryRow label="Rebate and relief" value={`-${formatINR(result.rebate)}`} />
        <SummaryRow label="Surcharge" value={formatINR(result.surcharge)} />
        {result.marginalRelief > 0 && <SummaryRow label="Surcharge marginal relief" value={`-${formatINR(result.marginalRelief)}`} />}
        <SummaryRow label="Health & Education cess (4%)" value={formatINR(result.cess)} />
      </dl>
    </section>
  );
}

export default function IndiaTaxCalculatorPage() {
  const [salary, setSalary] = useState("1200000");
  const [otherIncome, setOtherIncome] = useState("0");
  const [oldDeductions, setOldDeductions] = useState("150000");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("under60");
  const [resident, setResident] = useState(true);
  const [displayRegime, setDisplayRegime] = useState<DisplayRegime>("compare");
  const [message, setMessage] = useState("");

  const estimate = useMemo(() => {
    const salaryAmount = parseAmount(salary);
    const otherAmount = parseAmount(otherIncome);
    const oldDeductionAmount = parseAmount(oldDeductions);
    if (salaryAmount === null || otherAmount === null || oldDeductionAmount === null) return null;

    const totalIncomeBeforeDeductions = salaryAmount + otherAmount;
    const newStandardDeduction = Math.min(salaryAmount, INDIA_TAX_RULES.salaryStandardDeduction.new);
    const oldStandardDeduction = Math.min(salaryAmount, INDIA_TAX_RULES.salaryStandardDeduction.old);
    const newTaxableIncome = Math.max(0, totalIncomeBeforeDeductions - newStandardDeduction);
    const oldTaxableIncome = Math.max(0, totalIncomeBeforeDeductions - oldStandardDeduction - oldDeductionAmount);

    const newRegime: RegimeEstimate = {
      regime: "new",
      standardDeduction: newStandardDeduction,
      additionalDeductions: 0,
      result: calculateIndiaTax({ taxableIncome: newTaxableIncome, regime: "new", ageGroup, resident }),
    };
    const oldRegime: RegimeEstimate = {
      regime: "old",
      standardDeduction: oldStandardDeduction,
      additionalDeductions: Math.min(oldDeductionAmount, Math.max(0, totalIncomeBeforeDeductions - oldStandardDeduction)),
      result: calculateIndiaTax({ taxableIncome: oldTaxableIncome, regime: "old", ageGroup, resident }),
    };

    return { newRegime, oldRegime };
  }, [salary, otherIncome, oldDeductions, ageGroup, resident]);

  const visibleEstimates = useMemo(() => {
    if (!estimate) return [];
    if (displayRegime === "compare") return [estimate.newRegime, estimate.oldRegime];
    return [displayRegime === "new" ? estimate.newRegime : estimate.oldRegime];
  }, [estimate, displayRegime]);

  const reset = () => {
    setSalary("1200000");
    setOtherIncome("0");
    setOldDeductions("150000");
    setAgeGroup("under60");
    setResident(true);
    setDisplayRegime("compare");
    setMessage("");
  };

  const loadExample = (salaryValue: string, deductionValue: string) => {
    setSalary(salaryValue);
    setOtherIncome("0");
    setOldDeductions(deductionValue);
    setAgeGroup("under60");
    setResident(true);
    setDisplayRegime("compare");
    setMessage("");
  };

  const copyResult = async () => {
    if (!estimate) {
      setMessage("Enter valid non-negative amounts before copying the estimate.");
      return;
    }

    const lines = [
      `India Income Tax Estimate - Tax Year ${INDIA_TAX_RULES.taxYear}`,
      `Resident individual: ${resident ? "Yes" : "No"}`,
      `Annual salary / pension: ${formatINR(Number(salary))}`,
      `Other slab-rate income: ${formatINR(Number(otherIncome))}`,
      `Old-regime deductions/exemptions entered: ${formatINR(Number(oldDeductions))}`,
      ...[estimate.newRegime, estimate.oldRegime].map(({ regime, result }) =>
        `${regime === "new" ? "New" : "Old"} regime estimate: ${formatINR(result.totalTax)} (taxable income ${formatINR(result.taxableIncome)})`,
      ),
      "Estimate only; special-rate income and individual deduction eligibility are not fully assessed.",
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setMessage("Tax estimate copied.");
    } catch {
      setMessage("Unable to copy. Check clipboard permission and try again.");
    }
  };

  const exampleButtons = [
    { label: "Salary ₹12 lakh", salary: "1200000", deductions: "150000" },
    { label: "Salary ₹18 lakh", salary: "1800000", deductions: "200000" },
    { label: "Salary ₹30 lakh", salary: "3000000", deductions: "250000" },
  ];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <PageTitle
          title="🇮🇳 India Income Tax Calculator"
          description={`Estimate and compare new and old regime income tax for Tax Year ${INDIA_TAX_RULES.taxYear}. Includes salary standard deduction, resident rebates, surcharge and marginal relief.`}
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="tax-input-heading">
                <h2 id="tax-input-heading" className="mb-5 text-2xl font-bold text-white">⚙️ Income and tax details</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Annual salary or pension income before standard deduction</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={salary} onChange={(event) => { setSalary(event.target.value); setMessage(""); }} className={inputClass} aria-label="Annual salary or pension income in rupees" />
                    <span className="mt-1 block text-xs leading-5 text-slate-400">The calculator applies the selected regime&apos;s standard deduction to this amount.</span>
                  </label>
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Other annual income taxed at slab rates</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={otherIncome} onChange={(event) => { setOtherIncome(event.target.value); setMessage(""); }} className={inputClass} aria-label="Other annual income taxed at slab rates in rupees" />
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Age group (old regime)</span>
                    <select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value as AgeGroup)} className={inputClass}>
                      <option value="under60">Below 60</option>
                      <option value="60to79">60 to 79</option>
                      <option value="80plus">80 or above</option>
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Show estimate</span>
                    <select value={displayRegime} onChange={(event) => setDisplayRegime(event.target.value as DisplayRegime)} className={inputClass}>
                      <option value="compare">Compare both regimes</option>
                      <option value="new">New regime</option>
                      <option value="old">Old regime</option>
                    </select>
                  </label>
                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Old-regime eligible deductions / exemptions</span>
                    <input type="number" min="0" max="1000000000000" step="any" inputMode="decimal" value={oldDeductions} onChange={(event) => { setOldDeductions(event.target.value); setMessage(""); }} className={inputClass} aria-label="Old regime eligible deductions and exemptions excluding standard deduction" />
                    <span className="mt-1 block text-xs leading-5 text-slate-400">Enter your own eligible total (for example, applicable 80C, 80D or exemptions). Exclude the standard deduction; individual eligibility and statutory limits are not validated.</span>
                  </label>
                </div>

                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
                  <input type="checkbox" checked={resident} onChange={(event) => setResident(event.target.checked)} className="mt-0.5 size-4 accent-blue-500" />
                  <span><strong className="block text-white">I am a resident individual in India</strong><span className="mt-1 block text-slate-400">Residence status affects the 87A rebate and old-regime age-based exemption thresholds.</span></span>
                </label>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={copyResult}>📋 Copy Estimate</Button>
                  <button type="button" onClick={reset} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300">🔄 Reset</button>
                </div>
                {message && <p role="status" className="mt-3 text-sm text-blue-200">{message}</p>}
                {!estimate && <p role="alert" className="mt-3 text-sm text-rose-300">Enter valid, non-negative amounts. Each amount must be no more than ₹1,000,000,000,000.</p>}
              </section>

              <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="tax-result-heading">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="tax-result-heading" className="text-2xl font-bold text-white">📊 Tax estimate</h2>
                    <p className="mt-1 text-sm text-slate-400">Tax Year {INDIA_TAX_RULES.taxYear} · Income-tax Act, 2025</p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">Rates checked {INDIA_TAX_RULES.verifiedOn}</span>
                </div>

                {estimate ? (
                  <div className="mt-5 space-y-3">
                    {visibleEstimates.map((item) => (
                      <EstimatePanel
                        key={item.regime}
                        estimate={item}
                        recommended={displayRegime === "compare" && item.result.totalTax < (item.regime === "new" ? estimate.oldRegime.result.totalTax : estimate.newRegime.result.totalTax)}
                      />
                    ))}
                    {displayRegime === "compare" && <p className="text-xs leading-5 text-slate-400">The lower amount is only a comparison on the inputs provided. It is not a personalized recommendation to choose a regime.</p>}
                  </div>
                ) : (
                  <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-5 text-sm text-slate-400">Enter valid income amounts to see the estimate.</div>
                )}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6" aria-labelledby="tax-examples-heading">
              <h2 id="tax-examples-heading" className="mb-4 text-xl font-bold text-white">⚡ Quick examples</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {exampleButtons.map((example) => (
                  <button key={example.label} type="button" onClick={() => loadExample(example.salary, example.deductions)} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-semibold text-slate-200 transition hover:border-blue-500 hover:text-blue-200">
                    {example.label}<span className="mt-1 block text-sm font-normal text-slate-400">Compare both tax regimes</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-5 text-sm leading-6 text-amber-100">
              <strong className="block text-base">Important: estimate, not tax or legal advice</strong>
              This calculator estimates individual slab-rate income tax only. It does not calculate capital gains, lottery or other special-rate income, AMT, foreign tax relief, every deduction/exemption, advance tax, interest, penalties or ITR liability. Old-regime deductions are user-entered and not checked for eligibility or statutory caps. For a final assessment, use the official Income Tax Department utility or a qualified tax professional.
            </div>
          </div>
        </ToolCard>

        <section className="mt-10 grid gap-7 border-t border-slate-800 pt-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-white">How the India tax estimate works</h2>
            <p className="mt-3 leading-7 text-slate-300">Enter annual salary or pension income and other income that is taxed at normal slab rates. The calculator applies the salary standard deduction for the selected regime, then computes slab tax. For the old regime, enter any other eligible deductions or exemptions you expect to claim, excluding the standard deduction. The calculator then estimates rebate, surcharge, surcharge marginal relief and 4% Health and Education cess.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Tax Year 2026–27 slabs</h2>
            <p className="mt-3 leading-7 text-slate-300">Under the new regime, the bands are ₹0–4 lakh at 0%, ₹4–8 lakh at 5%, ₹8–12 lakh at 10%, ₹12–16 lakh at 15%, ₹16–20 lakh at 20%, ₹20–24 lakh at 25%, and income above ₹24 lakh at 30%. New-regime salary standard deduction is up to ₹75,000; old-regime salary standard deduction is up to ₹50,000.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">New versus old regime</h2>
            <p className="mt-3 leading-7 text-slate-300">The new regime applies its own slab rates and eligible resident rebate. The old regime uses different slabs, age-based basic exemption thresholds for resident senior citizens, and user-entered eligible deductions. The comparison is only as accurate as those inputs; it does not check which exemptions or deductions you qualify for.</p>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Official rate sources and updates</h2>
            <p className="mt-3 leading-7 text-slate-300">Rules are stored centrally with the effective tax year, verification date and official references. These rates were checked against government publications on {INDIA_TAX_RULES.verifiedOn}. ToolMint does not monitor or update tax rates live. After a Union Budget or amendment, the rules must be re-verified, the central values and tests updated, and the site redeployed.</p>
            <ul className="mt-3 space-y-2 text-sm text-blue-300">
              <li><a className="underline underline-offset-2 hover:text-blue-200" href={INDIA_TAX_RULES.sources[0]} target="_blank" rel="noreferrer">Income-tax Act 2025, Section 202: tax slabs</a></li>
              <li><a className="underline underline-offset-2 hover:text-blue-200" href={INDIA_TAX_RULES.sources[1]} target="_blank" rel="noreferrer">Income-tax Act 2025, Section 19: salary deductions</a></li>
              <li><a className="underline underline-offset-2 hover:text-blue-200" href={INDIA_TAX_RULES.sources[2]} target="_blank" rel="noreferrer">Income-tax Act 2025: rebate provisions</a></li>
              <li><a className="underline underline-offset-2 hover:text-blue-200" href={INDIA_TAX_RULES.sources[3]} target="_blank" rel="noreferrer">Union Budget memorandum: Tax Year 2026–27 rates</a></li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
