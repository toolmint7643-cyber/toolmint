import Link from "next/link";

type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
};

export default function ToolPreviewCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      aria-label={`Open ${tool.title}`}
      className="group block h-full rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/60"
    >
      <article className="flex h-full flex-col rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-slate-900 hover:shadow-xl hover:shadow-blue-950/20">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-300">
            {tool.category}
          </span>
          <span className="text-sm font-bold text-blue-300 transition group-hover:translate-x-1 group-hover:text-blue-200">
            Open
          </span>
        </div>

        <h3 className="mt-4 text-xl font-black text-white">{tool.title}</h3>

        <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{tool.description}</p>
      </article>
    </Link>
  );
}
