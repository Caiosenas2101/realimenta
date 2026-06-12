const express = require("express");
const db = require("../db");
const { authenticate, requireTipo } = require("../middleware/auth");
const { CAPACITY_OPTIONS, DAYS_OPTIONS } = require("../config");

const router = express.Router();

router.use(authenticate, requireTipo("ong"));

function getOrCreateProfile(userId) {
  let profile = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(userId);
  if (!profile) {
    db.prepare("INSERT INTO ngos (user_id, nome) VALUES (?, '')").run(userId);
    profile = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(userId);
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
    restrictions: parseJsonField(p.restrictions),
    days:         parseJsonField(p.days)
  };
}

// ─── GET /api/ngo/profile ─────────────────────────────────────────────────────
router.get("/profile", (req, res) => {
  const profile = getOrCreateProfile(req.user.id);
  return res.json({ profile: formatProfile(profile) });
});

// ─── PUT /api/ngo/profile ─────────────────────────────────────────────────────
// Body: { cnpj, nome, responsavel, endereco, bairro, cidade, telefone,
//         capacity, restrictions[], days[], hours }
router.put("/profile", (req, res) => {
  const {
    cnpj, nome, responsavel, endereco, bairro, cidade, telefone,
    capacity, restrictions, days, hours
  } = req.body || {};

  if (!nome || String(nome).trim() === "") {
    return res.status(400).json({ message: "O nome da organização é obrigatório." });
  }

  if (capacity && !CAPACITY_OPTIONS.includes(capacity)) {
    return res.status(400).json({ message: `Capacidade inválida: ${capacity}` });
  }

  if (days) {
    if (!Array.isArray(days)) {
      return res.status(400).json({ message: "days deve ser um array." });
    }
    const invalid = days.filter(d => !DAYS_OPTIONS.includes(d));
    if (invalid.length) {
      return res.status(400).json({ message: `Dias inválidos: ${invalid.join(", ")}` });
    }
  }

  getOrCreateProfile(req.user.id);

  db.prepare(`
    UPDATE ngos SET
      cnpj        = COALESCE(?, cnpj),
      nome        = ?,
      responsavel = COALESCE(?, responsavel),
      endereco    = COALESCE(?, endereco),
      bairro      = COALESCE(?, bairro),
      cidade      = COALESCE(?, cidade),
      telefone    = COALESCE(?, telefone),
      capacity    = COALESCE(?, capacity),
      restrictions= COALESCE(?, restrictions),
      days        = COALESCE(?, days),
      hours       = COALESCE(?, hours),
      updated_at  = datetime('now', '-3 hours')
    WHERE user_id = ?
  `).run(
    cnpj || null,
    nome.trim(),
    responsavel || null,
    endereco || null,
    bairro || null,
    cidade || null,
    telefone || null,
    capacity || null,
    restrictions ? JSON.stringify(restrictions) : null,
    days ? JSON.stringify(days) : null,
    hours || null,
    req.user.id
  );

  const profile = db.prepare("SELECT * FROM ngos WHERE user_id = ?").get(req.user.id);
  return res.json({ message: "Perfil atualizado.", profile: formatProfile(profile) });
});

// ─── GET /api/ngo/impact ─────────────────────────────────────────────────────
router.get("/impact", (req, res) => {
  const profile = getOrCreateProfile(req.user.id);
  const nid = profile.id;

  const totals = db.prepare(`
    SELECT COALESCE(SUM(volume_kg), 0) AS total_kg, COUNT(*) AS total_coletas
    FROM donations WHERE ngo_id = ?
  `).get(nid);

  const mesAtual = db.prepare(`
    SELECT COALESCE(SUM(volume_kg), 0) AS kg
    FROM donations
    WHERE ngo_id = ?
      AND strftime('%Y-%m', collected_at) = strftime('%Y-%m', datetime('now', '-3 hours'))
  `).get(nid).kg;

  const weeklyRaw = db.prepare(`
    SELECT
      CAST((julianday(date('now', '-3 hours')) - julianday(date(collected_at))) / 7 AS INTEGER) AS weeks_ago,
      SUM(volume_kg) AS kg
    FROM donations
    WHERE ngo_id = ? AND collected_at >= datetime('now', '-3 hours', '-28 days')
    GROUP BY weeks_ago
    HAVING weeks_ago BETWEEN 0 AND 3
  `).all(nid);

  const weeklyMap = {};
  weeklyRaw.forEach(r => { weeklyMap[r.weeks_ago] = r.kg; });
  const weekly = [3, 2, 1, 0].map(offset => ({
    label: offset === 0 ? 'Esta' : `-${offset}s`,
    kg: Math.round((weeklyMap[offset] || 0) * 10) / 10
  }));

  const activeAgreements = db.prepare(`
    SELECT COUNT(*) AS count FROM agreements
    WHERE ngo_id = ? AND status = 'ativo'
  `).get(nid).count;

  const parceiros = db.prepare(`
    SELECT COUNT(DISTINCT restaurant_id) AS count FROM agreements
    WHERE ngo_id = ? AND status IN ('ativo', 'encerrado')
  `).get(nid).count;

  const porRestaurante = db.prepare(`
    SELECT r.nome, SUM(d.volume_kg) AS kg
    FROM donations d JOIN restaurants r ON r.id = d.restaurant_id
    WHERE d.ngo_id = ?
    GROUP BY d.restaurant_id ORDER BY kg DESC LIMIT 5
  `).all(nid);

  const totalKg = totals.total_kg;

  return res.json({
    impact: {
      total_kg:        Math.round(totalKg * 10) / 10,
      total_coletas:   totals.total_coletas,
      mes_atual_kg:    Math.round(mesAtual * 10) / 10,
      refeicoes:       Math.round(totalKg / 0.5),
      acordos_ativos:  activeAgreements,
      parceiros_total: parceiros,
      weekly_kg:       weekly,
      por_restaurante: porRestaurante
    }
  });
});

module.exports = router;
