import { NextResponse } from "next/server";
import { fetchPublicUrl, SafePublicFetchError } from "@/lib/safePublicFetch";

export const runtime = "nodejs";

const MAX_XML_BYTES = 1_000_000;

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url")?.trim();

  if (!target) {
    return NextResponse.json({ error: "Enter a public sitemap URL." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: "Enter a valid HTTP or HTTPS URL." }, { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTP and HTTPS sitemap URLs are supported." }, { status: 400 });
  }

  try {
    const response = await fetchPublicUrl(targetUrl, {
      timeoutMs: 10_000,
      maxResponseBytes: MAX_XML_BYTES,
      headers: {
        Accept: "application/xml,text/xml,application/*+xml,text/plain;q=0.8,*/*;q=0.2",
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintSitemapExtractor/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `The sitemap server returned HTTP ${response.status}.` },
        { status: 400 }
      );
    }

    if (response.bodyTruncated) {
      return NextResponse.json(
        { error: "This sitemap exceeds the 1 MB fetch limit. Upload or paste a smaller XML sitemap instead." },
        { status: 413 }
      );
    }

    const xml = await response.text();
    if (!/<(?:[\w.-]+:)?(?:urlset|sitemapindex)\b/i.test(xml)) {
      return NextResponse.json(
        { error: "The URL did not return a recognizable XML sitemap or sitemap index." },
        { status: 415 }
      );
    }

    return NextResponse.json(
      { xml, sourceUrl: targetUrl.toString(), finalUrl: response.url },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof SafePublicFetchError
      ? error.message
      : "Unable to fetch this sitemap. The host may block requests or be temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
