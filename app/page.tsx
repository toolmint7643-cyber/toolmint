"use client";

import { useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolPreviewCard from "@/components/ToolPreviewCard";
import { tools } from "@/data/tools";

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">

        <div className="text-center py-12">

  <h1 className="text-5xl font-bold">
    ToolMint
  </h1>

  <p className="mt-4 text-slate-400 text-xl max-w-2xl mx-auto">
    Free online developer and productivity tools.
    Fast, secure and easy to use.
  </p>

</div>

        <input
          type="text"
          placeholder="🔍 Search tools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 mb-8 outline-none text-white placeholder:text-slate-400"
        />
<div className="mb-8 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">

  <h2 className="text-4xl font-bold text-blue-400">
    {tools.length}+
  </h2>

  <p className="mt-2 text-slate-400">
    Free Online Tools
  </p>

</div>
<div className="flex flex-wrap gap-3 mb-8">

  {["All", "Developer", "Text", "Image", "Calculator"].map((item) => (

    <button
      key={item}
      onClick={() => setCategory(item)}
      className={`px-4 py-2 rounded-xl border transition text-white ${
  category === item
    ? "bg-blue-600 border-blue-600"
    : "bg-slate-900 border-slate-700 hover:border-blue-500"
}`}
    >
      {item}
    </button>

  ))}

</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {tools
            .filter((tool) => {
  const matchesSearch = tool.title
    .toLowerCase()
    .includes(search.toLowerCase());

  const matchesCategory =
    category === "All" || tool.category === category;

  return matchesSearch && matchesCategory;
})
            .map((tool) => (
              <ToolPreviewCard
            key={tool.href}
            tool={tool}
            />
            ))}

        </div>

      </main>

      <Footer />
    </>
  );
}