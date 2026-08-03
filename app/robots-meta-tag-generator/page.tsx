"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type IndexDirective = "index" | "noindex";
type FollowDirective = "follow" | "nofollow";
type ImagePreview = "none" | "standard" | "large";

function buildContent(
  indexDirective: IndexDirective,
  followDirective: FollowDirective,
  noarchive: boolean,
  nosnippet: boolean,
  noimageindex: boolean,
  maxSnippet: string,
  maxImagePreview: ImagePreview,
  maxVideoPreview: string
) {
  const directives: string[] = [indexDirective, followDirective];

  if (noarchive) directives.push("noarchive");
  if (nosnippet) directives.push("nosnippet");
  if (noimageindex) directives.push("noimageindex");

  if (!nosnippet && maxSnippet.trim()) {
    directives.push(`max-snippet:${maxSnippet.trim()}`);
  }

  directives.push(`max-image-preview:${maxImagePreview}`);

  if (maxVideoPreview.trim()) {
    directives.push(`max-video-preview:${maxVideoPreview.trim()}`);
  }

  return directives.join(", ");
}

export default function RobotsMetaTagGeneratorPage() {
  const [indexDirective, setIndexDirective] = useState<IndexDirective>("index");
  const [followDirective, setFollowDirective] = useState<FollowDirective>("follow");
  const [noarchive, setNoarchive] = useState(false);
  const [nosnippet, setNosnippet] = useState(false);
  const [noimageindex, setNoimageindex] = useState(false);
  const [maxSnippet, setMaxSnippet] = useState("-1");
  const [maxImagePreview, setMaxImagePreview] = useState<ImagePreview>("large");
  const [maxVideoPreview, setMaxVideoPreview] = useState("-1");
  const [includeGooglebot, setIncludeGooglebot] = useState(false);
  const [includeBingbot, setIncludeBingbot] = useState(false);

  const robotsContent = useMemo(
    () =>
      buildContent(
        indexDirective,
        followDirective,
        noarchive,
        nosnippet,
        noimageindex,
        maxSnippet,
        maxImagePreview,
        maxVideoPreview
      ),
    [
      indexDirective,
      followDirective,
      noarchive,
      nosnippet,
      noimageindex,
      maxSnippet,
      maxImagePreview,
      maxVideoPreview,
    ]
  );

  const generatedTags = useMemo(() => {
    const tags = [`<meta name="robots" content="${robotsContent}" />`];

    if (includeGooglebot) {
      tags.push(`<meta name="googlebot" content="${robotsContent}" />`);
    }

    if (includeBingbot) {
      tags.push(`<meta name="bingbot" content="${robotsContent}" />`);
    }

    return tags.join("\n");
  }, [robotsContent, includeGooglebot, includeBingbot]);

  const status = useMemo(() => {
    if (indexDirective === "noindex") {
      return {
        label: "Page will not be indexed",
        color: "text-red-300",
        bg: "border-red-500/30 bg-red-500/10",
      };
    }

    if (followDirective === "nofollow") {
      return {
        label: "Page can index, but links may not be followed",
        color: "text-yellow-300",
        bg: "border-yellow-500/30 bg-yellow-500/10",
      };
    }

    return {
      label: "Page can be indexed and followed",
      color: "text-emerald-300",
      bg: "border-emerald-500/30 bg-emerald-500/10",
    };
  }, [indexDirective, followDirective]);

  const copyTags = async () => {
    await navigator.clipboard.writeText(generatedTags);
    alert("Robots meta tags copied!");
  };

  const loadSample = () => {
    setIndexDirective("index");
    setFollowDirective("follow");
    setNoarchive(false);
    setNosnippet(false);
    setNoimageindex(false);
    setMaxSnippet("-1");
    setMaxImagePreview("large");
    setMaxVideoPreview("-1");
    setIncludeGooglebot(true);
    setIncludeBingbot(false);
  };

  const resetTool = () => {
    setIndexDirective("index");
    setFollowDirective("follow");
    setNoarchive(false);
    setNosnippet(false);
    setNoimageindex(false);
    setMaxSnippet("-1");
    setMaxImagePreview("large");
    setMaxVideoPreview("-1");
    setIncludeGooglebot(false);
    setIncludeBingbot(false);
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🤖 Robots Meta Tag Generator"
          description="Generate robots meta tags for index, noindex, follow, nofollow, snippets, image previews and crawler directives."
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  ⚙️ Robots Directives
                </h2>
                <p className="text-slate-300">
                  Choose how search engines should index your page and follow
                  links.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block min-w-0">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Indexing
                  </span>
                  <select
                    value={indexDirective}
                    onChange={(event) =>
                      setIndexDirective(event.target.value as IndexDirective)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="index">index</option>
                    <option value="noindex">noindex</option>
                  </select>
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Following
                  </span>
                  <select
                    value={followDirective}
                    onChange={(event) =>
                      setFollowDirective(event.target.value as FollowDirective)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="follow">follow</option>
                    <option value="nofollow">nofollow</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["noarchive", noarchive, setNoarchive],
                  ["nosnippet", nosnippet, setNosnippet],
                  ["noimageindex", noimageindex, setNoimageindex],
                ].map(([label, checked, setter]) => (
                  <label
                    key={label as string}
                    className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked as boolean}
                      onChange={(event) =>
                        (setter as (value: boolean) => void)(event.target.checked)
                      }
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="break-words">{label as string}</span>
                  </label>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block min-w-0">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Max Snippet
                  </span>
                  <input
                    type="text"
                    value={maxSnippet}
                    disabled={nosnippet}
                    onChange={(event) => setMaxSnippet(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="-1"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Image Preview
                  </span>
                  <select
                    value={maxImagePreview}
                    onChange={(event) =>
                      setMaxImagePreview(event.target.value as ImagePreview)
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="large">large</option>
                    <option value="standard">standard</option>
                    <option value="none">none</option>
                  </select>
                </label>

                <label className="block min-w-0">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Max Video Preview
                  </span>
                  <input
                    type="text"
                    value={maxVideoPreview}
                    onChange={(event) => setMaxVideoPreview(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                    placeholder="-1"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeGooglebot}
                    onChange={(event) => setIncludeGooglebot(event.target.checked)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span>Add googlebot tag</span>
                </label>

                <label className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeBingbot}
                    onChange={(event) => setIncludeBingbot(event.target.checked)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span>Add bingbot tag</span>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={copyTags}>📋 Copy Tags</Button>
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
                  🧾 Generated Tags
                </h2>
                <p className="text-slate-300">
                  Add these meta tags inside your page head section.
                </p>
              </div>

              <div className={`rounded-2xl border p-5 ${status.bg}`}>
                <p className={`text-xl font-bold sm:text-2xl ${status.color}`}>
                  {status.label}
                </p>
              </div>

              <pre className="min-h-[220px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                {generatedTags}
              </pre>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <h3 className="mb-3 text-xl font-bold text-white">
                  📌 Current Content
                </h3>
                <p className="break-words text-slate-300">{robotsContent}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className={`rounded-xl border p-4 ${
                    indexDirective === "index"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p className="text-sm text-slate-300">Indexing</p>
                  <p
                    className={`mt-1 break-words text-3xl font-bold ${
                      indexDirective === "index"
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {indexDirective}
                  </p>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    followDirective === "follow"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-yellow-500/30 bg-yellow-500/10"
                  }`}
                >
                  <p className="text-sm text-slate-300">Following</p>
                  <p
                    className={`mt-1 break-words text-3xl font-bold ${
                      followDirective === "follow"
                        ? "text-emerald-300"
                        : "text-yellow-300"
                    }`}
                  >
                    {followDirective}
                  </p>
                </div>
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
              Robots meta tags control whether search engines can index a page,
              follow its links and show snippets in search results.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ✅ Best Practice
            </h2>
            <p className="text-slate-300">
              Use index, follow for important public pages. Use noindex only for
              private, duplicate, thin or staging pages.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              A noindex directive can remove a page from search results, so use
              it carefully before publishing.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}