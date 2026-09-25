/**
 * crawlSite.js
 *
 * Orchestrates the pieces above into what Section 2 asks for:
 *   "Crawl the company site to find what they do and, if it exists,
 *    how they hire."
 *
 * Approach:
 *   1. Fetch the homepage.
 *   2. Extract + rank its links for hiring-related and about-related pages.
 *   3. Fetch robots.txt once, filter candidates against it.
 *   4. Fetch the top N candidates of each kind (rate-limited, retried).
 *   5. One level deep only — a hiring/about page often links further
 *      (e.g. a careers page linking to an "our interview process" post),
 *      so we repeat step 2-4 once on the pages we just found, but we do
 *      NOT recurse indefinitely. Keeps the batch command's 15-minute
 *      budget for 5 cases realistic (Section 9).
 *
 * Every fetch failure is recorded, never thrown — "skip and report a
 * source that cannot be retrieved, rather than failing the whole run."
 */

const { fetchPage } = require("./fetchPage");
const { extractRankedLinks } = require("./linkRanking");
const { getDisallowedPaths, isAllowed } = require("./robots");
const { withRetry, HostThrottle } = require("./rateLimit");

const MAX_CANDIDATES_PER_KIND = 2;
const throttle = new HostThrottle(400);

async function fetchWithManners(url) {
  const host = new URL(url).host;
  await throttle.wait(host);
  return withRetry(() => fetchPage(url));
}

/**
 * @param {string} companyUrl
 * @returns {Promise<{
 *   pagesUsed: string[],
 *   pages: Array<{ url: string, html: string, kind: 'home'|'hiring'|'about' }>,
 *   skipped: Array<{ url: string, reason: string }>
 * }>}
 */
async function crawlSite(companyUrl) {
  const pages = [];
  const skipped = [];

  let normalizedUrl;
  try {
    normalizedUrl = new URL(companyUrl).toString();
  } catch {
    return { pagesUsed: [], pages: [], skipped: [{ url: companyUrl, reason: "INVALID_URL" }] };
  }

  const origin = new URL(normalizedUrl).origin;
  const disallowedPaths = await getDisallowedPaths(origin).catch(() => []);

  const homeResult = await fetchWithManners(normalizedUrl);
  if (!homeResult.ok) {
    skipped.push({ url: normalizedUrl, reason: homeResult.reason });
    return { pagesUsed: [], pages: [], skipped };
  }
  pages.push({ url: homeResult.finalUrl, html: homeResult.html, kind: "home" });

  const { hiringCandidates, aboutCandidates } = extractRankedLinks(homeResult.html, homeResult.finalUrl);

  const topCandidates = [
    ...hiringCandidates.slice(0, MAX_CANDIDATES_PER_KIND).map((c) => ({ ...c, kind: "hiring" })),
    ...aboutCandidates.slice(0, MAX_CANDIDATES_PER_KIND).map((c) => ({ ...c, kind: "about" })),
  ];

  for (const candidate of topCandidates) {
    const path = new URL(candidate.url).pathname;
    if (!isAllowed(path, disallowedPaths)) {
      skipped.push({ url: candidate.url, reason: "ROBOTS_DISALLOWED" });
      continue;
    }
    const result = await fetchWithManners(candidate.url);
    if (!result.ok) {
      skipped.push({ url: candidate.url, reason: result.reason });
      continue;
    }
    pages.push({ url: result.finalUrl, html: result.html, kind: candidate.kind });
  }

  // One extra hop: if we found a real hiring page, its own links (e.g. an
  // "our interview process" sub-page) are worth one more ranked look.
  const hiringPage = pages.find((p) => p.kind === "hiring");
  if (hiringPage) {
    const { hiringCandidates: deeper } = extractRankedLinks(hiringPage.html, hiringPage.url);
    const alreadyFetched = new Set(pages.map((p) => p.url));
    const nextCandidate = deeper.find((c) => !alreadyFetched.has(c.url));
    if (nextCandidate) {
      const path = new URL(nextCandidate.url).pathname;
      if (isAllowed(path, disallowedPaths)) {
        const result = await fetchWithManners(nextCandidate.url);
        if (result.ok) {
          pages.push({ url: result.finalUrl, html: result.html, kind: "hiring" });
        } else {
          skipped.push({ url: nextCandidate.url, reason: result.reason });
        }
      }
    }
  }

  return { pagesUsed: pages.map((p) => p.url), pages, skipped };
}

module.exports = { crawlSite };
