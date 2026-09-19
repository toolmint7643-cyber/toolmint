import Link from "next/link";

const navItems = [
  { label: "Tools", href: "/#tools" },
  { label: "Featured", href: "/#featured" },
  { label: "Quick picks", href: "/#popular" },
  { label: "FAQ", href: "/#faq" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-500/60">
          <span className="grid size-9 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 text-sm font-black text-blue-100 transition group-hover:border-blue-300">
            TM
          </span>
          <span className="text-xl font-black tracking-tight text-white">ToolMint</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/#tools"
          className="inline-flex items-center rounded-full border border-blue-400/40 bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400/60"
        >
          Browse tools
        </Link>
      </div>
    </header>
  );
}
