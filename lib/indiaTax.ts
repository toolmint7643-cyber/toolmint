export type TaxRegime = "new" | "old";
export type AgeGroup = "under60" | "60to79" | "80plus";

export const INDIA_TAX_RULES = {
  taxYear: "2026-27",
  act: "Income-tax Act, 2025",
  effectiveFrom: "2026-04-01",
  verifiedOn: "2026-11-03",
  cessRate: 0.04,
  salaryStandardDeduction: {
    new: 75_000,
    old: 50_000,
  },
  newRegimeRebate: {
    incomeLimit: 1_200_000,
    maximum: 60_000,
  },
  oldRegimeRebate: {
    incomeLimit: 500_000,
    maximum: 12_500,
  },
  sources: [
    "https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/section-202-78",
    "https://wmstatic-prd.incometaxindia.gov.in/web/guest/w/section-19-199",
    "https://incometaxindia.gov.in/Documents/Act/Income-tax-Act-2025.pdf",
    "https://www.indiabudget.gov.in/doc/memo.pdf",
  ],
} as const;

type Slab = { limit: number | null; rate: number };

const NEW_REGIME_SLABS: readonly Slab[] = [
  { limit: 400_000, rate: 0 },
  { limit: 800_000, rate: 0.05 },
  { limit: 1_200_000, rate: 0.1 },
  { limit: 1_600_000, rate: 0.15 },
  { limit: 2_000_000, rate: 0.2 },
  { limit: 2_400_000, rate: 0.25 },
  { limit: null, rate: 0.3 },
];

function getOldRegimeSlabs(ageGroup: AgeGroup, resident: boolean): readonly Slab[] {
  if (resident && ageGroup === "80plus") {
    return [
      { limit: 500_000, rate: 0 },
      { limit: 1_000_000, rate: 0.2 },
      { limit: null, rate: 0.3 },
    ];
  }

  if (resident && ageGroup === "60to79") {
    return [
      { limit: 300_000, rate: 0 },
      { limit: 500_000, rate: 0.05 },
      { limit: 1_000_000, rate: 0.2 },
      { limit: null, rate: 0.3 },
    ];
  }

  return [
    { limit: 250_000, rate: 0 },
    { limit: 500_000, rate: 0.05 },
    { limit: 1_000_000, rate: 0.2 },
    { limit: null, rate: 0.3 },
  ];
}

function taxForSlabs(income: number, slabs: readonly Slab[]) {
  let tax = 0;
  let lowerLimit = 0;

  for (const slab of slabs) {
    const upperLimit = slab.limit ?? Number.POSITIVE_INFINITY;
    const taxableInBand = Math.max(0, Math.min(income, upperLimit) - lowerLimit);
    tax += taxableInBand * slab.rate;
    lowerLimit = upperLimit;

    if (income <= upperLimit) break;
  }

  return tax;
}

function calculateSlabTax(income: number, regime: TaxRegime, ageGroup: AgeGroup, resident: boolean) {
  const slabs = regime === "new" ? NEW_REGIME_SLABS : getOldRegimeSlabs(ageGroup, resident);
  return taxForSlabs(income, slabs);
}

function calculateRebate(income: number, slabTax: number, regime: TaxRegime, resident: boolean) {
  if (!resident) return 0;

  if (regime === "old") {
    return income <= INDIA_TAX_RULES.oldRegimeRebate.incomeLimit
      ? Math.min(slabTax, INDIA_TAX_RULES.oldRegimeRebate.maximum)
      : 0;
  }

  const { incomeLimit, maximum } = INDIA_TAX_RULES.newRegimeRebate;
  if (income <= incomeLimit) return Math.min(slabTax, maximum);

  const marginalRelief = slabTax - (income - incomeLimit);
  return Math.min(slabTax, Math.max(0, marginalRelief));
}

function surchargeRateForIncome(income: number, regime: TaxRegime) {
  if (income > 20_000_000) return regime === "new" ? 0.25 : income > 50_000_000 ? 0.37 : 0.25;
  if (income > 10_000_000) return 0.15;
  if (income > 5_000_000) return 0.1;
  return 0;
}

function surchargeThresholds(regime: TaxRegime) {
  return regime === "new"
    ? [5_000_000, 10_000_000, 20_000_000]
    : [5_000_000, 10_000_000, 20_000_000, 50_000_000];
}

export type IndiaTaxResult = {
  taxableIncome: number;
  slabTax: number;
  rebate: number;
  taxAfterRebate: number;
  surchargeRate: number;
  surcharge: number;
  marginalRelief: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
};

export function calculateIndiaTax({
  taxableIncome,
  regime,
  ageGroup = "under60",
  resident = true,
}: {
  taxableIncome: number;
  regime: TaxRegime;
  ageGroup?: AgeGroup;
  resident?: boolean;
}): IndiaTaxResult {
  if (!Number.isFinite(taxableIncome) || taxableIncome < 0) {
    throw new RangeError("Taxable income must be a finite, non-negative number.");
  }

  const slabTax = calculateSlabTax(taxableIncome, regime, ageGroup, resident);
  const rebate = calculateRebate(taxableIncome, slabTax, regime, resident);
  const taxAfterRebate = Math.max(0, slabTax - rebate);
  const surchargeRate = surchargeRateForIncome(taxableIncome, regime);
  const nominalTaxWithSurcharge = taxAfterRebate * (1 + surchargeRate);

  const activeThreshold = surchargeThresholds(regime)
    .filter((threshold) => taxableIncome > threshold)
    .at(-1);
  let maximumTaxWithSurcharge = nominalTaxWithSurcharge;
  if (activeThreshold !== undefined) {
    const threshold = activeThreshold;
    const taxAtThreshold = calculateSlabTax(threshold, regime, ageGroup, resident);
    const rebateAtThreshold = calculateRebate(threshold, taxAtThreshold, regime, resident);
    const taxAfterRebateAtThreshold = taxAtThreshold - rebateAtThreshold;
    const previousSurchargeRate = surchargeRateForIncome(threshold, regime);
    const allowedAtThreshold = taxAfterRebateAtThreshold * (1 + previousSurchargeRate);
    maximumTaxWithSurcharge = Math.min(
      maximumTaxWithSurcharge,
      allowedAtThreshold + (taxableIncome - threshold),
    );
  }

  const taxWithSurcharge = Math.min(nominalTaxWithSurcharge, maximumTaxWithSurcharge);
  const surcharge = Math.max(0, taxWithSurcharge - taxAfterRebate);
  const marginalRelief = Math.max(0, nominalTaxWithSurcharge - taxWithSurcharge);
  const cess = taxWithSurcharge * INDIA_TAX_RULES.cessRate;
  const totalTax = taxWithSurcharge + cess;

  return {
    taxableIncome,
    slabTax,
    rebate,
    taxAfterRebate,
    surchargeRate,
    surcharge,
    marginalRelief,
    cess,
    totalTax,
    effectiveRate: taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0,
  };
}
