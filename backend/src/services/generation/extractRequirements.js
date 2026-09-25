/**
 * extractRequirements.js
 *
 * Section 3, Step 1:
 * Extract relevant requirements from the job description.
 *
 * This is deliberately a separate LLM call from question generation.
 *
 * Edge cases handled:
 * - Thin / two-line job descriptions produce fewer requirements.
 * - The model is instructed not to invent requirements.
 * - IDs are assigned by our code, not trusted from the model.
 * - Invalid model output is skipped instead of breaking the entire kit.
 */

const { callLLMJson } = require("./llmClient");
const { RequirementSchema } = require("../../schema/kitSchema");

const SYSTEM_PROMPT = `
You extract role requirements from a job description.

Rules:

1. Only extract requirements that the job description actually states or clearly implies.
   Never invent requirements that are not present in the posting.

2. If the job description is short, incomplete, or vague, return fewer requirements.
   A thin job description must produce a thin requirement list.
   Do not fill missing information with assumptions.

3. Classify each requirement using exactly one of these kinds:
   - "technical" = programming languages, frameworks, tools, databases, systems, APIs,
     cloud technologies, testing technologies, etc.
   - "behavioural" = communication, teamwork, leadership, mentoring, collaboration,
     adaptability, problem solving, etc.
   - "domain" = industry knowledge or subject-matter knowledge.

4. Classify priority:
   - "must" = explicitly required, essential, mandatory, or a clearly stated minimum.
   - "nice" = preferred, bonus, optional, desirable, or nice-to-have.

5. Do not create duplicate requirements.

6. Keep the requirement text concise while preserving its meaning.

7. Return ONLY valid JSON in this exact structure:

{
  "requirements": [
    {
      "text": "string",
      "kind": "technical",
      "priority": "must"
    }
  ]
}

Allowed values:

kind:
- "technical"
- "behavioural"
- "domain"

priority:
- "must"
- "nice"
`;

async function extractRequirements(jobDescriptionText) {
  if (
    typeof jobDescriptionText !== "string" ||
    jobDescriptionText.trim().length === 0
  ) {
    return {
      ok: false,
      reason: "Job description is empty.",
      requirements: [],
    };
  }

  try {
    const result = await callLLMJson({
      system: SYSTEM_PROMPT,
      user: `Job description:\n\n${jobDescriptionText.trim()}`,
    });

    if (!result || !result.ok) {
      return {
        ok: false,
        reason: result?.reason || "Requirement extraction failed.",
        requirements: [],
      };
    }

    const rawList = Array.isArray(result.data?.requirements)
      ? result.data.requirements
      : [];

    const requirements = [];
    const seen = new Set();

    rawList.forEach((item) => {
      if (!item || typeof item !== "object") {
        return;
      }

      const text =
        typeof item.text === "string" ? item.text.trim() : "";

      if (!text) {
        return;
      }

      const normalizedText = text.toLowerCase();

      // Prevent duplicate requirements from entering the kit.
      if (seen.has(normalizedText)) {
        return;
      }

      const candidate = {
        id: `r${requirements.length + 1}`,
        text,
        kind: item.kind,
        priority: item.priority,
      };

      const parsed = RequirementSchema.safeParse(candidate);

      // Ignore malformed model output instead of failing the whole kit.
      if (!parsed.success) {
        return;
      }

      seen.add(normalizedText);
      requirements.push(parsed.data);
    });

    return {
      ok: true,
      requirements,
    };
  } catch (error) {
    console.error("Requirement extraction error:", error);

    return {
      ok: false,
      reason: error.message || "Unexpected requirement extraction error.",
      requirements: [],
    };
  }
}

module.exports = {
  extractRequirements,
};

