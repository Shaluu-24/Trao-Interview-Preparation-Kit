const cheerio = require("cheerio");

const MAX_HTML_SIZE = 1_500_000;
const REQUEST_TIMEOUT_MS = 8000;

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost/private/local addresses.
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      return false;
    }

    // Block common private 172.16.0.0/12 range.
    if (hostname.startsWith("172.")) {
      const second = Number(hostname.split(".")[1]);

      if (second >= 16 && second <= 31) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  const url = new URL(value);

  url.hash = "";

  return url.toString();
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, maxLength = 500) {
  const text = cleanText(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function getAbsoluteUrl(baseUrl, href) {
  if (!href || typeof href !== "string") {
    return null;
  }

  try {
    const url = new URL(href, baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

async function fetchPage(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "TraoPrepKit/1.0 (+https://traoprepkit.local)",
        Accept:
          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: `Website returned HTTP ${response.status}.`,
      };
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) {
      return {
        ok: false,
        reason: "Company URL did not return an HTML page.",
      };
    }

    const contentLength = response.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) > MAX_HTML_SIZE
    ) {
      return {
        ok: false,
        reason: "Company page is too large to process.",
      };
    }

    const html = await response.text();

    if (Buffer.byteLength(html, "utf8") > MAX_HTML_SIZE) {
      return {
        ok: false,
        reason: "Company page is too large to process.",
      };
    }

    return {
      ok: true,
      html,
      finalUrl: response.url || url,
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        ok: false,
        reason: "Company website request timed out.",
      };
    }

    return {
      ok: false,
      reason: `Unable to fetch company website: ${error.message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractPageData(html, pageUrl) {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg").remove();

  const title = cleanText($("title").first().text());

  const description = cleanText(
    $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      ""
  );

  const headings = [];

  $("h1, h2, h3").each((_, element) => {
    const text = cleanText($(element).text());

    if (
      text &&
      text.length >= 3 &&
      !headings.some(
        (existing) =>
          existing.toLowerCase() === text.toLowerCase()
      )
    ) {
      headings.push(text);
    }
  });

  const bodyText = cleanText($("body").text());

  const links = [];

  $("a[href]").each((_, element) => {
    const text = cleanText($(element).text());
    const href = $(element).attr("href");

    const absoluteUrl = getAbsoluteUrl(pageUrl, href);

    if (!absoluteUrl) {
      return;
    }

    links.push({
      text,
      url: absoluteUrl,
    });
  });

  return {
    title,
    description,
    headings: headings.slice(0, 30),
    bodyText: truncate(bodyText, 5000),
    links: links.slice(0, 100),
  };
}

function findInterestingLinks(pageData, baseUrl) {
  const base = new URL(baseUrl);

  const keywords = [
    "about",
    "company",
    "product",
    "products",
    "solutions",
    "services",
    "career",
    "careers",
    "jobs",
    "hiring",
  ];

  const selected = [];

  for (const link of pageData.links) {
    const text = `${link.text} ${link.url}`.toLowerCase();

    if (!keywords.some((keyword) => text.includes(keyword))) {
      continue;
    }

    try {
      const url = new URL(link.url);

      if (url.hostname !== base.hostname) {
        continue;
      }
    } catch {
      continue;
    }

    if (!selected.some((item) => item.url === link.url)) {
      selected.push(link);
    }

    if (selected.length >= 6) {
      break;
    }
  }

  return selected;
}

function extractSignals(pageData) {
  const combined = [
    pageData.title,
    pageData.description,
    ...pageData.headings,
    pageData.bodyText,
  ]
    .join(" ")
    .toLowerCase();

  const signals = [];

  const signalPatterns = [
    {
      pattern: /\bcareers?\b|\bjobs?\b|\bhiring\b/i,
      label: "Career or hiring information appears on the website.",
    },
    {
      pattern: /\bproduct(s)?\b|\bplatform\b/i,
      label: "Product or platform information appears on the website.",
    },
    {
      pattern: /\bservices?\b|\bsolutions?\b/i,
      label: "Services or solutions information appears on the website.",
    },
    {
      pattern: /\babout us\b|\babout the company\b/i,
      label: "Company/about information appears on the website.",
    },
  ];

  for (const item of signalPatterns) {
    if (item.pattern.test(combined)) {
      signals.push(item.label);
    }
  }

  return signals;
}

function extractProducts(pageData) {
  const products = [];

  const productWords = [
    "product",
    "products",
    "platform",
    "solution",
    "solutions",
    "services",
  ];

  for (const heading of pageData.headings) {
    const lower = heading.toLowerCase();

    if (
      productWords.some((word) => lower.includes(word)) &&
      !products.some(
        (item) => item.toLowerCase() === heading.toLowerCase()
      )
    ) {
      products.push(heading);
    }
  }

  return products.slice(0, 10);
}

async function researchCompany(companyUrl) {
  if (!companyUrl || typeof companyUrl !== "string") {
    return {
      ok: false,
      reason: "Company URL is required.",
      company_brief: createEmptyBrief(),
    };
  }

  if (!isValidHttpUrl(companyUrl)) {
    return {
      ok: false,
      reason: "Company URL is invalid or not allowed.",
      company_brief: createEmptyBrief(),
    };
  }

  const normalizedUrl = normalizeUrl(companyUrl);

  const homeResult = await fetchPage(normalizedUrl);

  if (!homeResult.ok) {
    return {
      ok: false,
      reason: homeResult.reason,
      company_brief: createEmptyBrief(),
    };
  }

  const homeData = extractPageData(
    homeResult.html,
    homeResult.finalUrl
  );

  const interestingLinks = findInterestingLinks(
    homeData,
    homeResult.finalUrl
  );

  const additionalPages = [];

  for (const link of interestingLinks.slice(0, 4)) {
    const result = await fetchPage(link.url);

    if (!result.ok) {
      continue;
    }

    const data = extractPageData(
      result.html,
      result.finalUrl
    );

    additionalPages.push({
      url: result.finalUrl,
      data,
    });
  }

  const allHeadings = [
    ...homeData.headings,
    ...additionalPages.flatMap(
      (page) => page.data.headings
    ),
  ];

  const allDescriptions = [
    homeData.description,
    ...additionalPages.map(
      (page) => page.data.description
    ),
  ].filter(Boolean);

  const combinedPageData = {
    ...homeData,
    headings: [...new Set(allHeadings)],
    description:
      allDescriptions[0] || homeData.description,
  };

  const companyName =
    homeData.title
      ?.split("|")[0]
      ?.split("-")[0]
      ?.trim() || "Company";

  const summary =
    homeData.description ||
    truncate(homeData.bodyText, 600) ||
    "Company information was found, but no clear summary was available.";

  const sources = [
    {
      title: homeData.title || "Company website",
      url: homeResult.finalUrl,
    },
  ];

  for (const page of additionalPages) {
    sources.push({
      title:
        page.data.title ||
        page.data.headings[0] ||
        "Company page",
      url: page.url,
    });
  }

  const uniqueSources = sources.filter(
    (source, index, array) =>
      array.findIndex(
        (item) => item.url === source.url
      ) === index
  );

  return {
    ok: true,
    reason: null,
    company_brief: {
      name: companyName,
      summary,
      products: extractProducts(combinedPageData),
      hiring_signals: extractSignals(combinedPageData),
      sources: uniqueSources.slice(0, 10),
    },
  };
}

function createEmptyBrief() {
  return {
    name: "",
    summary:
      "Company research could not be retrieved. No company facts were invented.",
    products: [],
    hiring_signals: [],
    sources: [],
  };
}

module.exports = {
  researchCompany,
  isValidHttpUrl,
};