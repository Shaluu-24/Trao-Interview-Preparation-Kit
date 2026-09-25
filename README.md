# AI Interview Prep Kit — Trao Assessment

## Status (work in progress)

Built so far:
- `backend/src/schema/kitSchema.js` — Zod schema matching Appendix A exactly
- `backend/src/schema/validateKit.js` — structural + referential validation
  (checks ids are unique, schedule question_ids point at real questions,
  question/flashcard requirement_ids point at real requirements)
- `backend/src/schema/validateKit.test.js` — unit tests for the above

Not yet built: auth, crawler/retrieval, generation pipeline, coverage loop,
scheduler, batch command logic, Next.js frontend, deployment.

## Why start here

Everything downstream — generation, the batch command, the builder UI —
depends on agreeing what a "kit" is. Building the schema and its validator
first means every later piece can call `validateKit()` instead of trusting
raw LLM output, which is required by Section 13 ("validate a generated kit
against the expected structure before saving it") and helps with Section 10's
edge case "the model returns invalid JSON or an incomplete kit."

## Run the tests

```
cd backend
npm install
npm test
```

## Next steps

1. Auth (register/login/session, Section 1)
2. Crawler — find + rank hiring-related links on a company site (Section 2)
3. Generation pipeline — requirement extraction, per-category question
   generation, coverage check + second pass (Sections 3–4)
4. Scheduler — deterministic day allocation (Section 8)
5. Wire `npm run evaluate` to the real pipeline (Section 9)
6. Next.js builder UI + practice mode (Sections 6–7, 12)

## Update: generation pipeline + scheduler + batch command (real, not stub)

Added:
- `services/generation/llmClient.js` — provider-agnostic (OpenAI-compatible
  `/chat/completions`), handles rate limits with backoff and one JSON-repair
  retry
- `services/generation/extractRequirements.js`
- `services/generation/generateCompanyBrief.js`
- `services/generation/generateQuestions.js` — one call per requirement
- `services/generation/checkCoverage.js` — pure, deterministic
- `services/generation/deriveFlashcards.js` — deterministic from questions
  (design decision: see comment in file)
- `services/generation/runGenerationPipeline.js` — orchestrates all of the
  above, implements the second-pass coverage loop (max 2 passes — see
  comment for reasoning)
- `services/schedule/buildSchedule.js` — deterministic day allocation
- `services/pipeline/runPipeline.js` — the ONE function tying crawl +
  generation together; batch command below calls this, and the API will
  too, once it exists
- `src/batch/evaluate.js` — now a real implementation of Section 9 /
  Appendix B, not a stub

## Still not built

- Kit API routes (create/list/get, wired to runPipeline + MongoDB persistence)
- Builder UI edit/reorder/regenerate state model (Section 6 — the hardest
  problem in the brief)
- Practice mode
- Next.js frontend entirely
- Deployment

## .env you'll need to fill in for generation/batch to actually run

```
LLM_API_BASE_URL=   # e.g. https://api.groq.com/openai/v1
LLM_API_KEY=
LLM_MODEL=           # e.g. llama-3.1-8b-instant
```
