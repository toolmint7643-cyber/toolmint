"use client";

import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTitle from "@/components/PageTitle";
import ToolCard from "@/components/ToolCard";
import Button from "@/components/Button";

type DecodedJwt = {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  error: string;
};

const sampleJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik5hYmVlbCBLaGFuIiwiaWF0IjoxNzE5NzYzMjAwLCJleHAiOjE4OTM0NTYwMDB9.demo-signature";

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  try {
    return decodeURIComponent(
      atob(padded)
        .split("")
        .map((character) =>
          "%" + character.charCodeAt(0).toString(16).padStart(2, "0")
        )
        .join("")
    );
  } catch {
    return atob(padded);
  }
}

function decodeJwt(token: string): DecodedJwt {
  const trimmedToken = token.trim();

  if (!trimmedToken) {
    return {
      header: null,
      payload: null,
      signature: "",
      error: "",
    };
  }

  const parts = trimmedToken.split(".");

  if (parts.length !== 3) {
    return {
      header: null,
      payload: null,
      signature: "",
      error: "Invalid JWT format. A JWT must have header, payload and signature parts.",
    };
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));

    return {
      header,
      payload,
      signature: parts[2],
      error: "",
    };
  } catch {
    return {
      header: null,
      payload: null,
      signature: parts[2] || "",
      error: "Unable to decode this JWT. Please check if the token is valid.",
    };
  }
}

function formatJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : "";
}

function getUnixDate(value: unknown) {
  if (typeof value !== "number") return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value * 1000));
}

function getExpiryStatus(exp: unknown) {
  if (typeof exp !== "number") {
    return {
      label: "No expiry found",
      color: "text-slate-300",
      border: "border-slate-700",
      bg: "bg-slate-900",
      message: "This token does not include an exp claim.",
    };
  }

  const isExpired = Date.now() >= exp * 1000;

  if (isExpired) {
    return {
      label: "Expired",
      color: "text-red-300",
      border: "border-red-700",
      bg: "bg-red-950/30",
      message: "This token expiry time is in the past.",
    };
  }

  return {
    label: "Active",
    color: "text-green-300",
    border: "border-green-700",
    bg: "bg-green-950/30",
    message: "This token expiry time is still in the future.",
  };
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState(sampleJwt);

  const decoded = useMemo(() => decodeJwt(token), [token]);
  const expiryStatus = useMemo(
    () => getExpiryStatus(decoded.payload?.exp),
    [decoded.payload]
  );

  const headerJson = useMemo(() => formatJson(decoded.header), [decoded.header]);
  const payloadJson = useMemo(
    () => formatJson(decoded.payload),
    [decoded.payload]
  );

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

  const clearToken = () => {
    setToken("");
  };

  const resetToken = () => {
    setToken(sampleJwt);
  };

  const summaryCards = [
    {
      label: "Algorithm",
      value:
        typeof decoded.header?.alg === "string"
          ? decoded.header.alg
          : "Not found",
      icon: "🔐",
    },
    {
      label: "Token Type",
      value:
        typeof decoded.header?.typ === "string"
          ? decoded.header.typ
          : "Not found",
      icon: "🏷️",
    },
    {
      label: "Expiry Status",
      value: expiryStatus.label,
      icon: "⏰",
    },
  ];

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-5 py-10">
        <PageTitle
          title="🔐 JWT Decoder"
          description="Decode JSON Web Tokens online, inspect header and payload, check expiry time and read JWT claims instantly."
        />

        <ToolCard>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                ✍️ Paste JWT Token
              </h2>

              <textarea
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste your JWT token here..."
                className="min-h-[180px] w-full resize-y rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none focus:border-blue-500"
              />

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={clearToken}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  🧹 Clear
                </button>

                <button
                  type="button"
                  onClick={resetToken}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 font-bold text-slate-200 transition hover:border-blue-500 hover:text-blue-300"
                >
                  🔄 Sample Token
                </button>
              </div>
            </div>

            {decoded.error ? (
              <div className="rounded-2xl border border-red-700 bg-red-950/30 p-5 text-red-100">
                {decoded.error}
              </div>
            ) : null}

            <div
              className={`rounded-2xl border p-6 text-center ${expiryStatus.border} ${expiryStatus.bg}`}
            >
              <p className="text-slate-300">JWT Expiry Status</p>

              <div
                className={`mt-3 text-5xl font-extrabold ${expiryStatus.color}`}
              >
                {expiryStatus.label}
              </div>

              <p className="mt-3 text-slate-300">{expiryStatus.message}</p>

              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4 text-slate-300">
                Expires At:{" "}
                <span className="font-bold text-blue-400">
                  {getUnixDate(decoded.payload?.exp)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {summaryCards.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center transition hover:scale-105 hover:border-blue-500"
                >
                  <div className="mb-2 text-3xl">{item.icon}</div>

                  <div className="text-3xl font-extrabold text-blue-400 break-words">
                    {item.value}
                  </div>

                  <div className="mt-2 text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  📋 Decoded Header
                </h2>

                <pre className="min-h-[260px] overflow-auto rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {headerJson || "Header will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("JWT header", headerJson)}>
                    📋 Copy Header
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  📦 Decoded Payload
                </h2>

                <pre className="min-h-[260px] overflow-auto rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-blue-200">
                  {payloadJson || "Payload will appear here."}
                </pre>

                <div className="mt-4">
                  <Button onClick={() => copyText("JWT payload", payloadJson)}>
                    📋 Copy Payload
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <h2 className="mb-4 text-2xl font-bold text-white">
                🧾 JWT Claims
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Subject</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {String(decoded.payload?.sub || "Not available")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Issuer</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {String(decoded.payload?.iss || "Not available")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Audience</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {String(decoded.payload?.aud || "Not available")}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Issued At</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {getUnixDate(decoded.payload?.iat)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Expires At</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {getUnixDate(decoded.payload?.exp)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                  <p className="text-slate-400">Signature Length</p>
                  <p className="mt-1 break-words font-bold text-blue-400">
                    {decoded.signature.length} characters
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-700 bg-yellow-950/30 p-5 text-sm text-yellow-100">
              This tool decodes JWT header and payload only. It does not verify
              the token signature or confirm that the token is trusted.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() =>
                  copyText(
                    "Full decoded JWT",
                    `Header:\n${headerJson}\n\nPayload:\n${payloadJson}`
                  )
                }
              >
                📋 Copy Full Result
              </Button>

              <Button onClick={resetToken}>🔄 Reset</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  📌 What is a JWT?
                </h2>
                <p className="text-slate-300">
                  A JSON Web Token is a compact token format commonly used for
                  authentication and APIs. It contains a header, payload and
                  signature separated by dots.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="mb-3 text-2xl font-bold text-white">
                  🔍 Why decode a JWT?
                </h2>
                <p className="text-slate-300">
                  Decoding helps you inspect token claims like subject, issuer,
                  audience, issued time and expiry time while debugging login
                  flows or API requests.
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