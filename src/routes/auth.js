const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config");

const router = express.Router();

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Body: { email, password, tipo: "restaurante" | "ong" }
router.post("/register", (req, res) => {
  const { email, password, tipo } = req.body || {};

  if (!email || !password || !tipo) {
    return res.status(400).json({ message: "email, password e tipo são obrigatórios." });
  }

  if (!["restaurante", "ong"].includes(tipo)) {
    return res.status(400).json({ message: 'tipo deve ser "restaurante" ou "ong".' });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "A senha deve ter ao menos 6 caracteres." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ message: "Este e-mail já está cadastrado." });
  }

  const hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare("INSERT INTO users (email, password, tipo) VALUES (?, ?, ?)")
    .run(email, hash, tipo);

  const userId = result.lastInsertRowid;
  const token = jwt.sign({ id: userId, email, tipo }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.status(201).json({
    message: "Conta criada com sucesso.",
    token,
    user: { id: userId, email, tipo }
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Body: { email, password }
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "email e password são obrigatórios." });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "E-mail ou senha incorretos." });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, tipo: user.tipo },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    token,
    user: { id: user.id, email: user.email, tipo: user.tipo }
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Retorna os dados do usuário logado (requer Bearer token)
router.get("/me", (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Token não fornecido." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare("SELECT id, email, tipo, created_at FROM users WHERE id = ?")
      .get(payload.id);

    if (!user) return res.status(404).json({ message: "Usuário não encontrado." });

    return res.json({ user });
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
});

module.exports = router;
