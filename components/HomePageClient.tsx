"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

const categoryVisuals: Record<string, { icon: string; card: string; iconBox: string; accent: string; pill: string }> = {
  PDF: {
    icon: "📄",
    card: "border-rose-400/20 bg-[linear-gradient(145deg,rgba(244,63,94,0.12),rgba(15,23,42,0.96)_58%)] hover:border-rose-300/50",
    iconBox: "bg-rose-400/10 ring-1 ring-rose-300/20",
    accent: "text-rose-200",
    pill: "border-rose-300/20 bg-rose-300/10 text-rose-200",
  },
  Developer: {
    icon: "⌘",
    card: "border-cyan-400/20 bg-[linear-gradient(145deg,rgba(34,211,238,0.11),rgba(15,23,42,0.96)_58%)] hover:border-cyan-300/50",
    iconBox: "bg-cyan-400/10 ring-1 ring-cyan-300/20",
    accent: "text-cyan-200",
    pill: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  },
  SEO: {
    icon: "↗",
    card: "border-amber-400/20 bg-[linear-gradient(145deg,rgba(251,191,36,0.11),rgba(15,23,42,0.96)_58%)] hover:border-amber-300/50",
    iconBox: "bg-amber-400/10 ring-1 ring-amber-300/20",
    accent: "text-amber-200",
    pill: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  },
  Text: {
    icon: "T",
    card: "border-emerald-400/20 bg-[linear-gradient(145deg,rgba(52,211,153,0.11),rgba(15,23,42,0.96)_58%)] hover:border-emerald-300/50",
    iconBox: "bg-emerald-400/10 ring-1 ring-emerald-300/20",
    accent: "text-emerald-200",
    pill: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  },
  Calculator: {
    icon: "∑",
    card: "border-sky-400/20 bg-[linear-gradient(145deg,rgba(56,189,248,0.11),rgba(15,23,42,0.96)_58%)] hover:border-sky-300/50",
    iconBox: "bg-sky-400/10 ring-1 ring-sky-300/20",
    accent: "text-sky-200",
    pill: "border-sky-300/20 bg-sky-300/10 text-sky-200",
  },
  Color: {
    icon: "◉",
    card: "border-violet-400/20 bg-[linear-gradient(145deg,rgba(167,139,250,0.12),rgba(15,23,42,0.96)_58%)] hover:border-violet-300/50",
    iconBox: "bg-violet-400/10 ring-1 ring-violet-300/20",
    accent: "text-violet-200",
    pill: "border-violet-300/20 bg-violet-300/10 text-violet-200",
  },
  Image: {
    icon: "▧",
    card: "border-teal-400/20 bg-[linear-gradient(145deg,rgba(45,212,191,0.11),rgba(15,23,42,0.96)_58%)] hover:border-teal-300/50",
    iconBox: "bg-teal-400/10 ring-1 ring-teal-300/20",
    accent: "text-teal-200",
    pill: "border-teal-300/20 bg-teal-300/10 text-teal-200",
  },
  "Image & PDF": {
    icon: "⇄",
    card: "border-orange-400/20 bg-[linear-gradient(145deg,rgba(251,146,60,0.12),rgba(15,23,42,0.96)_58%)] hover:border-orange-300/50",
    iconBox: "bg-orange-400/10 ring-1 ring-orange-300/20",
    accent: "text-orange-200",
    pill: "border-orange-300/20 bg-orange-300/10 text-orange-200",
  },
};

function getCategoryVisual(category: string) {
  return categoryVisuals[category] ?? {
    icon: "✦",
    card: "border-blue-400/20 bg-[linear-gradient(145deg,rgba(96,165,250,0.11),rgba(15,23,42,0.96)_58%)] hover:border-blue-300/50",
    iconBox: "bg-blue-400/10 ring-1 ring-blue-300/20",
    accent: "text-blue-200",
    pill: "border-blue-300/20 bg-blue-300/10 text-blue-200",
  };
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

function toolSearchScore(tool: Tool, query: string) {
  if (!query) return 0;

  const title = tool.title.toLowerCase();
  const category = tool.category.toLowerCase();
  const terms = [...(tool.keywords ?? []), ...(tool.aliases ?? [])].map((term) => term.toLowerCase());

  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.includes(query)) return 2;
  if (terms.some((term) => term === query)) return 3;
  if (terms.some((term) => term.includes(query))) return 4;
  if (category === query) return 5;
  if (category.includes(query)) return 6;
  if (tool.description.toLowerCase().includes(query)) return 7;

  return Number.POSITIVE_INFINITY;
}

function sortSearchResults(items: Tool[], query: string) {
  return [...items].sort((a, b) => toolSearchScore(a, query) - toolSearchScore(b, query));
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
  return `shrink-0 rounded-full border px-3.5 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
    active
      ? "border-emerald-400 bg-emerald-400/15 text-emerald-100"
      : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-400/60 hover:text-white"
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
  const homeSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping) return;

      event.preventDefault();
      homeSearchRef.current?.focus();
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  const query = search.trim().toLowerCase();
  const shouldLimitDirectory = !query && category === "All";

  const filteredTools = useMemo(() => {
    const matches = tools.filter((tool) => {
      const matchesCategory = category === "All" || tool.category === category;
      return matchesCategory && toolSearchScore(tool, query) !== Number.POSITIVE_INFINITY;
    });

    return query ? sortSearchResults(matches, query) : matches;
  }, [category, query, tools]);

  const searchMatches = useMemo(
    () => (query ? sortSearchResults(tools.filter((tool) => toolSearchScore(tool, query) !== Number.POSITIVE_INFINITY), query) : []),
    [query, tools],
  );
  const homeSearchSuggestions = searchMatches.slice(0, 6);

  function showAllSearchResults() {
    setCategory("All");
    setVisibleDirectoryCount(directoryInitialLimit);
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("directory-tool-search")?.focus({ preventScroll: true });
  }

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
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#07111e_0%,#0b1725_58%,#020617_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-80 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="animate-fade-up">
            <p className="inline-flex rounded-full border border-blue-400/25 bg-blue-400/10 px-3.5 py-2 text-sm font-bold text-blue-100">
              <span aria-hidden="true" className="mr-2 text-emerald-300">✦</span>{tools.length}+ free tools for everyday work
            </p>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              Everything you need to work with files, images, text and data.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              ToolMint is a fast online utility platform for PDF tools, image converters, developer helpers, SEO checks, text cleanup, colors and calculators.
            </p>

            <div className="relative mt-8 max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-950/90 p-2 shadow-2xl shadow-black/30 backdrop-blur">
              <label htmlFor="home-tool-search" className="sr-only">Search ToolMint tools</label>
              <div className="flex min-h-14 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 transition focus-within:border-emerald-400/70 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.10)]">
                <span aria-hidden="true" className="text-xl text-emerald-300">⌕</span>
                <input
                  id="home-tool-search"
                  ref={homeSearchRef}
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setVisibleDirectoryCount(directoryInitialLimit); }}
                  onKeyDown={(event) => { if (event.key === "Enter" && search.trim()) showAllSearchResults(); }}
                  placeholder="Search a tool or describe what you need..."
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                />
                <button type="button" onClick={() => homeSearchRef.current?.focus()} aria-label="Focus tool search" title="Focus search (/)" className="hidden rounded-md border border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-400 transition hover:border-emerald-400/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 sm:inline-flex">/</button>
                {search ? (
                  <button type="button" onClick={() => { setSearch(""); setVisibleDirectoryCount(directoryInitialLimit); }} className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    Clear
                  </button>
                ) : null}
              </div>
              {query ? (
                <div className="absolute inset-x-2 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs font-bold text-slate-400">
                    <span>Matching tools</span>
                    <span>{searchMatches.length} {searchMatches.length === 1 ? "result" : "results"}</span>
                  </div>
                  {homeSearchSuggestions.length ? (
                    <div className="max-h-80 overflow-y-auto p-2">
                      {homeSearchSuggestions.map((tool) => (
                        <Link key={tool.href} href={tool.href} className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-slate-900 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-white">{tool.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-slate-400">{tool.category} · {tool.description}</span>
                          </span>
                          <span aria-hidden="true" className="shrink-0 text-emerald-300 transition group-hover:translate-x-1">↗</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="px-4 py-5 text-sm text-slate-400">No matching tools. Try a different keyword.</p>
                  )}
                  {searchMatches.length > 0 ? (
                    <button type="button" onClick={showAllSearchResults} className="w-full border-t border-slate-800 px-4 py-3 text-left text-sm font-bold text-emerald-200 transition hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/50">
                      See all {searchMatches.length} results
                    </button>
                  ) : null}
                </div>
              ) : null}
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
              <span className="inline-flex items-center gap-2 font-semibold text-slate-300"><span className="size-2 rounded-full bg-emerald-400" />No signup required</span>
            </div>
          </div>

          <aside className="animate-rise-in relative min-h-[420px] lg:min-h-0" aria-label="Explore popular ToolMint tools">
            <div className="absolute inset-0 rounded-[2rem] border border-slate-700/80 bg-[linear-gradient(145deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))] shadow-2xl shadow-black/30" />
            <div className="relative h-full p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-700/70 pb-4">
                <div>
                  <p className="text-xs font-black uppercase text-emerald-300">ToolMint workspace</p>
                  <p className="mt-1 text-sm text-slate-400">A useful tool, one click away</p>
                </div>
                <Link href="/all-tools" className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-emerald-300/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50">Explore all ↗</Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {quickPicks.slice(0, 5).map((tool, index) => <FloatingTool key={tool.href} tool={tool} index={index} />)}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8" id="featured">
        <SectionIntro eyebrow="Featured" title="Get a head start with these tools." text="Practical picks for everyday file, content and development work." />
        <div className="mt-7 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {featuredTools[0] ? <PrimaryFeature tool={featuredTools[0]} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {featuredTools.slice(1, 5).map((tool) => <FeatureMini key={tool.href} tool={tool} />)}
          </div>
        </div>
      </section>

      <AdSlot placement="homepage-featured-popular" />

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8" id="popular">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionIntro eyebrow="Quick picks" title="Popular tools, ready when you need them." text="Quick access to common PDF, image, text and data tasks." />
          <div className="grid gap-3 md:grid-cols-2">
            {popularTools.map((tool, index) => <MiniToolItem key={tool.href} tool={tool} index={index + 1} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <SectionIntro eyebrow="Explore by workflow" title="Browse by category." text="Choose an area and find tools made for that job." />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((item) => (
            <button key={item.name} type="button" onClick={() => { setCategory(item.name); setVisibleDirectoryCount(directoryInitialLimit); document.getElementById("tools")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={`group flex min-h-32 flex-col justify-between rounded-2xl border p-4 text-left shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/60 ${getCategoryVisual(item.name).card}`}>
              <span className="flex w-full items-start justify-between gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ${getCategoryVisual(item.name).iconBox}`}>{getCategoryVisual(item.name).icon}</span>
                <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-xs font-bold text-slate-300">{item.count}</span>
              </span>
              <span className="mt-4 flex w-full items-end justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-black text-white">{item.name}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-400">{categoryDescriptions[item.name] ?? item.description}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <SectionIntro eyebrow={hasReliableLatest ? "Latest" : "Recommended"} title={hasReliableLatest ? "Fresh from the tool catalog." : "More useful tools to explore."} text="Discover a few more ways to get things done with ToolMint." />
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {latestTools.map((tool) => <QuickTool key={tool.href} tool={tool} />)}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8" id="tools">
        <div className="rounded-[1.75rem] border border-slate-800/90 bg-slate-900/45 p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-blue-200">All tools</p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">Find the right tool in seconds.</h2>
              <p className="mt-3 max-w-2xl leading-7 text-slate-400">Search by name or task, then open the tool that fits what you need.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-400">
              <span>Showing <span className="text-white">{visibleDirectoryTools.length}</span> of <span className="text-white">{filteredTools.length}</span></span>
              <Link href="/all-tools" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-4 py-2 text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-400/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/50">Browse all tools <span aria-hidden="true">↗</span></Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex min-h-13 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4 transition focus-within:border-emerald-400/70 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.10)]">
              <span aria-hidden="true" className="text-xl text-emerald-300">⌕</span>
              <input id="directory-tool-search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleDirectoryCount(directoryInitialLimit); }} placeholder="Try PDF compressor, JSON, image, meta tags..." className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500" />
            </label>
            <button type="button" onClick={() => { setSearch(""); setCategory("All"); setVisibleDirectoryCount(directoryInitialLimit); }} className="min-h-13 rounded-xl border border-slate-700 bg-slate-950 px-5 font-bold text-slate-300 transition hover:border-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">Reset filters</button>
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
  <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
    <div>
      <p className="text-sm font-bold uppercase text-blue-200">
        ToolMint online tools
      </p>
      <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
        Practical tools for files, writing, development and everyday work.
      </h2>
    </div>

    <p className="text-base leading-8 text-slate-300">
      ToolMint brings common online tasks into one searchable directory.
      Find a tool for a PDF or image workflow, text cleanup, developer data,
      website checks, color work or a calculation. Each tool has its own page
      with its controls and results, so you can choose the workflow that fits
      your task without installing a separate desktop utility.
    </p>
  </div>

  <div className="mt-9 grid gap-x-8 gap-y-7 border-t border-slate-800 pt-7 md:grid-cols-2 lg:grid-cols-3">
    <article>
      <h3 className="text-xl font-bold text-white">PDF and image workflows</h3>
      <p className="mt-3 leading-7 text-slate-300">
        Work with PDF pages and files, or prepare an image for sharing and
        everyday use. ToolMint includes options for tasks such as merging,
        splitting, organizing, rotating and watermarking PDFs, along with
        image compression, resizing and format conversion. Compression results
        can vary with the source file and the settings you choose.
      </p>
      <p className="mt-3 leading-7 text-slate-300">
        Start with the{" "}
        <Link href="/pdf-compressor" className="font-bold text-blue-300 hover:text-blue-200">
          PDF Compressor
        </Link>
        ,{" "}
        <Link href="/pdf-to-jpg" className="font-bold text-blue-300 hover:text-blue-200">
          PDF to JPG Converter
        </Link>
        {" "}or{" "}
        <Link href="/image-compressor" className="font-bold text-blue-300 hover:text-blue-200">
          Image Compressor
        </Link>
        .
      </p>
    </article>

    <article>
      <h3 className="text-xl font-bold text-white">Developer and text utilities</h3>
      <p className="mt-3 leading-7 text-slate-300">
        Format or validate structured data, encode text for URLs, inspect a
        decoded JWT payload, or generate hashes. For writing tasks, count
        words and characters, change text case, sort lines or find and replace
        text. Results and limitations are shown on each tool page.
      </p>
      <p className="mt-3 leading-7 text-slate-300">
        Try the{" "}
        <Link href="/json-formatter" className="font-bold text-blue-300 hover:text-blue-200">
          JSON Formatter
        </Link>
        {" "}or{" "}
        <Link href="/word-counter" className="font-bold text-blue-300 hover:text-blue-200">
          Word Counter
        </Link>
        {" "}to get started.
      </p>
    </article>

    <article>
      <h3 className="text-xl font-bold text-white">SEO checks and calculations</h3>
      <p className="mt-3 leading-7 text-slate-300">
        Explore tools for tasks such as checking keyword frequency, preparing
        a robots.txt file, extracting URLs from a sitemap and reviewing public
        page information. Calculators cover common finance, date, health and
        business questions. These tools provide task-specific checks or
        estimates; they do not promise Google rankings or replace professional
        advice where that is needed.
      </p>
      <p className="mt-3 leading-7 text-slate-300">
        Browse the{" "}
        <Link href="/keyword-density-checker" className="font-bold text-blue-300 hover:text-blue-200">
          Keyword Density Checker
        </Link>
        {" "}and{" "}
        <Link href="/robots-txt-generator" className="font-bold text-blue-300 hover:text-blue-200">
          Robots.txt Generator
        </Link>
        .
      </p>
    </article>
  </div>

    <div className="mt-8 border-t border-slate-800 pt-6">
    <h3 className="text-xl font-bold text-white">Privacy and processing</h3>
    <p className="mt-3 max-w-5xl leading-7 text-slate-300">
      Processing depends on the tool. Many file tools process files in your
      browser where practical. Some website checks request publicly available
      page data. Review each tool page for its processing details and
      limitations, especially before using sensitive files. ToolMint does not
      require an account to browse and use its tools.
    </p>
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
  const visual = getCategoryVisual(tool.category);
  return (
    <Link href={tool.href} className={`group relative flex min-h-28 flex-col justify-between overflow-hidden rounded-2xl border p-4 shadow-lg shadow-black/15 transition duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/30 ${visual.card} ${index === 0 ? "col-span-2 min-h-32" : ""}`}>
      <span className="flex items-start justify-between gap-3">
        <span className={`grid size-10 place-items-center rounded-xl text-lg ${visual.iconBox}`}>{visual.icon}</span>
        <span className="text-sm font-black text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-white">↗</span>
      </span>
      <span className="mt-4 block min-w-0">
        <span className={`block text-[11px] font-black uppercase ${visual.accent}`}>{tool.category}</span>
        <span className="mt-1 block truncate text-sm font-black text-white">{tool.title}</span>
      </span>
    </Link>
  );
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="max-w-3xl"><p className="text-sm font-bold uppercase text-blue-200">{eyebrow}</p><h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">{title}</h2><p className="mt-3 leading-7 text-slate-400">{text}</p></div>;
}

function PrimaryFeature({ tool }: { tool: Tool }) {
  const visual = getCategoryVisual(tool.category);
  return (
    <Link href={tool.href} className={`group relative isolate flex min-h-64 flex-col justify-between overflow-hidden rounded-[1.75rem] border p-6 shadow-2xl shadow-black/20 transition duration-200 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white/30 sm:p-8 ${visual.card}`}>
      <span className="flex items-center justify-between gap-4">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase ${visual.pill}`}>
          <span aria-hidden="true">{visual.icon}</span> Featured tool
        </span>
        <span className="text-2xl text-white/60 transition group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
      </span>
      <span className="mt-10 block">
        <span className={`block text-xs font-black uppercase ${visual.accent}`}>{tool.category}</span>
        <span className="mt-2 block max-w-xl text-3xl font-black text-white sm:text-4xl">{tool.title}</span>
        <span className="mt-3 block max-w-xl leading-7 text-slate-300">{tool.description}</span>
        <span className={`mt-6 inline-flex items-center gap-2 font-bold text-white transition group-hover:gap-3`}>Open tool <span aria-hidden="true">→</span></span>
      </span>
    </Link>
  );
}

function FeatureMini({ tool }: { tool: Tool }) {
  const visual = getCategoryVisual(tool.category);
  return <Link href={tool.href} className={`group flex min-h-44 flex-col rounded-2xl border p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 ${visual.card}`}><span className="flex items-center justify-between gap-3"><span className={`grid size-9 place-items-center rounded-xl text-base ${visual.iconBox}`}>{visual.icon}</span><span className="text-sm text-white/50 transition group-hover:translate-x-1 group-hover:-translate-y-1">↗</span></span><span className={`mt-3 text-[11px] font-black uppercase ${visual.accent}`}>{tool.category}</span><span className="mt-1 block font-black text-white">{tool.title}</span><span className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{tool.description}</span></Link>;
}

function MiniToolItem({ tool, index }: { tool: Tool; index: number }) {
  const visual = getCategoryVisual(tool.category);
  return <Link href={tool.href} className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 ${visual.card}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg ${visual.iconBox}`}>{visual.icon}</span><span className="min-w-0 flex-1"><span className={`block text-[11px] font-black uppercase ${visual.accent}`}>{String(index).padStart(2, "0")} · {tool.category}</span><span className="mt-1 block truncate font-black text-white">{tool.title}</span></span><span aria-hidden="true" className="shrink-0 text-lg text-white/55 transition group-hover:translate-x-1 group-hover:text-white">↗</span></Link>;
}

function QuickTool({ tool }: { tool: Tool }) {
  const visual = getCategoryVisual(tool.category);
  return <Link href={tool.href} className={`group min-w-[250px] rounded-2xl border p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 ${visual.card}`}><span className="flex items-center justify-between gap-3"><span className={`grid size-9 place-items-center rounded-xl text-base ${visual.iconBox}`}>{visual.icon}</span><span aria-hidden="true" className="text-white/50 transition group-hover:translate-x-1 group-hover:-translate-y-1">↗</span></span><span className={`mt-3 block text-[11px] font-black uppercase ${visual.accent}`}>{tool.category}</span><span className="mt-1 block font-black text-white">{tool.title}</span><span className="mt-1 block line-clamp-2 text-sm leading-6 text-slate-400">{tool.description}</span></Link>;
}

function DirectoryCard({ tool }: { tool: Tool }) {
  const visual = getCategoryVisual(tool.category);
  return <Link href={tool.href} className={`group relative flex min-h-[190px] flex-col overflow-hidden rounded-2xl border p-4 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/25 focus:outline-none focus:ring-2 focus:ring-white/30 ${visual.card}`}><span className="flex items-start justify-between gap-3"><span className={`grid size-11 place-items-center rounded-xl text-lg ${visual.iconBox}`}>{visual.icon}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${visual.pill}`}>{tool.category}</span></span><span className="mt-4 block font-black leading-6 text-white">{tool.title}</span><span className="mt-1 line-clamp-2 flex-1 text-sm leading-6 text-slate-400">{tool.description}</span><span className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm font-bold text-slate-200"><span>Open tool</span><span aria-hidden="true" className="text-base transition group-hover:translate-x-1">→</span></span></Link>;
}

function EmptyState({ suggestions, reset }: { suggestions: Tool[]; reset: () => void }) {
  return <div className="mt-7 border-y border-slate-800 py-10 text-center"><h3 className="text-2xl font-black text-white">Nothing matched that search.</h3><p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">Try another keyword or explore a quick pick.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{suggestions.map((tool) => <Link key={tool.href} href={tool.href} className="rounded-full border border-slate-800 px-3 py-2 text-sm font-bold text-slate-300 transition hover:border-blue-400 hover:text-white">{tool.title}</Link>)}</div><button type="button" onClick={reset} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60">Reset search</button></div>;
}

function AdSlot({ placement }: { placement: string }) {
  return (
    <aside aria-label="Advertisement" data-ad-placement={placement} className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
      <div className="relative flex min-h-[120px] items-center justify-center border-y border-slate-800/80 py-8 text-center md:min-h-[250px]">
        <span className="absolute left-5 top-3 text-[10px] font-bold uppercase text-slate-500">Advertisement</span>
        <span className="text-sm text-slate-600">Ad space reserved</span>
      </div>
    </aside>
  );
}
