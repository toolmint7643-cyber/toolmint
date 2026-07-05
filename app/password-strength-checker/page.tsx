"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const samplePassword = "ToolMint@2026!";

const commonPasswords = new Set([
  "password",
  "password123",
  "123456",
  "12345678",
  "qwerty",
  "admin",
  "letmein",
  "welcome",
  "iloveyou",
  "abc123",
]);

function estimateCrackTime(score: number, length: number) {
  if (length === 0) return "Not available";
  if (score < 30) return "Instantly to a few seconds";
  if (score < 55) return "Minutes to hours";
  if (score < 75) return "Days to months";
  if (score < 90) return "Years";
  return "Many years";
}

function analyzePassword(password: string) {
  const checks = {
    length8: password.length >= 8,
    length12: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    noCommon: !commonPasswords.has(password.toLowerCase()),
    noRepeats: !/(.)\1{2,}/.test(password),
  };

  let score = 0;

  if (checks.length8) score += 15;
  if (checks.length12) score += 15;
  if (checks.lowercase) score += 10;
  if (checks.uppercase) score += 10;
  if (checks.number) score += 10;
  if (checks.symbol) score += 15;
  if (checks.noCommon) score += 15;
  if (checks.noRepeats) score += 10;

  if (password.length >= 16) score += 10;
  if (password.length === 0) score = 0;

  score = Math.min(score, 100);

  let label = "Very Weak";
  let color = "text-red-300";
  let border = "border-red-700";
  let bg = "bg-red-950/30";
  let message = "This password is too weak.";

  if (score >= 75) {
    label = "Strong";
    color = "text-green-300";
    border = "border-green-700";
    bg = "bg-green-950/30";
    message = "This password looks strong.";
  } else if (score >= 55) {
    label = "Good";
    color = "text-blue-300";
    border = "border-blue-700";
    bg = "bg-blue-950/30";
    message = "This password is decent, but can be improved.";
  } else if (score >= 30) {
    label = "Fair";
    color = "text-yellow-300";
    border = "border-yellow-700";
    bg = "bg-yellow-950/30";
    message = "This password needs stronger complexity.";
  }

  const suggestions = [
    !checks.length12 ? "Use at least 12 characters." : "",
    !checks.uppercase ? "Add uppercase letters." : "",
    !checks.lowercase ? "Add lowercase letters." : "",
    !checks.number ? "Add numbers." : "",
    !checks.symbol ? "Add symbols like @, #, $, % or !." : "",
    !checks.noCommon ? "Avoid common passwords." : "",
    !checks.noRepeats ? "Avoid repeated characters like aaa or 111." : "",
  ].filter(Boolean);

  return {
    score,
    label,
    color,
    border,
    bg,
    message,
    checks,
    suggestions,
    crackTime: estimateCrackTime(score, password.length),
  };
}

export default function PasswordStrengthCheckerPage() {
  const [password, setPassword] = useState(samplePassword);
  const [showPassword, setShowPassword] = useState(false);

  const result = useMemo(() => analyzePassword(password), [password]);

  const copyPassword = async () => {
    if (!password) {
      alert("Nothing to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      alert("Password copied successfully!");
    } catch {
      alert("Unable to copy password. Please try again.");
    }
  };

  const checks = [
    ["At least 8 characters", result.checks.length8],
    ["At least 12 characters", result.checks.length12],
    ["Lowercase letter", result.checks.lowercase],
    ["Uppercase letter", result.checks.uppercase],
    ["Number", result.checks.number],
    ["Symbol", result.checks.symbol],
    ["Not a common password", result.checks.noCommon],
    ["No repeated characters", result.checks.noRepeats],
  ];

  const quickExamples = [
    "password123",
    "ToolMint2026",
    "ToolMint@2026!",
    "T0olM!nt#Secure2026",
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔐 Password Strength Checker"
          description="Check password strength online, test password security, view strength score, get improvement tips and privacy-friendly feedback instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.95fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Enter Password
                </h2>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password to check strength..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                />

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Show password
                </label>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPassword("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setPassword(samplePassword)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample
                  </button>

                  <Button onClick={copyPassword}>📋 Copy</Button>
                </div>

                <div className="mt-6">
                  <h3 className="mb-3 text-xl font-bold text-white">
                    ⚡ Quick Examples
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickExamples.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPassword(item)}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ Strength Result
                </h2>

                <div
                  className={`rounded-2xl border p-6 text-center ${result.border} ${result.bg}`}
                >
                  <p className="text-slate-300">Password Score</p>

                  <div className={`mt-3 text-6xl font-extrabold ${result.color}`}>
                    {result.score}
                  </div>

                  <h3 className={`mt-3 text-2xl font-bold ${result.color}`}>
                    {result.label}
                  </h3>

                  <p className="mt-3 text-slate-300">{result.message}</p>
                </div>

                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Strength meter</span>
                    <span>{result.score}%</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-4 text-center">
                  <p className="text-slate-400">Estimated Crack Time</p>
                  <p className="mt-2 text-xl font-bold text-blue-400">
                    {result.crackTime}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                ["Length", password.length, "📏"],
                ["Score", `${result.score}%`, "📊"],
                ["Status", result.label, "🏷️"],
                ["Suggestions", result.suggestions.length, "💡"],
              ].map(([label, value, icon]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="mb-2 text-3xl">{icon}</div>
                  <div className="break-words text-3xl font-extrabold text-blue-400">
                    {value}
                  </div>
                  <div className="mt-2 text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                🧾 Password Checklist
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {checks.map(([label, passed]) => (
                  <div
                    key={String(label)}
                    className={`rounded-xl border p-4 ${
                      passed
                        ? "border-green-700 bg-green-950/30 text-green-100"
                        : "border-red-700 bg-red-950/30 text-red-100"
                    }`}
                  >
                    {passed ? "✅" : "❌"} {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                💡 Suggestions
              </h2>

              {result.suggestions.length ? (
                <ul className="space-y-3">
                  {result.suggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-green-700 bg-green-950/30 p-4 text-green-100">
                  Your password meets all listed checks.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This password strength checker runs in your browser. Your password
              is not sent to a server. For real accounts, use unique passwords and
              a trusted password manager.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Password Strength?
                </h2>
                <p className="text-slate-300">
                  Password strength measures how difficult a password may be to
                  guess or crack. Longer passwords with mixed letters, numbers and
                  symbols are generally stronger.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Tips
                </h2>
                <p className="text-slate-300">
                  Avoid common passwords, repeated characters, names and simple
                  patterns. Use unique passwords for every account and enable
                  two-factor authentication when possible.
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