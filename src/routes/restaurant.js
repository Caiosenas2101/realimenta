const express = require("express");
const db = require("../db");
const { authenticate, requireTipo } = require("../middleware/auth");
const { FOOD_TYPES, FREQUENCY_OPTIONS, VOLUME_OPTIONS, KG_PER_MEAL } = require("../config");

const router = express.Router();

// Todos os endpoints exigem autenticação como restaurante
router.use(authenticate, requireTipo("restaurante"));

// Helper: busca ou cria o perfil do restaurante pelo user_id
function getOrCreateProfile(userId) {
  let profile = db.prepare("SELECT * FROM restaurants WHERE user_id = ?").get(userId);
  if (!profile) {
    db.prepare("INSERT INTO restaurants (user_id, nome) VALUES (?, '')").run(userId);
    profile = db.prepare("SELECT * FROM restaurants WHERE user_id = ?").get(userId);
  }
  return profile;
}

function parseJsonField(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

function formatProfile(p) {
  return {
    ...p,
    food_types: parseJsonField(p.food_types)
  };
}

// ─── GET /api/restaurant/profile ─────────────────────────────────────────────
router.get("/profile", (req, res) => {
  const profile = getOrCreateProfile(req.user.id);
  return res.json({ profile: formatProfile(profile) });
});

// ─── PUT /api/restaurant/profile ─────────────────────────────────────────────
// Body: { cnpj, nome, endereco, bairro, cidade, telefone, food_types[], frequency, volume_range }
router.put("/profile", (req, res) => {
  const { cnpj, nome, endereco, bairro, cidade, telefone, food_types, frequency, volume_range } =
    req.body || {};

  if (!nome || String(nome).trim() === "") {
    return res.status(400).json({ message: "O nome do estabelecimento é obrigatório." });
  }

  if (food_types && !Array.isArray(food_types)) {
    return res.status(400).json({ message: "food_types deve ser um array." });
  }

  if (food_types) {
    const invalid = food_types.filter(f => !FOOD_TYPES.includes(f));
    if (invalid.length) {
      return res.status(400).json({ message: `Tipos inválidos: ${invalid.join(", ")}` });
    }
  }

  if (frequency && !FREQUENCY_OPTIONS.includes(frequency)) {
    return res.status(400).json({ message: `Frequência inválida: ${frequency}` });
  }

  if (volume_range && !VOLUME_OPTIONS.includes(volume_range)) {
    return res.status(400).json({ message: `Volume inválido: ${volume_range}` });
  }

  getOrCreateProfile(req.user.id);

  db.prepare(`
    UPDATE restaurants SET
      cnpj         = COALESCE(?, cnpj),
      nome         = ?,
      endereco     = COALESCE(?, endereco),
      bairro       = COALESCE(?, bairro),
      cidade       = COALESCE(?, cidade),
      telefone     = COALESCE(?, telefone),
      food_types   = COALESCE(?, food_types),
      frequency    = COALESCE(?, frequency),
      volume_range = COALESCE(?, volume_range),
      updated_at   = datetime('now')
    WHERE user_id = ?
  `).run(
    cnpj || null,
    nome.trim(),
    endereco || null,
    bairro || null,
    cidade || null,
    telefone || null,
    food_types ? JSON.stringify(food_types) : null,
    frequency || null,
    volume_range || null,
    req.user.id
  );

  const profile = db.prepare("SELECT * FROM restaurants WHERE user_id = ?").get(req.user.id);
  return res.json({ message: "Perfil atualizado.", profile: formatProfile(profile) });
});

// ─── GET /api/restaurant/impact ──────────────────────────────────────────────
// Dashboard de impacto do restaurante
router.get("/impact", (req, res) => {
  const profile = db.prepare("SELECT * FROM restaurants WHERE user_id = ?").get(req.user.id);
  if (!profile) return res.status(404).json({ message: "Perfil não encontrado." });

  const rid = profile.id;

  // Total geral
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(volume_kg), 0) AS total_kg,
      COUNT(*)                    AS total_coletas
    FROM donations WHERE restaurant_id = ?
  `).get(rid);

  // Por semana (últimas 4 semanas)
  const weekly = db.prepare(`
    SELECT
      strftime('%W', collected_at) AS week,
      SUM(volume_kg)               AS kg
    FROM donations
    WHERE restaurant_id = ? AND collected_at >= date('now', '-28 days')
    GROUP BY week
    ORDER BY week
  `).all(rid);

  // Acordos ativos
  const activeAgreements = db.prepare(`
    SELECT COUNT(*) AS count FROM agreements
    WHERE restaurant_id = ? AND status = 'ativo'
  `).get(rid).count;

  const totalKg = totals.total_kg;
  const meals   = Math.round(totalKg / 0.5); // 0.5 kg por refeição
  const people  = Math.round(meals / 3);     // estimativa: 3 refeições/dia/pessoa

  // Impacto por ONG parceira (o que as ONGs relatam)
  const ngoActions = db.prepare(`
    SELECT n.nome, SUM(d.volume_kg) AS kg
    FROM donations d
    JOIN ngos n ON n.id = d.ngo_id
    WHERE d.restaurant_id = ?
    GROUP BY d.ngo_id
    ORDER BY kg DESC
    LIMIT 5
  `).all(rid);

  return res.json({
    impact: {
      total_kg:          totalKg,
      total_coletas:     totals.total_coletas,
      refeicoes:         meals,
      pessoas_estimadas: people,
      acordos_ativos:    activeAgreements,
      weekly_kg:         weekly,
      por_ong:           ngoActions
    }
  });
});

module.exports = router;
