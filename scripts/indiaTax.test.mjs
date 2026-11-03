import assert from "node:assert/strict";
import test from "node:test";

import { calculateIndiaTax } from "../lib/indiaTax.ts";

test("new regime applies section 156 rebate through the 12 lakh threshold", () => {
  const result = calculateIndiaTax({ taxableIncome: 1_200_000, regime: "new" });
  assert.equal(result.totalTax, 0);
  assert.equal(result.rebate, 60_000);
});

test("new regime marginal relief limits tax just above 12 lakh", () => {
  const result = calculateIndiaTax({ taxableIncome: 1_220_000, regime: "new" });
  assert.equal(result.taxAfterRebate, 20_000);
  assert.equal(result.totalTax, 20_800);
});

test("old regime resident rebate removes tax at 5 lakh", () => {
  const result = calculateIndiaTax({ taxableIncome: 500_000, regime: "old" });
  assert.equal(result.totalTax, 0);
  assert.equal(result.rebate, 12_500);
});

test("old regime age thresholds apply only to resident individuals", () => {
  const seniorResident = calculateIndiaTax({ taxableIncome: 300_000, regime: "old", ageGroup: "60to79" });
  const nonResident = calculateIndiaTax({ taxableIncome: 300_000, regime: "old", ageGroup: "80plus", resident: false });
  assert.equal(seniorResident.slabTax, 0);
  assert.equal(nonResident.slabTax, 2_500);
});

test("non-residents do not receive the section 156 new-regime rebate", () => {
  const result = calculateIndiaTax({ taxableIncome: 1_200_000, regime: "new", resident: false });
  assert.equal(result.taxAfterRebate, 60_000);
  assert.equal(result.totalTax, 62_400);
});

test("surcharge marginal relief prevents a tax jump at 50 lakh", () => {
  const result = calculateIndiaTax({ taxableIncome: 5_000_001, regime: "new" });
  assert.ok(result.marginalRelief > 0);
  assert.ok(result.taxAfterRebate + result.surcharge <= 1_080_001.01);
});

test("marginal relief does not keep applying the 50 lakh cap at 3 crore", () => {
  const result = calculateIndiaTax({ taxableIncome: 30_000_000, regime: "new" });
  assert.equal(result.marginalRelief, 0);
  assert.equal(result.surchargeRate, 0.25);
});

test("invalid taxable income is rejected", () => {
  assert.throws(() => calculateIndiaTax({ taxableIncome: -1, regime: "new" }), RangeError);
});
