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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintHeadingChecker/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeout);

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

    const html = (await response.text()).slice(0, 600000);

    return NextResponse.json({
      html,
      sourceUrl: parsedUrl.toString(),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to fetch this page. The website may block server requests.",
      },
      { status: 400 }
    );
  }
}