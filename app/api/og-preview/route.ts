import { NextResponse } from "next/server";

type MetaResult = {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
  type: string;
  twitterCard: string;
  sourceUrl: string;
};

function getMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const propertyRegex = new RegExp(
    `<meta[^>]+property=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );

  const nameRegex = new RegExp(
    `<meta[^>]+name=["']${escapedKey}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );

  const reversePropertyRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapedKey}["'][^>]*>`,
    "i"
  );

  const reverseNameRegex = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapedKey}["'][^>]*>`,
    "i"
  );

  return (
    html.match(propertyRegex)?.[1] ||
    html.match(nameRegex)?.[1] ||
    html.match(reversePropertyRegex)?.[1] ||
    html.match(reverseNameRegex)?.[1] ||
    ""
  ).trim();
}

function getTitle(html: string) {
  const ogTitle = getMetaContent(html, "og:title");
  const twitterTitle = getMetaContent(html, "twitter:title");
  const titleTag = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || "";

  return ogTitle || twitterTitle || titleTag.trim();
}

function makeAbsoluteUrl(value: string, sourceUrl: string) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return value;
  }
}

function cleanText(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

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
        "User-Agent":
          "Mozilla/5.0 (compatible; ToolMintOpenGraphPreview/1.0)",
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

    const html = (await response.text()).slice(0, 500000);

    const result: MetaResult = {
      title: cleanText(getTitle(html)),
      description: cleanText(
        getMetaContent(html, "og:description") ||
          getMetaContent(html, "twitter:description") ||
          getMetaContent(html, "description")
      ),
      image: makeAbsoluteUrl(
        getMetaContent(html, "og:image") ||
          getMetaContent(html, "twitter:image"),
        parsedUrl.toString()
      ),
      url: makeAbsoluteUrl(
        getMetaContent(html, "og:url") || parsedUrl.toString(),
        parsedUrl.toString()
      ),
      siteName: cleanText(getMetaContent(html, "og:site_name")),
      type: cleanText(getMetaContent(html, "og:type") || "website"),
      twitterCard: cleanText(
        getMetaContent(html, "twitter:card") || "summary_large_image"
      ),
      sourceUrl: parsedUrl.toString(),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to fetch Open Graph data. The website may block server requests.",
      },
      { status: 400 }
    );
  }
}