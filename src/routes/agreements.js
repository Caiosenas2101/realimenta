const express = require("express");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { FOOD_TYPES, VOLUME_OPTIONS, DAYS_OPTIONS } = require("../config");

const router = express.Router();

router.use(authenticate);

function parseJsonField(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function formatAgreement(a) {
  return { ...a, dias: parseJsonField(a.dias) };
}

// ─── POST /api/agreements ─────────────────────────────────────────────────────
// Propõe um acordo.
// Restaurante propõe para uma ONG: body inclui ngo_id
// ONG propõe para um restaurante: body inclui restaurant_id
router.post("/", (req, res) => {
  const { ngo_id, restaurant_id, dias, horario, volume, food_type } = req.body || {};

  if (!dias || !horario || !volume || !food_type) {
    return res.status(400).json({ message: "dias, horario, volume e food_type são obrigatórios." });
  }

  if (!Array.isArray(dias) || dias.length === 0) {
    return res.status(400).json({ message: "dias deve ser um array não vazio." });
  }

  const invalidDias = dias.filter(d => !DAYS_OPTIONS.includes(d));
  if (invalidDias.length) {
    return res.status(400).json({ message: `Dias inválidos: ${invalidDias.join(", ")}` });
  }

  if (!FOOD_TYPES.includes(food_type)) {
    return res.status(400).json({ message: `Tipo de alimento inválido: ${food_type}` });
  }

  let rid, nid, iniciado_por;

  if (req.user.tipo === "restaurante") {
    if (!ngo_id) return res.status(400).json({ message: "ngo_id é obrigatório." });
    const rp = db.prepare("SELECT id FROM restaurants WHERE user_id = ?").get(req.user.id);
    if (!rp) return res.status(400).json({ message: "Complete seu perfil antes de propor um acordo." });
    const ngo = db.prepare("SELECT id FROM ngos WHERE id = ?").get(ngo_id);
    if (!ngo) return res.status(404).json({ message: "ONG não encontrada." });
    rid = rp.id;
    nid = ngo_id;
    iniciado_por = "restaurante";
  } else {
    if (!restaurant_id) return res.status(400).json({ message: "restaurant_id é obrigatório." });
    const np = db.prepare("SELECT id FROM ngos WHERE user_id = ?").get(req.user.id);
    if (!np) return res.status(400).json({ message: "Complete seu perfil antes de propor um acordo." });
    const restaurant = db.prepare("SELECT id FROM restaurants WHERE id = ?").get(restaurant_id);
    if (!restaurant) return res.status(404).json({ message: "Restaurante não encontrado." });
    rid = restaurant_id;
    nid = np.id;
    iniciado_por = "ong";
  }

  // Verifica acordo duplicado pendente/ativo
  const existing = db.prepare(`
    SELECT id FROM agreements
    WHERE restaurant_id = ? AND ngo_id = ? AND status IN ('pendente', 'ativo')
  `).get(rid, nid);

  if (existing) {
    return res.status(409).json({
      message: "Já existe um acordo ativo ou pendente entre estes parceiros.",
      agreement_id: existing.id
    });
  }

  const result = db.prepare(`
    INSERT INTO agreements (restaurant_id, ngo_id, dias, horario, volume, food_type, iniciado_por)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(rid, nid, JSON.stringify(dias), horario, volume, food_type, iniciado_por);

  const agreement = db
    .prepare("SELECT * FROM agreements WHERE id = ?")
    .get(result.lastInsertRowid);

  return res.status(201).json({ agreement: formatAgreement(agreement) });
});

// ─── GET /api/agreements ──────────────────────────────────────────────────────
// Lista todos os acordos do usuário logado (qualquer tipo).
router.get("/", (req, res) => {
  let agreements;

  if (req.user.tipo === "restaurante") {
    const rp = db.prepare("SELECT id FROM restaurants WHERE user_id = ?").get(req.user.id);
    if (!rp) return res.json({ agreements: [] });

    agreements = db.prepare(`
      SELECT a.*, n.nome AS ngo_nome, n.bairro AS ngo_bairro
      FROM agreements a
      JOIN ngos n ON n.id = a.ngo_id
      WHERE a.restaurant_id = ?
      ORDER BY a.updated_at DESC
    `).all(rp.id);
  } else {
    const np = db.prepare("SELECT id FROM ngos WHERE user_id = ?").get(req.user.id);
    if (!np) return res.json({ agreements: [] });

    agreements = db.prepare(`
      SELECT a.*, r.nome AS restaurant_nome, r.bairro AS restaurant_bairro
      FROM agreements a
      JOIN restaurants r ON r.id = a.restaurant_id
      WHERE a.ngo_id = ?
      ORDER BY a.updated_at DESC
    `).all(np.id);
  }

  return res.json({ agreements: agreements.map(formatAgreement) });
});

// ─── GET /api/agreements/:id ──────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const a = db.prepare(`
    SELECT a.*,
      r.nome AS restaurant_nome, r.bairro AS restaurant_bairro, r.user_id AS restaurant_user_id,
      n.nome AS ngo_nome, n.bairro AS ngo_bairro, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!a) return res.status(404).json({ message: "Acordo não encontrado." });

  // Verifica se o usuário é parte do acordo
  const isRestaurant = req.user.tipo === "restaurante" && a.restaurant_user_id === req.user.id;
  const isNgo = req.user.tipo === "ong" && a.ngo_user_id === req.user.id;

  if (!isRestaurant && !isNgo) {
    return res.status(403).json({ message: "Acesso negado a este acordo." });
  }

  return res.json({ agreement: formatAgreement(a) });
});

// ─── PATCH /api/agreements/:id/accept ────────────────────────────────────────
// Quem recebeu a proposta aceita o acordo.
router.patch("/:id/accept", (req, res) => {
  const a = db.prepare(`
    SELECT a.*, r.user_id AS restaurant_user_id, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!a) return res.status(404).json({ message: "Acordo não encontrado." });
  if (a.status !== "pendente") {
    return res.status(409).json({ message: `Acordo já está "${a.status}".` });
  }

  // Só quem recebeu a proposta pode aceitar
  const isRestaurant = req.user.tipo === "restaurante" && a.restaurant_user_id === req.user.id;
  const isNgo        = req.user.tipo === "ong"         && a.ngo_user_id         === req.user.id;
  const receivedProposal =
    (isRestaurant && a.iniciado_por === "ong") ||
    (isNgo        && a.iniciado_por === "restaurante");

  if (!receivedProposal) {
    return res.status(403).json({ message: "Apenas quem recebeu a proposta pode aceitá-la." });
  }

  db.prepare(`
    UPDATE agreements SET status = 'ativo', updated_at = datetime('now') WHERE id = ?
  `).run(a.id);

  const updated = db.prepare("SELECT * FROM agreements WHERE id = ?").get(a.id);
  return res.json({ message: "Acordo aceito!", agreement: formatAgreement(updated) });
});

// ─── PATCH /api/agreements/:id/reject ────────────────────────────────────────
router.patch("/:id/reject", (req, res) => {
  const a = db.prepare(`
    SELECT a.*, r.user_id AS restaurant_user_id, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!a) return res.status(404).json({ message: "Acordo não encontrado." });
  if (a.status !== "pendente") {
    return res.status(409).json({ message: `Acordo já está "${a.status}".` });
  }

  const isRestaurant = req.user.tipo === "restaurante" && a.restaurant_user_id === req.user.id;
  const isNgo        = req.user.tipo === "ong"         && a.ngo_user_id         === req.user.id;

  if (!isRestaurant && !isNgo) {
    return res.status(403).json({ message: "Acesso negado." });
  }

  db.prepare(`
    UPDATE agreements SET status = 'recusado', updated_at = datetime('now') WHERE id = ?
  `).run(a.id);

  const updated = db.prepare("SELECT * FROM agreements WHERE id = ?").get(a.id);
  return res.json({ message: "Acordo recusado.", agreement: formatAgreement(updated) });
});

// ─── PATCH /api/agreements/:id/close ─────────────────────────────────────────
// Encerra um acordo ativo (qualquer um dos dois parceiros pode encerrar).
router.patch("/:id/close", (req, res) => {
  const a = db.prepare(`
    SELECT a.*, r.user_id AS restaurant_user_id, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!a) return res.status(404).json({ message: "Acordo não encontrado." });
  if (a.status !== "ativo") {
    return res.status(409).json({ message: `Apenas acordos ativos podem ser encerrados.` });
  }

  const isRestaurant = req.user.tipo === "restaurante" && a.restaurant_user_id === req.user.id;
  const isNgo        = req.user.tipo === "ong"         && a.ngo_user_id         === req.user.id;

  if (!isRestaurant && !isNgo) {
    return res.status(403).json({ message: "Acesso negado." });
  }

  db.prepare(`
    UPDATE agreements SET status = 'encerrado', updated_at = datetime('now') WHERE id = ?
  `).run(a.id);

  const updated = db.prepare("SELECT * FROM agreements WHERE id = ?").get(a.id);
  return res.json({ message: "Acordo encerrado.", agreement: formatAgreement(updated) });
});

// ─── POST /api/agreements/:id/donations ──────────────────────────────────────
// Registra uma coleta realizada dentro de um acordo ativo.
// Body: { volume_kg }
router.post("/:id/donations", (req, res) => {
  const { volume_kg } = req.body || {};

  if (!volume_kg || isNaN(Number(volume_kg)) || Number(volume_kg) <= 0) {
    return res.status(400).json({ message: "volume_kg deve ser um número positivo." });
  }

  const a = db.prepare(`
    SELECT a.*, r.user_id AS restaurant_user_id, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!a) return res.status(404).json({ message: "Acordo não encontrado." });
  if (a.status !== "ativo") {
    return res.status(409).json({ message: "O acordo precisa estar ativo para registrar coletas." });
  }

  const isRestaurant = req.user.tipo === "restaurante" && a.restaurant_user_id === req.user.id;
  const isNgo        = req.user.tipo === "ong"         && a.ngo_user_id         === req.user.id;

  if (!isRestaurant && !isNgo) {
    return res.status(403).json({ message: "Acesso negado." });
  }

  const result = db.prepare(`
    INSERT INTO donations (agreement_id, restaurant_id, ngo_id, volume_kg, food_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(a.id, a.restaurant_id, a.ngo_id, Number(volume_kg), a.food_type);

  const donation = db.prepare("SELECT * FROM donations WHERE id = ?").get(result.lastInsertRowid);
  return res.status(201).json({ donation });
});

module.exports = router;
