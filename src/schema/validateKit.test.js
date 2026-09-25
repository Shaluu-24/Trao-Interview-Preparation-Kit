const { validateKit } = require("./validateKit");

// A minimal but fully-valid kit, matching Appendix A exactly.
// Used as the baseline in every test below — each test mutates a copy.
function makeValidKit() {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.example.com",
      role: "Backend Engineer",
      location: "Remote",
      jd_chars: 500,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.example.com/careers"],
    },
    company_brief: {
      summary: "Acme builds widgets.",
      what_they_do: "Widget manufacturing SaaS.",
      sources: ["https://acme.example.com/about"],
    },
    role: {
      title: "Backend Engineer",
      seniority: "mid",
      responsibilities: ["Build APIs"],
      requirements: [
        { id: "r1", text: "3+ years Node.js", kind: "technical", priority: "must" },
      ],
    },
    questions: [
      {
        id: "q1",
        requirement_ids: ["r1"],
        category: "technical",
        prompt: "Explain the Node.js event loop.",
        answer_outline: "Single-threaded, non-blocking I/O...",
        difficulty: 2,
      },
    ],
    flashcards: [
      { id: "f1", front: "What is the event loop?", back: "...", requirement_ids: ["r1"] },
    ],
    schedule: {
      days_available: 1,
      days: [{ day: 1, focus: "Node fundamentals", question_ids: ["q1"], minutes: 60 }],
    },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

test("a well-formed kit passes validation", () => {
  const result = validateKit(makeValidKit());
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);
});

test("rejects a schedule day that references a question id that doesn't exist", () => {
  const kit = makeValidKit();
  kit.schedule.days[0].question_ids.push("q-does-not-exist");
  const result = validateKit(kit);
  expect(result.valid).toBe(false);
  expect(result.errors.some((e) => e.message.includes("q-does-not-exist"))).toBe(true);
});

test("rejects a question that references an unknown requirement id", () => {
  const kit = makeValidKit();
  kit.questions[0].requirement_ids.push("r-ghost");
  const result = validateKit(kit);
  expect(result.valid).toBe(false);
});

test("rejects a non-integer minutes value", () => {
  const kit = makeValidKit();
  kit.schedule.days[0].minutes = 45.5;
  const result = validateKit(kit);
  expect(result.valid).toBe(false);
});

test("rejects duplicate requirement ids", () => {
  const kit = makeValidKit();
  kit.role.requirements.push({ id: "r1", text: "duplicate", kind: "technical", priority: "nice" });
  const result = validateKit(kit);
  expect(result.valid).toBe(false);
  expect(result.errors.some((e) => e.message.includes("duplicate"))).toBe(true);
});

test("flags uncovered must-have requirements as a warning, not a hard failure", () => {
  const kit = makeValidKit();
  kit.role.requirements.push({ id: "r2", text: "Must know Kubernetes", kind: "technical", priority: "must" });
  const result = validateKit(kit);
  expect(result.valid).toBe(true); // still structurally valid
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.warnings[0]).toContain("r2");
});

test("rejects an invalid category enum value", () => {
  const kit = makeValidKit();
  kit.questions[0].category = "trivia"; // not one of the four allowed categories
  const result = validateKit(kit);
  expect(result.valid).toBe(false);
});
