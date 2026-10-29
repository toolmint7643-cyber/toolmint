"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
  keywords?: string[];
  aliases?: string[];
  featured?: boolean;
  createdAt?: string;
};

type CategorySummary = {
  name: string;
  count: number;
  description: string;
};

type HomePageClientProps = {
  tools: Tool[];
  categories: CategorySummary[];
  featuredTools: Tool[];
  quickPicks: Tool[];
  popularTools: Tool[];
  latestTools: Tool[];
  hasReliableLatest: boolean;
};

const categoryDescriptions: Record<string, string> = {
  PDF: "Manage documents, pages and conversions.",
  Developer: "Format, validate and generate developer data.",
  SEO: "Prepare metadata, links and page checks.",
  Text: "Clean, count, compare and transform text.",
  Calculator: "Finance, date and everyday calculations.",
  Color: "Pick, test and build color systems.",
  Image: "Compress and optimize images.",
  "Image & PDF": "Convert image and PDF-adjacent files.",
};

const categoryInitials: Record<string, string> = {
  PDF: "PF",
  Developer: "DV",
  SEO: "SE",
  Text: "TX",
  Calculator: "CA",
  Color: "CO",
  Image: "IM",
  "Image & PDF": "IP",
};

const faqItems = [
  {
    id: "free",
    question: "Are ToolMint tools free to use?",
    answer: "Yes. ToolMint is built as a free online tools website for common developer, PDF, image, text, SEO, color and calculator tasks.",
  },
  {
    id: "install",
    question: "Do I need to install software?",
    answer: "No. ToolMint tools run as web pages in the browser. Advanced processing code stays on the individual tool pages where it is needed.",
  },
  {
    id: "mobile",
    question: "Can I use ToolMint on mobile?",
    answer: "Yes. The homepage uses compact search, filter and directory layouts designed for mobile and desktop screens.",
  },
  {
    id: "privacy",
    question: "Are files processed in the browser?",
    answer: "Many ToolMint file tools are designed for browser-side processing where practical. URL-based SEO tools may request public page data to inspect a page.",
  },
];

const directoryInitialLimit = 40;
const directoryLoadStep = 40;

function toolMatches(tool: Tool, query: string) {
  if (!query) return true;

  const searchable = [tool.title, tool.description, tool.category, ...(tool.keywords ?? []), ...(tool.aliases ?? [])]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
}

function uniqueByHref(items: Tool[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

function categoryButtonClass(active: boolean) {
  return `shrink-0 rounded-xl border px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
    active
      ? "border-blue-500 bg-blue-600 text-white"
      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-blue-400 hover:text-white"
  }`;
}

export default function HomePageClient({
  tools,
  categories,
  featuredTools,
  quickPicks,
  popularTools,
  latestTools,
  hasReliableLatest,
}: HomePageClientProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState("free");
  const [visibleDirectoryCount, setVisibleDirectoryCount] = useState(directoryInitialLimit);

  const query = search.trim().toLowerCase();
  const shouldLimitDirectory = !query && category === "All";

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory = category === "All" || tool.category === category;
      return matchesCategory && toolMatches(tool, query);
    });
  }, [category, query, tools]);

  const emptySuggestions = useMemo(() => uniqueByHref([...quickPicks, ...featuredTools]).slice(0, 5), [featuredTools, quickPicks]);
  const visibleDirectoryTools = shouldLimitDirectory ? filteredTools.slice(0, visibleDirectoryCount) : filteredTools;
  const hasMoreDirectoryTools = shouldLimitDirectory && visibleDirectoryTools.length < filteredTools.length;
  const pdfCount = categories.find((item) => item.name === "PDF")?.count ?? 0;
  const imageCount =
    (categories.find((item) => item.name === "Image")?.count ?? 0) +
    (categories.find((item) => item.name === "Image & PDF")?.count ?? 0);

  return (
    <main className="overflow-hidden text-slate-100">
      <section className="relative isolate border-b border-slate-800/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,0.20),transparent_34%),radial-gradient(circle_at_78%_4%,rgba(20,184,166,0.10),transparent_30%),linear-gradient(180deg,#020617_0%,#08111f_58%,#020617_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-80 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border border-blue-400/25 bg-blue-400/10 px-3.5 py-2 text-sm font-bold text-blue-100">
              {tools.length}+ free tools for everyday work
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Everything you need to work with files, images, text and data.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              ToolMint is a fast online utility platform for PDF tools, image converters, developer helpers, SEO checks, text cleanup, colors and calculators.
            </p>

            <div className="mt-8 max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-950/85 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur">
              <label htmlFor="home-tool-search" className="sr-only">Search ToolMint tools</label>
              <div className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 transition focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]">
                <span aria-hidden="true" className="text-sm font-black uppercase text-blue-200">Search</span>
                <input
                  id="home-tool-search"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setVisibleDirectoryCount(directoryInitialLimit); }}
                  placeholder="Search a tool or describe what you need..."
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                />
                <span className="hidden rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-slate-500 sm:inline-flex">Ctrl K</span>
                {search ? (
                  <button type="button" onClick={() => { setSearch(""); setVisibleDirectoryCount(directoryInitialLimit); }} className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.slice(0, 6).map((item) => (
                <button key={item.name} type="button" onClick={() => { setCategory(item.name); setVisibleDirectoryCount(directoryInitialLimit); document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  {item.name}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-slate-800/80 py-4 text-sm">
              <RailMetric value={`${tools.length}+`} label="Tools" />
              <RailMetric value={categories.length} label="Categories" />
              <RailMetric value={pdfCount} label="PDF tools" />
              <RailMetric value={imageCount} label="Image tools" />
              <span className="font-semibold text-slate-300">No signup required</span>
            </div>
          </div>

          <aside className="animate-rise-in relative min-h-[420px] lg:min-h-0" aria-label="ToolMint ecosystem preview">
            <div className="absolute inset-0 rounded-[2rem] border border-slate-800/80 bg-slate-950/35" />
            <div className="relative grid h-full content-center gap-3 p-4 sm:p-6">
              {quickPicks.slice(0, 7).map((tool, index) => <FloatingTool key={tool.href} tool={tool} index={index} />)}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8" id="featured">
        <SectionIntro eyebrow="Featured" title="A few high-impact tools to start with." text="A more editorial view for common ToolMint workflows, using verified tools from the catalog." />
        <div className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {featuredTools[0] ? <PrimaryFeature tool={featuredTools[0]} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredTools.slice(1, 5).map((tool) => <FeatureMini key={tool.href} tool={tool} />)}
          </div>
        </div>
      </section>

      {/* Future AdSense placement: render only after the publisher and ad unit are configured. */}

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8" id="popular">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionIntro eyebrow="Quick picks" title="Useful tools for common tasks." text="A compact list treatment keeps frequent actions easy to scan without repeating the same card style." />
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            {popularTools.map((tool, index) => <MiniToolItem key={tool.href} tool={tool} index={index + 1} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <SectionIntro eyebrow="Explore by workflow" title="Find the right category quickly." text="Counts come from the real ToolMint catalog and update as tools are added." />
        <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((item) => (
            <button key={item.name} type="button" onClick={() => { setCategory(item.name); setVisibleDirectoryCount(directoryInitialLimit); document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="group flex items-center justify-between gap-4 bg-slate-950 px-4 py-4 text-left transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/60">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-black text-blue-200 ring-1 ring-slate-800">{categoryInitials[item.name] ?? item.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block truncate font-black text-white">{item.name}</span>
                  <span className="block truncate text-sm text-slate-500">{categoryDescriptions[item.name] ?? item.description}</span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-black text-slate-400 group-hover:text-blue-200">{item.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <SectionIntro eyebrow={hasReliableLatest ? "Latest" : "Catalog highlights"} title={hasReliableLatest ? "Recently added tools." : "More useful tools to try."} text={hasReliableLatest ? "Latest tools are shown from reliable catalog metadata." : "The catalog does not include reliable added dates yet, so this section avoids fake latest claims."} />
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {latestTools.map((tool) => <QuickTool key={tool.href} tool={tool} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8" id="tools">
        <div className="border-y border-slate-800 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-blue-200">All tools</p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find the right tool in seconds.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-400">Search the catalog, filter by workflow and scan compact utility cards without heavy visual noise.</p>
            </div>
            <div className="text-sm font-bold text-slate-400">Showing <span className="text-white">{visibleDirectoryTools.length}</span> of <span className="text-white">{filteredTools.length}</span></div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex min-h-13 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 transition focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]">
              <span className="text-xs font-black uppercase text-slate-500">Search</span>
              <input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleDirectoryCount(directoryInitialLimit); }} placeholder="Try PDF compressor, JSON, image, meta tags..." className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500" />
            </label>
            <button type="button" onClick={() => { setSearch(""); setCategory("All"); setVisibleDirectoryCount(directoryInitialLimit); }} className="min-h-13 rounded-xl border border-slate-800 px-5 font-bold text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">Reset</button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button type="button" onClick={() => { setCategory("All"); setVisibleDirectoryCount(directoryInitialLimit); }} className={categoryButtonClass(category === "All")}>All <span className="text-slate-500">{tools.length}</span></button>
            {categories.map((item) => (
              <button key={item.name} type="button" onClick={() => { setCategory(item.name); setVisibleDirectoryCount(directoryInitialLimit); }} className={categoryButtonClass(category === item.name)}>{item.name} <span className="text-slate-500">{item.count}</span></button>
            ))}
          </div>

          {filteredTools.length > 0 ? (
            <>
              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
                {visibleDirectoryTools.map((tool) => <DirectoryCard key={tool.href} tool={tool} />)}
              </div>
              {hasMoreDirectoryTools ? (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleDirectoryCount((count) => count + directoryLoadStep)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-6 py-3 font-bold text-slate-200 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    Load more tools
                    <span className="ml-2 text-slate-500">
                      {visibleDirectoryTools.length}/{filteredTools.length}
                    </span>
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState suggestions={emptySuggestions} reset={() => { setSearch(""); setCategory("All"); setVisibleDirectoryCount(directoryInitialLimit); }} />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase text-blue-200">SEO-first utility platform</p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Free online tools built for real work.</h2>
          </div>
          <div className="grid gap-6 text-base leading-8 text-slate-300 md:grid-cols-2">
            <p>ToolMint helps developers, students, marketers, creators and business users finish practical tasks quickly. The catalog includes PDF tools, image tools, developer utilities, text tools, calculators, color tools and SEO tools.</p>
            <p>File-based tools are kept on their own pages so the homepage stays light. Many tools process files in the browser where practical, while URL-based SEO tools may fetch public page data to produce useful checks.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8" id="faq">
        <SectionIntro eyebrow="FAQ" title="Questions users ask before starting." text="Short answers without inflated claims." />
        <div className="mt-7 divide-y divide-slate-800 border-y border-slate-800">
          {faqItems.map((item) => (
            <div key={item.id}>
              <button type="button" onClick={() => setOpenFaq(openFaq === item.id ? "" : item.id)} className="flex w-full items-center justify-between gap-4 py-5 text-left font-bold text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/60" aria-expanded={openFaq === item.id}>
                {item.question}
                <span className="text-blue-300">{openFaq === item.id ? "-" : "+"}</span>
              </button>
              {openFaq === item.id ? <p className="pb-5 leading-7 text-slate-400">{item.answer}</p> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function RailMetric({ value, label }: { value: number | string; label: string }) {
  return <span className="inline-flex items-baseline gap-2"><span className="text-xl font-black text-white">{value}</span><span className="font-semibold text-slate-400">{label}</span></span>;
}

function FloatingTool({ tool, index }: { tool: Tool; index: number }) {
  const offsets = ["ml-2", "ml-12", "ml-0", "ml-20", "ml-7", "ml-16", "ml-3"];
  return (
    <Link href={tool.href} className={`group w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${offsets[index % offsets.length]}`} style={{ animationDelay: `${index * 60}ms` }}>
      <span className="flex items-center justify-between gap-4"><span className="min-w-0"><span className="block text-xs font-black uppercase text-slate-500">{tool.category}</span><span className="block truncate font-bold text-white">{tool.title}</span></span><span className="text-sm font-bold text-blue-300 transition group-hover:translate-x-1">Open</span></span>
    </Link>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="max-w-3xl"><p className="text-sm font-bold uppercase text-blue-200">{eyebrow}</p><h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">{title}</h2><p className="mt-3 leading-7 text-slate-400">{text}</p></div>;
}

function PrimaryFeature({ tool }: { tool: Tool }) {
  return (
    <Link href={tool.href} className="group grid min-h-64 gap-6 rounded-[1.75rem] border border-blue-400/25 bg-[linear-gradient(135deg,rgba(37,99,235,0.18),rgba(15,23,42,0.92))] p-6 shadow-2xl shadow-blue-950/15 transition hover:-translate-y-0.5 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400/60 sm:grid-cols-[1fr_180px] sm:p-7">
      <span><span className="rounded-full border border-blue-300/25 bg-blue-300/10 px-3 py-1 text-xs font-black uppercase text-blue-100">Primary featured</span><span className="mt-5 block text-3xl font-black text-white sm:text-4xl">{tool.title}</span><span className="mt-4 block max-w-xl leading-7 text-slate-300">{tool.description}</span><span className="mt-6 block font-bold text-blue-100 transition group-hover:translate-x-1">Open tool</span></span>
      <span className="hidden content-center sm:grid" aria-hidden="true"><span className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"><span className="block h-2 rounded bg-slate-700" /><span className="mt-4 block h-20 rounded-xl border border-dashed border-blue-400/40 bg-blue-400/10" /><span className="mt-4 grid grid-cols-[1fr_0.55fr] gap-2"><span className="h-2 rounded bg-blue-300/70" /><span className="h-2 rounded bg-slate-600" /></span></span></span>
    </Link>
  );
}

function FeatureMini({ tool }: { tool: Tool }) {
  return <Link href={tool.href} className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"><span className="text-xs font-black uppercase text-slate-500">{tool.category}</span><span className="mt-2 block font-black text-white">{tool.title}</span><span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{tool.description}</span><span className="mt-3 block text-sm font-bold text-blue-300 transition group-hover:translate-x-1">Open</span></Link>;
}

function MiniToolItem({ tool, index }: { tool: Tool; index: number }) {
  return <Link href={tool.href} className="group flex items-center justify-between gap-4 border-b border-slate-800 py-4 transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"><span className="flex min-w-0 items-center gap-4"><span className="w-7 shrink-0 text-sm font-black text-slate-600">{String(index).padStart(2, "0")}</span><span className="min-w-0"><span className="block truncate font-black text-white">{tool.title}</span><span className="block truncate text-sm text-slate-500">{tool.category}</span></span></span><span className="shrink-0 text-blue-300 opacity-70 transition group-hover:translate-x-1 group-hover:opacity-100">Open</span></Link>;
}

function QuickTool({ tool }: { tool: Tool }) {
  return <Link href={tool.href} className="min-w-[240px] rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"><span className="text-xs font-black uppercase text-slate-500">{tool.category}</span><span className="mt-2 block font-black text-white">{tool.title}</span><span className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{tool.description}</span></Link>;
}

function DirectoryCard({ tool }: { tool: Tool }) {
  return <Link href={tool.href} className="group flex min-h-40 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"><span className="grid size-9 place-items-center rounded-xl bg-slate-900 text-xs font-black text-blue-200 ring-1 ring-slate-800">{categoryInitials[tool.category] ?? tool.category.slice(0, 2).toUpperCase()}</span><span className="mt-3 block font-black leading-6 text-white">{tool.title}</span><span className="mt-1 line-clamp-2 flex-1 text-sm leading-6 text-slate-500">{tool.description}</span><span className="mt-3 text-sm font-bold text-blue-300 opacity-75 transition group-hover:translate-x-1 group-hover:opacity-100">Open</span></Link>;
}

function EmptyState({ suggestions, reset }: { suggestions: Tool[]; reset: () => void }) {
  return <div className="mt-7 border-y border-slate-800 py-10 text-center"><h3 className="text-2xl font-black text-white">Nothing matched that search.</h3><p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">Try another keyword or explore a quick pick.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{suggestions.map((tool) => <Link key={tool.href} href={tool.href} className="rounded-full border border-slate-800 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">{tool.title}</Link>)}</div><button type="button" onClick={reset} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60">Reset search</button></div>;
}
