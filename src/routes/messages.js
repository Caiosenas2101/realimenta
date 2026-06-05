const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authenticate } = require("../middleware/auth");
const { JWT_SECRET } = require("../config");
const chatBus = require("../chatBus");

const router = express.Router({ mergeParams: true });

// Helper: verifica se o usuário é parte do acordo
function getAgreementAndVerifyAccess(agreementId, userId, userTipo) {
  const a = db.prepare(`
    SELECT a.*, r.user_id AS restaurant_user_id, n.user_id AS ngo_user_id
    FROM agreements a
    JOIN restaurants r ON r.id = a.restaurant_id
    JOIN ngos n ON n.id = a.ngo_id
    WHERE a.id = ?
  `).get(agreementId);

  if (!a) return { error: 404, message: "Acordo não encontrado." };

  const isRestaurant = userTipo === "restaurante" && a.restaurant_user_id === userId;
  const isNgo        = userTipo === "ong"         && a.ngo_user_id         === userId;

  if (!isRestaurant && !isNgo) return { error: 403, message: "Acesso negado a este acordo." };

  return { agreement: a };
}

// ─── GET /api/agreements/:id/messages/stream (SSE) ───────────────────────────
// Tempo real: o navegador (EventSource) não envia headers, então o token JWT
// vem por query string. Definido ANTES do authenticate global.
router.get("/stream", (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ message: "Token não fornecido." });

  let user;
  try {
    user = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }

  const { agreement: a, error, message } = getAgreementAndVerifyAccess(
    req.params.id, user.id, user.tipo
  );
  if (error) return res.status(error).json({ message });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.write(": conectado\n\n");

  chatBus.subscribe(a.id, res);

  // Mantém a conexão viva atrás de proxies que cortam conexões ociosas.
  const ping = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* noop */ }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    chatBus.unsubscribe(a.id, res);
  });
});

router.use(authenticate);

// ─── GET /api/agreements/:id/messages ────────────────────────────────────────
router.get("/", (req, res) => {
  const { agreement: a, error, message } = getAgreementAndVerifyAccess(
    req.params.id, req.user.id, req.user.tipo
  );
  if (error) return res.status(error).json({ message });

  const messages = db.prepare(`
    SELECT m.*, u.email AS sender_email, u.tipo AS sender_tipo
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.agreement_id = ?
    ORDER BY m.created_at ASC
  `).all(a.id);

  // Próxima coleta baseada nos dias do acordo
  const diasArray = (() => {
    try { return JSON.parse(a.dias); } catch { return []; }
  })();

  const dayMap = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, "Sáb": 6, Sab: 6 };
  const today = new Date();
  let proximaColeta = null;

  if (diasArray.length > 0) {
    for (let offset = 1; offset <= 7; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const dayName = Object.keys(dayMap).find(k => dayMap[k] === d.getDay() && diasArray.includes(k));
      if (diasArray.includes(dayName)) {
        proximaColeta = `${dayName}, ${d.toLocaleDateString("pt-BR")} às ${a.horario}`;
        break;
      }
    }
  }

  return res.json({
    messages,
    proxima_coleta: proximaColeta,
    agreement_status: a.status
  });
});

// ─── POST /api/agreements/:id/messages ───────────────────────────────────────
// Body: { texto }
router.post("/", (req, res) => {
  const { agreement: a, error, message } = getAgreementAndVerifyAccess(
    req.params.id, req.user.id, req.user.tipo
  );
  if (error) return res.status(error).json({ message });
  if (a.status !== "ativo") {
    return res.status(409).json({ message: "O chat só aceita mensagens em acordos ativos." });
  }

  const { texto } = req.body || {};

  if (!texto || String(texto).trim() === "") {
    return res.status(400).json({ message: "O texto da mensagem é obrigatório." });
  }

  const result = db.prepare(`
    INSERT INTO messages (agreement_id, sender_id, texto)
    VALUES (?, ?, ?)
  `).run(a.id, req.user.id, String(texto).trim());

  const msg = db.prepare(`
    SELECT m.*, u.email AS sender_email, u.tipo AS sender_tipo
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  // Empurra em tempo real para todos conectados neste acordo (inclui o remetente).
  chatBus.publish(a.id, msg);

  return res.status(201).json({ message: msg });
});

module.exports = router;
