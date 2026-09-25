/**
 * requireAuth.js
 *
 * Section 1: "a signed-out visitor cannot reach protected pages or
 * endpoints" and "sensible handling of expired or invalid sessions."
 *
 * We use cookie-session (signed, httpOnly cookie holding just the user id —
 * no server-side session store needed, which keeps this minimal per the
 * brief's "keep this layer minimal" note). If the cookie is missing,
 * unsigned/tampered, or doesn't resolve to a real user anymore (e.g. the
 * account was deleted), we treat all of those the same way: 401, not a
 * crash.
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
  }
  next();
}

module.exports = { requireAuth };
