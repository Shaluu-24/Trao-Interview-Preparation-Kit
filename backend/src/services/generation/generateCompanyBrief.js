/**
 * generateCompanyBrief.js
 *
 * Section 3, step: turns crawled "what they do" pages into
 * company_brief.summary / what_they_do.
 *
 * Section 10 edge case: "public discussion of the company turns up
 * nothing at all" / company site unreachable -> we must produce "an
 * honest brief rather than a fabricated one." If no pages were
 * successfully crawled, we skip the LLM call entirely and return an
 * explicitly honest brief instead of prompting a model to guess.
 */

const { callLLMJson } = require("./llmClient");

const SYSTEM_PROMPT = `You write a short, factual company brief from page text taken from the company's own website.
Rules:
- Only state things the source text actually supports. Do not guess or fill gaps with generic industry claims.
- summary: 2-3 sentences, what the company is and does.
- what_they_do: a slightly more detailed paragraph on their product/service and space.
Return JSON: { "summary": string, "what_they_do": string }`;

async function generateCompanyBrief(companyName, crawledPagesText) {
  if (!crawledPagesText || crawledPagesText.trim().length === 0) {
    return {
      ok: true,
      brief: {
        summary: `No public information could be retrieved about ${companyName || "this company"}.`,
        what_they_do: "Unable to determine — the company's site was unreachable or had no usable content.",
        sources: [],
      },
    };
  }

  const result = await callLLMJson({
    system: SYSTEM_PROMPT,
    user: `Company: ${companyName}\n\nSource text:\n${crawledPagesText}`,
  });

  if (!result.ok) {
    return {
      ok: true, // not a hard failure — degrade honestly rather than abort the whole kit
      brief: {
        summary: `Could not generate a summary for ${companyName || "this company"} (${result.reason}).`,
        what_they_do: "",
        sources: [],
      },
    };
  }

  return {
    ok: true,
    brief: {
      summary: typeof result.data.summary === "string" ? result.data.summary : "",
      what_they_do: typeof result.data.what_they_do === "string" ? result.data.what_they_do : "",
      sources: [],
    },
  };
}

module.exports = { generateCompanyBrief };
