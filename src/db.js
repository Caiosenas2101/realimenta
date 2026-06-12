const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const os = require("os");

const DATA_DIR = path.join(os.tmpdir(), "realimenta");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "realimenta.db");
console.log(`[DB] Usando banco em: ${DB_PATH}`);

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    tipo        TEXT    NOT NULL CHECK(tipo IN ('restaurante', 'ong')),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cnpj         TEXT,
    nome         TEXT    NOT NULL DEFAULT '',
    endereco     TEXT,
    bairro       TEXT,
    cidade       TEXT,
    telefone     TEXT,
    food_types   TEXT,
    frequency    TEXT,
    volume_range TEXT,
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS ngos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    cnpj         TEXT,
    nome         TEXT    NOT NULL DEFAULT '',
    responsavel  TEXT,
    endereco     TEXT,
    bairro       TEXT,
    cidade       TEXT,
    telefone     TEXT,
    capacity     TEXT,
    restrictions TEXT,
    days         TEXT,
    hours        TEXT,
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS agreements (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ngo_id        INTEGER NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
    dias          TEXT    NOT NULL,
    horario       TEXT    NOT NULL,
    volume        TEXT    NOT NULL,
    food_type     TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pendente'
                          CHECK(status IN ('pendente', 'ativo', 'recusado', 'encerrado')),
    iniciado_por  TEXT    NOT NULL CHECK(iniciado_por IN ('restaurante', 'ong')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id INTEGER NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    texto        TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );

  CREATE TABLE IF NOT EXISTS donations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    agreement_id  INTEGER NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    ngo_id        INTEGER NOT NULL REFERENCES ngos(id) ON DELETE CASCADE,
    volume_kg     REAL    NOT NULL,
    food_type     TEXT    NOT NULL,
    collected_at  TEXT    NOT NULL DEFAULT (datetime('now', '-3 hours'))
  );
`);

module.exports = db;
