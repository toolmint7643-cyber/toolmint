import { NextResponse } from "next/server";

function isBlockedHostname(hostname: string) {
  const lowerHostname = hostname.toLowerCase();

  return (
    lowerHostname === "localhost" ||
    lowerHostname === "127.0.0.1" ||
    lowerHostname === "0.0.0.0" ||
    lowerHostname.startsWith("10.") ||
    lowerHostname.startsWith("192.168.") ||
    lowerHostname.startsWith("172.16.") ||
    lowerHostname.endsWith(".local")
  );
}

function countMatches(html: string, regex: RegExp) {
  return html.match(regex)?.length || 0;
}

function getHeaderSize(headers: Headers) {
  let size = 0;

  headers.forEach((value, key) => {
    size += key.length + value.length + 4;
  });

  return size;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url")?.trim();

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Please provide a URL." },
      { status: 400 }
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return NextResponse.json(
      { error: "Please enter a valid URL." },
      { status: 400 }
    );
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP and HTTPS URLs are allowed." },
      { status: 400 }
    );
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: "Local or private network URLs are not allowed." },
      { status: 400 }
    );
  }

  try {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintPageSizeChecker/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

    const responseTime = Date.now() - startedAt;

    if (!response.ok) {
      return NextResponse.json(
        { error: `Unable to fetch this URL. Status: ${response.status}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "This URL does not return an HTML page." },
        { status: 400 }
      );
    }

    const html = await response.text();
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html).length;

    const contentLength = Number(response.headers.get("content-length") || 0);
    const transferSize = contentLength > 0 ? contentLength : htmlBytes;
    const headerSize = getHeaderSize(response.headers);

    return NextResponse.json({
      sourceUrl: parsedUrl.toString(),
      finalUrl: response.url,
      status: response.status,
      responseTime,
      contentType,
      contentEncoding: response.headers.get("content-encoding") || "",
      cacheControl: response.headers.get("cache-control") || "",
      server: response.headers.get("server") || "",
      htmlBytes,
      transferSize,
      headerSize,
      totalEstimatedBytes: transferSize + headerSize,
      counts: {
        images: countMatches(html, /<img\b/gi),
        scripts: countMatches(html, /<script\b/gi),
        externalScripts: countMatches(html, /<script\b[^>]*\bsrc\s*=/gi),
        inlineScripts:
          countMatches(html, /<script\b/gi) -
          countMatches(html, /<script\b[^>]*\bsrc\s*=/gi),
        stylesheets: countMatches(html, /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["']/gi),
        inlineStyles: countMatches(html, /<style\b/gi),
        links: countMatches(html, /<a\b/gi),
        forms: countMatches(html, /<form\b/gi),
        iframes: countMatches(html, /<iframe\b/gi),
        videos: countMatches(html, /<video\b/gi),
        domElements: countMatches(html, /<[^/!][a-z][^>]*>/gi),
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to analyze this page. The website may block server requests or timeout.",
      },
      { status: 400 }
    );
  }
}