import { NextResponse } from "next/server";
import { fetchPublicUrl, SafePublicFetchError } from "@/lib/safePublicFetch";

export const runtime = "nodejs";

const MAX_ROBOTS_BYTES = 512 * 1024;

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url")?.trim();
  if (!input) {
    return NextResponse.json({ error: "Enter a public website URL." }, { status: 400 });
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(input);
  } catch {
    return NextResponse.json({ error: "Enter a valid HTTP or HTTPS website URL." }, { status: 400 });
  }

  if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only public HTTP and HTTPS websites are supported." }, { status: 400 });
  }

  const robotsUrl = new URL("/robots.txt", siteUrl.origin);

  try {
    const response = await fetchPublicUrl(robotsUrl, {
      timeoutMs: 10_000,
      maxResponseBytes: MAX_ROBOTS_BYTES,
      headers: {
        Accept: "text/plain,text/*;q=0.9,*/*;q=0.1",
        "User-Agent": "ToolMintRobotsTester/1.0",
      },
    });

    if (response.bodyTruncated) {
      return NextResponse.json(
        { error: "The robots.txt file exceeds the 512 KiB fetch limit." },
        { status: 413 }
      );
    }

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && (contentType.toLowerCase().includes("text/html") || /^\s*<!doctype html|^\s*<html\b/i.test(text))) {
      return NextResponse.json(
        { error: "The server returned an HTML page instead of a robots.txt file." },
        { status: 415 }
      );
    }

    return NextResponse.json(
      {
        sourceUrl: robotsUrl.toString(),
        finalUrl: response.url,
        status: response.status,
        statusText: response.statusText,
        contentType,
        text: response.ok ? text : "",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof SafePublicFetchError
      ? error.message
      : "Unable to fetch robots.txt. The host may block requests or be temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
