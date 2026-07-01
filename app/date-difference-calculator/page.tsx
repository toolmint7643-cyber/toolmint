"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OperationMode = "add" | "subtract";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
  }).format(date);
}

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getCalendarDifference(start: Date, end: Date) {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

function countWeekdaysAndWeekends(start: Date, end: Date, includeEndDate: boolean) {
  let weekdays = 0;
  let weekends = 0;

  const current = new Date(start);
  const finalDate = includeEndDate ? end : addDays(end, -1);

  while (current <= finalDate) {
    const day = current.getDay();

    if (day === 0 || day === 6) {
      weekends += 1;
    } else {
      weekdays += 1;
    }

    current.setDate(current.getDate() + 1);
  }

  return { weekdays, weekends };
}

export default function DateDifferenceCalculatorPage() {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(todayValue());
  const [includeEndDate, setIncludeEndDate] = useState(false);

  const [operationBaseDate, setOperationBaseDate] = useState(todayValue());
  const [operationDays, setOperationDays] = useState("30");
  const [operationMode, setOperationMode] = useState<OperationMode>("add");

  const result = useMemo(() => {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const isReversed = start > end;
    const from = isReversed ? end : start;
    const to = isReversed ? start : end;

    const extraDay = includeEndDate ? 1 : 0;
    const totalDays = Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY) + extraDay;
    const calendar = getCalendarDifference(from, includeEndDate ? addDays(to, 1) : to);
    const weekData = countWeekdaysAndWeekends(from, to, includeEndDate);

    return {
      isReversed,
      from,
      to,
      totalDays,
      totalWeeks: totalDays / 7,
      totalMonthsApprox: totalDays / 30.436875,
      calendar,
      weekdays: weekData.weekdays,
      weekends: weekData.weekends,
    };
  }, [startDate, endDate, includeEndDate]);

  const operationResult = useMemo(() => {
    const base = parseDate(operationBaseDate);
    const days = Number(operationDays);
    const safeDays = Number.isFinite(days) ? days : 0;

    return operationMode === "add" ? addDays(base, safeDays) : addDays(base, -safeDays);
  }, [operationBaseDate, operationDays, operationMode]);

  const copyResult = async () => {
    const text = `Date Difference Calculator Result

Start Date: ${formatDate(parseDate(startDate))}
End Date: ${formatDate(parseDate(endDate))}
Include End Date: ${includeEndDate ? "Yes" : "No"}

Calendar Difference: ${result.calendar.years} years, ${result.calendar.months} months, ${result.calendar.days} days
Total Days: ${result.totalDays}
Total Weeks: ${result.totalWeeks.toFixed(2)}
Weekdays: ${result.weekdays}
Weekends: ${result.weekends}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Date difference result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const resetTool = () => {
    setStartDate("2026-01-01");
    setEndDate(todayValue());
    setIncludeEndDate(false);
    setOperationBaseDate(todayValue());
    setOperationDays("30");
    setOperationMode("add");
  };

  const quickExamples = [
    { label: "Today to 30 days", start: todayValue(), end: dateInputValue(addDays(new Date(), 30)) },
    { label: "This Year", start: "2026-01-01", end: "2026-12-31" },
    { label: "Next 90 Days", start: todayValue(), end: dateInputValue(addDays(new Date(), 90)) },
    { label: "Project Sprint", start: todayValue(), end: dateInputValue(addDays(new Date(), 14)) },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📅 Date Difference Calculator"
          description="Calculate days between dates, date duration, weekdays, weekends, total weeks and add or subtract days from any date."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">📆 Select Dates</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-slate-300">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-slate-300">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <label className="mt-5 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeEndDate}
                    onChange={(event) => setIncludeEndDate(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Include end date in calculation
                </label>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={copyResult}>📋 Copy Result</Button>

                  <button
                    type="button"
                    onClick={resetTool}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">✅ Date Difference Result</h2>

                <div className="rounded-2xl border border-blue-700 bg-blue-950/30 p-6 text-center">
                  <p className="text-slate-300">Calendar Difference</p>

                  <div className="mt-3 text-4xl font-extrabold text-blue-300 break-words">
                    {result.calendar.years}y {result.calendar.months}m {result.calendar.days}d
                  </div>

                  <p className="mt-3 text-slate-300">
                    {formatDate(result.from)} to {formatDate(result.to)}
                  </p>

                  {result.isReversed ? (
                    <p className="mt-2 text-sm text-yellow-300">
                      Dates were reversed automatically for calculation.
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">{result.totalDays}</div>
                    <div className="mt-1 text-slate-400">Total Days</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">
                      {result.totalWeeks.toFixed(2)}
                    </div>
                    <div className="mt-1 text-slate-400">Total Weeks</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">{result.weekdays}</div>
                    <div className="mt-1 text-slate-400">Weekdays</div>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                    <div className="text-3xl font-extrabold text-blue-400">{result.weekends}</div>
                    <div className="mt-1 text-slate-400">Weekends</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">⚡ Quick Examples</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => {
                      setStartDate(example.start);
                      setEndDate(example.end);
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">➕ Add or Subtract Days</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="block">
                  <span className="mb-2 block text-slate-300">Base Date</span>
                  <input
                    type="date"
                    value={operationBaseDate}
                    onChange={(event) => setOperationBaseDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Days</span>
                  <input
                    type="number"
                    value={operationDays}
                    onChange={(event) => setOperationDays(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-slate-300">Mode</span>
                  <select
                    value={operationMode}
                    onChange={(event) => setOperationMode(event.target.value as OperationMode)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                  >
                    <option value="add">Add Days</option>
                    <option value="subtract">Subtract Days</option>
                  </select>
                </label>

                <div className="rounded-xl border border-blue-700 bg-blue-950/30 p-4 text-center">
                  <div className="text-sm text-slate-300">Result Date</div>
                  <div className="mt-2 font-bold text-blue-300">{formatDate(operationResult)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              Date calculations use calendar days in your browser timezone. For payroll, legal,
              banking or official deadline calculations, always verify with the relevant authority.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a Date Difference Calculator?
                </h2>
                <p className="text-slate-300">
                  A date difference calculator finds the number of days, weeks, months and
                  years between two dates. It is useful for project timelines, travel plans,
                  deadlines, age gaps and event countdowns.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to calculate days between dates, weekdays between dates,
                  weekends, date duration, business planning ranges and add or subtract days
                  from a selected date.
                </p>
              </div>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}