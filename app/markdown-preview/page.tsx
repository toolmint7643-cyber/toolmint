"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleMarkdown = `# ToolMint Markdown Preview

Write **bold text**, *italic text*, inline \`code\`, links and lists.

## Features

- Live markdown preview
- Word and character count
- Copy markdown
- Copy plain text

> Markdown is useful for docs, README files, notes and blog drafts.

### Code Example

\`\`\`js
const tool = "Markdown Preview";
console.log(tool);
\`\`\`

### Table Example

| Tool | Category |
| --- | --- |
| JSON Validator | Developer |
| Markdown Preview | Productivity |
`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
}

function markdownToHtml(markdown: string) {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;
  let inTable = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html.push("</tbody></table>");
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      closeList();
      closeTable();

      if (inCodeBlock) {
        html.push(
          `<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }

      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      closeTable();
      return;
    }

    if (
      trimmed.includes("|") &&
      lines[index + 1]?.trim().match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/)
    ) {
      closeList();
      closeTable();

      const headers = trimmed
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      html.push("<table><thead><tr>");
      headers.forEach((header) => {
        html.push(`<th>${parseInlineMarkdown(header)}</th>`);
      });
      html.push("</tr></thead><tbody>");
      inTable = true;
      return;
    }

    if (trimmed.match(/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/)) {
      return;
    }

    if (inTable && trimmed.includes("|")) {
      const cells = trimmed
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      html.push("<tr>");
      cells.forEach((cell) => {
        html.push(`<td>${parseInlineMarkdown(cell)}</td>`);
      });
      html.push("</tr>");
      return;
    }

    closeTable();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }

      html.push(`<li>${parseInlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }

    closeList();

    if (trimmed.startsWith("### ")) {
      html.push(`<h3>${parseInlineMarkdown(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      html.push(`<h2>${parseInlineMarkdown(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("# ")) {
      html.push(`<h1>${parseInlineMarkdown(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("> ")) {
      html.push(`<blockquote>${parseInlineMarkdown(trimmed.slice(2))}</blockquote>`);
    } else {
      html.push(`<p>${parseInlineMarkdown(trimmed)}</p>`);
    }
  });

  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  closeList();
  closeTable();

  return html.join("");
}

function getPlainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`|[\]()~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function MarkdownPreviewPage() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);

  const html = useMemo(() => markdownToHtml(markdown), [markdown]);
  const plainText = useMemo(() => getPlainText(markdown), [markdown]);

  const stats = useMemo(() => {
    return {
      characters: markdown.length,
      words: plainText ? plainText.split(/\s+/).length : 0,
      lines: markdown ? markdown.split("\n").length : 0,
    };
  }, [markdown, plainText]);

  const copyText = async (label: string, value: string) => {
    if (!value) {
      alert(`Nothing to copy from ${label}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      alert(`${label} copied successfully!`);
    } catch {
      alert("Unable to copy. Please try again.");
    }
  };

  const quickExamples = [
    {
      label: "README Template",
      value: `# Project Name

A short project description.

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- Fast
- Mobile friendly
- SEO ready`,
    },
    {
      label: "Blog Draft",
      value: `# Blog Title

This is a **short intro** for your blog post.

## Main Point

Write your content here with a [useful link](https://example.com).`,
    },
    {
      label: "Task List",
      value: `# Today's Tasks

- Write documentation
- Fix layout issue
- Test mobile view
- Commit changes`,
    },
    {
      label: "Table Notes",
      value: `# Tool List

| Tool | Status |
| --- | --- |
| JSON Validator | Done |
| Markdown Preview | In Progress |`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="📝 Markdown Preview"
          description="Write markdown online, preview formatted content, copy markdown and create README files, notes, docs and blog drafts instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Markdown Editor
                </h2>

                <textarea
                  value={markdown}
                  onChange={(event) => setMarkdown(event.target.value)}
                  placeholder="Write markdown here..."
                  className="min-h-[520px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setMarkdown("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setMarkdown(sampleMarkdown)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample
                  </button>

                  <Button onClick={() => copyText("Markdown", markdown)}>
                    📋 Copy Markdown
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    ✅ Live Preview
                  </h2>

                  <Button onClick={() => copyText("Plain text", plainText)}>
                    📋 Copy Text
                  </Button>
                </div>

                <div
                  className="markdown-preview min-h-[520px] max-w-full overflow-auto rounded-xl border border-slate-700 bg-slate-800 p-5 text-slate-200"
                  dangerouslySetInnerHTML={{
                    __html: html || "<p>Preview will appear here.</p>",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">🔤</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.characters}
                </div>
                <div className="mt-2 text-slate-400">Characters</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📝</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.words}
                </div>
                <div className="mt-2 text-slate-400">Words</div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500">
                <div className="mb-2 text-3xl">📏</div>
                <div className="text-3xl font-extrabold text-blue-400">
                  {stats.lines}
                </div>
                <div className="mt-2 text-slate-400">Lines</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Markdown Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setMarkdown(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <style jsx>{`
              .markdown-preview h1 {
                font-size: 2rem;
                font-weight: 800;
                color: white;
                margin-bottom: 1rem;
              }

              .markdown-preview h2 {
                font-size: 1.5rem;
                font-weight: 800;
                color: white;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
              }

              .markdown-preview h3 {
                font-size: 1.25rem;
                font-weight: 700;
                color: white;
                margin-top: 1.25rem;
                margin-bottom: 0.5rem;
              }

              .markdown-preview p {
                margin-bottom: 1rem;
                line-height: 1.7;
              }

              .markdown-preview ul {
                list-style: disc;
                padding-left: 1.5rem;
                margin-bottom: 1rem;
              }

              .markdown-preview li {
                margin-bottom: 0.4rem;
              }

              .markdown-preview blockquote {
                border-left: 4px solid #3b82f6;
                background: rgb(15 23 42);
                padding: 1rem;
                margin: 1rem 0;
                color: #cbd5e1;
              }

              .markdown-preview code {
                background: rgb(15 23 42);
                color: #93c5fd;
                padding: 0.15rem 0.35rem;
                border-radius: 0.35rem;
              }

              .markdown-preview pre {
                background: rgb(15 23 42);
                border: 1px solid rgb(51 65 85);
                border-radius: 0.75rem;
                padding: 1rem;
                overflow: auto;
                margin: 1rem 0;
              }

              .markdown-preview pre code {
                background: transparent;
                padding: 0;
              }

              .markdown-preview table {
                width: 100%;
                border-collapse: collapse;
                margin: 1rem 0;
                overflow: hidden;
                border-radius: 0.75rem;
              }

              .markdown-preview th,
              .markdown-preview td {
                border: 1px solid rgb(51 65 85);
                padding: 0.75rem;
                text-align: left;
              }

              .markdown-preview th {
                background: rgb(15 23 42);
                color: white;
              }

              .markdown-preview a {
                color: #60a5fa;
                text-decoration: underline;
              }
            `}</style>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This Markdown Preview supports common markdown syntax for writing
              docs, README files, notes and drafts. For advanced markdown plugins,
              rendering may differ from GitHub or other platforms.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is Markdown?
                </h2>
                <p className="text-slate-300">
                  Markdown is a lightweight writing format used for README files,
                  documentation, notes, blog drafts and developer content. It lets
                  you write formatted text using simple symbols.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this markdown editor to preview README files, write docs,
                  draft blog posts, format notes, check tables and copy plain text
                  from markdown content.
                </p>
              </div>
            </div>
          </div>
        </ToolCard>
      </main>

      <Footer />
    </>
  );
}