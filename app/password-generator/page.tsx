"use client";

import { useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";
export default function PasswordGeneratorPage() {
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [length, setLength] = useState(16);
const [includeUppercase, setIncludeUppercase] = useState(true);
const [includeLowercase, setIncludeLowercase] = useState(true);
const [includeNumbers, setIncludeNumbers] = useState(true);
const [includeSymbols, setIncludeSymbols] = useState(true);
const generatePassword = () => {
  const groups: string[] = [];

if (includeUppercase)
  groups.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

if (includeLowercase)
  groups.push("abcdefghijklmnopqrstuvwxyz");

if (includeNumbers)
  groups.push("0123456789");

if (includeSymbols)
  groups.push("!@#$%^&*");

if (groups.length === 0) {
  alert("Please select at least one option.");
  return;
}

  try {
    const randomIndex = (maxExclusive: number) => {
      const range = 0x1_0000_0000;
      const limit = Math.floor(range / maxExclusive) * maxExclusive;
      const value = new Uint32Array(1);

      do {
        crypto.getRandomValues(value);
      } while (value[0] >= limit);

      return value[0] % maxExclusive;
    };

    const allCharacters = groups.join("");
    const characters = groups.map((group) => group[randomIndex(group.length)]);

    while (characters.length < length) {
      characters.push(allCharacters[randomIndex(allCharacters.length)]);
    }

    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomIndex(index + 1);
      [characters[index], characters[swapIndex]] = [
        characters[swapIndex],
        characters[index],
      ];
    }

    setPassword(characters.join(""));
  } catch {
    alert("Secure password generation is unavailable in this browser context.");
  }
};
const copyPassword = async () => {
  if (!password) return;

  await navigator.clipboard.writeText(password);
  alert("✅ Password Copied");
};
const getStrength = () => {
  let score = 0;

  if (length >= 8) score++;
  if (length >= 12) score++;
  if (includeUppercase) score++;
  if (includeLowercase) score++;
  if (includeNumbers) score++;
  if (includeSymbols) score++;

  if (score <= 2)
    return {
      text: "Weak",
      color: "bg-red-500",
      width: "w-1/3",
    };

  if (score <= 4)
    return {
      text: "Medium",
      color: "bg-yellow-500",
      width: "w-2/3",
    };

  return {
    text: "Strong",
    color: "bg-green-500",
    width: "w-full",
  };
};
  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <PageTitle
          title="Password Generator"
          description="Generate cryptographically random passwords in your browser. Choose a length from 6 to 32 characters and select character types."
        />

        <ToolCard>

          <div className="space-y-6">

  <input
  type={showPassword ? "text" : "password"}
    value={password}
    readOnly
    placeholder="Your password will appear here..."
    className="w-full rounded-xl bg-slate-800 border border-slate-700 p-4 text-lg outline-none"
  />
  <div className="space-y-2">

  <div className="flex justify-between text-sm">
    <span>Password Strength</span>
    <span>{getStrength().text}</span>
  </div>

  <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
    <div
      className={`h-full transition-all duration-300 ${getStrength().color} ${getStrength().width}`}
    />
  </div>

</div>
<div>
  <label className="block mb-2 font-medium">
    Password Length: {length}
  </label>
<div className="flex justify-end">
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="text-sm text-blue-400 hover:text-blue-300"
  >
    {showPassword ? "🙈 Hide Password" : "👁 Show Password"}
  </button>
</div>
  <input
    type="range"
    min="6"
    max="32"
    value={length}
    onChange={(e) => setLength(Number(e.target.value))}
    className="w-full"
  />
</div>
<div className="grid grid-cols-2 gap-4">

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={includeUppercase}
      onChange={(e) => setIncludeUppercase(e.target.checked)}
    />
    Uppercase
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={includeLowercase}
      onChange={(e) => setIncludeLowercase(e.target.checked)}
    />
    Lowercase
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={includeNumbers}
      onChange={(e) => setIncludeNumbers(e.target.checked)}
    />
    Numbers
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={includeSymbols}
      onChange={(e) => setIncludeSymbols(e.target.checked)}
    />
    Symbols
  </label>

</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
<Button onClick={generatePassword}>

  Generate Password
</Button>
<Button
  onClick={generatePassword}
  variant="secondary"
>
  🔄 Regenerate
</Button>
<Button
  onClick={copyPassword}
  variant="success"
>
  Copy Password
</Button>
</div>

        </ToolCard>

      </main>

      <Footer />
    </>
  );
}
