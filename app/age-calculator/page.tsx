"use client";

import { useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

export default function AgeCalculatorPage() {
  const currentYear = new Date().getFullYear();

  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("1");
  const [year, setYear] = useState(currentYear.toString());


const [result, setResult] = useState({
  years: 0,
  months: 0,
  days: 0,
  totalMonths: 0,
  totalWeeks: 0,
  totalDays: 0,
  totalHours: 0,
  totalMinutes: 0,
  calculated: false,
});

  const calculateAge = () => {
  const birth = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;

    const previousMonthDays = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    ).getDate();

    days += previousMonthDays;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMilliseconds = today.getTime() - birth.getTime();

  const totalDays = Math.floor(
    totalMilliseconds / (1000 * 60 * 60 * 24)
  );

  const totalWeeks = Math.floor(totalDays / 7);

  const totalHours = totalDays * 24;

  const totalMinutes = totalHours * 60;

  setResult({
  years,
  months,
  days,
  totalMonths: years * 12 + months,
  totalWeeks,
  totalDays,
  totalHours,
  totalMinutes,
  calculated: true,
});
};
  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="Age Calculator"
          description="Calculate your exact age instantly."
        />

        <ToolCard>

          <div className="space-y-6">

            <div className="grid grid-cols-3 gap-4">

              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-4"
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>

              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-4"
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((name, index) => (
                  <option key={index} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-4"
              >
                {Array.from(
                  { length: currentYear - 1899 },
                  (_, i) => currentYear - i
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

            </div>

            <Button onClick={calculateAge}>
              Calculate Age
            </Button>

           {result.calculated && (
  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">

    <h2 className="text-center text-2xl font-bold mb-6">
      🎂 Your Age
    </h2>

    <div className="grid grid-cols-3 gap-4">

     {[
  result.years,
  result.months,
  result.days,
].map((value, index) => {

        const labels = ["Years", "Months", "Days"];

        return (
          <div
            key={index}
            className="rounded-xl bg-slate-900 p-5 text-center border border-slate-700"
          >

            <div className="text-4xl font-bold text-blue-400">
              {value}
            </div>

            <div className="mt-2 text-slate-400">
              {labels[index]}
            </div>

          </div>
        );

      })}

    </div>

  </div>
)}

          </div>

        </ToolCard>

      </main>

      <Footer />
    </>
  );
}