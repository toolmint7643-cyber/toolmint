import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Read the ToolMint terms of use for free online tools, browser-side processing, limitations, acceptable use and disclaimers.",
  alternates: {
    canonical: "/terms",
  },
};

const terms = [
  {
    title: "Use of ToolMint",
    body: "ToolMint provides free online tools for PDFs, images, developers, SEO, text, colors, calculators and productivity workflows. You may use the tools for lawful personal, educational or business purposes.",
  },
  {
    title: "Tool limitations",
    body: "ToolMint tools are provided as-is. Some tools are browser-side, some inspect public URLs and some may depend on browser capabilities or third-party APIs. Results can vary by file type, browser, public website configuration or input quality.",
  },
  {
    title: "No professional advice",
    body: "Calculator, SEO, security, PDF and productivity results are informational utilities only. They are not legal, financial, medical, tax, cybersecurity or professional advice.",
  },
  {
    title: "User responsibility",
    body: "You are responsible for checking outputs before relying on them. For sensitive documents, legal files, security decisions or business-critical work, verify results with a qualified professional or trusted workflow.",
  },
  {
    title: "Acceptable use",
    body: "Do not use ToolMint to process unlawful content, violate privacy, abuse public websites, attempt unauthorized access or overload ToolMint services.",
  },
  {
    title: "Changes to tools",
    body: "ToolMint may add, remove, update or limit tools at any time to improve quality, performance, security and reliability.",
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <section className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase text-blue-300">
            ToolMint terms
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            These terms explain the basic rules for using ToolMint and the
            limitations that apply to free online tools.
          </p>

          <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-100">
            Last updated: September 19, 2026
          </div>

          <div className="mt-8 grid gap-5">
            {terms.map((term) => (
              <article
                key={term.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
              >
                <h2 className="text-2xl font-black text-white">
                  {term.title}
                </h2>
                <p className="mt-3 leading-8 text-slate-300">{term.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
