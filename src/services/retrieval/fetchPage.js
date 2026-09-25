/**
 * fetchPage.js
 *
 * Section 11 (Security): "restrict handling to expected content types and
 * sizes" and "validate external URLs before fetching them, and reject
 * private and loopback addresses in production."
 *
 * This is the single choke point every retrieval call goes through. It:
 *   - blocks private/loopback IPs when NODE_ENV=production (the batch
 *     command in Section 9 explicitly runs against localhost test servers,
 *     so we must NOT block loopback in dev/test — only production)
 *   - enforces a timeout so one slow site can't hang the whole run
 *   - caps response size so we don't try to parse a 500MB file as HTML
 *   - only accepts text/html (and plain text) — no binaries
 *   - never throws on a bad URL/timeout/wrong content-type — always
 *     returns a structured result so callers can record-and-continue
 *     (Section 2: "skip and report a source that cannot be retrieved,
 *     rather than failing the whole run")
 */

const dns = require("dns").promises;
const net = require("net");

const MAX_BYTES = 2 * 1024 * 1024; // 2MB — generous for an HTML page, not for a video
const TIMEOUT_MS = 8000;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain"];

function isPrivateOrLoopback(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 127) return true; // loopback
    if (parts[0] === 10) return true; // private
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // private
    if (parts[0] === 192 && parts[1] === 168) return true; // private
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
    return false;
  }
  // IPv6 loopback / unique local
  if (ip === "::1") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

async function isUrlSafe(urlStr) {
  if (process.env.NODE_ENV !== "production") {
    // The mandatory batch command (Section 9) is explicitly run against
    // "a local address" test servers, so loopback must stay allowed
    // outside production.
    return true;
  }
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  try {
    const { address } = await dns.lookup(parsed.hostname);
    return !isPrivateOrLoopback(address);
  } catch {
    return false; // DNS failure -> treat as unsafe/unreachable, don't fetch
  }
}

/**
 * @returns {Promise<{ ok: true, html: string, finalUrl: string } | { ok: false, reason: string }>}
 */
async function fetchPage(urlStr) {
  const safe = await isUrlSafe(urlStr);
  if (!safe) {
    return { ok: false, reason: "URL_BLOCKED", detail: "Private, loopback, or invalid URL." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(urlStr, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "TraoPrepKitBot/1.0 (+assessment)" },
    });

    if (!response.ok) {
      return { ok: false, reason: "HTTP_ERROR", detail: `Status ${response.status}` };
    }

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return { ok: false, reason: "UNSUPPORTED_CONTENT_TYPE", detail: contentType || "unknown" };
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return { ok: false, reason: "TOO_LARGE", detail: `${contentLength} bytes` };
    }

    // Stream-cap even if content-length wasn't sent honestly
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BYTES) {
        controller.abort();
        return { ok: false, reason: "TOO_LARGE", detail: "exceeded size cap mid-stream" };
      }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");

    return { ok: true, html, finalUrl: response.url || urlStr };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, reason: "TIMEOUT", detail: `No response within ${TIMEOUT_MS}ms` };
    }
    return { ok: false, reason: "NETWORK_ERROR", detail: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchPage, isUrlSafe, isPrivateOrLoopback };
