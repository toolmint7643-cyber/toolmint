"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type OutputMode = "format" | "minify";

const sampleSql = `select users.id,users.name,orders.total from users inner join orders on users.id=orders.user_id where orders.status='paid' and orders.total>1000 order by orders.created_at desc limit 10;`;

const sqlKeywords = [
  "select",
  "from",
  "where",
  "inner join",
  "left join",
  "right join",
  "full join",
  "join",
  "on",
  "and",
  "or",
  "group by",
  "order by",
  "having",
  "limit",
  "offset",
  "insert into",
  "values",
  "update",
  "set",
  "delete",
  "create table",
  "alter table",
  "drop table",
  "case",
  "when",
  "then",
  "else",
  "end",
];

function uppercaseKeywords(sql: string) {
  let output = sql;

  sqlKeywords
    .slice()
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
      output = output.replace(regex, keyword.toUpperCase());
    });

  return output;
}

function formatSql(sql: string, indentSize: number, uppercase: boolean) {
  if (!sql.trim()) return "";

  const indentText = " ".repeat(indentSize);
  let output = uppercase ? uppercaseKeywords(sql) : sql;

  output = output
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",\n")
    .replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|VALUES|SET)\b/gi, "\n$1")
    .replace(/\s+(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN)\b/gi, "\n$1")
    .replace(/\s+(AND|OR)\s+/gi, "\n$1 ")
    .replace(/\s*;\s*/g, ";\n");

  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      if (/^(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|VALUES|SET|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|JOIN|AND|OR)\b/i.test(line)) {
        return `${indentText}${line}`;
      }

      return line;
    })
    .join("\n");
}

function minifySql(sql: string, uppercase: boolean) {
  const output = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),;=<>+\-*/])\s*/g, "$1")
    .trim();

  return uppercase ? uppercaseKeywords(output) : output;
}

function analyzeSql(sql: string) {
  const statements = sql.split(";").filter((item) => item.trim()).length;
  const selects = sql.match(/\bselect\b/gi) || [];
  const joins = sql.match(/\bjoin\b/gi) || [];
  const wheres = sql.match(/\bwhere\b/gi) || [];

  return {
    statements,
    selects: selects.length,
    joins: joins.length,
    wheres: wheres.length,
    size: new TextEncoder().encode(sql).length,
  };
}

function validateSql(sql: string) {
  if (!sql.trim()) {
    return {
      valid: false,
      message: "Please enter SQL to format.",
    };
  }

  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    return {
      valid: false,
      message: "SQL may have unmatched parentheses. Please check ( and ).",
    };
  }

  return {
    valid: true,
    message: "SQL looks ready for formatting.",
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SqlFormatterPage() {
  const [input, setInput] = useState(sampleSql);
  const [outputMode, setOutputMode] = useState<OutputMode>("format");
  const [indentSize, setIndentSize] = useState(2);
  const [uppercase, setUppercase] = useState(true);

  const output = useMemo(() => {
    return outputMode === "format"
      ? formatSql(input, indentSize, uppercase)
      : minifySql(input, uppercase);
  }, [input, outputMode, indentSize, uppercase]);

  const stats = useMemo(() => analyzeSql(input), [input]);
  const validation = useMemo(() => validateSql(input), [input]);

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
      label: "SELECT Query",
      value: `select id,name,email from users where active=1 order by created_at desc limit 20;`,
    },
    {
      label: "JOIN Query",
      value: `select users.name,orders.total from users left join orders on users.id=orders.user_id where orders.status='paid';`,
    },
    {
      label: "INSERT Query",
      value: `insert into users(name,email,active) values('ToolMint','hello@example.com',1);`,
    },
    {
      label: "UPDATE Query",
      value: `update products set price=price*1.10,updated_at=now() where category='tools';`,
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🗄️ SQL Formatter"
          description="Format SQL online, beautify SQL queries, minify SQL, uppercase keywords and inspect statements, SELECTs, JOINs and WHERE clauses."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ SQL Input
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste SQL query here..."
                  className="min-h-[420px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setInput("")}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🧹 Clear
                  </button>

                  <button
                    type="button"
                    onClick={() => setInput(sampleSql)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample SQL
                  </button>

                  <Button onClick={() => copyText("SQL input", input)}>
                    📋 Copy Input
                  </Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✅ SQL Output
                </h2>

                <div
                  className={`rounded-2xl border p-5 text-center ${
                    validation.valid
                      ? "border-green-700 bg-green-950/30"
                      : "border-red-700 bg-red-950/30"
                  }`}
                >
                  <div
                    className={`text-4xl font-extrabold ${
                      validation.valid ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {validation.valid ? "SQL Ready" : "Check SQL"}
                  </div>

                  <p className="mt-3 text-slate-300">{validation.message}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setOutputMode("format")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "format"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Format
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutputMode("minify")}
                    className={`rounded-xl border p-4 font-bold transition ${
                      outputMode === "minify"
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-200 hover:border-blue-500"
                    }`}
                  >
                    Minify
                  </button>

                  <button
                    type="button"
                    onClick={() => setUppercase((value) => !value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {uppercase ? "Uppercase" : "Original Case"}
                  </button>

                  <select
                    value={indentSize}
                    onChange={(event) => setIndentSize(Number(event.target.value))}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 outline-none focus:border-blue-500"
                  >
                    <option value={2}>2 Spaces</option>
                    <option value={4}>4 Spaces</option>
                  </select>
                </div>

                <pre className="mt-5 min-h-[260px] max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {output || "Formatted or minified SQL will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("SQL output", output)}>
                    📋 Copy Output
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                ["Statements", stats.statements, "📄"],
                ["SELECT", stats.selects, "🔎"],
                ["JOIN", stats.joins, "🔗"],
                ["WHERE", stats.wheres, "🎯"],
                ["Size", formatBytes(stats.size), "📏"],
              ].map(([label, value, icon]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="mb-2 text-3xl">{icon}</div>
                  <div className="break-words text-3xl font-extrabold text-blue-400">
                    {value}
                  </div>
                  <div className="mt-2 text-slate-400">{label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick SQL Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This SQL Formatter is designed for quick query beautifying and
              minifying. SQL dialects can differ between MySQL, PostgreSQL,
              SQLite and SQL Server, so review complex queries before production
              use.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is SQL Formatting?
                </h2>
                <p className="text-slate-300">
                  SQL formatting adds line breaks, indentation and keyword styling
                  to make queries easier to read, debug and review. It helps
                  developers understand SELECT, JOIN, WHERE and ORDER BY clauses.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to format SQL online, beautify SQL queries, minify
                  SQL, uppercase keywords and clean database queries for reports,
                  apps or debugging.
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