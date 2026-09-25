/**
 * llmClient.js
 *
 * Works with any provider exposing an OpenAI-compatible
 * /chat/completions endpoint (Groq, Together, OpenAI itself, many free
 * tiers do). Configure via .env:
 *   LLM_API_BASE_URL  e.g. https://api.groq.com/openai/v1
 *   LLM_API_KEY
 *   LLM_MODEL         e.g. llama-3.1-8b-instant
 *
 * Why this shape: Section 3 requires SEPARATE calls per step (extract
 * requirements, generate questions per requirement+category, etc.) —
 * "the two should not come from the same call with the same
 * instructions." This client is the single low-level function every one
 * of those steps calls, each with its own system prompt.
 *
 * Section 10 edge case: "the model returns invalid JSON or an incomplete
 * kit." We handle that here, once, instead of in every caller:
 *   1. Ask for JSON only, strip markdown fences defensively.
 *   2. If it still doesn't parse, make ONE repair attempt: send the bad
 *      output back with "this was not valid JSON, return only valid JSON."
 *   3. If that also fails, throw a typed error the caller can catch and
 *      record as a skipped/failed step rather than crashing the run.
 */

const { withRetry } = require("../retrieval/rateLimit");

class LLMJsonError extends Error {
  constructor(message, raw) {
    super(message);
    this.name = "LLMJsonError";
    this.raw = raw;
  }
}

function stripFences(text) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(stripFences(text));
  } catch {
    // last resort: grab the first {...} or [...] block in the text
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function rawChatCall(messages) {
  const baseUrl = process.env.LLM_API_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) {
    throw new Error("LLM_API_BASE_URL, LLM_API_KEY, and LLM_MODEL must be set in .env");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.4 }),
    });

    if (res.status === 429) {
      return { ok: false, reason: "RATE_LIMITED" };
    }
    if (!res.ok) {
      return { ok: false, reason: "HTTP_ERROR", detail: `${res.status}` };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: "EMPTY_RESPONSE" };
    return { ok: true, content };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, reason: "TIMEOUT" };
    return { ok: false, reason: "NETWORK_ERROR", detail: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls the LLM and returns parsed JSON, handling rate limits (retry with
 * backoff, reusing the same withRetry used for site crawling — Section 3
 * FAQ: "your pipeline needs to handle being told to slow down") and one
 * JSON-repair attempt.
 *
 * @param {{system: string, user: string}} params
 * @returns {Promise<{ok: true, data: any} | {ok: false, reason: string}>}
 */
async function callLLMJson({ system, user }) {
  const messages = [
    { role: "system", content: `${system}\n\nRespond with ONLY valid JSON. No markdown fences, no commentary.` },
    { role: "user", content: user },
  ];

  const result = await withRetry(
    async () => {
      const r = await rawChatCall(messages);
      // map to the {ok, reason} shape withRetry expects for its retry check
      return r.ok ? r : { ok: false, reason: r.reason === "RATE_LIMITED" ? "TIMEOUT" : r.reason };
    },
    { maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 8000 }
  );

  if (!result.ok) {
    return { ok: false, reason: result.reason || "LLM_UNAVAILABLE" };
  }

  let parsed = tryParseJson(result.content);
  if (parsed !== null) return { ok: true, data: parsed };

  // One repair attempt
  const repair = await rawChatCall([
    ...messages,
    { role: "assistant", content: result.content },
    { role: "user", content: "That was not valid JSON. Return ONLY valid JSON, nothing else." },
  ]);
  if (repair.ok) {
    parsed = tryParseJson(repair.content);
    if (parsed !== null) return { ok: true, data: parsed };
  }

  return { ok: false, reason: "INVALID_JSON" };
}

module.exports = { callLLMJson, LLMJsonError };
