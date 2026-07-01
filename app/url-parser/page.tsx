"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

const sampleUrl =
  "https://example.com:443/products/search?q=toolmint%20tools&category=developer&page=2&utm_source=google#features";

const quickExamples = [
  {
    label: "Search URL",
    value:
      "https://example.com/search?q=hello%20world&city=Hyderabad&page=1",
  },
  {
    label: "Ecommerce URL",
    value:
      "https://shop.example.com/products/laptop?brand=dell&price=50000&sort=latest#reviews",
  },
  {
    label: "UTM Campaign",
    value:
      "https://toolmint.com/tools?utm_source=google&utm_medium=cpc&utm_campaign=launch",
  },
  {
    label: "Localhost API",
    value: "http://localhost:3000/api/users?id=101&active=true",
  },
];

function parseUrl(input: string, decodeValues: boolean) {
  if (!input.trim()) {
    return {
      valid: false,
      error: "Please enter a URL to parse.",
      url: null as URL | null,
      queryParams: [] as Array<{ key: string; value: string }>,
      queryJson: "",
    };
  }

  try {
    const parsedUrl = new URL(input);
    const queryParams = Array.from(parsedUrl.searchParams.entries()).map(
      ([key, value]) => ({
        key: decodeValues ? decodeURIComponent(key) : key,
        value: decodeValues ? decodeURIComponent(value) : value,
      })
    );

    return {
      valid: true,
      error: "",
      url: parsedUrl,
      queryParams,
      queryJson: JSON.stringify(
        queryParams.reduce<Record<string, string | string[]>>(
          (acc, item) => {
            if (acc[item.key]) {
              acc[item.key] = Array.isArray(acc[item.key])
                ? [...acc[item.key], item.value]
                : [acc[item.key] as string, item.value];
            } else {
              acc[item.key] = item.value;
            }

            return acc;
          },
          {}
        ),
        null,
        2
      ),
    };
  } catch {
    return {
      valid: false,
      error:
        "Invalid URL. Please include a valid protocol like https:// or http://.",
      url: null as URL | null,
      queryParams: [] as Array<{ key: string; value: string }>,
      queryJson: "",
    };
  }
}

export default function UrlParserPage() {
  const [input, setInput] = useState(sampleUrl);
  const [decodeValues, setDecodeValues] = useState(true);

  const result = useMemo(
    () => parseUrl(input, decodeValues),
    [input, decodeValues]
  );

  const urlParts = result.url
    ? [
        { label: "Protocol", value: result.url.protocol, icon: "🔐" },
        { label: "Origin", value: result.url.origin, icon: "🌐" },
        { label: "Hostname", value: result.url.hostname, icon: "🏷️" },
        { label: "Port", value: result.url.port || "Default", icon: "🚪" },
        { label: "Pathname", value: result.url.pathname || "/", icon: "🛣️" },
        { label: "Hash / Fragment", value: result.url.hash || "Not found", icon: "#" },
      ]
    : [];

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

  const copyFullResult = () => {
    if (!result.url) {
      alert("Nothing to copy. Please enter a valid URL first.");
      return;
    }

    const text = `URL Parser Result

Full URL: ${result.url.href}
Protocol: ${result.url.protocol}
Origin: ${result.url.origin}
Hostname: ${result.url.hostname}
Port: ${result.url.port || "Default"}
Pathname: ${result.url.pathname}
Search: ${result.url.search || "Not found"}
Hash: ${result.url.hash || "Not found"}

Query Parameters:
${result.queryJson || "No query parameters found."}`;

    copyText("URL parser result", text);
  };

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔎 URL Parser"
          description="Parse URLs online, extract protocol, hostname, path, port, hash fragment and query parameters instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  ✍️ Enter URL
                </h2>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Paste a full URL here, including https://..."
                  className="min-h-[220px] w-full max-w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 font-mono text-sm text-white outline-none focus:border-blue-500"
                />

                <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-200">
                  <input
                    type="checkbox"
                    checked={decodeValues}
                    onChange={(event) => setDecodeValues(event.target.checked)}
                    className="h-5 w-5"
                  />
                  Decode query parameter values
                </label>

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
                    onClick={() => setInput(sampleUrl)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    🔄 Sample URL
                  </button>

                  <Button onClick={copyFullResult}>📋 Copy Result</Button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  {result.valid ? "✅ Valid URL" : "❌ URL Status"}
                </h2>

                <div
                  className={`rounded-2xl border p-5 text-center ${
                    result.valid
                      ? "border-green-700 bg-green-950/30"
                      : "border-red-700 bg-red-950/30"
                  }`}
                >
                  <div
                    className={`text-4xl font-extrabold ${
                      result.valid ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {result.valid ? "Valid URL" : "Invalid URL"}
                  </div>

                  <p className="mt-3 text-slate-300">
                    {result.valid
                      ? "Your URL was parsed successfully."
                      : result.error}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {urlParts.map((part) => (
                    <div
                      key={part.label}
                      className="min-w-0 rounded-xl border border-slate-700 bg-slate-800 p-4"
                    >
                      <div className="mb-2 text-2xl">{part.icon}</div>
                      <div className="text-sm text-slate-400">{part.label}</div>
                      <div className="mt-1 break-all font-bold text-blue-400">
                        {part.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-white">
                  🧩 Query Parameters
                </h2>

                <Button onClick={() => copyText("Query JSON", result.queryJson)}>
                  📋 Copy Query JSON
                </Button>
              </div>

              {result.queryParams.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                  <table className="w-full min-w-[560px] text-left">
                    <thead className="bg-slate-800 text-slate-300">
                      <tr>
                        <th className="p-4">Parameter</th>
                        <th className="p-4">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.queryParams.map((item, index) => (
                        <tr
                          key={`${item.key}-${index}`}
                          className="border-t border-slate-700 bg-slate-900"
                        >
                          <td className="break-all p-4 font-bold text-blue-400">
                            {item.key}
                          </td>
                          <td className="break-all p-4 text-slate-300">
                            {item.value || "(empty)"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-slate-300">
                  No query parameters found in this URL.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ⚡ Quick Examples
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickExamples.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setInput(example.value)}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-left font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                  >
                    <span className="block">{example.label}</span>
                    <span className="mt-1 block truncate text-sm font-normal text-slate-400">
                      {example.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This URL Parser runs in your browser and does not send URLs to any
              server. Use it to debug links, API endpoints, tracking URLs and
              query strings safely.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a URL Parser?
                </h2>
                <p className="text-slate-300">
                  A URL parser breaks a link into readable parts like protocol,
                  hostname, port, pathname, query string and hash fragment. It is
                  useful for developers, SEO checks and API debugging.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Common Uses
                </h2>
                <p className="text-slate-300">
                  Use this tool to parse URLs online, extract query parameters,
                  inspect UTM tracking links, debug API URLs and convert query
                  strings into JSON.
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