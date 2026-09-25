/**
 * generateQuestions.js
 *
 * Universal interview question generator.
 *
 * Generates questions for one requirement at a time while adapting
 * the question style to the detected job role and requirement type.
 *
 * Supports:
 * - Software / IT
 * - Data / Analytics
 * - Business Analyst
 * - HR / Recruitment
 * - Sales / Customer Success
 * - Operations / Administration
 * - Product / Project Management
 * - Design
 * - Core Engineering
 * - Other roles
 *
 * Uses the LLM when available.
 * Falls back to deterministic role-aware questions when no LLM
 * provider/API key is configured.
 */

const { callLLMJson } = require("./llmClient");
const { QuestionSchema } = require("../../schema/kitSchema");

/**
 * Map requirement kind to a useful interview category.
 *
 * The final category is still constrained to the schema-supported
 * categories because the kit validator expects these values.
 */
function categoryForKind(kind) {
  const normalized = String(kind || "").toLowerCase();

  if (
    normalized === "behavioural" ||
    normalized === "behavioral" ||
    normalized === "soft_skill"
  ) {
    return "behavioural";
  }

  if (
    normalized === "domain" ||
    normalized === "company" ||
    normalized === "company_fit"
  ) {
    return "company-fit";
  }

  if (
    normalized === "system_design" ||
    normalized === "architecture"
  ) {
    return "system-design";
  }

  return "technical";
}

/**
 * Detect broad role family.
 *
 * This is deliberately lightweight. The requirement itself remains
 * the main source of truth.
 */
function detectRoleFamily(roleTitle = "", requirementText = "") {
  const text = `${roleTitle} ${requirementText}`.toLowerCase();

  if (
    /\b(full[\s-]?stack|software engineer|software developer|backend|frontend|web developer|mobile developer|android|ios|devops|cloud|cybersecurity|network|system administrator|qa|test engineer)\b/.test(
      text
    )
  ) {
    return "technology";
  }

  if (
    /\b(data analyst|data analytics|business intelligence|bi analyst)\b/.test(
      text
    )
  ) {
    return "data-analytics";
  }

  if (/\b(data engineer)\b/.test(text)) {
    return "data-engineering";
  }

  if (
    /\b(data scientist|machine learning|ml engineer|ai engineer|artificial intelligence)\b/.test(
      text
    )
  ) {
    return "ai-data";
  }

  if (
    /\b(business analyst|business analytics|process analyst)\b/.test(text)
  ) {
    return "business-analysis";
  }

  if (
    /\b(product manager|product owner|project manager|program manager|project coordinator)\b/.test(
      text
    )
  ) {
    return "management";
  }

  if (
    /\b(hr executive|human resources|recruiter|talent acquisition|hr manager)\b/.test(
      text
    )
  ) {
    return "hr";
  }

  if (
    /\b(sales|business development|account executive|customer success|customer support|customer service)\b/.test(
      text
    )
  ) {
    return "sales-customer";
  }

  if (
    /\b(operations|administrative|admin|data entry|office executive|operations executive)\b/.test(
      text
    )
  ) {
    return "operations";
  }

  if (
    /\b(ui\/?ux|ui designer|ux designer|graphic designer|product designer)\b/.test(
      text
    )
  ) {
    return "design";
  }

  if (
    /\b(mechanical engineer|civil engineer|electrical engineer|electronics engineer|chemical engineer|manufacturing engineer)\b/.test(
      text
    )
  ) {
    return "core-engineering";
  }

  return "general";
}

/**
 * Detect useful sub-topics from the requirement.
 */
function detectRequirementTopic(requirementText = "") {
  const text = String(requirementText || "").toLowerCase();

  const topicPatterns = [
    {
      pattern: /\b(stakeholder|stakeholders)\b/,
      topic: "stakeholder management",
    },
    {
      pattern: /\b(requirement gathering|requirements gathering|brd|frd)\b/,
      topic: "requirements gathering and documentation",
    },
    {
      pattern: /\b(user acceptance testing|uat)\b/,
      topic: "UAT",
    },
    {
      pattern: /\b(agile|scrum|sprint)\b/,
      topic: "Agile/Scrum",
    },
    {
      pattern: /\b(process mapping|process improvement|workflow)\b/,
      topic: "process analysis",
    },
    {
      pattern: /\b(sql|database|mysql|postgresql|oracle)\b/,
      topic: "SQL and databases",
    },
    {
      pattern: /\b(excel|spreadsheet|pivot|vlookup|xlookup)\b/,
      topic: "Excel/data analysis",
    },
    {
      pattern: /\b(power bi|tableau|dashboard|visualization)\b/,
      topic: "data visualization",
    },
    {
      pattern: /\b(python|pandas|numpy|statistics|statistical)\b/,
      topic: "data analysis",
    },
    {
      pattern: /\b(react|javascript|typescript|html|css)\b/,
      topic: "frontend development",
    },
    {
      pattern: /\b(api|rest|backend|server|spring boot|node\.?js|express)\b/,
      topic: "backend/API development",
    },
    {
      pattern: /\b(dsa|data structures|algorithms|coding)\b/,
      topic: "problem solving and algorithms",
    },
    {
      pattern: /\b(aws|azure|gcp|cloud)\b/,
      topic: "cloud computing",
    },
    {
      pattern: /\b(git|github|version control)\b/,
      topic: "version control",
    },
    {
      pattern: /\b(testing|qa|quality assurance|test cases)\b/,
      topic: "testing and quality",
    },
    {
      pattern: /\b(recruitment|recruiting|hiring|candidate sourcing)\b/,
      topic: "recruitment",
    },
    {
      pattern: /\b(employee relations|employee engagement)\b/,
      topic: "employee relations",
    },
    {
      pattern: /\b(sales|lead generation|prospecting|conversion)\b/,
      topic: "sales",
    },
    {
      pattern: /\b(customer service|customer support|complaints)\b/,
      topic: "customer handling",
    },
    {
      pattern: /\b(project management|project planning|milestone|delivery)\b/,
      topic: "project management",
    },
    {
      pattern: /\b(product roadmap|product strategy|user needs)\b/,
      topic: "product management",
    },
    {
      pattern: /\b(ui|ux|wireframe|prototype|figma)\b/,
      topic: "UI/UX design",
    },
  ];

  for (const item of topicPatterns) {
    if (item.pattern.test(text)) {
      return item.topic;
    }
  }

  return "";
}

/**
 * Build role-specific guidance for the LLM.
 */
function roleGuidance(roleFamily, roleTitle, requirementText) {
  const topic = detectRequirementTopic(requirementText);

  const base = [
    `Detected role: ${roleTitle || "Interview Preparation"}.`,
    `Detected role family: ${roleFamily}.`,
    topic ? `Detected requirement topic: ${topic}.` : "",
  ].filter(Boolean);

  const guidance = {
    technology:
      "Focus on implementation, technical decisions, debugging, architecture, tools, quality, and practical scenarios relevant to the requirement.",

    "data-analytics":
      "Focus on data interpretation, SQL, Excel, dashboards, metrics, analytical reasoning, business insights, and practical data scenarios when relevant.",

    "data-engineering":
      "Focus on data pipelines, ETL/ELT, databases, distributed processing, data quality, scalability, and reliability when relevant.",

    "ai-data":
      "Focus on statistics, machine learning, model reasoning, data preparation, evaluation, experimentation, and practical AI scenarios when relevant.",

    "business-analysis":
      "Focus on requirements gathering, stakeholder communication, process analysis, documentation, business problems, prioritization, UAT, Agile, and measurable outcomes when relevant.",

    management:
      "Focus on planning, prioritization, delivery, stakeholders, risks, communication, decision-making, and measurable outcomes when relevant.",

    hr:
      "Focus on recruitment, employee interaction, policies, conflict handling, communication, confidentiality, sourcing, and people-related scenarios when relevant.",

    "sales-customer":
      "Focus on customer needs, communication, objections, relationship management, targets, problem resolution, negotiation, and measurable outcomes when relevant.",

    operations:
      "Focus on process execution, accuracy, coordination, documentation, efficiency, prioritization, and handling operational problems when relevant.",

    design:
      "Focus on user needs, design reasoning, research, wireframes, prototypes, usability, visual decisions, iteration, and design tools when relevant.",

    "core-engineering":
      "Focus on engineering fundamentals, practical application, troubleshooting, safety, quality, design decisions, and domain-specific scenarios when relevant.",

    general:
      "Focus on practical application of the requirement, role responsibilities, problem solving, communication, and realistic workplace scenarios.",
  };

  return [...base, guidance[roleFamily] || guidance.general].join("\n");
}

/**
 * System prompt.
 *
 * The prompt explicitly tells the model that this is NOT a
 * Software Engineer-only application.
 */
const SYSTEM_PROMPT = `
You create interview practice questions for ONE named job requirement.

This is a UNIVERSAL interview preparation product.
The job may be technical, business, analytical, HR, sales, operations,
management, design, engineering, or another professional domain.

IMPORTANT RULES:

1. Generate questions ONLY for the supplied requirement.
2. Do not silently assume the candidate is a Software Engineer.
3. Adapt the question style to the detected job role.
4. Use the requirement wording as the primary source of truth.
5. Do not invent skills or experience that are not supported by the JD.
6. Generate 2-3 questions maximum.
7. Questions should be realistic interview questions, not generic definitions.
8. Prefer practical/application questions when appropriate.
9. Behavioural requirements should produce behavioural or situational questions.
10. Technical/domain requirements should produce technical or domain questions.
11. Hiring-process context may influence question style.
12. If the hiring process mentions system design, case study, presentation,
    take-home, technical round, HR round, or similar stages, reflect that
    when relevant to this requirement.

Allowed categories:
- "technical"
- "behavioural"
- "system-design"
- "company-fit"

Difficulty:
- 1 = fundamentals
- 2 = applied
- 3 = deep, complex, or edge-case reasoning

answer_outline must be concise and useful.
It should describe the main points a strong answer should cover.
Do not write a full essay.

Return ONLY valid JSON:

{
  "questions": [
    {
      "prompt": "string",
      "answer_outline": "string",
      "difficulty": 1,
      "category": "technical"
    }
  ]
}
`;

/**
 * Deterministic fallback question builder.
 *
 * This is important because the user may run the application
 * without an LLM API key.
 */
function buildFallbackQuestions({
  requirement,
  roleTitle,
  roleFamily,
  startingIndex,
}) {
  const text = String(requirement?.text || "").trim();
  const kind = String(requirement?.kind || "").toLowerCase();
  const priority = String(requirement?.priority || "").toLowerCase();

  if (!text) {
    return [];
  }

  const topic = detectRequirementTopic(text);
  const category = categoryForKind(kind);

  const questions = [];

  /**
   * Behavioural / soft-skill requirements.
   */
  if (
    kind === "behavioural" ||
    kind === "behavioral" ||
    kind === "soft_skill"
  ) {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `Tell me about a time you demonstrated ${text}. What was the situation, what did you do, and what was the outcome?`,
      answer_outline:
        "Situation/context → specific action taken → communication or reasoning → measurable/resulting outcome → lesson learned.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `How would you demonstrate ${text} when working with a difficult stakeholder or teammate?`,
      answer_outline:
        "Clarify the issue → listen to the other perspective → communicate clearly → agree on an action → follow through.",
      difficulty: 2,
    });

    return questions;
  }

  /**
   * Business Analyst fallback.
   */
  if (roleFamily === "business-analysis") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: category === "company-fit" ? "company-fit" : "technical",
      prompt: `As a ${roleTitle}, how would you apply ${text} to solve a real business problem?`,
      answer_outline:
        "Understand business objective → gather relevant information → identify stakeholders → analyze/prioritize needs → recommend solution → validate outcome.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `What steps would you follow to demonstrate your ability in ${text} during a Business Analyst project?`,
      answer_outline:
        "Identify inputs → define requirements or process → document findings → validate with stakeholders → track changes → measure outcome.",
      difficulty: 2,
    });

    if (topic) {
      questions.push({
        id: `q${startingIndex + 2}`,
        requirement_ids: [requirement.id],
        category: "technical",
        prompt: `A project specifically requires ${topic}. How would you handle this responsibility from start to finish?`,
        answer_outline:
          "Clarify objective → collect inputs → perform analysis → document decision → validate with stakeholders → monitor result.",
        difficulty: 3,
      });
    }

    return questions;
  }

  /**
   * Data Analyst fallback.
   */
  if (roleFamily === "data-analytics") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `How would you use ${text} to answer a business question as a Data Analyst?`,
      answer_outline:
        "Define business question → identify data → clean/validate → analyze → visualize or summarize → communicate insight and recommendation.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `What common problems could you face while working with ${text}, and how would you validate your result?`,
      answer_outline:
        "Check data quality → identify assumptions → validate calculations → compare with source data → investigate anomalies → explain limitations.",
      difficulty: 3,
    });

    return questions;
  }

  /**
   * HR fallback.
   */
  if (roleFamily === "hr") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `How would you handle a real workplace situation involving ${text}?`,
      answer_outline:
        "Understand people/context → maintain confidentiality and fairness → communicate clearly → follow policy/process → document and follow up.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `Describe an example that demonstrates your ability in ${text}.`,
      answer_outline:
        "Situation → responsibility → action → communication → result → lesson learned.",
      difficulty: 2,
    });

    return questions;
  }

  /**
   * Sales/customer fallback.
   */
  if (roleFamily === "sales-customer") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `How would you apply ${text} when dealing with a customer or prospect?`,
      answer_outline:
        "Understand customer need → ask relevant questions → communicate value → handle concerns → agree next step → follow up.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `Tell me about a situation where you demonstrated ${text}. What was the outcome?`,
      answer_outline:
        "Situation → customer/business goal → action → communication → measurable result → learning.",
      difficulty: 2,
    });

    return questions;
  }

  /**
   * Operations fallback.
   */
  if (roleFamily === "operations") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `How would you apply ${text} to improve an operational process?`,
      answer_outline:
        "Understand current process → identify bottleneck → define improvement → implement carefully → monitor accuracy/efficiency → review result.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `Describe a situation where you had to manage ${text} under time or workload pressure.`,
      answer_outline:
        "Prioritize tasks → communicate constraints → execute accurately → monitor deadlines → resolve issues → report outcome.",
      difficulty: 2,
    });

    return questions;
  }

  /**
   * Management fallback.
   */
  if (roleFamily === "management") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `How would you demonstrate ${text} while managing a project or product initiative?`,
      answer_outline:
        "Clarify objective → prioritize work → align stakeholders → manage risks → track progress → measure outcome.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "behavioural",
      prompt: `Tell me about a situation where you used ${text} to make a difficult decision.`,
      answer_outline:
        "Context → competing priorities → evidence considered → decision → stakeholder communication → result.",
      difficulty: 3,
    });

    return questions;
  }

  /**
   * Design fallback.
   */
  if (roleFamily === "design") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `How would you approach ${text} when designing a solution for users?`,
      answer_outline:
        "Understand users → identify problem → explore alternatives → create/validate solution → iterate from feedback → measure usability.",
      difficulty: 2,
    });

    questions.push({
      id: `q${startingIndex + 1}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `What trade-offs would you consider when working on ${text}?`,
      answer_outline:
        "User needs → simplicity → consistency → accessibility → technical constraints → validation and iteration.",
      difficulty: 3,
    });

    return questions;
  }

  /**
   * Core engineering fallback.
   */
  if (roleFamily === "core-engineering") {
    questions.push({
      id: `q${startingIndex}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `Explain how you would apply ${text} in a practical engineering project.`,
      answer_outline:
        "Define engineering objective → identify constraints → select approach → implement → test/validate → document result.",
      difficulty: 2,
    });

    questions.push({
      id: `${`q${startingIndex + 1}`}`,
      requirement_ids: [requirement.id],
      category: "technical",
      prompt: `What problems could arise while working with ${text}, and how would you troubleshoot them?`,
      answer_outline:
        "Identify symptoms → isolate cause → check assumptions and measurements → test corrective action → verify result.",
      difficulty: 3,
    });

    return questions;
  }

  /**
   * Universal fallback.
   *
   * Works for any role not covered above.
   */
  questions.push({
    id: `q${startingIndex}`,
    requirement_ids: [requirement.id],
    category,
    prompt: `How would you apply ${text} in the ${roleTitle || "role"} position?`,
    answer_outline:
      "Explain the requirement → describe a practical approach → give a relevant example → discuss expected outcome and validation.",
    difficulty: 2,
  });

  questions.push({
    id: `q${startingIndex + 1}`,
    requirement_ids: [requirement.id],
    category,
    prompt: `What challenges might you face while working with ${text}, and how would you handle them?`,
    answer_outline:
      "Identify likely challenge → analyze root cause → choose practical response → communicate clearly → verify the outcome.",
    difficulty: 3,
  });

  return questions;
}

/**
 * Validate and normalize generated questions.
 */
function normalizeQuestions(rawList, requirement, startingIndex, suggestedCategory) {
  const questions = [];

  if (!Array.isArray(rawList)) {
    return questions;
  }

  rawList.forEach((q, i) => {
    const category =
      typeof q?.category === "string" && q.category.trim()
        ? q.category.trim()
        : suggestedCategory;

    const allowedCategories = [
      "technical",
      "behavioural",
      "system-design",
      "company-fit",
    ];

    const safeCategory = allowedCategories.includes(category)
      ? category
      : suggestedCategory;

    const difficulty =
      Number.isInteger(q?.difficulty) &&
      q.difficulty >= 1 &&
      q.difficulty <= 3
        ? q.difficulty
        : 2;

    const candidate = {
      id: `q${startingIndex + i}`,
      requirement_ids: [requirement.id],
      category: safeCategory,
      prompt:
        typeof q?.prompt === "string"
          ? q.prompt.trim()
          : "",
      answer_outline:
        typeof q?.answer_outline === "string"
          ? q.answer_outline.trim()
          : "",
      difficulty,
    };

    const parsed = QuestionSchema.safeParse(candidate);

    if (
      parsed.success &&
      candidate.prompt.length > 0
    ) {
      questions.push(parsed.data);
    }
  });

  return questions;
}

/**
 * @param {{
 *   id:string,
 *   text:string,
 *   kind:string,
 *   priority:string,
 *   role_title?:string,
 *   role?:string,
 *   seniority?:string,
 *   coverage_gap?:boolean
 * }} requirement
 *
 * @param {string|null} hiringProcessContext
 * @param {number} startingIndex
 */
async function generateQuestionsForRequirement(
  requirement,
  hiringProcessContext,
  startingIndex
) {
  const roleTitle =
    String(
      requirement?.role_title ||
      requirement?.role ||
      "Interview Preparation"
    ).trim();

  const roleFamily = detectRoleFamily(
    roleTitle,
    requirement?.text || ""
  );

  const suggestedCategory = categoryForKind(
    requirement?.kind
  );

  const contextInstruction = roleGuidance(
    roleFamily,
    roleTitle,
    requirement?.text || ""
  );

  const userPrompt = [
    `Requirement: "${requirement?.text || ""}"`,
    `Requirement kind: ${requirement?.kind || "unknown"}`,
    `Priority: ${requirement?.priority || "unknown"}`,
    `Role title: ${roleTitle}`,
    `Role family: ${roleFamily}`,
    `Suggested category: ${suggestedCategory}`,
    requirement?.seniority
      ? `Seniority: ${requirement.seniority}`
      : "",
    requirement?.coverage_gap
      ? "This requirement is currently uncovered. Generate especially targeted questions for it."
      : "",
    contextInstruction,
    hiringProcessContext
      ? `This company's hiring process, from researched public content:
${String(hiringProcessContext).slice(0, 1500)}`
      : "No hiring-process information was found for this company.",
  ]
    .filter(Boolean)
    .join("\n\n");

  /**
   * First try the configured LLM.
   */
  try {
    const result = await callLLMJson({
      system: SYSTEM_PROMPT,
      user: userPrompt,
    });

    if (result?.ok) {
      const rawList = Array.isArray(result.data?.questions)
        ? result.data.questions
        : [];

      const questions = normalizeQuestions(
        rawList,
        requirement,
        startingIndex,
        suggestedCategory
      );

      if (questions.length > 0) {
        return {
          ok: true,
          questions,
          source: "llm",
        };
      }
    }
  } catch (error) {
    // Fall through to deterministic generation.
  }

  /**
   * Deterministic fallback.
   *
   * This makes the application useful even when:
   * - LLM_PROVIDER is configured but API key is missing
   * - provider fails
   * - rate limits occur
   * - malformed LLM JSON is returned
   */
  const fallbackQuestions = buildFallbackQuestions({
    requirement,
    roleTitle,
    roleFamily,
    startingIndex,
  });

  const validatedFallback = [];

  fallbackQuestions.forEach((candidate) => {
    const parsed = QuestionSchema.safeParse(candidate);

    if (parsed.success) {
      validatedFallback.push(parsed.data);
    }
  });

  if (validatedFallback.length > 0) {
    return {
      ok: true,
      questions: validatedFallback,
      source: "deterministic-fallback",
    };
  }

  return {
    ok: false,
    questions: [],
    reason:
      "Could not generate or validate interview questions for this requirement.",
  };
}

module.exports = {
  generateQuestionsForRequirement,
  categoryForKind,
  detectRoleFamily,
  detectRequirementTopic,
  buildFallbackQuestions,
};