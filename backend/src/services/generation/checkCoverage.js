/**
 * checkCoverage.js
 *
 * Section 3: "Compare the generated questions against the extracted
 * requirements to find what is not covered" is listed as one of the two
 * steps that "must not be handed to the model... your code's decision to
 * make, not the model's."
 *
 * Pure function, no I/O, trivially unit-testable — which is exactly what
 * Section 14 asks tests to protect ("coverage checking").
 */

function checkCoverage(requirements, questions) {
  const coveredRequirementIds = new Set(questions.flatMap((q) => q.requirement_ids));
  const uncovered = requirements.filter((r) => !coveredRequirementIds.has(r.id));
  return {
    uncoveredAll: uncovered,
    uncoveredMustHave: uncovered.filter((r) => r.priority === "must"),
  };
}

module.exports = { checkCoverage };
