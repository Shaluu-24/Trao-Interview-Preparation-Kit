const express = require("express");

const router = express.Router();

const { extractRequirements } = require("../services/requirementExtractor");
const { researchCompany } = require("../services/companyResearch");
const {
  generateQuestions,
  buildCoverage,
} = require("../services/questionGenerator");

/**
 * POST /api/kits
 *
 * Creates an interview prep kit from:
 * - Job description
 * - Company website
 * - Number of preparation days
 *
 * Pipeline:
 * 1. Validate input
 * 2. Extract requirements from JD
 * 3. Research provided company website
 * 4. Generate requirement-specific interview questions
 * 5. Build flashcards
 * 6. Build deterministic study schedule
 * 7. Build requirement coverage
 */

router.post("/", async (req, res) => {
  try {
    const { jobDescription, companyUrl, days } = req.body;

    // --------------------------------------------------
    // 1. Basic validation
    // --------------------------------------------------

    if (
      typeof jobDescription !== "string" ||
      !jobDescription.trim()
    ) {
      return res.status(400).json({
        error: "Job description is required.",
      });
    }

    if (
      typeof companyUrl !== "string" ||
      !companyUrl.trim()
    ) {
      return res.status(400).json({
        error: "Company website is required.",
      });
    }

    const numberOfDays = Number(days);

    if (
      !Number.isInteger(numberOfDays) ||
      numberOfDays < 1 ||
      numberOfDays > 60
    ) {
      return res.status(400).json({
        error: "Days must be an integer between 1 and 60.",
      });
    }

    // --------------------------------------------------
    // 2. Validate company URL
    // --------------------------------------------------

    let parsedUrl;

    try {
      parsedUrl = new URL(companyUrl.trim());
    } catch {
      return res.status(400).json({
        error: "Please provide a valid company website URL.",
      });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        error: "Company website must use HTTP or HTTPS.",
      });
    }

    // --------------------------------------------------
    // 3. Extract requirements from job description
    // --------------------------------------------------

    const requirementResult = await extractRequirements(
      jobDescription.trim()
    );

    const requirements = Array.isArray(
      requirementResult.requirements
    )
      ? requirementResult.requirements
      : [];

    const mustRequirements = requirements.filter(
      (item) => item.priority === "must"
    );

    const niceToHave = requirements.filter(
      (item) => item.priority === "nice"
    );

    // --------------------------------------------------
    // 4. Research the ACTUAL provided company website
    // --------------------------------------------------

    const companyResearchResult = await researchCompany(
      parsedUrl.toString()
    );

    const companyBrief =
      companyResearchResult.company_brief || {
        name: "",
        summary:
          "Company research could not be retrieved.",
        products: [],
        hiring_signals: [],
        sources: [],
      };

    // --------------------------------------------------
    // 5. Build role summary
    // --------------------------------------------------

    const roleSummary =
      requirements.length > 0
        ? `This Software Engineer role requires ${requirements.length} identified skills or competencies from the provided job description.`
        : "The job description did not contain enough information to extract specific requirements.";

    // --------------------------------------------------
    // 6. Generate requirement-specific questions
    // --------------------------------------------------

    const questions = generateQuestions(requirements);

    // --------------------------------------------------
    // 7. Build flashcards
    // --------------------------------------------------

    const flashcards = [];

    if (requirements.length > 0) {
      requirements.forEach((requirement, index) => {
        const relatedQuestion = questions.find(
          (question) =>
            question.requirement_id === requirement.id
        );

        flashcards.push({
          id: `f${index + 1}`,
          requirement_id: requirement.id,
          front: `What should you know about ${requirement.text}?`,
          back:
            relatedQuestion?.answer ||
            `Review the role requirement: ${requirement.text}.`,
        });
      });
    }

    // Add company flashcard when company research succeeds.
    if (companyBrief.name) {
      flashcards.push({
        id: `f${flashcards.length + 1}`,
        front: "What company are you interviewing with?",
        back: companyBrief.name,
      });
    }

    // --------------------------------------------------
    // 8. Build deterministic study schedule
    // --------------------------------------------------

    const schedule = Array.from(
      { length: numberOfDays },
      (_, index) => {
        const day = index + 1;

        let title;
        let minutes = 60;

        if (day === 1) {
          title = "Understand the role and company";
        } else if (day === 2) {
          title = "Study core technical requirements";
        } else if (day === 3) {
          title = "Practice technical interview questions";
        } else if (day === 4) {
          title =
            "Practice project and problem-solving questions";
        } else if (day === 5) {
          title =
            "Review company and role-specific topics";
        } else if (day === numberOfDays) {
          title = "Final interview revision";
        } else {
          title = "Practice interview questions";
        }

        // If this is the final day, slightly reduce workload
        // so the candidate has time for final review.
        if (day === numberOfDays && numberOfDays > 1) {
          minutes = 45;
        }

        return {
          day,
          minutes,
          tasks: [
            {
              id: `task-${day}-1`,
              title,
              minutes,
            },
          ],
        };
      }
    );

    // --------------------------------------------------
    // 9. Build coverage map
    // --------------------------------------------------

    const coverage = buildCoverage(
      requirements,
      questions
    );

    // --------------------------------------------------
    // 10. Build complete kit
    // --------------------------------------------------

    const kit = {
      source: {
        job_description: jobDescription.trim(),
        company_url: parsedUrl.toString(),
        days: numberOfDays,
      },

      company_brief: {
        name: companyBrief.name || "",
        summary:
          companyBrief.summary ||
          "No company summary was available.",
        products: companyBrief.products || [],
        hiring_signals:
          companyBrief.hiring_signals || [],
        sources: companyBrief.sources || [],
      },

      role: {
        title: "Software Engineer",
        summary: roleSummary,
        must_requirements: mustRequirements,
        nice_to_have: niceToHave,
      },

      questions,

      flashcards,

      schedule,

      coverage,
    };

    // --------------------------------------------------
    // 11. Return result
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Prep kit created successfully.",

      requirement_extraction: {
        ok: requirementResult.ok,
        source: requirementResult.source || null,
        reason: requirementResult.reason || null,
      },

      company_research: {
        ok: companyResearchResult.ok,
        reason: companyResearchResult.reason || null,
      },

      kit,
    });
  } catch (error) {
    console.error("Create kit error:", error);

    return res.status(500).json({
      error: "Failed to create prep kit.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

module.exports = router;
