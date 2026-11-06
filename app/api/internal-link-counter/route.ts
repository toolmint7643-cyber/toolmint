import { NextResponse } from "next/server";
import { fetchPublicUrl, SafePublicFetchError } from "@/lib/safePublicFetch";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 300_000;

function normalizedHost(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function parseHttpUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const targetUrl = parseHttpUrl(params.get("url"));
  const siteUrl = parseHttpUrl(params.get("site"));

  if (!targetUrl || !siteUrl) {
    return NextResponse.json(
      { error: "Provide valid public HTTP or HTTPS page and site URLs." },
      { status: 400 }
    );
  }

  if (normalizedHost(targetUrl.hostname) !== normalizedHost(siteUrl.hostname)) {
    return NextResponse.json(
      { error: "Only pages on the sitemap's host (including its www alias) can be inspected." },
      { status: 400 }
    );
  }

  try {
    const response = await fetchPublicUrl(targetUrl, {
      timeoutMs: 6_000,
      maxResponseBytes: MAX_HTML_BYTES,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintInternalLinkCounter/1.0)",
      },
    });

    const finalUrl = new URL(response.url);
    if (normalizedHost(finalUrl.hostname) !== normalizedHost(siteUrl.hostname)) {
      return NextResponse.json(
        { error: "The page redirected to a different host and was not included." },
        { status: 400 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `The page returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}.`,
          statusCode: response.status,
        },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return NextResponse.json(
        { error: "The page response is not HTML." },
        { status: 415 }
      );
    }

    return NextResponse.json(
      {
        html: await response.text(),
        finalUrl: response.url,
        statusCode: response.status,
        truncated: response.bodyTruncated,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[internal-link-counter] Public page fetch failed:", error);
    const message = error instanceof SafePublicFetchError
      ? error.message
      : "The public page could not be fetched.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
