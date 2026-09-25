/**
 * validateKit.js
 *
 * Two layers of validation, on purpose:
 *
 *   1. Structural — does it match KitSchema (right fields, right types)?
 *      Zod handles this.
 *
 *   2. Referential — do the ids actually line up? Appendix A says:
 *        "every question_ids entry in the schedule must refer to
 *         a question that exists"
 *      and Section 5 says every question's requirement_ids must be real
 *      requirement ids. Zod can't express "this array of strings must be a
 *      subset of ids found elsewhere in the object" cleanly, so that logic
 *      lives here, in plain JS, where it's easy to read and unit test.
 *
 * This function is called from THREE places in the system, all reusing
 * this same code (never a parallel implementation, per Section 9):
 *   - after each LLM generation step, before we trust the output
 *   - before saving a kit to MongoDB
 *   - inside the batch command (npm run evaluate), on every case
 */

const { KitSchema } = require("./kitSchema");

function validateKit(kitCandidate) {
  const errors = [];

  // --- layer 1: structural ---
  const parsed = KitSchema.safeParse(kitCandidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
      });
    }
    // If the shape itself is wrong, referential checks below would just
    // throw on undefined fields — stop here and report structural errors.
    return { valid: false, errors };
  }

  const kit = parsed.data;

  // --- layer 2: referential integrity ---

  const requirementIds = new Set(kit.role.requirements.map((r) => r.id));
  const questionIds = new Set(kit.questions.map((q) => q.id));
  const flashcardIds = new Set(kit.flashcards.map((f) => f.id));

  // ids must be unique within the kit
  if (requirementIds.size !== kit.role.requirements.length) {
    errors.push({ path: "role.requirements", message: "duplicate requirement id" });
  }
  if (questionIds.size !== kit.questions.length) {
    errors.push({ path: "questions", message: "duplicate question id" });
  }
  if (flashcardIds.size !== kit.flashcards.length) {
    errors.push({ path: "flashcards", message: "duplicate flashcard id" });
  }

  // every question.requirement_ids must point at a real requirement
  kit.questions.forEach((q, i) => {
    q.requirement_ids.forEach((rid) => {
      if (!requirementIds.has(rid)) {
        errors.push({
          path: `questions[${i}].requirement_ids`,
          message: `references unknown requirement id "${rid}"`,
        });
      }
    });
  });

  // every flashcard.requirement_ids must point at a real requirement
  kit.flashcards.forEach((f, i) => {
    f.requirement_ids.forEach((rid) => {
      if (!requirementIds.has(rid)) {
        errors.push({
          path: `flashcards[${i}].requirement_ids`,
          message: `references unknown requirement id "${rid}"`,
        });
      }
    });
  });

  // every schedule.days[].question_ids must point at a real question
  // (this is the exact rule Appendix A states explicitly)
  kit.schedule.days.forEach((day, i) => {
    day.question_ids.forEach((qid) => {
      if (!questionIds.has(qid)) {
        errors.push({
          path: `schedule.days[${i}].question_ids`,
          message: `references unknown question id "${qid}"`,
        });
      }
    });
  });

  // schedule.days_available must match days.length and the requested days
  // (Section 8: "The number of days in the schedule equals the number of
  // days requested" — checked again at generation time against user input,
  // but the internal consistency check belongs here too)
  if (kit.schedule.days.length !== kit.schedule.days_available) {
    errors.push({
      path: "schedule.days",
      message: `schedule has ${kit.schedule.days.length} day(s) but days_available is ${kit.schedule.days_available}`,
    });
  }

  // coverage.uncovered_requirement_ids should be empty for a kit that's
  // considered finished — we don't hard-fail on this here (a batch case
  // can legitimately ship as "ok" with a documented gap after max passes),
  // but we surface it so callers can decide.
  const trulyUncovered = kit.role.requirements
    .filter((r) => r.priority === "must")
    .map((r) => r.id)
    .filter((rid) => !kit.questions.some((q) => q.requirement_ids.includes(rid)));

  return {
    valid: errors.length === 0,
    errors,
    warnings:
      trulyUncovered.length > 0
        ? [`${trulyUncovered.length} must-have requirement(s) have no question: ${trulyUncovered.join(", ")}`]
        : [],
  };
}

module.exports = { validateKit };
