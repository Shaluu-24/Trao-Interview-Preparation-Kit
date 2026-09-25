const { checkCoverage } = require("./checkCoverage");

const requirements = [
  { id: "r1", text: "5+ years React", kind: "technical", priority: "must" },
  { id: "r2", text: "Mentors juniors", kind: "behavioural", priority: "must" },
  { id: "r3", text: "AWS experience", kind: "technical", priority: "nice" },
];

test("finds a must-have requirement with zero questions", () => {
  const questions = [{ id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "x", answer_outline: "y", difficulty: 1 }];
  const { uncoveredMustHave } = checkCoverage(requirements, questions);
  expect(uncoveredMustHave.map((r) => r.id)).toEqual(["r2"]);
});

test("returns empty when every must-have is covered, even if nice-to-have is not", () => {
  const questions = [
    { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "x", answer_outline: "y", difficulty: 1 },
    { id: "q2", requirement_ids: ["r2"], category: "behavioural", prompt: "x", answer_outline: "y", difficulty: 1 },
  ];
  const { uncoveredMustHave, uncoveredAll } = checkCoverage(requirements, questions);
  expect(uncoveredMustHave).toHaveLength(0);
  expect(uncoveredAll.map((r) => r.id)).toEqual(["r3"]); // nice-to-have still flagged in uncoveredAll
});

test("a question covering multiple requirement_ids counts for all of them", () => {
  const questions = [
    { id: "q1", requirement_ids: ["r1", "r2"], category: "technical", prompt: "x", answer_outline: "y", difficulty: 1 },
  ];
  const { uncoveredMustHave } = checkCoverage(requirements, questions);
  expect(uncoveredMustHave).toHaveLength(0);
});

test("no questions at all -> everything is uncovered", () => {
  const { uncoveredMustHave } = checkCoverage(requirements, []);
  expect(uncoveredMustHave.map((r) => r.id)).toEqual(["r1", "r2"]);
});
