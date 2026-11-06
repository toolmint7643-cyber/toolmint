"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button from "@/components/Button";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";

type Intent = "Informational" | "Commercial research" | "Transactional" | "Custom modifier";
type Idea = { seed: string; phrase: string; intent: Intent; pattern: string };
type IntentSelection = Exclude<Intent, "Custom modifier">;

const sampleSeeds = "pdf compressor\nimage compressor";
const intentOptions: IntentSelection[] = [
  "Informational",
  "Commercial research",
  "Transactional",
];

const patternGroups: Record<IntentSelection, Array<{ phrase: (seed: string) => string; pattern: string }>> = {
  Informational: [
    { phrase: (seed) => `what is ${seed}`, pattern: "Definition" },
    { phrase: (seed) => `how to use ${seed}`, pattern: "How-to question" },
    { phrase: (seed) => `how does ${seed} work`, pattern: "How-it-works question" },
    { phrase: (seed) => `why use ${seed}`, pattern: "Why question" },
    { phrase: (seed) => `${seed} guide`, pattern: "Guide" },
    { phrase: (seed) => `${seed} tutorial`, pattern: "Tutorial" },
    { phrase: (seed) => `${seed} examples`, pattern: "Examples" },
    { phrase: (seed) => `${seed} tips`, pattern: "Tips" },
    { phrase: (seed) => `${seed} for beginners`, pattern: "Audience" },
    { phrase: (seed) => `when to use ${seed}`, pattern: "When question" },
  ],
  "Commercial research": [
    { phrase: (seed) => `best ${seed}`, pattern: "Best-of" },
    { phrase: (seed) => `${seed} comparison`, pattern: "Comparison" },
    { phrase: (seed) => `${seed} alternatives`, pattern: "Alternatives" },
    { phrase: (seed) => `${seed} reviews`, pattern: "Reviews" },
    { phrase: (seed) => `${seed} features`, pattern: "Features" },
    { phrase: (seed) => `${seed} pricing`, pattern: "Pricing" },
    { phrase: (seed) => `${seed} cost`, pattern: "Cost" },
    { phrase: (seed) => `${seed} pros and cons`, pattern: "Pros and cons" },
  ],
  Transactional: [
    { phrase: (seed) => `buy ${seed}`, pattern: "Buy" },
    { phrase: (seed) => `${seed} online`, pattern: "Online action" },
    { phrase: (seed) => `${seed} free`, pattern: "Free option" },
    { phrase: (seed) => `${seed} download`, pattern: "Download" },
    { phrase: (seed) => `${seed} template`, pattern: "Template" },
    { phrase: (seed) => `${seed} tool`, pattern: "Tool" },
    { phrase: (seed) => `get ${seed}`, pattern: "Get" },
  ],
};

function cleanLines(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function createIdeas(
  seeds: string[],
  selectedIntents: IntentSelection[],
  modifiers: string[],
  customPlacement: "before" | "after" | "both",
) {
  const unique = new Map<string, Idea>();

  const add = (idea: Idea) => {
    const phrase = idea.phrase.replace(/\s+/g, " ").trim();
    const key = phrase.toLocaleLowerCase();
    if (phrase && !unique.has(key)) unique.set(key, { ...idea, phrase });
  };

  for (const seed of seeds) {
    for (const intent of selectedIntents) {
      for (const item of patternGroups[intent]) {
        add({ seed, phrase: item.phrase(seed), intent, pattern: item.pattern });
      }
    }

    for (const modifier of modifiers) {
      if (customPlacement === "before" || customPlacement === "both") {
        add({ seed, phrase: `${modifier} ${seed}`, intent: "Custom modifier", pattern: "Modifier before seed" });
      }
      if (customPlacement === "after" || customPlacement === "both") {
        add({ seed, phrase: `${seed} ${modifier}`, intent: "Custom modifier", pattern: "Modifier after seed" });
      }
    }
  }

  return Array.from(unique.values());
}

function makeCsv(ideas: Idea[]) {
  return [
    ["Seed keyword", "Idea", "Intent group", "Pattern"].map(csvCell).join(","),
    ...ideas.map((idea) => [idea.seed, idea.phrase, idea.intent, idea.pattern].map(csvCell).join(",")),
  ].join("\r\n");
}

export default function KeywordSuggestionLitePage() {
  const [seedsInput, setSeedsInput] = useState("");
  const [modifiersInput, setModifiersInput] = useState("");
  const [selectedIntents, setSelectedIntents] = useState<IntentSelection[]>(intentOptions);
  const [customPlacement, setCustomPlacement] = useState<"before" | "after" | "both">("both");
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [filter, setFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState("All groups");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredIdeas = useMemo(() => {
    if (!ideas) return [];
    const query = filter.trim().toLocaleLowerCase();
    return ideas.filter((idea) =>
      (intentFilter === "All groups" || idea.intent === intentFilter) &&
      (!query || `${idea.seed} ${idea.phrase} ${idea.pattern}`.toLocaleLowerCase().includes(query)),
    );
  }, [filter, ideas, intentFilter]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const idea of ideas ?? []) counts.set(idea.intent, (counts.get(idea.intent) ?? 0) + 1);
    return counts;
  }, [ideas]);

  function toggleIntent(intent: IntentSelection) {
    setSelectedIntents((current) => current.includes(intent)
      ? current.filter((item) => item !== intent)
      : [...current, intent]);
  }

  function generate() {
    const seeds = Array.from(new Set(cleanLines(seedsInput).map((seed) => seed.replace(/\s+/g, " "))));
    const modifiers = Array.from(new Set(cleanLines(modifiersInput).map((item) => item.replace(/\s+/g, " "))));

    if (!seeds.length) {
      setError("Enter at least one seed keyword or topic.");
      setIdeas(null);
      return;
    }
    if (seeds.length > 10) {
      setError("Use up to 10 seed keywords per run.");
      setIdeas(null);
      return;
    }
    if (seeds.some((seed) => seed.length > 100)) {
      setError("Each seed keyword must be 100 characters or fewer.");
      setIdeas(null);
      return;
    }
    if (modifiers.length > 20) {
      setError("Use up to 20 custom modifiers per run.");
      setIdeas(null);
      return;
    }
    if (selectedIntents.length === 0 && modifiers.length === 0) {
      setError("Select at least one idea group or add a custom modifier.");
      setIdeas(null);
      return;
    }

    setIdeas(createIdeas(seeds, selectedIntents, modifiers, customPlacement));
    setError("");
    setNotice("Generated locally from phrase patterns and your modifiers. No search volume or live autocomplete data was requested.");
  }

  function loadExample() {
    setSeedsInput(sampleSeeds);
    setModifiersInput("for small business\nonline\nfree");
    setSelectedIntents(intentOptions);
    setCustomPlacement("both");
    setIdeas(null);
    setFilter("");
    setIntentFilter("All groups");
    setError("");
    setNotice("");
  }

  function reset() {
    setSeedsInput("");
    setModifiersInput("");
    setSelectedIntents(intentOptions);
    setCustomPlacement("both");
    setIdeas(null);
    setFilter("");
    setIntentFilter("All groups");
    setError("");
    setNotice("");
  }

  async function copyIdeas() {
    if (!filteredIdeas.length) return;
    try {
      await navigator.clipboard.writeText(filteredIdeas.map((idea) => idea.phrase).join("\n"));
      setNotice(`${filteredIdeas.length} idea(s) copied.`);
    } catch {
      setError("Could not copy ideas. Check browser clipboard permissions.");
    }
  }

  function downloadIdeas() {
    if (!filteredIdeas.length) return;
    const blob = new Blob([makeCsv(filteredIdeas)], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = "toolmint-keyword-ideas.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🔎 Keyword Suggestion Lite"
          description="Generate intent-based keyword phrase ideas from seed topics and your own modifiers. Ideas are pattern-generated, not live search or volume data."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Build keyword ideas</h2>
                <p className="mt-2 text-slate-300">Add up to 10 topics, one per line, then select the idea groups to generate.</p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">Seed keywords or topics</span>
                <textarea
                  value={seedsInput}
                  onChange={(event) => setSeedsInput(event.target.value)}
                  placeholder={"pdf compressor\nimage compressor\nkeyword research"}
                  className="min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white outline-none focus:border-blue-500"
                />
                <span className="mt-2 block text-sm text-slate-400">One seed per line. Maximum 10 seeds, 100 characters each.</span>
              </label>

              <fieldset>
                <legend className="mb-3 font-semibold text-slate-200">Idea groups</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {intentOptions.map((intent) => (
                    <label key={intent} className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                      <input type="checkbox" checked={selectedIntents.includes(intent)} onChange={() => toggleIntent(intent)} className="size-4 accent-blue-500" />
                      <span>{intent}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">Custom modifiers (optional)</span>
                <textarea
                  value={modifiersInput}
                  onChange={(event) => setModifiersInput(event.target.value)}
                  placeholder={"for beginners\nfor small business\nnear me"}
                  className="min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-white outline-none focus:border-blue-500"
                />
                <span className="mt-2 block text-sm text-slate-400">Use up to 20 modifiers, one per line. They are combined before and/or after each seed.</span>
              </label>

              <label className="block max-w-sm">
                <span className="mb-2 block font-semibold text-slate-200">Custom modifier position</span>
                <select value={customPlacement} onChange={(event) => setCustomPlacement(event.target.value as typeof customPlacement)} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-blue-500">
                  <option value="both">Before and after seed</option>
                  <option value="before">Before seed only</option>
                  <option value="after">After seed only</option>
                </select>
              </label>

              {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200" role="alert">{error}</p>}
              {notice && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100" role="status">{notice}</p>}

              <div className="flex flex-wrap gap-3">
                <Button onClick={generate}>Generate Ideas</Button>
                <Button onClick={loadExample} variant="secondary">Load Example</Button>
                <Button onClick={reset} variant="secondary">Reset</Button>
              </div>

              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                These are locally generated phrase patterns, not validated search queries. No Google autocomplete, search volume, keyword difficulty, trend, CPC or ranking data is fetched.
              </p>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Keyword idea results</h2>
                  <p className="mt-2 text-slate-300" aria-live="polite">{ideas ? `${filteredIdeas.length} of ${ideas.length} ideas shown` : "Generate ideas to see phrase patterns here."}</p>
                </div>
                {ideas && <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={copyIdeas} disabled={!filteredIdeas.length}>Copy Ideas</Button><Button variant="secondary" onClick={downloadIdeas} disabled={!filteredIdeas.length}>Download CSV</Button></div>}
              </div>

              {!ideas ? (
                <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900 p-6 text-center text-slate-400">Your generated ideas will appear here.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="text-xs text-slate-400">Total ideas</p><p className="mt-1 text-xl font-bold text-white">{ideas.length}</p></div>
                    {intentOptions.map((intent) => <div key={intent} className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="break-words text-xs text-slate-400">{intent}</p><p className="mt-1 text-xl font-bold text-white">{groupCounts.get(intent) ?? 0}</p></div>)}
                    <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="break-words text-xs text-slate-400">Custom modifier</p><p className="mt-1 text-xl font-bold text-white">{groupCounts.get("Custom modifier") ?? 0}</p></div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-200">Filter ideas</span>
                      <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search generated phrases" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-blue-500" />
                    </label>
                    <label className="block sm:min-w-52">
                      <span className="mb-2 block text-sm font-semibold text-slate-200">Idea group</span>
                      <select value={intentFilter} onChange={(event) => setIntentFilter(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-blue-500">
                        <option>All groups</option>
                        {intentOptions.map((intent) => <option key={intent}>{intent}</option>)}
                        <option>Custom modifier</option>
                      </select>
                    </label>
                  </div>

                  <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1" aria-label="Generated keyword ideas">
                    {filteredIdeas.length ? filteredIdeas.map((idea, index) => (
                      <article key={`${idea.phrase}-${index}`} className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="min-w-0 break-words font-semibold text-white">{idea.phrase}</p>
                          <span className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">{idea.intent}</span>
                        </div>
                        <p className="mt-1 break-words text-xs text-slate-400">Seed: {idea.seed} · Pattern: {idea.pattern}</p>
                      </article>
                    )) : <p className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-center text-slate-400">No ideas match these filters.</p>}
                  </div>
                </>
              )}
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <h2 className="text-xl font-bold text-white">How to use the keyword idea generator</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-300">
              <li>Enter a topic or seed phrase, with one seed on each line.</li>
              <li>Select informational, comparison-focused or transactional phrase patterns.</li>
              <li>Add audience, use-case or location modifiers that fit your actual page.</li>
              <li>Review, filter, copy or export the ideas, then validate promising topics with your own search data.</li>
            </ol>
          </ToolCard>
          <ToolCard>
            <h2 className="text-xl font-bold text-white">Validate before targeting a phrase</h2>
            <p className="mt-3 leading-7 text-slate-300">Phrase patterns help brainstorm page topics; they do not prove that people search for a phrase. Check real impressions and queries in Google Search Console, and use Google Keyword Planner or Google Trends when you need demand or trend context.</p>
            <p className="mt-3 leading-7 text-slate-300">Use the <Link href="/keyword-density-checker" className="font-semibold text-cyan-200 underline">Keyword Density Checker</Link> to review a draft for repeated phrases, or the <Link href="/meta-description-generator" className="font-semibold text-cyan-200 underline">Meta Description Generator</Link> to draft a page description.</p>
          </ToolCard>
        </div>
      </main>
      <Footer />
    </>
  );
}
