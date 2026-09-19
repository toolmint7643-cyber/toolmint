import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getGuide, guides } from "@/data/guides";

type GuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return {
      title: "Guide Not Found",
    };
  }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `/guides/${guide.slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      siteName: "ToolMint",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuideDetailPage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
        <article className="mx-auto max-w-4xl">
          <Link
            href="/guides"
            className="text-sm font-bold text-blue-300 transition hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            Back to guides
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
              {guide.category}
            </span>
            <span className="text-sm font-semibold text-slate-500">
              {guide.readingTime}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            {guide.description}
          </p>

          <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <p className="text-sm font-bold uppercase text-blue-200">
              Recommended tool
            </p>
            <Link
              href={guide.primaryTool.href}
              className="mt-2 inline-flex text-xl font-black text-white transition hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              {guide.primaryTool.label}
            </Link>
          </div>

          <div className="mt-8 grid gap-5">
            {guide.sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6"
              >
                <h2 className="text-2xl font-black text-white">
                  {section.title}
                </h2>
                <p className="mt-3 leading-8 text-slate-300">{section.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-black text-white">Quick checklist</h2>
            <ul className="mt-4 grid gap-3 text-slate-300">
              {guide.checklist.map((item) => (
                <li key={item} className="rounded-xl bg-slate-950 p-4">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-black text-white">Related tools</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guide.relatedTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-bold text-slate-200 transition hover:border-blue-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
