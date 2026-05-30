const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

/**
 * Middleware que exige token JWT válido.
 * Injeta req.user = { id, email, tipo } na request.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, tipo }
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

/**
 * Middleware que restringe a rota a um tipo específico de usuário.
 * Uso: requireTipo("restaurante") ou requireTipo("ong")
 */
function requireTipo(tipo) {
  return (req, res, next) => {
    if (req.user?.tipo !== tipo) {
      return res.status(403).json({
        message: `Acesso restrito a usuários do tipo "${tipo}".`
      });
    }
    next();
  };
}

module.exports = { authenticate, requireTipo };
