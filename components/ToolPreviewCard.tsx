import Link from "next/link";

type Tool = {
  title: string;
  description: string;
  href: string;
  category: string;
};

export default function ToolPreviewCard({
  tool,
}: {
  tool: Tool;
}) {
  return (
    <Link href={tool.href}>
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 hover:border-blue-500 transition cursor-pointer h-full">

       <h3 className="text-xl font-bold text-white">
          {tool.title}
        </h3>

        <p className="mt-2 text-slate-300">
          {tool.description}
        </p>

      </div>
    </Link>
  );
}