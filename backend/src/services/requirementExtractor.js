/**
 * requirementExtractor.js
 *
 * Extracts relevant requirements from a job description.
 *
 * Strategy:
 * 1. Try the configured LLM.
 * 2. If LLM is unavailable, use a deterministic fallback extractor.
 *
 * The fallback ensures the application can still generate
 * a useful kit when the LLM provider is unavailable.
 */

const { callLLMJson } = require("./llmClient");
const { RequirementSchema } = require("../schema/kitSchema");

const SYSTEM_PROMPT = `
You extract role requirements from a job description.

Rules:

1. Only extract requirements that the job description actually states
or clearly implies. Never invent requirements.

2. If the job description is short, incomplete, or vague,
return fewer requirements.

3. Classify each requirement as exactly one of:

- "technical" = programming languages, frameworks, tools, databases,
  APIs, cloud technologies, testing technologies, systems, etc.

- "behavioural" = communication, teamwork, leadership, mentoring,
  collaboration, adaptability, problem solving, etc.

- "domain" = industry knowledge or subject-matter knowledge.

4. Classify priority as exactly one of:

- "must" = explicitly required, essential, mandatory, or clearly stated minimum.

- "nice" = preferred, bonus, optional, desirable, or nice-to-have.

5. Do not create duplicate requirements.

6. Keep requirement text concise.

7. Return ONLY valid JSON:

{
  "requirements": [
    {
      "text": "string",
      "kind": "technical",
      "priority": "must"
    }
  ]
}
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
      source: "none",
    };
  }

  const text = jobDescriptionText.trim();

  // First try the configured LLM.
  try {
    const result = await callLLMJson({
      system: SYSTEM_PROMPT,
      user: `Job description:\n\n${text}`,
    });

    if (result && result.ok) {
      const requirements = validateRequirements(
        Array.isArray(result.data?.requirements)
          ? result.data.requirements
          : []
      );

      return {
        ok: true,
        requirements,
        source: "llm",
      };
    }

    console.log(
      "LLM requirement extraction unavailable. Using deterministic fallback."
    );
  } catch (error) {
    console.error(
      "LLM requirement extraction failed. Using fallback:",
      error.message
    );
  }

  // Deterministic fallback.
  const fallbackRequirements = extractRequirementsFallback(text);

  return {
    ok: true,
    requirements: fallbackRequirements,
    source: "fallback",
  };
}

/**
 * Validates and normalizes model-generated requirements.
 */
function validateRequirements(rawList) {
  const requirements = [];
  const seen = new Set();

  rawList.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const text =
      typeof item.text === "string"
        ? item.text.trim()
        : "";

    if (!text) {
      return;
    }

    const normalizedText = text.toLowerCase();

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

    if (!parsed.success) {
      return;
    }

    seen.add(normalizedText);
    requirements.push(parsed.data);
  });

  return requirements;
}

/**
 * Deterministic fallback extractor.
 *
 * Uses controlled patterns rather than simple includes()
 * so that short terms such as "C" do not create false matches.
 */
function extractRequirementsFallback(text) {
  const requirements = [];

  const technicalSkills = [
    { pattern: /\bjava\b/i, label: "Java" },
    { pattern: /\bpython\b/i, label: "Python" },
    { pattern: /\bjavascript\b/i, label: "JavaScript" },
    { pattern: /\btypescript\b/i, label: "TypeScript" },

    { pattern: /\bc\+\+\b/i, label: "C++" },
    { pattern: /\bc#\b/i, label: "C#" },

    { pattern: /\bspring boot\b/i, label: "Spring Boot" },
    { pattern: /\breact\.js\b/i, label: "React.js" },
    { pattern: /\bangular\b/i, label: "Angular" },
    { pattern: /\bvue\.js\b/i, label: "Vue.js" },
    { pattern: /\bnode\.js\b/i, label: "Node.js" },
    { pattern: /\bexpress\.js\b/i, label: "Express.js" },

    { pattern: /\brest apis?\b/i, label: "REST APIs" },
    { pattern: /\bgraphql\b/i, label: "GraphQL" },

    { pattern: /\bsql\b/i, label: "SQL" },
    { pattern: /\bmysql\b/i, label: "MySQL" },
    { pattern: /\bpostgresql\b/i, label: "PostgreSQL" },
    { pattern: /\bmongodb\b/i, label: "MongoDB" },
    { pattern: /\boracle\b/i, label: "Oracle" },
    { pattern: /\bredis\b/i, label: "Redis" },

    { pattern: /\baws\b/i, label: "AWS" },
    { pattern: /\bazure\b/i, label: "Azure" },
    { pattern: /\bgcp\b/i, label: "GCP" },

    { pattern: /\bdocker\b/i, label: "Docker" },
    { pattern: /\bkubernetes\b/i, label: "Kubernetes" },

    { pattern: /\bgit\b/i, label: "Git" },
    { pattern: /\bgithub\b/i, label: "GitHub" },
    { pattern: /\blinux\b/i, label: "Linux" },

    { pattern: /\bhtml\b/i, label: "HTML" },
    { pattern: /\bcss\b/i, label: "CSS" },
    { pattern: /\btailwind css\b/i, label: "Tailwind CSS" },

    { pattern: /\btesting\b/i, label: "Testing" },
    { pattern: /\bjest\b/i, label: "Jest" },
    { pattern: /\bjunit\b/i, label: "JUnit" },
    { pattern: /\bci\/cd\b/i, label: "CI/CD" },

    { pattern: /\bmachine learning\b/i, label: "Machine Learning" },
    { pattern: /\btensorflow\b/i, label: "TensorFlow" },
    { pattern: /\bpytorch\b/i, label: "PyTorch" },
  ];

  const behaviouralSkills = [
    {
      pattern: /\bproblem[- ]solving\b/i,
      label: "Problem Solving",
    },
    {
      pattern: /\bcommunication\b/i,
      label: "Communication",
    },
    {
      pattern: /\bteamwork\b/i,
      label: "Teamwork",
    },
    {
      pattern: /\bcollaboration\b/i,
      label: "Collaboration",
    },
    {
      pattern: /\bleadership\b/i,
      label: "Leadership",
    },
    {
      pattern: /\badaptability\b/i,
      label: "Adaptability",
    },
    {
      pattern: /\btime management\b/i,
      label: "Time Management",
    },
    {
      pattern: /\bmentoring\b/i,
      label: "Mentoring",
    },
  ];

  technicalSkills.forEach(({ pattern, label }) => {
    if (pattern.test(text)) {
      requirements.push({
        text: label,
        kind: "technical",
        priority: "must",
      });
    }
  });

  behaviouralSkills.forEach(({ pattern, label }) => {
    if (pattern.test(text)) {
      requirements.push({
        text: label,
        kind: "behavioural",
        priority: "must",
      });
    }
  });

  return validateRequirements(requirements);
}

module.exports = {
  extractRequirements,
};