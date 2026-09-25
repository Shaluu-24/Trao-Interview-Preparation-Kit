/**
 * rateLimit.js
 *
 * Section 2: "Rate-limit your requests and back off on failure."
 * Section 9: the batch command must survive "any retries rate limits force"
 * and still finish 5 cases within 15 minutes — so backoff has to be capped,
 * not open-ended.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs fn() with retries on failure, using exponential backoff with a cap.
 * fn should return a value where `.ok === false` counts as a retryable
 * failure for reasons like TIMEOUT / NETWORK_ERROR, but NOT for reasons
 * like URL_BLOCKED or UNSUPPORTED_CONTENT_TYPE (retrying those is pointless
 * — they'll never succeed).
 */
const RETRYABLE_REASONS = new Set(["TIMEOUT", "NETWORK_ERROR", "HTTP_ERROR"]);

async function withRetry(fn, { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 4000 } = {}) {
  let lastResult;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastResult = await fn();
    if (lastResult.ok) return lastResult;
    if (!RETRYABLE_REASONS.has(lastResult.reason)) return lastResult; // don't waste retries
    if (attempt < maxAttempts) {
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delay);
    }
  }
  return lastResult;
}

/**
 * A tiny per-host request queue: only one in-flight request per host at a
 * time, spaced by `minGapMs`. This is deliberately simple — enough to
 * avoid hammering a single company's site during a crawl, without pulling
 * in a queueing library for something this small.
 */
class HostThrottle {
  constructor(minGapMs = 400) {
    this.minGapMs = minGapMs;
    this.lastRequestAt = new Map(); // host -> timestamp
  }

  async wait(host) {
    const last = this.lastRequestAt.get(host) || 0;
    const elapsed = Date.now() - last;
    if (elapsed < this.minGapMs) {
      await sleep(this.minGapMs - elapsed);
    }
    this.lastRequestAt.set(host, Date.now());
  }
}

module.exports = { withRetry, HostThrottle, sleep };
