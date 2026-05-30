const path = require("path");
const fs   = require("fs");
const os   = require("os");

const DB_PATH = path.join(os.tmpdir(), "realimenta", "realimenta.db");

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log("✅ Banco apagado:", DB_PATH);
} else {
  console.log("ℹ️  Banco não encontrado em:", DB_PATH);
}

console.log("🌱 Reinicie o servidor para criar um banco zerado.");
