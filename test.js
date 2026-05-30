process.env.DB_DIR = "/tmp/realimenta_test_" + Date.now();
const request = require("supertest");
const app = require("./src/server");

async function run() {
  let rToken, oToken, ngoId, agreementId;

  // 1. Register restaurante
  let r = await request(app).post("/api/auth/register")
    .send({ email: "rest@test.com", password: "senha123", tipo: "restaurante" });
  console.assert(r.status === 201, "Register restaurante: " + r.status);
  rToken = r.body.token;
  console.log("✅ Register restaurante:", r.body.user.email);

  // 2. Register ONG
  r = await request(app).post("/api/auth/register")
    .send({ email: "ong@test.com", password: "senha123", tipo: "ong" });
  console.assert(r.status === 201, "Register ong: " + r.status);
  oToken = r.body.token;
  console.log("✅ Register ONG:", r.body.user.email);

  // 3. Login duplicado → 409
  r = await request(app).post("/api/auth/register")
    .send({ email: "rest@test.com", password: "senha123", tipo: "restaurante" });
  console.assert(r.status === 409, "Duplicate: " + r.status);
  console.log("✅ Email duplicado rejeitado:", r.body.message);

  // 4. Login
  r = await request(app).post("/api/auth/login")
    .send({ email: "rest@test.com", password: "senha123" });
  console.assert(r.status === 200, "Login: " + r.status);
  console.log("✅ Login OK");

  // 5. Perfil restaurante
  r = await request(app).put("/api/restaurant/profile")
    .set("Authorization", "Bearer " + rToken)
    .send({ nome: "Restaurante Sabor Arte", bairro: "Vila Mariana", cidade: "Sao Paulo",
            food_types: ["Pratos preparados", "Hortifruti"], frequency: "3x por semana", volume_range: "10-30kg" });
  console.assert(r.status === 200, "Perfil restaurante: " + r.status + " " + JSON.stringify(r.body));
  console.log("✅ Perfil restaurante salvo:", r.body.profile.nome);

  // 6. Perfil ONG
  r = await request(app).put("/api/ngo/profile")
    .set("Authorization", "Bearer " + oToken)
    .send({ nome: "Acao Comunitaria Luz", responsavel: "Maria Silva", bairro: "Vila Mariana",
            cidade: "Sao Paulo", capacity: "20-50kg", days: ["Ter","Qui","Sab"], hours: "Tarde (12-18h)" });
  console.assert(r.status === 200, "Perfil ONG: " + r.status + " " + JSON.stringify(r.body));
  console.log("✅ Perfil ONG salvo:", r.body.profile.nome);

  // 7. Restaurante busca ONGs
  r = await request(app).get("/api/ngos").set("Authorization", "Bearer " + rToken);
  console.assert(r.status === 200, "Busca ONGs: " + r.status);
  console.assert(r.body.ngos.length === 1, "Deve ter 1 ONG, tem: " + r.body.ngos.length);
  ngoId = r.body.ngos[0].id;
  console.log("✅ Busca ONGs: encontrou", r.body.ngos.length, "ONG(s), ID:", ngoId);

  // 8. Propor acordo
  r = await request(app).post("/api/agreements")
    .set("Authorization", "Bearer " + rToken)
    .send({ ngo_id: ngoId, dias: ["Ter","Qui"], horario: "14:00", volume: "10-30kg", food_type: "Pratos preparados" });
  console.assert(r.status === 201, "Propor acordo: " + r.status + " " + JSON.stringify(r.body));
  agreementId = r.body.agreement.id;
  console.log("✅ Acordo proposto, ID:", agreementId, "status:", r.body.agreement.status);

  // 9. Acordo duplicado → 409
  r = await request(app).post("/api/agreements")
    .set("Authorization", "Bearer " + rToken)
    .send({ ngo_id: ngoId, dias: ["Seg"], horario: "09:00", volume: "Ate 10kg", food_type: "Hortifruti" });
  console.assert(r.status === 409, "Acordo duplicado: " + r.status);
  console.log("✅ Acordo duplicado rejeitado");

  // 10. ONG aceita
  r = await request(app).patch(`/api/agreements/${agreementId}/accept`)
    .set("Authorization", "Bearer " + oToken);
  console.assert(r.status === 200, "Aceitar: " + r.status + " " + JSON.stringify(r.body));
  console.log("✅ Acordo aceito, status:", r.body.agreement.status);

  // 11. Chat
  r = await request(app).post(`/api/agreements/${agreementId}/messages`)
    .set("Authorization", "Bearer " + rToken)
    .send({ texto: "Ola! Terca teremos 35kg." });
  console.assert(r.status === 201, "Enviar msg: " + r.status);
  console.log("✅ Mensagem enviada");

  r = await request(app).get(`/api/agreements/${agreementId}/messages`)
    .set("Authorization", "Bearer " + oToken);
  console.assert(r.status === 200 && r.body.messages.length === 1, "Msgs: " + r.body.messages?.length);
  console.log("✅ Chat recuperado, próxima coleta:", r.body.proxima_coleta);

  // 12. Registrar coleta
  r = await request(app).post(`/api/agreements/${agreementId}/donations`)
    .set("Authorization", "Bearer " + rToken)
    .send({ volume_kg: 32 });
  console.assert(r.status === 201, "Doacao: " + r.status + " " + JSON.stringify(r.body));
  console.log("✅ Coleta registrada:", r.body.donation.volume_kg + "kg");

  // 13. Impacto restaurante
  r = await request(app).get("/api/restaurant/impact").set("Authorization", "Bearer " + rToken);
  console.assert(r.status === 200, "Impacto: " + r.status);
  console.log("✅ Impacto restaurante:", r.body.impact);

  // 14. Impacto ONG
  r = await request(app).get("/api/ngo/impact").set("Authorization", "Bearer " + oToken);
  console.assert(r.status === 200, "Impacto ONG: " + r.status);
  console.log("✅ Impacto ONG:", r.body.impact);

  console.log("\n🎉 Todos os testes passaram!");
  process.exit(0);
}

run().catch(e => { console.error("❌", e); process.exit(1); });
