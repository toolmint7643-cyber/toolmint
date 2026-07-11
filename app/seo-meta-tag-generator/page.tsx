"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type RobotsOption =
    | "index, follow"
    | "noindex, follow"
    | "index, nofollow"
    | "noindex, nofollow";

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function getLengthStatus(length: number, min: number, max: number) {
    if (length < min) return "Short";
    if (length > max) return "Long";
    return "Good";
}
const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "use",
    "with",
    "you",
    "your",
    "online",
    "free",
]);

function generateKeywordsFromDescription(descriptionText: string) {
    const words = descriptionText
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 2 && !stopWords.has(word));

    const scores = new Map<string, number>();

    words.forEach((word) => {
        scores.set(word, (scores.get(word) || 0) + 1);
    });

    for (let index = 0; index < words.length - 1; index += 1) {
        const phrase = `${words[index]} ${words[index + 1]}`;
        scores.set(phrase, (scores.get(phrase) || 0) + 2);
    }

    return Array.from(scores.entries())
        .sort((first, second) => second[1] - first[1])
        .slice(0, 10)
        .map(([keyword]) => keyword)
        .join(", ");
}
export default function SeoMetaTagGeneratorPage() {
    const [title, setTitle] = useState("ToolMint - Free Online Developer Tools");
    const [description, setDescription] = useState(
        "Use free online developer, productivity, calculator, image, PDF, color and SEO tools on ToolMint."
    );
    const [keywords, setKeywords] = useState(
        "free tools, developer tools, online tools, productivity tools"
    );
    const [canonicalUrl, setCanonicalUrl] = useState("https://toolmint.com/");
    const [robots, setRobots] = useState<RobotsOption>("index, follow");
    const [author, setAuthor] = useState("ToolMint");

    const [ogTitle, setOgTitle] = useState("ToolMint - Free Online Tools");
    const [ogDescription, setOgDescription] = useState(
        "Fast, free and mobile-friendly online tools for developers, students and creators."
    );
    const [ogImage, setOgImage] = useState("https://toolmint.com/og-image.png");
    const [ogUrl, setOgUrl] = useState("https://toolmint.com/");
    const [twitterCard, setTwitterCard] = useState("summary_large_image");

    const generatedTags = useMemo(() => {
        const safeTitle = escapeHtml(title);
        const safeDescription = escapeHtml(description);
        const safeKeywords = escapeHtml(keywords);
        const safeCanonicalUrl = escapeHtml(canonicalUrl);
        const safeRobots = escapeHtml(robots);
        const safeAuthor = escapeHtml(author);
        const safeOgTitle = escapeHtml(ogTitle || title);
        const safeOgDescription = escapeHtml(ogDescription || description);
        const safeOgImage = escapeHtml(ogImage);
        const safeOgUrl = escapeHtml(ogUrl || canonicalUrl);
        const safeTwitterCard = escapeHtml(twitterCard);

        return `<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<meta name="keywords" content="${safeKeywords}" />
<meta name="robots" content="${safeRobots}" />
<meta name="author" content="${safeAuthor}" />
<link rel="canonical" href="${safeCanonicalUrl}" />

<meta property="og:type" content="website" />
<meta property="og:title" content="${safeOgTitle}" />
<meta property="og:description" content="${safeOgDescription}" />
<meta property="og:image" content="${safeOgImage}" />
<meta property="og:url" content="${safeOgUrl}" />
<meta property="og:site_name" content="${safeAuthor}" />

<meta name="twitter:card" content="${safeTwitterCard}" />
<meta name="twitter:title" content="${safeOgTitle}" />
<meta name="twitter:description" content="${safeOgDescription}" />
<meta name="twitter:image" content="${safeOgImage}" />`;
    }, [
        title,
        description,
        keywords,
        canonicalUrl,
        robots,
        author,
        ogTitle,
        ogDescription,
        ogImage,
        ogUrl,
        twitterCard,
    ]);

    const titleStatus = getLengthStatus(title.length, 30, 60);
    const descriptionStatus = getLengthStatus(description.length, 120, 160);

    async function copyTags() {
        try {
            await navigator.clipboard.writeText(generatedTags);
            alert("SEO meta tags copied successfully!");
        } catch {
            alert("Unable to copy tags. Please try again.");
        }
    }

    function loadSample() {
        setTitle("ToolMint - Free Online Developer Tools");
        setDescription(
            "Use free online developer, productivity, calculator, image, PDF, color and SEO tools on ToolMint."
        );
        setKeywords("free tools, developer tools, online tools, productivity tools");
        setCanonicalUrl("https://toolmint.com/");
        setRobots("index, follow");
        setAuthor("ToolMint");
        setOgTitle("ToolMint - Free Online Tools");
        setOgDescription(
            "Fast, free and mobile-friendly online tools for developers, students and creators."
        );
        setOgImage("https://toolmint.com/og-image.png");
        setOgUrl("https://toolmint.com/");
        setTwitterCard("summary_large_image");
    }

    function resetTool() {
        setTitle("");
        setDescription("");
        setKeywords("");
        setCanonicalUrl("");
        setRobots("index, follow");
        setAuthor("");
        setOgTitle("");
        setOgDescription("");
        setOgImage("");
        setOgUrl("");
        setTwitterCard("summary_large_image");
    }

    return (
        <>
            <Header />

            <main className="mx-auto max-w-6xl px-5 py-10">
                <PageTitle
                    title="🔎 SEO Meta Tag Generator"
                    description="Generate SEO meta tags, Open Graph tags and Twitter card tags for websites with live previews and copy-ready HTML."
                />

                <ToolCard>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            ✍️ SEO Inputs
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Add page title, description, canonical URL and social
                                            preview details.
                                        </p>
                                    </div>

                                    <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200">
                                        Copy-ready HTML
                                    </span>
                                </div>

                                <div className="space-y-5">
                                    <label className="block">
                                        <span className="mb-2 flex items-center justify-between text-slate-300">
                                            <span>Page title</span>
                                            <strong
                                                className={
                                                    titleStatus === "Good"
                                                        ? "text-emerald-300"
                                                        : "text-yellow-300"
                                                }
                                            >
                                                {title.length} chars • {titleStatus}
                                            </strong>
                                        </span>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(event) => setTitle(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            placeholder="Enter page title"
                                        />
                                    </label>

                                    <label className="block">
                                        <span className="mb-2 flex items-center justify-between text-slate-300">
                                            <span>Meta description</span>
                                            <strong
                                                className={
                                                    descriptionStatus === "Good"
                                                        ? "text-emerald-300"
                                                        : "text-yellow-300"
                                                }
                                            >
                                                {description.length} chars • {descriptionStatus}
                                            </strong>
                                        </span>
                                        <textarea
                                            value={description}
                                            onChange={(event) => setDescription(event.target.value)}
                                            className="min-h-[110px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            placeholder="Enter meta description"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-2 block text-slate-300">Keywords</span>
                                        <input
                                            type="text"
                                            value={keywords}
                                            onChange={(event) => setKeywords(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            placeholder="keyword one, keyword two"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setKeywords(generateKeywordsFromDescription(description))
                                            }
                                            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                                        >
                                            ✨ Auto Keywords From Description
                                        </button>
                                    </label>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="mb-2 block text-slate-300">
                                                Canonical URL
                                            </span>
                                            <input
                                                type="url"
                                                value={canonicalUrl}
                                                onChange={(event) =>
                                                    setCanonicalUrl(event.target.value)
                                                }
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                                placeholder="https://example.com/page"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="mb-2 block text-slate-300">Robots</span>
                                            <select
                                                value={robots}
                                                onChange={(event) =>
                                                    setRobots(event.target.value as RobotsOption)
                                                }
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            >
                                                <option value="index, follow">index, follow</option>
                                                <option value="noindex, follow">noindex, follow</option>
                                                <option value="index, nofollow">index, nofollow</option>
                                                <option value="noindex, nofollow">
                                                    noindex, nofollow
                                                </option>
                                            </select>
                                        </label>
                                    </div>

                                    <label className="block">
                                        <span className="mb-2 block text-slate-300">Author</span>
                                        <input
                                            type="text"
                                            value={author}
                                            onChange={(event) => setAuthor(event.target.value)}
                                            className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            placeholder="Website or author name"
                                        />
                                    </label>

                                    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                                        <h3 className="mb-4 text-xl font-bold text-white">
                                            🌐 Social Preview Tags
                                        </h3>

                                        <div className="space-y-4">
                                            <input
                                                type="text"
                                                value={ogTitle}
                                                onChange={(event) => setOgTitle(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                                placeholder="Open Graph title"
                                            />

                                            <textarea
                                                value={ogDescription}
                                                onChange={(event) =>
                                                    setOgDescription(event.target.value)
                                                }
                                                className="min-h-[90px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                                placeholder="Open Graph description"
                                            />

                                            <input
                                                type="url"
                                                value={ogImage}
                                                onChange={(event) => setOgImage(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                                placeholder="https://example.com/og-image.png"
                                            />

                                            <input
                                                type="url"
                                                value={ogUrl}
                                                onChange={(event) => setOgUrl(event.target.value)}
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                                placeholder="https://example.com/page"
                                            />

                                            <select
                                                value={twitterCard}
                                                onChange={(event) =>
                                                    setTwitterCard(event.target.value)
                                                }
                                                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
                                            >
                                                <option value="summary_large_image">
                                                    summary_large_image
                                                </option>
                                                <option value="summary">summary</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <Button onClick={copyTags}>📋 Copy Tags</Button>

                                        <button
                                            type="button"
                                            onClick={loadSample}
                                            className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                                        >
                                            🧪 Sample
                                        </button>

                                        <button
                                            type="button"
                                            onClick={resetTool}
                                            className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300"
                                        >
                                            🔄 Reset
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <h2 className="mb-5 text-2xl font-bold text-white">
                                    ✅ Generated Tags
                                </h2>

                                <textarea
                                    value={generatedTags}
                                    readOnly
                                    className="min-h-[430px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm leading-6 text-blue-200 outline-none"
                                />

                                <div className="mt-5 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4 text-sm text-yellow-100">
                                    Best practice: keep title around 30-60 characters and meta
                                    description around 120-160 characters.
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-white">
                                    🔍 Search Preview
                                </h2>

                                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
                                    <p className="text-sm text-emerald-300">
                                        {canonicalUrl || "https://example.com/page"}
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold text-blue-300">
                                        {title || "Page title preview"}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                        {description || "Meta description preview will appear here."}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <h2 className="mb-4 text-2xl font-bold text-white">
                                    📣 Social Preview
                                </h2>

                                <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                                    <div className="flex h-44 items-center justify-center bg-slate-800 text-center text-sm text-slate-400">
                                        {ogImage ? ogImage : "OG image URL preview"}
                                    </div>

                                    <div className="p-5">
                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                            {ogUrl || canonicalUrl || "https://example.com"}
                                        </p>
                                        <h3 className="mt-2 text-xl font-bold text-white">
                                            {ogTitle || title || "Social title preview"}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">
                                            {ogDescription ||
                                                description ||
                                                "Social description preview will appear here."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <h2 className="mb-3 text-2xl font-bold text-white">
                                    📌 What is an SEO Meta Tag Generator?
                                </h2>
                                <p className="text-slate-300">
                                    An SEO meta tag generator creates HTML tags that describe your
                                    page to search engines and social platforms. It helps improve
                                    page previews, indexing control and share appearance.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                                <h2 className="mb-3 text-2xl font-bold text-white">
                                    🚀 SEO Tips
                                </h2>
                                <p className="text-slate-300">
                                    Write unique titles and descriptions for every page, add a
                                    canonical URL, use strong Open Graph images and avoid stuffing
                                    too many keywords.
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