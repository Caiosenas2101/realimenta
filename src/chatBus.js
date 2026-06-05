// Barramento de eventos em memória para o chat em tempo real (SSE).
// Mantém, por acordo, o conjunto de conexões abertas (response do Express)
// e empurra mensagens novas para todas elas.

const subscribers = new Map(); // agreementId (string) -> Set<res>

function subscribe(agreementId, res) {
  const key = String(agreementId);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key).add(res);
}

function unsubscribe(agreementId, res) {
  const key = String(agreementId);
  const set = subscribers.get(key);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) subscribers.delete(key);
}

function publish(agreementId, data) {
  const key = String(agreementId);
  const set = subscribers.get(key);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch { /* conexão já encerrada */ }
  }
}

module.exports = { subscribe, unsubscribe, publish };
