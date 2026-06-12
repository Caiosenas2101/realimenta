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
      updated_at   = datetime('now', '-3 hours')
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
router.get("/impact", (req, res) => {
  const profile = getOrCreateProfile(req.user.id);
  const rid = profile.id;

  const totals = db.prepare(`
    SELECT COALESCE(SUM(volume_kg), 0) AS total_kg, COUNT(*) AS total_coletas
    FROM donations WHERE restaurant_id = ?
  `).get(rid);

  const mesAtual = db.prepare(`
    SELECT COALESCE(SUM(volume_kg), 0) AS kg
    FROM donations
    WHERE restaurant_id = ?
      AND strftime('%Y-%m', collected_at) = strftime('%Y-%m', datetime('now', '-3 hours'))
  `).get(rid).kg;

  const weeklyRaw = db.prepare(`
    SELECT
      CAST((julianday(date('now', '-3 hours')) - julianday(date(collected_at))) / 7 AS INTEGER) AS weeks_ago,
      SUM(volume_kg) AS kg
    FROM donations
    WHERE restaurant_id = ? AND collected_at >= datetime('now', '-3 hours', '-28 days')
    GROUP BY weeks_ago
    HAVING weeks_ago BETWEEN 0 AND 3
  `).all(rid);

  const weeklyMap = {};
  weeklyRaw.forEach(r => { weeklyMap[r.weeks_ago] = r.kg; });
  const weekly = [3, 2, 1, 0].map(offset => ({
    label: offset === 0 ? 'Esta' : `-${offset}s`,
    kg: Math.round((weeklyMap[offset] || 0) * 10) / 10
  }));

  const activeAgreements = db.prepare(`
    SELECT COUNT(*) AS count FROM agreements
    WHERE restaurant_id = ? AND status = 'ativo'
  `).get(rid).count;

  const parceiros = db.prepare(`
    SELECT COUNT(DISTINCT ngo_id) AS count FROM agreements
    WHERE restaurant_id = ? AND status IN ('ativo', 'encerrado')
  `).get(rid).count;

  const tipoMaisDoado = db.prepare(`
    SELECT food_type, SUM(volume_kg) AS kg
    FROM donations WHERE restaurant_id = ?
    GROUP BY food_type ORDER BY kg DESC LIMIT 1
  `).get(rid);

  const totalKg = totals.total_kg;
  const meals   = Math.round(totalKg / 0.5);
  const people  = Math.round(meals / 3);

  const ngoActions = db.prepare(`
    SELECT n.nome, SUM(d.volume_kg) AS kg
    FROM donations d JOIN ngos n ON n.id = d.ngo_id
    WHERE d.restaurant_id = ?
    GROUP BY d.ngo_id ORDER BY kg DESC LIMIT 5
  `).all(rid);

  return res.json({
    impact: {
      total_kg:          Math.round(totalKg * 10) / 10,
      total_coletas:     totals.total_coletas,
      mes_atual_kg:      Math.round(mesAtual * 10) / 10,
      refeicoes:         meals,
      pessoas_estimadas: people,
      acordos_ativos:    activeAgreements,
      parceiros_total:   parceiros,
      tipo_mais_doado:   tipoMaisDoado?.food_type || null,
      weekly_kg:         weekly,
      por_ong:           ngoActions
    }
  });
});

module.exports = router;
