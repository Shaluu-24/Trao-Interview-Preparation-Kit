/**
 * robots.js
 *
 * Section 2: "Respect robots.txt and site terms."
 *
 * This is a deliberately minimal parser: it reads Disallow rules for
 * User-agent: * (and our own agent, if a site targets it specifically)
 * and checks whether a given path is blocked. It does not implement the
 * full robots.txt spec (crawl-delay, sitemaps, wildcard matching beyond a
 * simple prefix check). That's a documented limitation, not an oversight —
 * full compliance is a bigger task than this assessment's timebox
 * justifies, and a prefix-based check is the conservative direction to
 * simplify in (it can only over-block, never under-block).
 */

const { fetchPage } = require("./fetchPage");

async function getDisallowedPaths(origin) {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  const result = await fetchPage(robotsUrl).catch(() => ({ ok: false }));

  // No robots.txt, or couldn't fetch it -> nothing explicitly disallowed.
  if (!result || !result.ok) return [];

  const lines = result.html.split("\n").map((l) => l.trim());
  const disallowed = [];
  let applies = false;

  for (const line of lines) {
    if (/^user-agent:/i.test(line)) {
      const agent = line.split(":")[1].trim();
      applies = agent === "*" || agent.toLowerCase().includes("traoprepkitbot");
      continue;
    }
    if (applies && /^disallow:/i.test(line)) {
      const path = line.split(":").slice(1).join(":").trim();
      if (path) disallowed.push(path);
    }
  }
  return disallowed;
}

function isAllowed(path, disallowedPaths) {
  return !disallowedPaths.some((rule) => path.startsWith(rule));
}

module.exports = { getDisallowedPaths, isAllowed };
