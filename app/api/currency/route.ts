import { NextResponse } from "next/server";

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

function getFallbackRate(from: string, to: string) {
  if (from === to) return 1;

  const fromRate = fallbackRates[from];
  const toRate = fallbackRates[to];

  if (!fromRate || !toRate) return null;

  return toRate / fromRate;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const amount = Number(searchParams.get("amount") || "1");
  const from = (searchParams.get("from") || "USD").toUpperCase();
  const to = (searchParams.get("to") || "INR").toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: "Please enter a valid amount greater than 0.",
      },
      { status: 400 }
    );
  }

  if (!from || !to) {
    return NextResponse.json(
      {
        success: false,
        error: "Please select both currencies.",
      },
      { status: 400 }
    );
  }

  if (from === to) {
    return NextResponse.json({
      success: true,
      live: true,
      provider: "Same currency",
      amount,
      from,
      to,
      rate: 1,
      converted: amount,
      updated: new Date().toISOString(),
    });
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (apiKey) {
    try {
      const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}/${amount}`;
      const response = await fetch(apiUrl, {
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const data = await response.json();

        if (
          data.result === "success" &&
          typeof data.conversion_rate === "number" &&
          typeof data.conversion_result === "number"
        ) {
          return NextResponse.json({
            success: true,
            live: true,
            provider: "ExchangeRate API",
            amount,
            from,
            to,
            rate: data.conversion_rate,
            converted: data.conversion_result,
            updated: data.time_last_update_utc || new Date().toISOString(),
          });
        }
      }
    } catch {
      // Public fallback will run below.
    }
  }

  try {
    const publicUrl = `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`;
    const response = await fetch(publicUrl, {
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      const converted = data?.rates?.[to];

      if (typeof converted === "number") {
        return NextResponse.json({
          success: true,
          live: true,
          provider: "Frankfurter API",
          amount,
          from,
          to,
          rate: converted / amount,
          converted,
          updated: data.date || new Date().toISOString(),
        });
      }
    }
  } catch {
    // Manual fallback will run below.
  }

  const fallbackRate = getFallbackRate(from, to);

  if (fallbackRate) {
    return NextResponse.json({
      success: true,
      live: false,
      provider: "Manual fallback",
      amount,
      from,
      to,
      rate: fallbackRate,
      converted: amount * fallbackRate,
      updated: new Date().toISOString(),
      warning:
        "Live rate is unavailable right now, so an approximate fallback rate is being used.",
    });
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Currency rate is not available right now. Please try another currency pair.",
    },
    { status: 400 }
  );
}