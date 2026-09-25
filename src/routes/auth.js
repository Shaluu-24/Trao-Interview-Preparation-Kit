const express = require("express");
const { z } = require("zod");
const User = require("../models/User");

const router = express.Router();

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }
  const { email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    // Deliberately vague — don't confirm which emails are registered.
    return res.status(409).json({ error: { code: "EMAIL_IN_USE", message: "Could not register with that email." } });
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash });

  req.session.userId = user._id.toString();
  res.status(201).json({ id: user._id, email: user.email });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0].message } });
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  // Same error for "no such user" and "wrong password" — don't leak which.
  const genericError = { error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } };

  if (!user) return res.status(401).json(genericError);

  const ok = await user.checkPassword(password);
  if (!ok) return res.status(401).json(genericError);

  req.session.userId = user._id.toString();
  res.json({ id: user._id, email: user.email });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session = null;
  res.status(204).end();
});

// GET /api/auth/me — lets the frontend check session validity cheaply
router.get("/me", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Not signed in." } });
  }
  res.json({ userId: req.session.userId });
});

module.exports = router;
