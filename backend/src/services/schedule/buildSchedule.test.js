const { buildSchedule } = require("./buildSchedule");

const requirements = [
  { id: "r1", text: "React", kind: "technical", priority: "must" },
  { id: "r2", text: "Docker (nice)", kind: "technical", priority: "nice" },
];

function q(id, reqId, difficulty) {
  return { id, requirement_ids: [reqId], category: "technical", prompt: "x", answer_outline: "y", difficulty };
}

test("days_available and days.length always equal the days requested", () => {
  const questions = [q("q1", "r1", 1), q("q2", "r1", 2), q("q3", "r2", 3)];
  const { days_available, days } = buildSchedule(requirements, questions, 5);
  expect(days_available).toBe(5);
  expect(days).toHaveLength(5);
});

test("handles a 1-day request", () => {
  const questions = [q("q1", "r1", 1), q("q2", "r1", 2)];
  const { days } = buildSchedule(requirements, questions, 1);
  expect(days).toHaveLength(1);
  expect(days[0].question_ids.sort()).toEqual(["q1", "q2"]);
});

test("handles a request for more days than there are questions (Section 10 edge case)", () => {
  const questions = [q("q1", "r1", 1)];
  const { days } = buildSchedule(requirements, questions, 3);
  expect(days).toHaveLength(3);
  // days with no questions still get an honest label and non-zero minutes,
  // never fabricated content
  const empty = days.filter((d) => d.question_ids.length === 0);
  expect(empty.every((d) => d.focus === "Review / buffer" && d.minutes > 0)).toBe(true);
});

test("every requirement's must-have question ends up scheduled somewhere", () => {
  const questions = [q("q1", "r1", 1), q("q2", "r2", 3)];
  const { days } = buildSchedule(requirements, questions, 2);
  const allScheduledIds = days.flatMap((d) => d.question_ids);
  expect(allScheduledIds).toContain("q1"); // linked to the must-have requirement
});

test("a must-have-linked question is prioritized onto day 1 over a higher-difficulty nice-to-have one", () => {
  const questions = [q("q-nice", "r2", 3), q("q-must", "r1", 1)];
  const { days } = buildSchedule(requirements, questions, 2);
  // must-have (even though lower difficulty) should be scored first and
  // land in the first round-robin bucket, i.e. day 1
  expect(days[0].question_ids).toContain("q-must");
});

test("all minutes values are positive integers", () => {
  const questions = [q("q1", "r1", 1), q("q2", "r1", 2), q("q3", "r2", 3)];
  const { days } = buildSchedule(requirements, questions, 2);
  days.forEach((d) => {
    expect(Number.isInteger(d.minutes)).toBe(true);
    expect(d.minutes).toBeGreaterThan(0);
  });
});
