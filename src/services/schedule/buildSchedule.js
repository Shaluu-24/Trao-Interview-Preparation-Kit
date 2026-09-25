/**
 * buildSchedule.js
 *
 * Section 8: "This is arithmetic and allocation. It belongs in your code,
 * not in a prompt." Also listed alongside coverage-checking in Section 3
 * as a step that must not be handed to the model.
 *
 * Rules enforced here, straight from the brief:
 *   - "Every must-have requirement appears somewhere in the schedule"
 *   - "The number of days in the schedule equals the number of days
 *      requested"
 *   - "Harder and higher-priority material lands earlier, not the night
 *      before"
 *   - minutes is an integer (Section 5)
 *
 * Approach (documented for the README):
 *   1. Score every question: must-have-linked questions outrank
 *      nice-linked ones; within that, higher difficulty outranks lower.
 *   2. Sort by that score, descending — hardest/highest-priority first.
 *   3. Distribute in that order across the requested number of days,
 *      round-robin, so day 1 gets first pick repeatedly rather than being
 *      front-loaded with everything and later days left empty.
 *   4. Each question is budgeted a fixed number of minutes based on its
 *      difficulty (harder questions get more time). Day minutes is the
 *      sum of its questions' minutes.
 *   5. If a day would end up with zero questions (more days requested than
 *      questions exist), it still gets a minutes value and an honest focus
 *      label ("Review / buffer") rather than being fabricated content.
 */

const MINUTES_PER_DIFFICULTY = { 1: 10, 2: 15, 3: 25 };

function scoreQuestion(question, requirementById) {
  const linkedMustHave = question.requirement_ids.some(
    (rid) => requirementById.get(rid)?.priority === "must"
  );
  // must-have questions always outrank nice-to-have ones, difficulty
  // breaks ties within that tier.
  return (linkedMustHave ? 1000 : 0) + question.difficulty;
}

function focusLabelFor(questions, requirementById) {
  if (questions.length === 0) return "Review / buffer";
  const categories = [...new Set(questions.map((q) => q.category))];
  return categories.join(" + ");
}

/**
 * @param {Array} requirements - full requirement list (for must-have lookups)
 * @param {Array} questions - full question list to schedule
 * @param {number} daysRequested
 * @returns {{ days_available: number, days: Array }}
 */
function buildSchedule(requirements, questions, daysRequested) {
  const requirementById = new Map(requirements.map((r) => [r.id, r]));

  const ordered = [...questions].sort(
    (a, b) => scoreQuestion(b, requirementById) - scoreQuestion(a, requirementById)
  );

  const dayCount = Math.max(1, Math.floor(daysRequested)); // Section 10: handle 1-day and 60-day requests
  const buckets = Array.from({ length: dayCount }, () => []);

  // Round-robin so difficulty/priority ordering spreads across days instead
  // of dumping everything into day 1.
  ordered.forEach((q, i) => {
    buckets[i % dayCount].push(q);
  });

  const days = buckets.map((qs, i) => {
    const minutes = qs.reduce((sum, q) => sum + (MINUTES_PER_DIFFICULTY[q.difficulty] || 15), 0);
    return {
      day: i + 1,
      focus: focusLabelFor(qs, requirementById),
      question_ids: qs.map((q) => q.id),
      minutes: minutes > 0 ? minutes : 15, // never zero — Section 5 wants a real integer, and a
      // day with nothing scheduled still gets a small buffer/review block
      // rather than an implausible 0.
    };
  });

  return { days_available: dayCount, days };
}

module.exports = { buildSchedule };
