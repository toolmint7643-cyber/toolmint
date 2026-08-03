"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type Tone = "professional" | "friendly" | "marketing" | "simple";

const sampleTitle = "Free JSON Formatter Online";
const sampleKeyword = "JSON formatter";
const sampleExtraKeywords = "format JSON, validate JSON, beautify JSON";
const sampleAudience = "developers and students";

function getStatus(length: number) {
  if (length < 120) {
    return {
      label: "Short",
      color: "text-yellow-300",
      bg: "bg-yellow-500/10 border-yellow-500/30",
    };
  }

  if (length > 160) {
    return {
      label: "Too Long",
      color: "text-red-300",
      bg: "bg-red-500/10 border-red-500/30",
    };
  }

  return {
    label: "Good",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  };
}

function cleanInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => cleanInput(keyword))
    .filter(Boolean);
}

function uniqueDescriptions(descriptions: string[]) {
  return Array.from(new Set(descriptions.map((item) => cleanInput(item))));
}

function buildDescriptions(
  title: string,
  mainKeyword: string,
  extraKeywords: string,
  audience: string,
  tone: Tone
) {
  const pageTitle = cleanInput(title) || "your page";
  const keyword = cleanInput(mainKeyword) || "this topic";
  const keywords = splitKeywords(extraKeywords);
  const targetAudience = cleanInput(audience) || "users";
  const keywordPhrase = keywords.length > 0 ? keywords.slice(0, 2).join(", ") : keyword;

  const templates: Record<Tone, string[]> = {
    professional: [
      `Use ${pageTitle} to quickly improve your workflow with ${keyword}. Built for ${targetAudience}, this page helps you get accurate results fast.`,
      `Discover ${pageTitle} with helpful features for ${keyword}, ${keywordPhrase} and everyday productivity. Simple, reliable and easy to use.`,
      `Get a clean and practical ${keyword} solution with ${pageTitle}. Ideal for ${targetAudience} who need fast, accurate and simple results.`,
      `${pageTitle} helps ${targetAudience} save time with ${keyword} and related tasks. Use it online for a smooth, focused experience.`,
      `Try ${pageTitle} for a fast way to handle ${keyword}. Designed for ${targetAudience} with a clean interface and useful results.`,
      `Improve your work with ${pageTitle}, a simple online option for ${keyword}, ${keywordPhrase} and quick productivity tasks.`,
    ],
    friendly: [
      `Need ${keyword}? Try ${pageTitle} for a simple and easy way to get things done online. Helpful for ${targetAudience} and everyday use.`,
      `${pageTitle} makes ${keyword} easier with a clean, friendly experience. Use it online anytime for quick and useful results.`,
      `Create better results with ${pageTitle}. It is simple, fast and helpful for ${targetAudience} working with ${keyword}.`,
      `Use ${pageTitle} to make ${keyword} quick and stress-free. A handy online tool for ${targetAudience} who want simple results.`,
      `Make your work easier with ${pageTitle}. Perfect for ${targetAudience} who need ${keyword}, ${keywordPhrase} and fast output.`,
      `Try ${pageTitle} online and handle ${keyword} in a clean, simple way. Built to help ${targetAudience} save time.`,
    ],
    marketing: [
      `Boost your workflow with ${pageTitle}. Get fast ${keyword} results, improve productivity and make everyday tasks easier for ${targetAudience}.`,
      `Use ${pageTitle} to create better results in less time. A powerful online option for ${keyword}, ${keywordPhrase} and quick work.`,
      `Save time with ${pageTitle}, built for ${targetAudience} who need fast ${keyword} results and a smooth online experience.`,
      `Make ${keyword} easier with ${pageTitle}. Fast, simple and useful for ${targetAudience} who want reliable results online.`,
      `Get more done with ${pageTitle}. Use this online tool for ${keyword}, ${keywordPhrase} and productivity-focused work.`,
      `Turn slow tasks into quick wins with ${pageTitle}. Helpful for ${targetAudience} working with ${keyword} and related needs.`,
    ],
    simple: [
      `${pageTitle} helps you with ${keyword} online. It is simple, fast and useful for ${targetAudience}.`,
      `Use ${pageTitle} for ${keyword}. This tool is easy to use and helps ${targetAudience} get quick results.`,
      `Try ${pageTitle} to work with ${keyword}, ${keywordPhrase} and related tasks in a simple online tool.`,
      `${pageTitle} is a simple online tool for ${keyword}. It helps ${targetAudience} save time and work faster.`,
      `Get quick help with ${keyword} using ${pageTitle}. A clean and easy tool for ${targetAudience}.`,
      `Use ${pageTitle} online for ${keyword}. Simple design, fast output and useful results for ${targetAudience}.`,
    ],
  };

  return uniqueDescriptions(templates[tone]);
}

export default function MetaDescriptionGeneratorPage() {
  const [title, setTitle] = useState(sampleTitle);
  const [mainKeyword, setMainKeyword] = useState(sampleKeyword);
  const [extraKeywords, setExtraKeywords] = useState(sampleExtraKeywords);
  const [audience, setAudience] = useState(sampleAudience);
  const [tone, setTone] = useState<Tone>("professional");

  const descriptions = useMemo(
    () => buildDescriptions(title, mainKeyword, extraKeywords, audience, tone),
    [title, mainKeyword, extraKeywords, audience, tone]
  );

  const bestDescription = descriptions.find(
    (description) => getStatus(description.length).label === "Good"
  );

  const copyText = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    alert(message);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(descriptions.join("\n\n"));
    alert("All meta descriptions copied!");
  };

  const loadSample = () => {
    setTitle(sampleTitle);
    setMainKeyword(sampleKeyword);
    setExtraKeywords(sampleExtraKeywords);
    setAudience(sampleAudience);
    setTone("professional");
  };

  const resetTool = () => {
    setTitle("");
    setMainKeyword("");
    setExtraKeywords("");
    setAudience("");
    setTone("professional");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="📝 Meta Description Generator"
          description="Generate SEO-friendly meta description ideas with keyword, audience and tone options for better search snippets."
        />

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ✍️ Page Details
                </h2>
                <p className="text-slate-300">
                  Add your page topic, target keyword and audience to create
                  meta description ideas.
                </p>
              </div>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Page Title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Example: Free JSON Formatter Online"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Main Keyword
                </span>
                <input
                  type="text"
                  value={mainKeyword}
                  onChange={(event) => setMainKeyword(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Example: JSON formatter"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Extra Keywords
                </span>
                <input
                  type="text"
                  value={extraKeywords}
                  onChange={(event) => setExtraKeywords(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="keyword one, keyword two"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Target Audience
                </span>
                <input
                  type="text"
                  value={audience}
                  onChange={(event) => setAudience(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="developers, students, marketers"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  Tone
                </span>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value as Tone)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="marketing">Marketing</option>
                  <option value="simple">Simple</option>
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <Button onClick={copyAll}>📋 Copy All</Button>
                <Button onClick={loadSample}>✨ Sample</Button>
                <Button onClick={resetTool} variant="secondary">
                  🔄 Reset
                </Button>
              </div>
            </div>
          </ToolCard>

          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  📄 Generated Descriptions
                </h2>
                <p className="text-slate-300">
                  Choose a description close to 120-160 characters for best SEO
                  snippet display.
                </p>
              </div>

              {bestDescription && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-300">
                    ⭐ Recommended
                  </p>
                  <p className="leading-7 text-slate-100">
                    {bestDescription}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-300">
                      {bestDescription.length} chars
                    </span>
                    <Button
                      onClick={() =>
                        copyText(bestDescription, "Recommended description copied!")
                      }
                    >
                      📋 Copy
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {descriptions.map((description, index) => {
                  const status = getStatus(description.length);

                  return (
                    <div
                      key={`${description}-${index}`}
                      className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-white">
                          Option {index + 1}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${status.bg} ${status.color}`}
                        >
                          {description.length} chars - {status.label}
                        </span>
                      </div>

                      <p className="leading-7 text-slate-200">
                        {description}
                      </p>

                      <div className="mt-4">
                        <Button
                          onClick={() =>
                            copyText(description, "Meta description copied!")
                          }
                        >
                          📋 Copy Description
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🔍 SEO Usage
            </h2>
            <p className="text-slate-300">
              Use meta descriptions to explain page value clearly and improve
              search result click-through rate.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Keep descriptions around 120-160 characters, include your main
              keyword naturally and write for humans first.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              This free version uses smart templates, not an AI API. Always
              review and edit descriptions before publishing.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}