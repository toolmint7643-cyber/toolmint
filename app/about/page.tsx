import type { Metadata } from "next";
import Link from "next/link";
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

          <section className="mt-10 border-t border-slate-800 pt-8">
            <h2 className="text-2xl font-black text-white">What you can do here</h2>
            <div className="mt-4 grid gap-5 text-slate-300 sm:grid-cols-2">
              <p className="leading-8">
                The directory brings together document utilities such as PDF
                merging, page organization, conversion and inspection, alongside
                image compression and format conversion. Developer tools cover
                common formatting, encoding and validation tasks; text tools
                help count, compare and transform written content.
              </p>
              <p className="leading-8">
                ToolMint is an independent utility project, not a financial,
                legal or security authority. Calculators provide estimates,
                SEO checkers report what they can inspect, and file tools may
                have format or browser limits. Review each tool&apos;s notes before
                relying on an output, especially for important documents or
                business decisions. Browse the complete directory to see what
                is currently available.
              </p>
            </div>
          </section>

          <section className="mt-10 border-t border-slate-800 pt-8">
            <h2 className="text-2xl font-black text-white">How ToolMint works</h2>
            <div className="mt-4 space-y-4 leading-8 text-slate-300">
              <p>
                ToolMint is organized around everyday tasks rather than a single
                type of software. You can browse tools for PDF page management,
                image conversion, writing, calculations, color accessibility and
                common developer workflows from the <Link className="font-bold text-blue-300 hover:text-blue-200" href="/all-tools">complete tools directory</Link>.
                Each page describes its inputs, output and relevant limitations
                so you can decide whether it fits your task.
              </p>
              <p>
                Many text, image and PDF operations run directly in your browser,
                which avoids sending those files to ToolMint for processing.
                Some features that inspect a public web page or retrieve live
                information need a network request or an external data source.
                Check the individual tool&apos;s privacy and limitation notes before
                using it with confidential material or relying on a result for an
                important decision.
              </p>
              <p>
                ToolMint is an independent project and its tools are utilities,
                not professional advice or a substitute for checking important
                outputs. The collection changes as features are reviewed and
                improved. For corrections, accessibility feedback or a useful
                tool idea, visit the <Link className="font-bold text-blue-300 hover:text-blue-200" href="/contact">Contact page</Link>.
              </p>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
