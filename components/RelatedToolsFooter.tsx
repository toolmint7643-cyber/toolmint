"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tools } from "@/data/tools";

type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
};

const workflowLabels: Record<string, string> = {
  PDF: "Related PDF tools",
  "Image & PDF": "Related file tools",
  Image: "Related image tools",
  Developer: "Related developer tools",
  Text: "Related text tools",
  Calculator: "Related calculators",
  Color: "Related color tools",
  SEO: "Related SEO tools",
};

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function getRelatedTools(currentTool: Tool) {
  const sameCategory = tools.filter(
    (tool) =>
      tool.href !== currentTool.href && tool.category === currentTool.category
  );

  const sameWorkflow =
    currentTool.category === "PDF"
      ? tools.filter(
          (tool) =>
            tool.href !== currentTool.href &&
            (tool.category === "PDF" || tool.category === "Image & PDF")
        )
      : sameCategory;

  const fallbackTools = tools.filter((tool) => tool.href !== currentTool.href);
  const combined = [...sameWorkflow, ...fallbackTools];
  const uniqueTools = new Map<string, Tool>();

  combined.forEach((tool) => {
    if (!uniqueTools.has(tool.href)) {
      uniqueTools.set(tool.href, tool);
    }
  });

  return Array.from(uniqueTools.values()).slice(0, 6);
}

export default function RelatedToolsFooter() {
  const pathname = normalizePath(usePathname());
  const currentTool = tools.find((tool) => tool.href === pathname);

  if (!currentTool) {
    return null;
  }

  const relatedTools = getRelatedTools(currentTool);

  if (relatedTools.length === 0) {
    return null;
  }

  const heading = workflowLabels[currentTool.category] || "Related tools";

  return (
    <section
      aria-labelledby="related-tools-footer-title"
      className="border-b border-slate-800 bg-slate-950"
    >
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-blue-300">
              Keep working
            </p>
            <h2
              id="related-tools-footer-title"
              className="mt-1 text-2xl font-black text-white"
            >
              {heading}
            </h2>
          </div>

          <Link
            href="/#tools"
            className="text-sm font-bold text-blue-300 transition hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          >
            Browse all tools
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {relatedTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-blue-400 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-white">{tool.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">
                    {tool.description}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-black text-blue-300 transition group-hover:translate-x-0.5">
                  Open
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
