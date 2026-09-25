/**
 * runGenerationPipeline.js
 *
 * Universal AI Interview Preparation Kit generation pipeline.
 *
 * Deliberate sequence:
 *   1. Extract requirements from the job description
 *   2. Generate company brief from researched pages
 *   3. Generate questions for every extracted requirement
 *   4. Check must-have coverage and run one additional gap-closing pass
 *   5. Derive flashcards deterministically
 *   6. Build deterministic day-by-day study schedule
 *   7. Assemble and validate the complete kit
 *
 * IMPORTANT:
 * This pipeline is role-agnostic.
 *
 * The role is inferred from the supplied job description instead of being
 * hardcoded to "Software Engineer".
 *
 * Examples:
 *   Business Analyst JD       -> Business Analyst kit
 *   Data Analyst JD           -> Data Analyst kit
 *   Full Stack Developer JD   -> Full Stack Developer kit
 *   HR Executive JD           -> HR Executive kit
 *   Operations Executive JD   -> Operations Executive kit
 *   Any other JD              -> Best detected role or "Interview Preparation"
 *
 * Generation failures are recorded in `notes` and do not automatically
 * terminate the pipeline. This follows the assignment requirement that
 * partial generation/research is acceptable when a complete kit cannot be
 * produced from every step.
 */

const { extractRequirements } = require("./extractRequirements");
const { generateCompanyBrief } = require("./generateCompanyBrief");
const { generateQuestionsForRequirement } = require("./generateQuestions");
const { checkCoverage } = require("./checkCoverage");
const { deriveFlashcards } = require("./deriveFlashcards");
const { buildSchedule } = require("../schedule/buildSchedule");
const { validateKit } = require("../../schema/validateKit");

const MAX_COVERAGE_PASSES = 2;

/**
 * Common role/title patterns.
 *
 * These are intentionally broad because the product is meant to support
 * both IT and non-IT interview preparation.
 */
const ROLE_PATTERNS = [
  // Software / IT
  {
    pattern: /\bfull[\s-]?stack\s+(developer|engineer)\b/i,
    title: "Full Stack Developer",
  },
  {
    pattern: /\bsoftware\s+(engineer|developer)\b/i,
    title: "Software Engineer",
  },
  {
    pattern: /\bfrontend\s+(developer|engineer)\b/i,
    title: "Frontend Developer",
  },
  {
    pattern: /\bfront[\s-]?end\s+(developer|engineer)\b/i,
    title: "Frontend Developer",
  },
  {
    pattern: /\bbackend\s+(developer|engineer)\b/i,
    title: "Backend Developer",
  },
  {
    pattern: /\bback[\s-]?end\s+(developer|engineer)\b/i,
    title: "Backend Developer",
  },
  {
    pattern: /\bweb\s+(developer|engineer)\b/i,
    title: "Web Developer",
  },
  {
    pattern: /\bmobile\s+(developer|engineer)\b/i,
    title: "Mobile Developer",
  },
  {
    pattern: /\bandroid\s+(developer|engineer)\b/i,
    title: "Android Developer",
  },
  {
    pattern: /\bios\s+(developer|engineer)\b/i,
    title: "iOS Developer",
  },
  {
    pattern: /\bdevops\s+(engineer|developer)\b/i,
    title: "DevOps Engineer",
  },
  {
    pattern: /\bcloud\s+(engineer|developer|architect)\b/i,
    title: "Cloud Engineer",
  },
  {
    pattern: /\bdata\s+engineer\b/i,
    title: "Data Engineer",
  },
  {
    pattern: /\bdata\s+scientist\b/i,
    title: "Data Scientist",
  },
  {
    pattern: /\bdata\s+analyst\b/i,
    title: "Data Analyst",
  },
  {
    pattern: /\bmachine\s+learning\s+(engineer|scientist)\b/i,
    title: "Machine Learning Engineer",
  },
  {
    pattern: /\bai\s+(engineer|developer|specialist)\b/i,
    title: "AI Engineer",
  },
  {
    pattern: /\bqa\s+(engineer|analyst|tester)\b/i,
    title: "QA Engineer",
  },
  {
    pattern: /\bquality\s+assurance\s+(engineer|analyst|tester)\b/i,
    title: "QA Engineer",
  },
  {
    pattern: /\btest\s+(engineer|analyst)\b/i,
    title: "Test Engineer",
  },
  {
    pattern: /\bcyber\s*security\s+(analyst|engineer|specialist)\b/i,
    title: "Cybersecurity Analyst",
  },
  {
    pattern: /\bsecurity\s+(analyst|engineer|specialist)\b/i,
    title: "Security Analyst",
  },
  {
    pattern: /\bsystem\s+(administrator|engineer)\b/i,
    title: "System Administrator",
  },
  {
    pattern: /\bnetwork\s+(engineer|administrator)\b/i,
    title: "Network Engineer",
  },

  // Business / Analytics
  {
    pattern: /\bbusiness\s+analyst\b/i,
    title: "Business Analyst",
  },
  {
    pattern: /\bbusiness\s+analytics\b/i,
    title: "Business Analytics",
  },
  {
    pattern: /\bbusiness\s+intelligence\s+(analyst|developer)\b/i,
    title: "Business Intelligence Analyst",
  },
  {
    pattern: /\bfinancial\s+analyst\b/i,
    title: "Financial Analyst",
  },
  {
    pattern: /\bfinance\s+analyst\b/i,
    title: "Finance Analyst",
  },
  {
    pattern: /\bmarketing\s+analyst\b/i,
    title: "Marketing Analyst",
  },
  {
    pattern: /\boperations\s+analyst\b/i,
    title: "Operations Analyst",
  },
  {
    pattern: /\bprocess\s+analyst\b/i,
    title: "Process Analyst",
  },
  {
    pattern: /\bresearch\s+analyst\b/i,
    title: "Research Analyst",
  },

  // Management
  {
    pattern: /\bproduct\s+manager\b/i,
    title: "Product Manager",
  },
  {
    pattern: /\bproduct\s+owner\b/i,
    title: "Product Owner",
  },
  {
    pattern: /\bproject\s+manager\b/i,
    title: "Project Manager",
  },
  {
    pattern: /\bprogram\s+manager\b/i,
    title: "Program Manager",
  },
  {
    pattern: /\bproject\s+coordinator\b/i,
    title: "Project Coordinator",
  },

  // HR
  {
    pattern: /\bhr\s+(executive|manager|specialist|associate)\b/i,
    title: "HR Executive",
  },
  {
    pattern: /\bhuman\s+resources\s+(executive|manager|specialist|associate)\b/i,
    title: "Human Resources",
  },
  {
    pattern: /\brecruiter\b/i,
    title: "Recruiter",
  },
  {
    pattern: /\btalent\s+acquisition\b/i,
    title: "Talent Acquisition",
  },

  // Sales / Customer
  {
    pattern: /\bsales\s+(executive|associate|representative|manager)\b/i,
    title: "Sales Executive",
  },
  {
    pattern: /\bbusiness\s+development\s+(executive|associate|manager)\b/i,
    title: "Business Development Executive",
  },
  {
    pattern: /\bcustomer\s+(support|service)\s+(executive|associate|representative)\b/i,
    title: "Customer Support Executive",
  },
  {
    pattern: /\bcustomer\s+success\s+(executive|associate|manager)\b/i,
    title: "Customer Success",
  },

  // Operations / Admin
  {
    pattern: /\boperations\s+(executive|associate|manager)\b/i,
    title: "Operations Executive",
  },
  {
    pattern: /\badmin(istrative)?\s+(executive|assistant|associate)\b/i,
    title: "Administrative Executive",
  },
  {
    pattern: /\bdata\s+entry\s+(operator|executive|associate)\b/i,
    title: "Data Entry Executive",
  },

  // Design
  {
    pattern: /\bui\/?ux\s+(designer|developer)\b/i,
    title: "UI/UX Designer",
  },
  {
    pattern: /\bui\s+designer\b/i,
    title: "UI Designer",
  },
  {
    pattern: /\bux\s+designer\b/i,
    title: "UX Designer",
  },
  {
    pattern: /\bgraphic\s+designer\b/i,
    title: "Graphic Designer",
  },

  // Engineering / Core
  {
    pattern: /\bmechanical\s+engineer\b/i,
    title: "Mechanical Engineer",
  },
  {
    pattern: /\bcivil\s+engineer\b/i,
    title: "Civil Engineer",
  },
  {
    pattern: /\belectrical\s+engineer\b/i,
    title: "Electrical Engineer",
  },
  {
    pattern: /\belectronics\s+engineer\b/i,
    title: "Electronics Engineer",
  },
];

/**
 * Infer a role title from the JD.
 *
 * We deliberately prioritize explicit title phrases such as:
 *   Job Title:
 *   Position:
 *   Role:
 *   Designation:
 *   We are hiring for...
 *
 * before doing a broader pattern scan.
 */
function inferRoleTitle(jobDescriptionText = "") {
  const text = String(jobDescriptionText || "").trim();

  if (!text) {
    return "Interview Preparation";
  }

  // First inspect the beginning of the JD because job titles normally appear
  // near the top.
  const firstPart = text.slice(0, 1800);

  const explicitTitlePatterns = [
    /(?:job\s+title|position|role|designation|title)\s*[:\-]\s*([^\n\r|]+)/i,
    /(?:we\s+are\s+hiring\s+(?:a|an|for)?|hiring\s+for\s+(?:a|an)?|looking\s+for\s+(?:a|an)?)\s*([^\n\r|]+)/i,
  ];

  for (const explicitPattern of explicitTitlePatterns) {
    const match = firstPart.match(explicitPattern);

    if (match && match[1]) {
      const candidate = cleanRoleCandidate(match[1]);

      if (isUsefulRoleCandidate(candidate)) {
        return candidate;
      }
    }
  }

  // Then use known role patterns.
  for (const role of ROLE_PATTERNS) {
    if (role.pattern.test(text)) {
      return role.title;
    }
  }

  // Last fallback: inspect common title-like first lines.
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const line of lines) {
    const candidate = cleanRoleCandidate(line);

    if (isUsefulRoleCandidate(candidate)) {
      return candidate;
    }
  }

  return "Interview Preparation";
}

/**
 * Clean a title candidate extracted from a JD.
 */
function cleanRoleCandidate(value) {
  return String(value || "")
    .replace(/^[#>*\-\s]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[|•]+.*$/, "")
    .trim()
    .replace(/[.,;:]+$/, "")
    .slice(0, 120);
}

/**
 * Prevent random JD sentences from being treated as role names.
 */
function isUsefulRoleCandidate(candidate) {
  if (!candidate) return false;

  if (candidate.length < 3 || candidate.length > 100) {
    return false;
  }

  const lower = candidate.toLowerCase();

  const looksLikeRole =
    /\b(engineer|developer|analyst|manager|executive|associate|specialist|designer|architect|consultant|administrator|assistant|coordinator|scientist|recruiter|representative|operator|tester|technician|intern|lead|director|officer)\b/i.test(
      lower
    );

  if (!looksLikeRole) {
    return false;
  }

  // Avoid accidentally capturing long responsibility sentences.
  const wordCount = candidate.split(/\s+/).length;

  return wordCount <= 10;
}

/**
 * Infer seniority from the JD.
 *
 * This is intentionally conservative. If the JD does not explicitly state
 * seniority, we return an empty string instead of inventing it.
 */
function inferSeniority(jobDescriptionText = "") {
  const text = String(jobDescriptionText || "");

  const seniorityPatterns = [
    {
      pattern: /\b(senior|sr\.?)\b/i,
      value: "Senior",
    },
    {
      pattern: /\b(lead|principal)\b/i,
      value: "Lead / Principal",
    },
    {
      pattern: /\b(staff|architect)\b/i,
      value: "Staff / Architect",
    },
    {
      pattern: /\b(junior|jr\.?)\b/i,
      value: "Junior",
    },
    {
      pattern: /\b(entry[\s-]?level)\b/i,
      value: "Entry Level",
    },
    {
      pattern: /\b(fresher|graduate|new\s+graduate)\b/i,
      value: "Graduate / Fresher",
    },
    {
      pattern: /\bintern(ship)?\b/i,
      value: "Intern",
    },
    {
      pattern: /\b(manager|head)\b/i,
      value: "Managerial",
    },
  ];

  for (const item of seniorityPatterns) {
    if (item.pattern.test(text)) {
      return item.value;
    }
  }

  return "";
}

/**
 * Extract responsibility-like statements from the JD.
 *
 * This does not try to replace the requirement extractor. It simply gives
 * the final kit a useful role.responsibilities array.
 */
function extractResponsibilities(jobDescriptionText = "") {
  const text = String(jobDescriptionText || "").trim();

  if (!text) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\s>*•\-–—\d.)]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const responsibilityHeaderPattern =
    /^(responsibilities|what you(?:'|’)ll do|what you will do|duties|key responsibilities|role responsibilities|job responsibilities)\b/i;

  const requirementHeaderPattern =
    /^(requirements|required skills|qualifications|preferred skills|skills|experience)\b/i;

  const responsibilities = [];
  let inResponsibilitiesSection = false;

  for (const line of lines) {
    if (responsibilityHeaderPattern.test(line)) {
      inResponsibilitiesSection = true;
      continue;
    }

    if (requirementHeaderPattern.test(line)) {
      inResponsibilitiesSection = false;
      continue;
    }

    if (inResponsibilitiesSection) {
      if (line.length >= 12 && line.length <= 500) {
        responsibilities.push(line);
      }
    }
  }

  // If there was no recognizable section, use sentences containing
  // responsibility/action verbs.
  if (responsibilities.length === 0) {
    const sentences = text
      .split(/[\n.!?]+/)
      .map((sentence) => sentence.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const actionPattern =
      /^(build|develop|design|create|manage|analyze|support|coordinate|lead|work|collaborate|prepare|monitor|maintain|implement|test|document|communicate|handle|review|deliver|assist|perform|identify|gather|define|track|report|improve|optimize)\b/i;

    for (const sentence of sentences) {
      if (
        actionPattern.test(sentence) &&
        sentence.length >= 20 &&
        sentence.length <= 500
      ) {
        responsibilities.push(sentence);
      }
    }
  }

  return uniqueStrings(responsibilities).slice(0, 12);
}

/**
 * Build a short role summary without inventing experience.
 */
function buildRoleSummary({
  roleTitle,
  seniority,
  requirements,
  responsibilities,
}) {
  const requirementCount = Array.isArray(requirements)
    ? requirements.length
    : 0;

  const responsibilityCount = Array.isArray(responsibilities)
    ? responsibilities.length
    : 0;

  const parts = [
    `${roleTitle} interview preparation kit.`,
  ];

  if (seniority) {
    parts.push(`Seniority identified as ${seniority}.`);
  }

  if (requirementCount > 0) {
    parts.push(
      `${requirementCount} job requirements or competencies were identified from the supplied description.`
    );
  }

  if (responsibilityCount > 0) {
    parts.push(
      `${responsibilityCount} responsibility areas were extracted for interview preparation.`
    );
  }

  return parts.join(" ");
}

/**
 * Safely remove duplicates while preserving order.
 */
function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values || []) {
    const normalized = String(value || "").trim();

    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

/**
 * Ensure source URLs are clean strings.
 */
function cleanPagesUsed(pagesUsed) {
  if (!Array.isArray(pagesUsed)) {
    return [];
  }

  return pagesUsed
    .map((value) => {
      if (typeof value === "string") {
        return value.trim();
      }

      if (value && typeof value === "object") {
        return (
          value.url ||
          value.href ||
          value.source ||
          value.link ||
          ""
        )
          .toString()
          .trim();
      }

      return "";
    })
    .filter(Boolean);
}

/**
 * Generate the universal interview preparation kit.
 */
async function runGenerationPipeline({
  jobDescriptionText,
  companyName,
  companyUrl,
  aboutPagesText,
  hiringProcessText,
  pagesUsed,
  daysRequested,
}) {
  const notes = [];

  const safeJobDescription = String(jobDescriptionText || "").trim();
  const safeCompanyName = String(companyName || "").trim();
  const safeCompanyUrl = String(companyUrl || "").trim();
  const safeHiringProcessText = String(hiringProcessText || "").trim();

  const safePagesUsed = cleanPagesUsed(pagesUsed);

  /**
   * ------------------------------------------------------------
   * STEP 0: UNIVERSAL ROLE DETECTION
   * ------------------------------------------------------------
   */
  const roleTitle = inferRoleTitle(safeJobDescription);
  const seniority = inferSeniority(safeJobDescription);
  const responsibilities = extractResponsibilities(safeJobDescription);

  /**
   * ------------------------------------------------------------
   * STEP 1: REQUIREMENTS
   * ------------------------------------------------------------
   */
  let reqResult;

  try {
    reqResult = await extractRequirements(safeJobDescription);
  } catch (error) {
    reqResult = {
      ok: false,
      requirements: [],
      reason: error?.message || "Unknown requirement extraction error",
    };
  }

  const requirements =
    reqResult && reqResult.ok && Array.isArray(reqResult.requirements)
      ? reqResult.requirements
      : [];

  if (!reqResult?.ok) {
    notes.push(
      `requirement extraction failed: ${
        reqResult?.reason || "unknown error"
      }`
    );
  }

  /**
   * ------------------------------------------------------------
   * STEP 2: COMPANY BRIEF
   * ------------------------------------------------------------
   *
   * Company research is independent of requirement extraction.
   */
  let briefResult;

  try {
    briefResult = await generateCompanyBrief(
      safeCompanyName,
      String(aboutPagesText || "")
    );
  } catch (error) {
    briefResult = {
      ok: false,
      brief: {
        name: safeCompanyName,
        summary: "",
        products: [],
        hiring_signals: [],
      },
      reason: error?.message || "Unknown company brief error",
    };
  }

  const generatedBrief =
    briefResult && briefResult.brief && typeof briefResult.brief === "object"
      ? briefResult.brief
      : {
          name: safeCompanyName,
          summary: "",
          products: [],
          hiring_signals: [],
        };

  if (!briefResult?.ok) {
    notes.push(
      `company brief generation failed: ${
        briefResult?.reason || "unknown error"
      }`
    );
  }

  const company_brief = {
    ...generatedBrief,
    sources: safePagesUsed,
  };

  /**
   * ------------------------------------------------------------
   * STEP 3: QUESTIONS
   * ------------------------------------------------------------
   *
   * One generation call per requirement.
   *
   * IMPORTANT:
   * We pass role context so the question generator can adapt questions
   * to Business Analyst, Data Analyst, Full Stack, etc.
   */
  let questionIdCounter = 1;
  let questions = [];

  for (const req of requirements) {
    let qResult;

    try {
      qResult = await generateQuestionsForRequirement(
        {
          ...req,
          role_title: roleTitle,
          role: roleTitle,
          seniority,
        },
        safeHiringProcessText,
        questionIdCounter
      );
    } catch (error) {
      qResult = {
        ok: false,
        questions: [],
        reason: error?.message || "Unknown question generation error",
      };
    }

    if (
      qResult &&
      qResult.ok &&
      Array.isArray(qResult.questions)
    ) {
      questions = questions.concat(qResult.questions);
      questionIdCounter += qResult.questions.length;
    } else {
      notes.push(
        `question generation failed for ${req.id || "requirement"}: ${
          qResult?.reason || "unknown error"
        }`
      );
    }
  }

  /**
   * ------------------------------------------------------------
   * STEP 4: COVERAGE LOOP
   * ------------------------------------------------------------
   *
   * If must-have requirements are not covered, generate targeted
   * additional questions.
   *
   * Maximum passes = 2:
   *   Pass 1 = initial generation
   *   Pass 2 = gap-closing generation
   */
  let passes = 1;
  let coverage = checkCoverage(requirements, questions);

  while (
    coverage.uncoveredMustHave.length > 0 &&
    passes < MAX_COVERAGE_PASSES
  ) {
    for (const gapReq of coverage.uncoveredMustHave) {
      let qResult;

      try {
        qResult = await generateQuestionsForRequirement(
          {
            ...gapReq,
            role_title: roleTitle,
            role: roleTitle,
            seniority,
            coverage_gap: true,
          },
          safeHiringProcessText,
          questionIdCounter
        );
      } catch (error) {
        qResult = {
          ok: false,
          questions: [],
          reason: error?.message || "Unknown coverage question error",
        };
      }

      if (
        qResult &&
        qResult.ok &&
        Array.isArray(qResult.questions)
      ) {
        questions = questions.concat(qResult.questions);
        questionIdCounter += qResult.questions.length;
      } else {
        notes.push(
          `coverage pass question generation failed for ${
            gapReq.id || "requirement"
          }: ${qResult?.reason || "unknown error"}`
        );
      }
    }

    passes += 1;
    coverage = checkCoverage(requirements, questions);
  }

  /**
   * ------------------------------------------------------------
   * STEP 5: FLASHCARDS
   * ------------------------------------------------------------
   */
  let flashcards = [];

  try {
    flashcards = deriveFlashcards(questions);

    if (!Array.isArray(flashcards)) {
      flashcards = [];
      notes.push("flashcard derivation returned an invalid result");
    }
  } catch (error) {
    flashcards = [];
    notes.push(
      `flashcard derivation failed: ${
        error?.message || "unknown error"
      }`
    );
  }

  /**
   * ------------------------------------------------------------
   * STEP 6: STUDY SCHEDULE
   * ------------------------------------------------------------
   */
  let schedule;

  try {
    schedule = buildSchedule(
      requirements,
      questions,
      daysRequested
    );
  } catch (error) {
    schedule = {
      days_available: Number(daysRequested) || 1,
      days: [],
    };

    notes.push(
      `schedule generation failed: ${
        error?.message || "unknown error"
      }`
    );
  }

  /**
   * ------------------------------------------------------------
   * STEP 7: ASSEMBLE UNIVERSAL KIT
   * ------------------------------------------------------------
   */
  const kit = {
    source: {
      company: safeCompanyName,
      company_url: safeCompanyUrl,

      // Dynamic role instead of hardcoded Software Engineer.
      role: roleTitle,

      location: "",

      jd_chars: safeJobDescription.length,

      researched_at: new Date().toISOString(),

      pages_used: safePagesUsed,
    },

    company_brief,

    role: {
      title: roleTitle,

      seniority,

      responsibilities,

      summary: buildRoleSummary({
        roleTitle,
        seniority,
        requirements,
        responsibilities,
      }),

      requirements,

      // Keep compatibility with consumers that distinguish must-have
      // and nice-to-have requirements.
      must_requirements: requirements.filter(
        (requirement) =>
          requirement &&
          (
            requirement.must_have === true ||
            requirement.priority === "must" ||
            requirement.priority === "high" ||
            requirement.kind === "must_have"
          )
      ),

      nice_to_have: requirements.filter(
        (requirement) =>
          requirement &&
          (
            requirement.must_have === false ||
            requirement.priority === "nice_to_have" ||
            requirement.priority === "low" ||
            requirement.kind === "nice_to_have"
          )
      ),
    },

    questions,

    flashcards,

    schedule,

    coverage: {
      uncovered_requirement_ids:
        coverage.uncoveredMustHave.map(
          (requirement) => requirement.id
        ),

      passes,
    },
  };

  /**
   * ------------------------------------------------------------
   * STEP 8: FINAL VALIDATION
   * ------------------------------------------------------------
   */
  let validation;

  try {
    validation = validateKit(kit);
  } catch (error) {
    validation = {
      ok: false,
      valid: false,
      errors: [
        error?.message || "Kit validation threw an error",
      ],
    };

    notes.push(
      `kit validation failed: ${
        error?.message || "unknown validation error"
      }`
    );
  }

  return {
    kit,
    validation,
    notes,
  };
}

module.exports = {
  runGenerationPipeline,
  MAX_COVERAGE_PASSES,
  inferRoleTitle,
  inferSeniority,
  extractResponsibilities,
};