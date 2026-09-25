#!/usr/bin/env node
/**
 * evaluate.js — the mandatory batch entry point (Section 9).
 *
 * Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
 *
 * Requirements from Section 9, and where each is satisfied:
 *   - "Runs your full retrieval, generation and validation path... the
 *      same code your application uses" -> calls runPipeline(), the exact
 *      function the API will call too.
 *   - "Continues after one case fails, recording the failure rather than
 *      aborting the run" -> each case is wrapped in try/catch; a thrown
 *      error becomes a { status: "failed" } entry, the loop moves on.
 *   - "Uses the days value given for each case" -> passed straight through
 *      to runPipeline.
 *   - "Writes a single JSON file in the shape given in Appendix B" -> see
 *      writeOutput() below.
 *   - "Reads credentials from environment variables... needs no setup
 *      beyond your documented install step" -> dotenv loads .env, which
 *      README.md documents.
 *   - retrieval "must not assume a particular host" -> crawlSite/fetchPage
 *      take whatever URL they're given, including http://localhost:PORT/.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { runPipeline } = require("../services/pipeline/runPipeline");

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") args.input = argv[i + 1];
    if (argv[i] === "--output") args.output = argv[i + 1];
  }
  return args;
}

function classifyError(err) {
  const message = err && err.message ? err.message : String(err);
  if (/unreachable|ENOTFOUND|ECONNREFUSED|TIMEOUT/i.test(message)) {
    return { code: "COMPANY_UNREACHABLE", message };
  }
  if (/invalid.*url/i.test(message)) {
    return { code: "INVALID_COMPANY_URL", message };
  }
  return { code: "PIPELINE_ERROR", message };
}

async function runCase(caseInput) {
  const { id, jd, company_url, days } = caseInput;
  try {
    const result = await runPipeline({ jd, company_url, days });
    if (!result.validation.valid) {
      return {
        id,
        status: "failed",
        kit: null,
        error: {
          code: "KIT_VALIDATION_FAILED",
          message: result.validation.errors.map((e) => `${e.path}: ${e.message}`).join("; "),
        },
      };
    }
    return { id, status: "ok", kit: result.kit, error: null };
  } catch (err) {
    return { id, status: "failed", kit: null, error: classifyError(err) };
  }
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));
  if (!input || !output) {
    console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
    process.exit(1);
  }

  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);

  let cases;
  try {
    cases = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  } catch (err) {
    console.error(`Could not read/parse input file at ${inputPath}: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(cases)) {
    console.error("Input file must be a JSON array of cases (see Appendix B).");
    process.exit(1);
  }

  const kits = [];
  for (const caseInput of cases) {
    console.log(`Running case ${caseInput.id}...`);
    const result = await runCase(caseInput);
    console.log(`  -> ${result.status}`);
    kits.push(result);
  }

  const outputDoc = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  };

  fs.writeFileSync(outputPath, JSON.stringify(outputDoc, null, 2), "utf-8");
  console.log(`Wrote ${kits.length} result(s) to ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error in batch run:", err);
  process.exit(1);
});
