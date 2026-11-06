import { NextResponse } from "next/server";
import { fetchPublicUrl, SafePublicFetchError } from "@/lib/safePublicFetch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url")?.trim();

  if (!input) {
    return NextResponse.json({ error: "Please provide a public webpage URL." }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(input);
  } catch {
    return NextResponse.json({ error: "Please enter a valid webpage URL." }, { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Only HTTP and HTTPS URLs are allowed." }, { status: 400 });
  }

  try {
    const response = await fetchPublicUrl(targetUrl, {
      timeoutMs: 8000,
      maxResponseBytes: 700000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintSchemaValidator/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "The webpage returned HTTP " + response.status + "." },
        { status: 400 },
      );
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return NextResponse.json(
        { error: "This URL did not return an HTML document." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      html: await response.text(),
      sourceUrl: response.url,
      status: response.status,
      bodyTruncated: response.bodyTruncated,
    });
  } catch (error) {
    const message = error instanceof SafePublicFetchError
      ? error.message
      : "Unable to fetch this webpage. It may block public requests or be temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
