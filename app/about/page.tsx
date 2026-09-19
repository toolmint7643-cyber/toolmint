import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "About ToolMint",
  description:
    "Learn about ToolMint, a free online tools platform for PDFs, images, SEO, developers, text, colors and calculators.",
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    title: "Useful first",
    body: "ToolMint focuses on practical tools people can use immediately without a long setup process.",
  },
  {
    title: "Clear limitations",
    body: "Tools should explain what they do, what they do not do and when results should be verified.",
  },
  {
    title: "Fast and mobile-friendly",
    body: "The platform is designed to work well on desktop and mobile, with lightweight pages and searchable navigation.",
  },
  {
    title: "Privacy-aware",
    body: "Where practical, file-based tools run in the browser so users can process files without uploading them to a server.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <section className="mx-auto max-w-5xl">
          <p className="text-sm font-bold uppercase text-blue-300">
            About ToolMint
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Free online tools for real everyday work.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            ToolMint is a free online utility platform for PDF tools, image
            converters, developer utilities, SEO checks, text cleanup, color
            tools and calculators. The goal is simple: fast tools, clean design
            and honest functionality.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {values.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
              >
                <h2 className="text-2xl font-black text-white">
                  {value.title}
                </h2>
                <p className="mt-3 leading-8 text-slate-300">{value.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
