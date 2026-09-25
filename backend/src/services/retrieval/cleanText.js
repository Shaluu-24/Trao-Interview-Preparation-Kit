const cheerio = require("cheerio");

/**
 * cleanText.js — turns raw HTML into plain text worth sending to an LLM.
 * Strips script/style/nav noise, collapses whitespace, and caps length so
 * we don't blow through free-tier token limits on one page.
 */
function cleanText(html, maxChars = 6000) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, maxChars);
}

module.exports = { cleanText };
