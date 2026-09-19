import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { guides } from "@/data/guides";

export const metadata: Metadata = {
  title: "ToolMint Guides",
  description:
    "Read practical ToolMint guides for PDF compression, PDF conversion, image compression, JSON formatting and SEO meta tags.",
  alternates: {
    canonical: "/guides",
  },
};

export default function GuidesPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <section className="mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase text-blue-300">
            ToolMint guides
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black text-white sm:text-5xl">
            Practical guides for using online tools better.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Learn how to compress PDFs, convert files, optimize images, format
            JSON and write better SEO metadata with clear workflows and direct
            links to ToolMint tools.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-blue-400 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
                    {guide.category}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {guide.readingTime}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-black text-white">
                  {guide.title}
                </h2>
                <p className="mt-3 leading-7 text-slate-400">
                  {guide.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-bold text-blue-300 transition group-hover:text-blue-200">
                  Read guide
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
