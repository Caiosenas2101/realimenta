const express = require("express");
const db = require("../db");
const { authenticate, requireTipo } = require("../middleware/auth");

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

// ─── GET /api/ngos ────────────────────────────────────────────────────────────
// Restaurante busca ONGs compatíveis.
// Query params: ?bairro=&cidade=&food_type=
// Retorna ONGs cujo perfil combina com o que o restaurante doa.
router.get("/ngos", authenticate, requireTipo("restaurante"), (req, res) => {
  const { bairro, cidade, food_type } = req.query;

  // Perfil do restaurante para cruzar compatibilidade
  const restaurantProfile = db
    .prepare("SELECT * FROM restaurants WHERE user_id = ?")
    .get(req.user.id);

  const restaurantFoodTypes = restaurantProfile
    ? parseJsonField(restaurantProfile.food_types)
    : [];

  // Busca todas as ONGs com perfil completo
  let ngos = db.prepare(`
    SELECT
      n.*,
      u.email,
      (SELECT COUNT(*) FROM agreements a
       WHERE a.ngo_id = n.id AND a.status IN ('ativo', 'encerrado')) AS acordos_totais,
      (SELECT COUNT(*) FROM agreements a
       WHERE a.ngo_id = n.id AND a.status = 'ativo') AS acordos_ativos
    FROM ngos n
    JOIN users u ON u.id = n.user_id
    WHERE n.nome != ''
  `).all();

  // Filtros opcionais
  if (bairro) {
    ngos = ngos.filter(n => n.bairro?.toLowerCase().includes(bairro.toLowerCase()));
  }
  if (cidade) {
    ngos = ngos.filter(n => n.cidade?.toLowerCase().includes(cidade.toLowerCase()));
  }

  // Formata e adiciona score de compatibilidade
  ngos = ngos.map(n => {
    const ngoFoodTypes = []; // ONGs não filtram por tipo de alimento diretamente
    const days = parseJsonField(n.days);

    // Score simples: 1 ponto por dia compatível
    const restaurantDays = restaurantProfile
      ? (restaurantProfile.frequency === "Diaria" ? ["Seg","Ter","Qua","Qui","Sex"] : [])
      : [];

    const matchedDays = days.filter(d => restaurantDays.includes(d));

    return {
      id:            n.id,
      nome:          n.nome,
      responsavel:   n.responsavel,
      bairro:        n.bairro,
      cidade:        n.cidade,
      capacity:      n.capacity,
      days,
      hours:         n.hours,
      restrictions:  parseJsonField(n.restrictions),
      acordos_ativos: n.acordos_ativos,
      acordos_totais: n.acordos_totais,
      compatibilidade: matchedDays.length > 0 ? "alta" : "normal"
    };
  });

  return res.json({ ngos });
});

// ─── GET /api/ngos/:id ────────────────────────────────────────────────────────
// Perfil público de uma ONG (para restaurantes verem antes de propor acordo)
router.get("/ngos/:id", authenticate, (req, res) => {
  const ngo = db.prepare(`
    SELECT
      n.*,
      (SELECT COUNT(*) FROM agreements a WHERE a.ngo_id = n.id AND a.status = 'ativo')  AS acordos_ativos,
      (SELECT COUNT(*) FROM agreements a WHERE a.ngo_id = n.id AND a.status IN ('ativo','encerrado')) AS parceiros_totais,
      (SELECT strftime('%b %Y', MIN(created_at)) FROM agreements WHERE ngo_id = n.id)   AS membro_desde
    FROM ngos n
    WHERE n.id = ?
  `).get(req.params.id);

  if (!ngo) return res.status(404).json({ message: "ONG não encontrada." });

  return res.json({
    ngo: {
      id:             ngo.id,
      nome:           ngo.nome,
      responsavel:    ngo.responsavel,
      endereco:       ngo.endereco,
      bairro:         ngo.bairro,
      cidade:         ngo.cidade,
      capacity:       ngo.capacity,
      days:           parseJsonField(ngo.days),
      hours:          ngo.hours,
      restrictions:   parseJsonField(ngo.restrictions),
      acordos_ativos: ngo.acordos_ativos,
      parceiros_totais: ngo.parceiros_totais,
      membro_desde:   ngo.membro_desde
    }
  });
});

// ─── GET /api/restaurants ─────────────────────────────────────────────────────
// ONG busca restaurantes compatíveis.
router.get("/restaurants", authenticate, requireTipo("ong"), (req, res) => {
  const { bairro, cidade, food_type } = req.query;

  let restaurants = db.prepare(`
    SELECT
      r.*,
      (SELECT COUNT(*) FROM agreements a
       WHERE a.restaurant_id = r.id AND a.status = 'ativo') AS acordos_ativos,
      (SELECT COUNT(*) FROM agreements a
       WHERE a.restaurant_id = r.id AND a.status IN ('ativo','encerrado')) AS acordos_totais
    FROM restaurants r
    JOIN users u ON u.id = r.user_id
    WHERE r.nome != ''
  `).all();

  if (bairro) {
    restaurants = restaurants.filter(r => r.bairro?.toLowerCase().includes(bairro.toLowerCase()));
  }
  if (cidade) {
    restaurants = restaurants.filter(r => r.cidade?.toLowerCase().includes(cidade.toLowerCase()));
  }
  if (food_type) {
    restaurants = restaurants.filter(r => {
      const types = parseJsonField(r.food_types);
      return types.includes(food_type);
    });
  }

  const formatted = restaurants.map(r => ({
    id:            r.id,
    nome:          r.nome,
    bairro:        r.bairro,
    cidade:        r.cidade,
    food_types:    parseJsonField(r.food_types),
    frequency:     r.frequency,
    volume_range:  r.volume_range,
    acordos_ativos: r.acordos_ativos,
    acordos_totais: r.acordos_totais
  }));

  return res.json({ restaurants: formatted });
});

// ─── GET /api/restaurants/:id ─────────────────────────────────────────────────
router.get("/restaurants/:id", authenticate, (req, res) => {
  const r = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(req.params.id);
  if (!r) return res.status(404).json({ message: "Restaurante não encontrado." });

  return res.json({
    restaurant: {
      id:           r.id,
      nome:         r.nome,
      bairro:       r.bairro,
      cidade:       r.cidade,
      food_types:   parseJsonField(r.food_types),
      frequency:    r.frequency,
      volume_range: r.volume_range
    }
  });
});

module.exports = router;
