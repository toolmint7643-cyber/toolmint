import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const size = {
  width: 1200,
  height: 630,
};

function cleanText(value: string | null, fallback: string) {
  const text = (value || fallback).replace(/\s+/g, " ").trim();

  if (text.length <= 72) {
    return text;
  }

  return `${text.slice(0, 69)}...`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = cleanText(searchParams.get("title"), "ToolMint");
  const category = cleanText(searchParams.get("category"), "Free Online Tools");

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "linear-gradient(135deg, #020617 0%, #0f172a 48%, #172554 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div style={{ alignItems: "center", display: "flex", gap: 20 }}>
            <div
              style={{
                alignItems: "center",
                background: "rgba(37, 99, 235, 0.25)",
                border: "2px solid rgba(147, 197, 253, 0.55)",
                borderRadius: 24,
                color: "#dbeafe",
                display: "flex",
                fontSize: 28,
                fontWeight: 900,
                height: 82,
                justifyContent: "center",
                width: 82,
              }}
            >
              TM
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#ffffff", fontSize: 34, fontWeight: 900 }}>
                ToolMint
              </div>
              <div style={{ color: "#93c5fd", fontSize: 22, fontWeight: 700 }}>
                Free online utility tools
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.82)",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              borderRadius: 999,
              color: "#bfdbfe",
              display: "flex",
              fontSize: 24,
              fontWeight: 800,
              padding: "16px 24px",
            }}
          >
            {category}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#f8fafc",
              display: "flex",
              fontSize: 74,
              fontWeight: 950,
              letterSpacing: -1,
              lineHeight: 1.02,
              maxWidth: 900,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "#cbd5e1",
              display: "flex",
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1.35,
              maxWidth: 940,
            }}
          >
            Fast, mobile-friendly tools for PDFs, images, SEO, developers,
            text, colors and calculators.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: "#93c5fd",
            display: "flex",
            fontSize: 24,
            fontWeight: 800,
            justifyContent: "space-between",
          }}
        >
          <div>toolmint.com</div>
          <div>No install. Fast workflow. Free tools.</div>
        </div>
      </div>
    ),
    size
  );
}
