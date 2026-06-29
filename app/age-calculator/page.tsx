"use client";

import { useEffect, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
import AgeStatCard from "@/components/AgeStatCard";

const monthNames = [
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
];

const zodiacSigns = [
  { name: "Aries", symbol: "♈" },
  { name: "Taurus", symbol: "♉" },
  { name: "Gemini", symbol: "♊" },
  { name: "Cancer", symbol: "♋" },
  { name: "Leo", symbol: "♌" },
  { name: "Virgo", symbol: "♍" },
  { name: "Libra", symbol: "♎" },
  { name: "Scorpio", symbol: "♏" },
  { name: "Sagittarius", symbol: "♐" },
  { name: "Capricorn", symbol: "♑" },
  { name: "Aquarius", symbol: "♒" },
  { name: "Pisces", symbol: "♓" },
];

type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  daysUntilBirthday: number;
  nextBirthdayDate: string;
  dayOfBirth: string;
  zodiacSign: string;
  calculated: boolean;
};

const initialResult: AgeResult = {
  years: 0,
  months: 0,
  days: 0,
  totalMonths: 0,
  totalWeeks: 0,
  totalDays: 0,
  totalHours: 0,
  totalMinutes: 0,
  totalSeconds: 0,
  daysUntilBirthday: 0,
  nextBirthdayDate: "",
  dayOfBirth: "",
  zodiacSign: "",
  calculated: false,
};

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getZodiacSign(month: number, day: number) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "♈ Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "♉ Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "♊ Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "♋ Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "♌ Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "♍ Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "♎ Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "♏ Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "♐ Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "♑ Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "♒ Aquarius";
  return "♓ Pisces";
}

export default function AgeCalculatorPage() {
  const currentYear = new Date().getFullYear();

  const [day, setDay] = useState("1");
  const [month, setMonth] = useState("1");
  const [year, setYear] = useState(currentYear.toString());
  const [calculateOn, setCalculateOn] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgeResult>(initialResult);

  const selectedMonth = Number(month);
  const selectedYear = Number(year);
  const maxDay = getDaysInMonth(selectedMonth, selectedYear);

  useEffect(() => {
    if (Number(day) > maxDay) {
      setDay(maxDay.toString());
    }
  }, [day, maxDay]);

  const resetCalculator = () => {
    setDay("1");
    setMonth("1");
    setYear(currentYear.toString());
    setCalculateOn(new Date().toISOString().slice(0, 10));
    setError("");
    setResult(initialResult);
  };

  const copyResult = async () => {
    if (!result.calculated) return;

    const text = `🎂 Age: ${result.years} Years ${result.months} Months ${result.days} Days

📅 Total Months: ${result.totalMonths}
🗓️ Total Weeks: ${result.totalWeeks}
🌍 Total Days: ${result.totalDays}
⏰ Total Hours: ${result.totalHours}
⏱️ Total Minutes: ${result.totalMinutes}
⚡ Total Seconds: ${result.totalSeconds}

🎉 Next Birthday: ${result.nextBirthdayDate}
⏳ Days Until Birthday: ${result.daysUntilBirthday}

📌 Born On: ${result.dayOfBirth}
✨ Zodiac Sign: ${result.zodiacSign}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("✅ Result copied successfully!");
    } catch {
      alert("Unable to copy result. Please try again.");
    }
  };

  const calculateAge = () => {
    setError("");

    const birth = startOfDay(
      new Date(Number(year), Number(month) - 1, Number(day))
    );
    const today = startOfDay(new Date(calculateOn));

    const isValidBirthDate =
      birth.getFullYear() === Number(year) &&
      birth.getMonth() === Number(month) - 1 &&
      birth.getDate() === Number(day);

    if (!isValidBirthDate) {
      setResult(initialResult);
      setError("Please select a valid birth date.");
      return;
    }

    if (birth > today) {
      setResult(initialResult);
      setError("Birth date cannot be after the calculation date.");
      return;
    }

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMilliseconds = today.getTime() - birth.getTime();
    const totalDays = Math.floor(totalMilliseconds / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;
    const totalMinutes = totalHours * 60;
    const totalSeconds = totalMinutes * 60;

    let nextBirthday = startOfDay(
      new Date(today.getFullYear(), Number(month) - 1, Number(day))
    );

    if (nextBirthday < today) {
      nextBirthday = startOfDay(
        new Date(today.getFullYear() + 1, Number(month) - 1, Number(day))
      );
    }

    const daysUntilBirthday = Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const nextBirthdayDate = nextBirthday.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const dayOfBirth = birth.toLocaleDateString("en-US", {
      weekday: "long",
    });

    setResult({
      years,
      months,
      days,
      totalMonths: years * 12 + months,
      totalWeeks,
      totalDays,
      totalHours,
      totalMinutes,
      totalSeconds,
      daysUntilBirthday,
      nextBirthdayDate,
      dayOfBirth,
      zodiacSign: getZodiacSign(Number(month), Number(day)),
      calculated: true,
    });
  };

  const stats = [
    { value: result.years, label: "🎂 Years" },
    { value: result.months, label: "📅 Months" },
    { value: result.days, label: "🌞 Days" },
    { value: result.totalMonths, label: "📆 Total Months" },
    { value: result.totalWeeks, label: "🗓️ Total Weeks" },
    { value: result.totalDays, label: "🌍 Total Days" },
    { value: result.totalHours, label: "⏰ Total Hours" },
    { value: result.totalMinutes, label: "⏱️ Total Minutes" },
    { value: result.totalSeconds, label: "⚡ Total Seconds" },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🎂 Age Calculator"
          description="Calculate your exact age instantly with birthday details and zodiac insights."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-4"
              >
                {Array.from({ length: maxDay }, (_, i) => (
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
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-4"
              >
                {Array.from({ length: currentYear - 1899 }, (_, i) => {
                  const value = currentYear - i;
                  return (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-slate-300">
                📍 Calculate age on
              </label>
              <input
                type="date"
                value={calculateOn}
                onChange={(e) => setCalculateOn(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 p-4"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-300">
                ⚠️ {error}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button onClick={calculateAge}>✨ Calculate Age</Button>
              <Button onClick={resetCalculator}>🔄 Reset</Button>
              {result.calculated && (
                <Button onClick={copyResult}>📋 Copy Result</Button>
              )}
            </div>

            {result.calculated && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
                <h2 className="text-center text-2xl font-bold mb-6">
                  🎉 Your Age Summary
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.map((item) => (
                    <AgeStatCard
                      key={item.label}
                      value={item.value}
                      label={item.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {result.calculated && (
              <div className="rounded-2xl border border-blue-700 bg-slate-800 p-6 text-center">
                <div className="text-5xl mb-3">🎁</div>

                <h3 className="text-2xl font-bold">Next Birthday</h3>

                <p className="mt-4 text-5xl font-extrabold text-blue-400">
                  {result.daysUntilBirthday}
                </p>

                <p className="mt-2 text-slate-300">Days Remaining</p>

                <p className="mt-5 text-lg text-slate-400">
                  🎉 {result.nextBirthdayDate}
                </p>

                <div className="mt-6 border-t border-slate-700 pt-6">
                  <div className="text-3xl mb-2">📌</div>
                  <p className="text-slate-400">Born On</p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {result.dayOfBirth}
                  </p>
                </div>

                <div className="mt-6 border-t border-slate-700 pt-6">
                  <div className="text-3xl mb-2">✨</div>
                  <p className="text-slate-400">Zodiac Sign</p>
                  <p className="mt-2 text-2xl font-bold text-yellow-400">
                    {result.zodiacSign}
                  </p>
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