/**
 * runPipeline.js
 *
 * Section 9 requires the batch command to run "the same code your
 * application uses, not a parallel implementation." This file is that
 * shared code path. Once the API routes (kit creation) are built, they
 * will call this exact function too — not a copy of it.
 *
 * Sequencing (Section 3's "genuine sequencing" requirement):
 *   pasted JD needs no retrieval -> crawl only depends on companyUrl ->
 *   generation depends on BOTH (jd text + whatever crawling found).
 */

const { crawlSite } = require("../retrieval/crawlSite");
const { cleanText } = require("../retrieval/cleanText");
const { runGenerationPipeline } = require("../generation/runGenerationPipeline");

function guessCompanyName(companyUrl) {
  try {
    const host = new URL(companyUrl).hostname.replace(/^www\./, "");
    return host.split(".")[0];
  } catch {
    return "";
  }
}

/**
 * @param {{ jd: string, company_url: string, days: number }} caseInput
 * @returns {Promise<{ kit: object, validation: object, retrieval: { pagesUsed: string[], skipped: Array }, notes: string[] }>}
 */
async function runPipeline({ jd, company_url, days }) {
  // Retrieval — independent of the JD, so it happens first and its
  // failure doesn't block generation from at least using the JD text.
  const crawlResult = await crawlSite(company_url).catch((err) => ({
    pagesUsed: [],
    pages: [],
    skipped: [{ url: company_url, reason: `CRAWL_THREW: ${err.message}` }],
  }));

  const aboutPages = crawlResult.pages.filter((p) => p.kind === "home" || p.kind === "about");
  const hiringPages = crawlResult.pages.filter((p) => p.kind === "hiring");

  const aboutPagesText = aboutPages.map((p) => cleanText(p.html)).join("\n\n");
  const hiringProcessText = hiringPages.length > 0 ? hiringPages.map((p) => cleanText(p.html)).join("\n\n") : null;

  const generationResult = await runGenerationPipeline({
    jobDescriptionText: jd || "",
    companyName: guessCompanyName(company_url),
    companyUrl: company_url,
    aboutPagesText,
    hiringProcessText,
    pagesUsed: crawlResult.pagesUsed,
    daysRequested: days,
  });

  return {
    ...generationResult,
    retrieval: { pagesUsed: crawlResult.pagesUsed, skipped: crawlResult.skipped },
  };
}

module.exports = { runPipeline };
