const express = require("express");
const cors = require("cors");
const path = require("path");
const { PORT } = require("./config");

// Importa rotas
const authRoutes        = require("./routes/auth");
const restaurantRoutes  = require("./routes/restaurant");
const ngoRoutes         = require("./routes/ngo");
const matchingRoutes    = require("./routes/matching");
const agreementRoutes   = require("./routes/agreements");
const messageRoutes     = require("./routes/messages");

const app = express();

// ─── Middlewares globais ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Frontend estático ────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// ─── Rotas API ────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/restaurant",  restaurantRoutes);
app.use("/api/ngo",         ngoRoutes);
app.use("/api",             matchingRoutes);
app.use("/api/agreements",  agreementRoutes);
app.use("/api/agreements/:id/messages", messageRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ ok: true, version: "2.0.0", timestamp: new Date().toISOString() });
});

// ─── SPA fallback — compatível com Express 4 e 5 ─────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Erro interno do servidor." });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌱 ReAlimenta rodando em http://localhost:${PORT}`);
});

module.exports = app;
