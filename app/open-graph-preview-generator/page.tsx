"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OgData = {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  type: string;
  twitterCard: string;
  sourceUrl: string;
};

const sampleData: OgData = {
  title: "ToolMint - Free Online Developer and SEO Tools",
  description:
    "Use free online tools for developers, creators and website owners. Format JSON, generate SEO tags, create sitemaps and more.",
  image: "https://toolmint.com/og-image.png",
  url: "https://toolmint.com",
  siteName: "ToolMint",
  type: "website",
  twitterCard: "summary_large_image",
  sourceUrl: "https://toolmint.com",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default function OpenGraphPreviewGeneratorPage() {
  const [fetchUrl, setFetchUrl] = useState("https://toolmint.com");
  const [title, setTitle] = useState(sampleData.title);
  const [description, setDescription] = useState(sampleData.description);
  const [image, setImage] = useState(sampleData.image);
  const [url, setUrl] = useState(sampleData.url);
  const [siteName, setSiteName] = useState(sampleData.siteName);
  const [type, setType] = useState(sampleData.type);
  const [twitterCard, setTwitterCard] = useState(sampleData.twitterCard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generatedTags = useMemo(() => {
    return `<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />

<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(url)}" />
<meta property="og:site_name" content="${escapeHtml(siteName)}" />
<meta property="og:type" content="${escapeHtml(type)}" />

<meta name="twitter:card" content="${escapeHtml(twitterCard)}" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />`;
  }, [title, description, image, url, siteName, type, twitterCard]);

  const fetchOpenGraphData = async () => {
    if (!fetchUrl.trim()) {
      alert("Please enter a URL first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/og-preview?url=${encodeURIComponent(fetchUrl.trim())}`
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to fetch Open Graph data.");
        return;
      }

      const result = data as OgData;

      setTitle(result.title || "");
      setDescription(result.description || "");
      setImage(result.image || "");
      setUrl(result.url || result.sourceUrl || fetchUrl);
      setSiteName(result.siteName || "");
      setType(result.type || "website");
      setTwitterCard(result.twitterCard || "summary_large_image");

      alert("Open Graph data fetched!");
    } catch {
      setError("Something went wrong while fetching this URL.");
    } finally {
      setLoading(false);
    }
  };

  const copyTags = async () => {
    await navigator.clipboard.writeText(generatedTags);
    alert("Open Graph meta tags copied!");
  };

  const loadSample = () => {
    setFetchUrl(sampleData.sourceUrl);
    setTitle(sampleData.title);
    setDescription(sampleData.description);
    setImage(sampleData.image);
    setUrl(sampleData.url);
    setSiteName(sampleData.siteName);
    setType(sampleData.type);
    setTwitterCard(sampleData.twitterCard);
    setError("");
  };

  const resetTool = () => {
    setFetchUrl("");
    setTitle("");
    setDescription("");
    setImage("");
    setUrl("");
    setSiteName("");
    setType("website");
    setTwitterCard("summary_large_image");
    setError("");
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-10">
        <PageTitle
          title="🌐 Open Graph Preview Generator"
          description="Fetch, preview and generate Open Graph and Twitter Card meta tags for better social sharing and SEO."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ToolCard>
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  🔎 Fetch Website Tags
                </h2>
                <p className="text-slate-300">
                  Enter a page URL to fetch its title, description, image and
                  social preview data.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="url"
                  value={fetchUrl}
                  onChange={(event) => setFetchUrl(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="https://example.com/page"
                />
                <Button onClick={fetchOpenGraphData}>
                  {loading ? "⏳ Fetching" : "🚀 Fetch"}
                </Button>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
                  ⚠️ {error}
                </div>
              )}

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  OG Title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Page title"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  OG Description
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[120px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="Short page description"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-semibold text-slate-200">
                  OG Image URL
                </span>
                <input
                  type="url"
                  value={image}
                  onChange={(event) => setImage(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  placeholder="https://example.com/og-image.png"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Page URL
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Site Name
                  </span>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(event) => setSiteName(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    OG Type
                  </span>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="website">website</option>
                    <option value="article">article</option>
                    <option value="product">product</option>
                    <option value="profile">profile</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block font-semibold text-slate-200">
                    Twitter Card
                  </span>
                  <select
                    value={twitterCard}
                    onChange={(event) => setTwitterCard(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="summary_large_image">
                      summary_large_image
                    </option>
                    <option value="summary">summary</option>
                    <option value="app">app</option>
                    <option value="player">player</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
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
                  👀 Social Preview
                </h2>
                <p className="text-slate-300">
                  Preview how your page may look when shared on social
                  platforms.
                </p>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <div className="flex aspect-[1.91/1] items-center justify-center bg-slate-800">
                  {image ? (
                    <img
                      src={image}
                      alt="Open Graph preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-slate-400">No image preview</span>
                  )}
                </div>

                <div className="space-y-2 p-5">
                  <p className="text-sm uppercase tracking-wide text-slate-400">
                    {siteName || "Website"}
                  </p>
                  <h3 className="line-clamp-2 text-xl font-bold text-white">
                    {title || "Open Graph title"}
                  </h3>
                  <p className="line-clamp-3 text-slate-300">
                    {description || "Open Graph description will appear here."}
                  </p>
                  <p className="truncate text-sm text-blue-300">
                    {url || "https://example.com"}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-bold text-white">
                  🧩 Generated Meta Tags
                </h2>
                <pre className="min-h-[360px] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                  {generatedTags}
                </pre>
              </div>
            </div>
          </ToolCard>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              📈 SEO Benefit
            </h2>
            <p className="text-slate-300">
              Open Graph tags improve how your pages appear when shared on
              Facebook, LinkedIn, WhatsApp and other platforms.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              🖼️ Image Tip
            </h2>
            <p className="text-slate-300">
              Use a clear 1200 x 630 image for best social sharing preview
              quality across most platforms.
            </p>
          </ToolCard>

          <ToolCard>
            <h2 className="mb-3 text-xl font-bold text-white">
              ⚠️ Important Note
            </h2>
            <p className="text-slate-300">
              Some websites block server requests, so fetching may fail. Manual
              editing and tag generation will still work.
            </p>
          </ToolCard>
        </div>
      </main>

      <Footer />
    </>
  );
}