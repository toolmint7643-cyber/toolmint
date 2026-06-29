"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const quickDiscounts = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70];

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DiscountCalculatorPage() {
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [extraDiscountPercent, setExtraDiscountPercent] = useState("");
  const [taxPercent, setTaxPercent] = useState("");

  const result = useMemo(() => {
    const price = toNumber(originalPrice);
    const discount = toNumber(discountPercent);
    const extraDiscount = toNumber(extraDiscountPercent);
    const tax = toNumber(taxPercent);

    if (!originalPrice || price <= 0) {
      return {
        firstDiscountAmount: 0,
        priceAfterFirstDiscount: 0,
        extraDiscountAmount: 0,
        priceAfterDiscount: 0,
        savedAmount: 0,
        effectiveDiscount: 0,
        taxAmount: 0,
        finalPrice: 0,
      };
    }

    const firstDiscountAmount = (price * discount) / 100;
    const priceAfterFirstDiscount = price - firstDiscountAmount;

    const extraDiscountAmount =
      (priceAfterFirstDiscount * extraDiscount) / 100;
    const priceAfterDiscount = priceAfterFirstDiscount - extraDiscountAmount;

    const savedAmount = price - priceAfterDiscount;
    const effectiveDiscount = (savedAmount / price) * 100;

    const taxAmount = (priceAfterDiscount * tax) / 100;
    const finalPrice = priceAfterDiscount + taxAmount;

    return {
      firstDiscountAmount,
      priceAfterFirstDiscount,
      extraDiscountAmount,
      priceAfterDiscount,
      savedAmount,
      effectiveDiscount,
      taxAmount,
      finalPrice,
    };
  }, [originalPrice, discountPercent, extraDiscountPercent, taxPercent]);

  const resetCalculator = () => {
    setOriginalPrice("");
    setDiscountPercent("");
    setExtraDiscountPercent("");
    setTaxPercent("");
  };

  const copyResult = async () => {
    const text = `Discount Calculator Result

Original Price: ${formatCurrency(toNumber(originalPrice))}
Discount: ${formatNumber(toNumber(discountPercent))}%
Extra Discount: ${formatNumber(toNumber(extraDiscountPercent))}%
Tax After Discount: ${formatNumber(toNumber(taxPercent))}%

Saved Amount: ${formatCurrency(result.savedAmount)}
Effective Discount: ${formatNumber(result.effectiveDiscount)}%
Price After Discount: ${formatCurrency(result.priceAfterDiscount)}
Tax Amount: ${formatCurrency(result.taxAmount)}
Final Price: ${formatCurrency(result.finalPrice)}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Discount result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const summaryCards = [
    {
      label: "Final Price",
      value: formatCurrency(result.finalPrice),
      icon: "✅",
    },
    {
      label: "You Save",
      value: formatCurrency(result.savedAmount),
      icon: "💰",
    },
    {
      label: "Effective Discount",
      value: `${formatNumber(result.effectiveDiscount)}%`,
      icon: "🏷️",
    },
    {
      label: "Tax Amount",
      value: formatCurrency(result.taxAmount),
      icon: "🧾",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🏷️ Discount Calculator"
          description="Calculate final price, savings, extra discounts and tax after discount instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Original Price
                </span>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(event) => setOriginalPrice(event.target.value)}
                  placeholder="Example: 2000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Discount %
                </span>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  placeholder="Example: 30"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Extra Discount % Optional
                </span>
                <input
                  type="number"
                  value={extraDiscountPercent}
                  onChange={(event) =>
                    setExtraDiscountPercent(event.target.value)
                  }
                  placeholder="Example: 10"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-slate-300">
                  Tax After Discount % Optional
                </span>
                <input
                  type="number"
                  value={taxPercent}
                  onChange={(event) => setTaxPercent(event.target.value)}
                  placeholder="Example: 18"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div>
              <h2 className="mb-3 text-xl font-bold">
                ⚡ Quick Discount
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                {quickDiscounts.map((discount) => (
                  <button
                    key={discount}
                    onClick={() => setDiscountPercent(discount.toString())}
                    className={`rounded-xl border p-3 text-center font-bold transition ${
                      discountPercent === discount.toString()
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-500"
                    }`}
                  >
                    {discount}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {summaryCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="text-3xl mb-2">{item.icon}</div>

                  <div className="text-3xl font-extrabold text-blue-400">
                    {item.value}
                  </div>

                  <div className="mt-2 text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                📊 Price Breakdown
              </h2>

              <div className="space-y-3 text-slate-200">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Original Price</span>
                  <span className="font-bold text-white">
                    {formatCurrency(toNumber(originalPrice))}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Discount Amount</span>
                  <span className="font-bold text-green-400">
                    - {formatCurrency(result.firstDiscountAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Extra Discount Amount</span>
                  <span className="font-bold text-green-400">
                    - {formatCurrency(result.extraDiscountAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Price After Discount</span>
                  <span className="font-bold text-white">
                    {formatCurrency(result.priceAfterDiscount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span>Tax Amount</span>
                  <span className="font-bold text-yellow-400">
                    + {formatCurrency(result.taxAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 text-lg">
                  <span className="font-bold">Final Price</span>
                  <span className="font-extrabold text-blue-400">
                    {formatCurrency(result.finalPrice)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                💡 Common Uses
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  🛒 Calculate sale prices while shopping online.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  🏷️ Compare single and extra discount offers.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  🧾 Add tax after discount for final billing.
                </p>

                <p className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-100">
                  💰 Find exact savings before checkout.
                </p>
              </div>
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