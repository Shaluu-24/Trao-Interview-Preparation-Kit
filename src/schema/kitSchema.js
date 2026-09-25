/**
 * kitSchema.js
 *
 * This is the ONE place that defines what a valid kit looks like.
 * It mirrors Appendix A of the brief field-for-field, field names exact.
 *
 * Why Zod: it gives us runtime validation (not just TypeScript types that
 * vanish at compile time). We need runtime checks because kits are built
 * from LLM output, which is untrusted and sometimes malformed — Section 10
 * explicitly requires us to handle "the model returns invalid JSON or an
 * incomplete kit" as an edge case, not a crash.
 *
 * Every other part of the system imports FROM this file. Nobody redefines
 * the shape anywhere else. That's what makes "validate a generated kit
 * against the expected structure before saving it" (Section 13) a real,
 * enforced rule instead of a comment.
 */

const { z } = require("zod");

// ---- shared primitives -----------------------------------------------

const isoDateString = z.string().refine(
  (val) => !Number.isNaN(Date.parse(val)),
  { message: "must be a valid ISO date string" }
);

const url = z.string().url();

// ---- source ------------------------------------------------------------

const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string(), // kept as string, not strict url() — a company
  // may only give a bare domain, and we don't want the whole kit to fail
  // validation over a missing "https://" the user forgot to type.
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().nonnegative(),
  researched_at: isoDateString,
  pages_used: z.array(url),
});

// ---- company_brief -------------------------------------------------------

const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(url),
});

// ---- role / requirements ------------------------------------------------

const RequirementKind = z.enum(["technical", "behavioural", "domain"]);
const RequirementPriority = z.enum(["must", "nice"]);

const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: RequirementKind,
  priority: RequirementPriority,
});

const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

// ---- questions -----------------------------------------------------------

const QuestionCategory = z.enum([
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
]);

const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)),
  category: QuestionCategory,
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

// ---- flashcards -----------------------------------------------------------

const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string().min(1)),
});

// ---- schedule --------------------------------------------------------------

const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string().min(1)),
  minutes: z.number().int().positive(), // integer minutes — brief is explicit:
  // "No floats, no 'about an hour'."
});

const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

// ---- coverage ----------------------------------------------------------------

const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});

// ---- the full kit -------------------------------------------------------------

const KitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema,
});

module.exports = {
  KitSchema,
  RequirementSchema,
  QuestionSchema,
  FlashcardSchema,
  ScheduleDaySchema,
};
