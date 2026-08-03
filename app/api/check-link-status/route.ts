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

function getStatusType(status: number) {
  if (status >= 200 && status < 400) {
    return "good";
  }

  if (status >= 400) {
    return "broken";
  }

  return "unknown";
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
    const timeout = setTimeout(() => controller.abort(), 7000);

    let response = await fetch(parsedUrl.toString(), {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolMintLinkStatus/1.0)",
      },
    });

    clearTimeout(timeout);

    if (response.status === 405 || response.status === 403) {
      const fallbackController = new AbortController();
      const fallbackTimeout = setTimeout(() => fallbackController.abort(), 7000);

      response = await fetch(parsedUrl.toString(), {
        method: "GET",
        signal: fallbackController.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ToolMintLinkStatus/1.0)",
          Accept: "text/html,*/*",
        },
      });

      clearTimeout(fallbackTimeout);
    }

    return NextResponse.json({
      url: parsedUrl.toString(),
      status: response.status,
      statusText: response.statusText || "",
      type: getStatusType(response.status),
      finalUrl: response.url,
    });
  } catch {
    return NextResponse.json({
      url: parsedUrl.toString(),
      status: 0,
      statusText: "Blocked or timeout",
      type: "unknown",
      finalUrl: parsedUrl.toString(),
    });
  }
}