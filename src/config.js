// Centralize configurações e constantes aqui.
// Em produção, use variáveis de ambiente reais (.env).

const JWT_SECRET = process.env.JWT_SECRET || "realimenta-dev-secret-2024";
const JWT_EXPIRES_IN = "7d";
const PORT = process.env.PORT || 3000;

const FOOD_TYPES = [
  "Pratos preparados",
  "Hortifruti",
  "Padaria e confeitaria",
  "Padaria",
  "Laticínios",
  "Laticinios",
  "Carnes e proteínas",
  "Carnes e proteinas",
  "Bebidas",
  "Enlatados e secos",
  "Congelados"
];

const FREQUENCY_OPTIONS = [
  "Diaria",
  "Diária",
  "3x por semana",
  "2x por semana",
  "Semanal",
  "Quinzenal"
];

const VOLUME_OPTIONS = [
  "Até 10kg",
  "Ate 10kg",
  "10-30kg",
  "30-50kg",
  "50-100kg",
  "Mais de 100kg"
];

const CAPACITY_OPTIONS = [
  "Até 20kg/semana",
  "Ate 20kg/semana",
  "20-50kg",
  "50-100kg",
  "100-200kg",
  "Mais de 200kg"
];

const DAYS_OPTIONS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Sab", "Dom"];

// Estimativa: 1 kg de alimento ≈ 2 refeições viabilizadas
const KG_PER_MEAL = 0.5;

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PORT,
  FOOD_TYPES,
  FREQUENCY_OPTIONS,
  VOLUME_OPTIONS,
  CAPACITY_OPTIONS,
  DAYS_OPTIONS,
  KG_PER_MEAL
};
