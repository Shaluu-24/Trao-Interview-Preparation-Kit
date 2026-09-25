const { extractRankedLinks } = require("./linkRanking");

const sampleHtml = `
<html><body>
  <nav>
    <a href="/">Home</a>
    <a href="/product">Product</a>
    <a href="/company/open-roles">Join our team</a>
    <a href="/blog/how-we-interview-engineers">Engineering Blog</a>
    <a href="/about-us">About Us</a>
    <a href="https://other-site.example.com/careers">External careers page</a>
  </nav>
</body></html>
`;

test("ranks an unconventionally-pathed hiring link above unrelated links", () => {
  const { hiringCandidates } = extractRankedLinks(sampleHtml, "https://acme.example.com");
  const urls = hiringCandidates.map((c) => c.url);
  expect(urls).toContain("https://acme.example.com/company/open-roles");
  expect(urls).toContain("https://acme.example.com/blog/how-we-interview-engineers");
  // Should NOT include the plain product page — no hiring signal there.
  expect(urls).not.toContain("https://acme.example.com/product");
});

test("ranks the about page separately from hiring candidates", () => {
  const { aboutCandidates } = extractRankedLinks(sampleHtml, "https://acme.example.com");
  expect(aboutCandidates.map((c) => c.url)).toContain("https://acme.example.com/about-us");
});

test("ignores links to a different origin", () => {
  const { hiringCandidates } = extractRankedLinks(sampleHtml, "https://acme.example.com");
  expect(hiringCandidates.some((c) => c.url.includes("other-site.example.com"))).toBe(false);
});

test("a link whose URL path has no keyword but whose anchor text does still scores", () => {
  const html = `<a href="/p/2024/09/updates">We're hiring engineers</a>`;
  const { hiringCandidates } = extractRankedLinks(html, "https://acme.example.com");
  expect(hiringCandidates.length).toBe(1);
});
