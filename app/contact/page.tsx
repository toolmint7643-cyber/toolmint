import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact ToolMint for feedback, bug reports, tool requests, business inquiries and support questions.",
  alternates: {
    canonical: "/contact",
  },
};

const contactReasons = [
  {
    title: "Broken tool or incorrect result",
    detail: "Share the tool name, what you entered and what result you expected.",
  },
  {
    title: "New tool request",
    detail: "Mention the tool category and the main feature you want ToolMint to add.",
  },
  {
    title: "Product feedback",
    detail: "Tell us what feels confusing, slow, missing or useful.",
  },
  {
    title: "Business inquiry",
    detail: "Include partnership, sponsored placement or collaboration details.",
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <section className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase text-blue-300">
            Get in touch
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Contact ToolMint
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Have feedback, a bug report, a tool request or a business question?
            Contact the ToolMint team and include the tool name, browser and a
            short description so the issue can be reviewed clearly.
          </p>

          <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <h2 className="text-2xl font-black text-white">Email</h2>
            <Link
              href="mailto:toolmint7643@gmail.com"
              className="mt-3 inline-flex text-lg font-bold text-blue-200 transition hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              toolmint7643@gmail.com
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-black text-white">
              Include these details in your email
            </h2>
            <p className="mt-2 text-slate-400">
              These are guidance notes, not clickable actions.
            </p>
            <ul className="mt-4 grid gap-3 text-slate-300 sm:grid-cols-2">
              {contactReasons.map((reason) => (
                <li
                  key={reason.title}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <h3 className="font-bold text-white">{reason.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {reason.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
