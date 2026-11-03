import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { tools } from "@/data/tools";

export const metadata: Metadata = {
  title: "All Free Online Tools | ToolMint",
  description:
    "Browse the complete ToolMint directory of free online PDF, image, developer, SEO, text, calculator and color tools.",
  alternates: {
    canonical: "/all-tools",
  },
};

const toolsByCategory = tools.reduce<Record<string, typeof tools>>((groups, tool) => {
  (groups[tool.category] ??= []).push(tool);
  return groups;
}, {});

const categories = Object.entries(toolsByCategory).sort(([a], [b]) =>
  a.localeCompare(b)
);

function categoryId(category: string) {
  return `category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export default function AllToolsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-blue-300">Tool directory</p>
            <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
              All ToolMint tools
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Browse {tools.length} free online utilities by category. Open a tool
              for its controls, supported formats, usage notes and any important
              limitations before processing your data.
            </p>
          </header>

          <nav aria-label="Tool categories" className="mt-8 flex flex-wrap gap-2">
            {categories.map(([category, items]) => (
              <a
                key={category}
                href={`#${categoryId(category)}`}
                className="rounded-full border border-slate-700 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {category} <span className="text-slate-500">{items.length}</span>
              </a>
            ))}
          </nav>

          <div className="mt-10 space-y-12">
            {categories.map(([category, items]) => (
              <section
                key={category}
                id={categoryId(category)}
                aria-labelledby={`${categoryId(category)}-title`}
              >
                <div className="border-b border-slate-800 pb-3">
                  <h2 id={`${categoryId(category)}-title`} className="text-2xl font-black text-white">
                    {category} tools <span className="text-base font-semibold text-slate-500">({items.length})</span>
                  </h2>
                </div>
                <ul className="mt-2 divide-y divide-slate-800">
                  {items.map((tool) => (
                    <li key={tool.href}>
                      <Link
                        href={tool.href}
                        className="group grid gap-1 py-4 sm:grid-cols-[minmax(12rem,0.7fr)_1.3fr] sm:gap-6"
                      >
                        <span className="font-bold text-white group-hover:text-blue-200">
                          {tool.title}
                        </span>
                        <span className="text-sm leading-6 text-slate-400">
                          {tool.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
