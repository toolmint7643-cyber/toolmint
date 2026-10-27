import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import type { IncomingHttpHeaders, RequestOptions } from "node:http";

const MAX_REDIRECTS = 4;
const MAX_RESPONSE_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 8_000;

type Address = { address: string; family: number };
type SafeFetchOptions = {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

export type SafePublicResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  headers: Headers;
  bodyTruncated: boolean;
  text(): Promise<string>;
};

export class SafePublicFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafePublicFetchError";
  }
}

function blockedIPv4(address: string) {
  const [a, b, c] = address.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function parseIPv6(address: string): number[] | null {
  let value = address.toLowerCase().split("%")[0];
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");
    const octets = value.slice(lastColon + 1).split(".").map(Number);
    if (octets.length !== 4) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${value.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const words = [
    ...left,
    ...Array(halves.length === 2 ? missing : 0).fill("0"),
    ...right,
  ].map((part) => Number.parseInt(part, 16));
  return words.length === 8 && words.every(Number.isFinite) ? words : null;
}

function blockedIPv6(address: string) {
  const words = parseIPv6(address);
  if (!words) return true;

  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff;
  if (mapped) {
    const octets = [words[6] >> 8, words[6] & 0xff, words[7] >> 8, words[7] & 0xff];
    return blockedIPv4(octets.join("."));
  }
  if (words.slice(0, 6).every((word) => word === 0)) return true;

  const globalUnicast = (words[0] & 0xe000) === 0x2000;
  const documentation =
    (words[0] === 0x2001 && words[1] <= 0x01ff) ||
    (words[0] === 0x2001 && words[1] === 0x0db8) ||
    words[0] === 0x2002 ||
    (words[0] === 0x3fff && (words[1] & 0xf000) === 0);
  return !globalUnicast || documentation;
}

function cleanHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

function validateUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SafePublicFetchError("Only HTTP and HTTPS URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new SafePublicFetchError("URLs containing credentials are not allowed.");
  }
  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) {
    throw new SafePublicFetchError("Only standard HTTP and HTTPS ports are allowed.");
  }

  const hostname = cleanHostname(url.hostname);
  if (
    !hostname || hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa") || hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") || hostname.endsWith(".example")
  ) {
    throw new SafePublicFetchError("Local or reserved hostnames are not allowed.");
  }
}

async function resolvePublicAddress(url: URL, timeoutMs: number): Promise<Address> {
  const hostname = cleanHostname(url.hostname);
  const family = isIP(hostname);
  let addresses: Address[];
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    addresses = family
      ? [{ address: hostname, family }]
      : await Promise.race([
          lookup(hostname, { all: true, verbatim: true }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(new SafePublicFetchError("The public hostname lookup timed out.")),
              timeoutMs
            );
          }),
        ]);
  } catch (error) {
    if (error instanceof SafePublicFetchError) throw error;
    throw new SafePublicFetchError("The public hostname could not be resolved.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (
    addresses.length === 0 ||
    addresses.some(({ address, family: addressFamily }) =>
      addressFamily === 4 ? blockedIPv4(address) : blockedIPv6(address)
    )
  ) {
    throw new SafePublicFetchError("Local or private network addresses are not allowed.");
  }
  return addresses[0];
}

function toWebHeaders(source: IncomingHttpHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
    else if (value !== undefined) headers.set(name, value);
  }
  return headers;
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function requestOnce(
  url: URL,
  address: Address,
  options: Required<Pick<SafeFetchOptions, "method" | "timeoutMs" | "maxResponseBytes">> &
    Pick<SafeFetchOptions, "headers">
): Promise<SafePublicResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let response: http.IncomingMessage | undefined;

    const finish = (error?: Error, body = Buffer.alloc(0), bodyTruncated = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        reject(error);
        return;
      }
      const status = response?.statusCode || 0;
      const headers = toWebHeaders(response?.headers || {});
      const text = body.toString("utf8");
      resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: response?.statusMessage || "",
        url: url.toString(),
        headers,
        bodyTruncated,
        async text() { return text; },
      });
    };

    const onResponse = (incoming: http.IncomingMessage) => {
      response = incoming;
      const contentEncoding = incoming.headers["content-encoding"];
      if (contentEncoding && contentEncoding !== "identity") {
        finish(new SafePublicFetchError("Compressed HTTP responses are not supported."));
        incoming.destroy();
        request.destroy();
        return;
      }
      if (isRedirect(incoming.statusCode || 0) && incoming.headers.location) {
        finish();
        incoming.destroy();
        request.destroy();
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      incoming.on("data", (chunk: Buffer | string) => {
        if (settled) return;
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        const accepted = buffer.subarray(0, Math.max(0, options.maxResponseBytes - received));
        if (accepted.length) {
          chunks.push(accepted);
          received += accepted.length;
        }
        if (accepted.length < buffer.length) {
          finish(undefined, Buffer.concat(chunks), true);
          incoming.destroy();
          request.destroy();
        }
      });
      incoming.on("end", () => finish(undefined, Buffer.concat(chunks)));
      incoming.on("error", (error) => finish(error));
    };

    const pinnedLookup: NonNullable<RequestOptions["lookup"]> = (
      _hostname, lookupOptions, callback
    ) => {
      if (lookupOptions.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };

    const requestOptions: http.RequestOptions = {
      method: options.method,
      headers: { "Accept-Encoding": "identity", ...options.headers },
      lookup: pinnedLookup,
      ...(url.protocol === "https:" && !isIP(cleanHostname(url.hostname))
        ? { servername: cleanHostname(url.hostname) }
        : {}),
    };
    const request = url.protocol === "https:"
      ? https.request(url, requestOptions, onResponse)
      : http.request(url, requestOptions, onResponse);

    const timeout = setTimeout(() => {
      finish(new SafePublicFetchError("The website request timed out."));
      request.destroy();
    }, options.timeoutMs);
    request.on("error", (error) => finish(error));
    request.end();
  });
}

export async function fetchPublicUrl(
  input: URL | string,
  options: SafeFetchOptions = {}
): Promise<SafePublicResponse> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(input.toString());
  } catch {
    throw new SafePublicFetchError("Please enter a valid URL.");
  }
  const method = options.method || "GET";
  const timeoutMs = Math.min(Math.max(options.timeoutMs || DEFAULT_TIMEOUT_MS, 1_000), 15_000);
  const maxResponseBytes = Math.min(
    Math.max(options.maxResponseBytes || MAX_RESPONSE_BYTES, 1),
    MAX_RESPONSE_BYTES
  );
  const deadline = Date.now() + timeoutMs;

  for (let redirects = 0; ; redirects += 1) {
    validateUrl(currentUrl);
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new SafePublicFetchError("The website request timed out.");
    }
    const address = await resolvePublicAddress(currentUrl, remainingMs);
    const requestTimeoutMs = deadline - Date.now();
    if (requestTimeoutMs <= 0) {
      throw new SafePublicFetchError("The website request timed out.");
    }
    const response = await requestOnce(currentUrl, address, {
      method, headers: options.headers, timeoutMs: requestTimeoutMs, maxResponseBytes,
    });
    const location = response.headers.get("location");
    if (!isRedirect(response.status) || !location) return response;
    if (redirects >= MAX_REDIRECTS) {
      throw new SafePublicFetchError("The website redirected too many times.");
    }
    try {
      currentUrl = new URL(location, currentUrl);
    } catch {
      throw new SafePublicFetchError("The website returned an invalid redirect.");
    }
  }
}
