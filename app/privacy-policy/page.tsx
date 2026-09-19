import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the ToolMint privacy policy for browser-side tools, public URL checks, cookies, analytics, ads and user data handling.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const sections = [
  {
    title: "Privacy-first tools",
    body: "ToolMint is built around free online tools that run in your browser where practical. Many PDF, image, text, color, calculator and developer tools process data locally on your device without uploading files to ToolMint servers.",
  },
  {
    title: "Information you provide",
    body: "When you paste text, upload a file, enter a URL or use a calculator, the information is used to power the tool you selected. File-based browser tools generally keep files local in your browser. URL-based SEO tools may request public page data so the tool can inspect metadata, headings, links or page size.",
  },
  {
    title: "Analytics and advertising",
    body: "ToolMint may use privacy-respecting analytics, Google Analytics, Google Search Console, Google AdSense or similar services in the future to understand traffic, improve tools and support free access. These services may use cookies or similar technologies according to their own policies.",
  },
  {
    title: "No sensitive data guarantee",
    body: "Do not upload or paste highly sensitive personal, financial, legal, medical or confidential business information unless you fully understand how the selected tool works. Browser-side processing improves privacy, but you are responsible for choosing what to process.",
  },
  {
    title: "Data retention",
    body: "ToolMint does not intentionally store uploaded files from browser-side tools. If a tool uses a public URL check or third-party API, request logs may be handled by hosting, analytics or API providers.",
  },
  {
    title: "Policy updates",
    body: "This policy may be updated as ToolMint adds analytics, advertising, APIs or new features. The latest version on this page applies to your use of ToolMint.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <section className="mx-auto max-w-4xl">
          <p className="text-sm font-bold uppercase text-blue-300">
            ToolMint policy
          </p>
          <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            ToolMint is designed for fast, practical tools with clear privacy
            expectations. This page explains how data is handled across
            browser-side tools, public URL checks, analytics and future
            monetization.
          </p>

          <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-blue-100">
            Last updated: September 19, 2026
          </div>

          <div className="mt-8 grid gap-5">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
              >
                <h2 className="text-2xl font-black text-white">
                  {section.title}
                </h2>
                <p className="mt-3 leading-8 text-slate-300">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
