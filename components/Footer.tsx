import Link from "next/link";
import RelatedToolsFooter from "@/components/RelatedToolsFooter";

const toolLinks = [
  { label: "PDF Compressor", href: "/pdf-compressor" },
  { label: "Image Compressor", href: "/image-compressor" },
  { label: "JSON Formatter", href: "/json-formatter" },
  { label: "Word Counter", href: "/word-counter" },
];

const categoryLinks = [
  { label: "All Tools", href: "/#tools" },
  { label: "Featured", href: "/#featured" },
  { label: "Quick Picks", href: "/#popular" },
  { label: "FAQ", href: "/#faq" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <RelatedToolsFooter />

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500/60">
            <span className="grid size-10 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-sm font-black text-blue-100">
              TM
            </span>
            <span className="text-2xl font-black text-white">ToolMint</span>
          </Link>
          <p className="mt-4 max-w-md leading-7 text-slate-400">
            Free online tools for PDFs, images, developers, SEO, text, colors and everyday calculations.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            © {new Date().getFullYear()} ToolMint. Built for fast daily workflows.
          </p>
        </div>

        <FooterColumn title="Useful tools" links={toolLinks} />
        <FooterColumn title="Explore" links={categoryLinks} />
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase text-slate-500">{title}</h2>
      <div className="mt-4 grid gap-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-300 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
