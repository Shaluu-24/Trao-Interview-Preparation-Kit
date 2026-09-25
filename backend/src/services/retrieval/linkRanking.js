/**
 * linkRanking.js
 *
 * Ranks same-origin company links for hiring, interview-process,
 * careers, jobs, company and about-page research.
 */

const cheerio = require("cheerio");

const HIRING_KEYWORDS = [
  "career",
  "careers",
  "jobs",
  "job",
  "hiring",
  "hire",
  "join us",
  "join our team",
  "we're hiring",
  "open roles",
  "open positions",
  "work with us",
  "life at",
  "team",
  "culture",
  "how we hire",
  "how we interview",
  "interview",
  "interview process",
  "interviewing",
  "our process",
  "hiring process",
  "recruitment",
  "recruiting",
  "apply",
];

const ABOUT_KEYWORDS = [
  "about",
  "about us",
  "who we are",
  "our story",
  "company",
  "mission",
];

function score(text, href, keywords) {
  const anchor = String(text || "").toLowerCase();
  const url = String(href || "").toLowerCase();

  let total = 0;

  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();

    // Strong signal when the keyword appears in the URL.
    if (url.includes(kw)) {
      total += 2;
    }

    // Additional signal from visible anchor text.
    if (anchor.includes(kw)) {
      total += 1;
    }
  }

  return total;
}

function extractRankedLinks(html, baseUrl) {
  const $ = cheerio.load(html);

  const seen = new Set();
  const hiringCandidates = [];
  const aboutCandidates = [];

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href");
    const text = $(el).text().trim();

    if (
      !rawHref ||
      rawHref.startsWith("#") ||
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:")
    ) {
      return;
    }

    let resolved;

    try {
      resolved = new URL(rawHref, baseUrl).toString();
    } catch {
      return;
    }

    // Only follow links belonging to the same company website.
    try {
      const resolvedUrl = new URL(resolved);
      const base = new URL(baseUrl);

      if (resolvedUrl.origin !== base.origin) {
        return;
      }
    } catch {
      return;
    }

    if (seen.has(resolved)) {
      return;
    }

    seen.add(resolved);

    const hiringScore = score(
      text,
      resolved,
      HIRING_KEYWORDS
    );

    const aboutScore = score(
      text,
      resolved,
      ABOUT_KEYWORDS
    );

    if (hiringScore > 0) {
      hiringCandidates.push({
        url: resolved,
        text,
        score: hiringScore,
      });
    }

    if (aboutScore > 0) {
      aboutCandidates.push({
        url: resolved,
        text,
        score: aboutScore,
      });
    }
  });

  hiringCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.url.localeCompare(b.url);
  });

  aboutCandidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.url.localeCompare(b.url);
  });

  return {
    hiringCandidates,
    aboutCandidates,
  };
}

module.exports = {
  extractRankedLinks,
  HIRING_KEYWORDS,
  ABOUT_KEYWORDS,
};