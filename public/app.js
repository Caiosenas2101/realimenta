/* ═══════════════════════════════════════════════════════════════════════════
   ReAlimenta — SPA Frontend
   Conecta ao backend em http://localhost:3000/api
   ═══════════════════════════════════════════════════════════════════════════ */

const API = '/api';

// ─── Auth state ───────────────────────────────────────────────────────────────
const Auth = {
  get token()  { return localStorage.getItem('ra_token'); },
  get user()   { try { return JSON.parse(localStorage.getItem('ra_user')); } catch { return null; } },
  set(token, user) {
    localStorage.setItem('ra_token', token);
    localStorage.setItem('ra_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('ra_token');
    localStorage.removeItem('ra_user');
  },
  get loggedIn() { return !!this.token; },
  get tipo()     { return this.user?.tipo; }
};

// ─── API helper ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (Auth.token) opts.headers['Authorization'] = 'Bearer ' + Auth.token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: data.message || 'Erro desconhecido.' };
  return data;
}

// ─── Router ───────────────────────────────────────────────────────────────────
const routes = {};
function route(name, fn) { routes[name] = fn; }

function navigate(name, params = {}) {
  window._routeParams = params;
  window.location.hash = '#/' + name;
}

window.addEventListener('hashchange', render);
window.addEventListener('load', render);

function render() {
  const hash = window.location.hash.replace('#/', '') || 'landing';
  const [name, ...rest] = hash.split('/');
  const params = window._routeParams || {};
  if (rest.length) params._id = rest[0];

  // Encerra o stream do chat ao navegar para fora dele
  if (name !== 'chat' && window._chatES) {
    try { window._chatES.close(); } catch {}
    window._chatES = null;
  }

  // Redirect if not logged in
  const publicRoutes = ['landing', 'login', 'tipo', 'register',
    'onboard-r1', 'onboard-r2', 'onboard-r3',
    'onboard-o1', 'onboard-o2', 'onboard-o3', 'onboard-o4'];
  if (!Auth.loggedIn && !publicRoutes.includes(name)) {
    return navigate('landing');
  }
  // Redirect if already logged in
  if (Auth.loggedIn && publicRoutes.includes(name)) {
    return navigate('inicio');
  }

  const fn = routes[name] || routes['404'];
  if (fn) fn(params);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    el.classList.add('show');
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  });
}

// ─── Shell helpers ────────────────────────────────────────────────────────────
function LOGO_SVG(size = 28) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="13" fill="#EBF3E6"/>
    <path d="M11 9c0-2.5 4-5 6.5-2.5-2.5 0-3.5 2.5-3.5 2.5s2.5 0 3.5 2.5c-2.5-.5-5 .5-6.5-2.5z" fill="#2D5C1E"/>
    <path d="M10 13c1 4 5 6.5 9 5-4 2.5-9 1-10-4l1-1z" fill="#2D5C1E"/>
    <path d="M9 19c0 2.5 2.5 5 5 5" stroke="#E05A1B" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

window.logout = () => {
  Auth.clear();
  navigate('landing');
};

function topbar({ back, title, step, logo } = {}) {
  if (logo) return `
    <div class="topbar">
      <div class="topbar-logo">${LOGO_SVG()} <span>Re<span style="color:var(--orange)">Alimenta</span></span></div>
      ${Auth.loggedIn ? `<button onclick="logout()" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--text-3);padding:0;">Sair</button>` : ''}
    </div>`;
  return `
    <div class="topbar">
      ${back ? `<button class="topbar-back" onclick="${back}">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Voltar
      </button>` : '<div></div>'}
      ${title ? `<span class="topbar-title">${title}</span>` : ''}
      ${step  ? `<span class="topbar-step">${step}</span>` : '<div></div>'}
    </div>`;
}

function bottomNav(active) {
  const tipo = Auth.tipo;
  const listRoute = tipo === 'restaurante' ? 'ongs' : 'restaurantes';
  const listLabel = tipo === 'restaurante' ? 'ONGs' : 'Restaurantes';
  const items = [
    { id: 'inicio', label: 'Início', icon: `<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 20v-7h6v7" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>` },
    { id: listRoute, label: listLabel, icon: `<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><circle cx="11" cy="9" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M3 19c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>` },
    { id: 'chat', label: 'Chat', icon: `<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M4 4h14a1 1 0 011 1v9a1 1 0 01-1 1H7l-4 3V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>` },
    { id: 'impacto', label: 'Impacto', icon: `<svg width="22" height="22" fill="none" viewBox="0 0 22 22"><path d="M3 18l4-6 4 3 4-8 4 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  ];
  return `<nav class="bottom-nav">
    ${items.map(i => `
      <button class="nav-item ${active === i.id ? 'active' : ''}" onclick="navigate('${i.id}')">
        ${i.icon}
        ${i.label}
      </button>`).join('')}
  </nav>`;
}

function setApp(html) {
  document.getElementById('app').innerHTML = html;
}

// ─── Chip selector helper ─────────────────────────────────────────────────────
function initChips(container, single = false) {
  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (single) container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.toggle('active');
    });
  });
}

function getActiveChips(container) {
  return [...container.querySelectorAll('.chip.active')].map(c => c.dataset.value);
}

function formatDias(dias) {
  if (Array.isArray(dias)) return dias.join(', ');
  try {
    return (JSON.parse(dias || '[]')).join(', ');
  } catch {
    return '';
  }
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

/* ── Landing ─────────────────────────────────────────────────────────────────── */
route('landing', () => {
  setApp(`
    <div class="screen">
      <div class="landing-hero">
        <div class="landing-logo-wrap">
          ${LOGO_SVG(72)}
          <div style="font-size:28px;font-weight:800;color:var(--green);margin-top:10px;">
            Re<span style="color:var(--orange)">Alimenta</span>
          </div>
        </div>
        <p class="landing-tagline">Doação programada de alimentos.</p>
        <p class="landing-sub">Restaurantes e ONGs conectados por acordos que funcionam.</p>
        <div class="impact-pill">
          <span class="impact-pill-num">12.480</span>
          <span class="impact-pill-label">refeições viabilizadas este mês</span>
        </div>
        <div class="landing-btns">
          <button class="btn btn-primary" onclick="navigate('tipo')">Criar conta →</button>
          <button class="btn btn-secondary" onclick="navigate('login')">Já tenho conta</button>
        </div>
        <p style="font-size:11px;color:var(--text-3);margin-top:20px;">Compatível com a lei 15.224/2025</p>
      </div>
    </div>`);
});

/* ── Login ───────────────────────────────────────────────────────────────────── */
route('login', () => {
  setApp(`
    <div class="screen">
      ${topbar({ back: "navigate('landing')" })}
      <div class="screen-content no-nav" style="max-width:400px;margin:0 auto;">
        <div style="margin-bottom:28px;margin-top:8px;">
          <h2 style="margin-bottom:6px;">Entrar</h2>
          <p>Acesse sua conta ReAlimenta.</p>
        </div>
        <div class="input-group">
          <label>E-mail</label>
          <input class="input" id="email" type="email" placeholder="seu@email.com" />
        </div>
        <div class="input-group">
          <label>Senha</label>
          <input class="input" id="pwd" type="password" placeholder="••••••••" />
        </div>
        <p id="err" class="error-msg" style="margin-bottom:12px;"></p>
        <button class="btn btn-primary" id="loginBtn" onclick="doLogin()">Entrar</button>
        <button class="btn btn-ghost" style="margin-top:8px;" onclick="navigate('tipo')">Criar conta</button>
      </div>
    </div>`);

  document.getElementById('pwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});

window.doLogin = async () => {
  const email = document.getElementById('email').value.trim();
  const pwd   = document.getElementById('pwd').value;
  const btn   = document.getElementById('loginBtn');
  const err   = document.getElementById('err');
  err.textContent = '';
  if (!email || !pwd) { err.textContent = 'Preencha e-mail e senha.'; return; }
  btn.disabled = true; btn.textContent = 'Entrando…';
  try {
    const data = await api('POST', '/auth/login', { email, password: pwd });
    Auth.set(data.token, data.user);
    navigate('inicio');
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Entrar';
  }
};

/* ── Tipo ────────────────────────────────────────────────────────────────────── */
route('tipo', () => {
  setApp(`
    <div class="screen">
      ${topbar({ logo: true })}
      <div class="screen-content no-nav">
        <div style="margin-bottom:28px;margin-top:8px;">
          <h2 style="margin-bottom:6px;">Como você quer participar?</h2>
          <p>Escolha o perfil que representa sua organização.</p>
        </div>
        <button class="type-option" onclick="navigate('onboard-r1')">
          <div class="type-icon green">🍽️</div>
          <div>
            <div class="type-title">Sou um restaurante ou mercado</div>
            <div class="type-desc">Quero doar alimentos excedentes de forma programada.</div>
          </div>
          <svg class="type-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="type-option" onclick="navigate('onboard-o1')">
          <div class="type-icon orange">🤝</div>
          <div>
            <div class="type-title">Sou uma ONG</div>
            <div class="type-desc">Quero receber doações recorrentes de alimentos.</div>
          </div>
          <svg class="type-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <p style="font-size:12px;color:var(--text-3);text-align:center;margin-top:24px;">Todas as organizações passam por verificação de CNPJ ativo.</p>
      </div>
    </div>`);
});

/* ── Onboarding Restaurante — Passo 1/3 ──────────────────────────────────────── */
route('onboard-r1', () => {
  setApp(`
    <div class="screen">
      ${topbar({ back: "navigate('tipo')", step: '1 de 3' })}
      <div class="screen-content no-nav">
        <div class="onboard-icon" style="background:var(--green-light)">🍽️</div>
        <div class="onboard-title">Dados do estabelecimento</div>
        <div class="onboard-sub">Informações básicas para seu perfil.</div>
        <div class="input-group">
          <label>CNPJ</label>
          <input class="input" id="cnpj" type="text" placeholder="00.000.000/0001-00" />
          <div class="input-hint">Precisamos verificar que sua empresa está ativa para garantir segurança às ONGs parceiras.</div>
        </div>
        <div class="input-group">
          <label>Nome do estabelecimento</label>
          <input class="input" id="nome" type="text" placeholder="Ex: Restaurante Sabor & Arte" />
          <div class="input-hint">Esse nome será visível para as ONGs na busca por parceiros.</div>
        </div>
        <div class="input-group">
          <label>Endereço completo</label>
          <input class="input" id="endereco" type="text" placeholder="Rua, número, bairro, cidade" />
          <div class="input-hint">O endereço é usado para calcular a distância até ONGs próximas.</div>
        </div>
        <div class="input-group">
          <label>Telefone de contato</label>
          <input class="input" id="tel" type="tel" placeholder="(11) 99999-9999" />
        </div>
        <div class="divider"></div>
        <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:14px;">Credenciais de acesso</p>
        <div class="input-group">
          <label>E-mail</label>
          <input class="input" id="email" type="email" placeholder="seu@email.com" />
          <div class="input-hint">Usado para entrar na sua conta depois.</div>
        </div>
        <div class="input-group">
          <label>Senha</label>
          <input class="input" id="senha" type="password" placeholder="Mínimo 6 caracteres" />
        </div>
        <p id="err" class="error-msg" style="margin-bottom:12px;"></p>
        <button class="btn btn-primary" onclick="goOnboardR2()">Continuar →</button>
      </div>
    </div>`);
});

window.goOnboardR2 = () => {
  const nome  = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const err   = document.getElementById('err');
  if (!nome)              { err.textContent = 'O nome é obrigatório.'; return; }
  if (!email)             { err.textContent = 'O e-mail é obrigatório.'; return; }
  if (senha.length < 6)   { err.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }
  window._rData = {
    cnpj:     document.getElementById('cnpj').value.trim(),
    nome,
    endereco: document.getElementById('endereco').value.trim(),
    telefone: document.getElementById('tel').value.trim(),
    email,
    password: senha,
  };
  navigate('onboard-r2');
};

/* ── Onboarding Restaurante — Passo 2/3 ──────────────────────────────────────── */
route('onboard-r2', () => {
  setApp(`
    <div class="screen">
      ${topbar({ back: "navigate('onboard-r1')", step: '2 de 3' })}
      <div class="screen-content no-nav">
        <div class="onboard-icon" style="background:var(--green-light)">🥦</div>
        <div class="onboard-title">Perfil de doação</div>
        <div class="onboard-sub">Nos ajuda a conectar você com ONGs compatíveis.</div>

        <div class="section-title">Tipo de alimento que costuma doar</div>
        <div class="chips" id="foodChips">
          ${['Pratos preparados','Hortifruti','Padaria e confeitaria','Laticínios','Carnes e proteínas','Bebidas','Enlatados e secos','Congelados']
            .map(f => `<button class="chip" data-value="${f}">${f}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">Volume estimado por doação</div>
        <div class="chips" id="volChips">
          ${['Até 10kg','10-30kg','30-50kg','50-100kg','Mais de 100kg']
            .map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">Frequência ideal</div>
        <div class="chips" id="freqChips">
          ${['Diaria','3x por semana','2x por semana','Semanal','Quinzenal']
            .map(f => `<button class="chip" data-value="${f}">${f}</button>`).join('')}
        </div>

        <p id="err" class="error-msg" style="margin:12px 0;"></p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="submitRestaurant()">Continuar →</button>
      </div>
    </div>`);

  initChips(document.getElementById('foodChips'));
  initChips(document.getElementById('volChips'), true);
  initChips(document.getElementById('freqChips'), true);
});

window.submitRestaurant = async () => {
  const foodTypes   = getActiveChips(document.getElementById('foodChips'));
  const volChips    = getActiveChips(document.getElementById('volChips'));
  const freqChips   = getActiveChips(document.getElementById('freqChips'));
  const err         = document.getElementById('err');

  if (!foodTypes.length) { err.textContent = 'Selecione ao menos um tipo de alimento.'; return; }
  if (!volChips.length)  { err.textContent = 'Selecione o volume estimado.'; return; }
  if (!freqChips.length) { err.textContent = 'Selecione a frequência.'; return; }
  err.textContent = '';

  const profileData = { ...(window._rData || {}), food_types: foodTypes, volume_range: volChips[0], frequency: freqChips[0] };

  // Register account then save profile
  const btn = document.querySelector('.btn-primary');
  btn.disabled = true; btn.textContent = 'Salvando…';

  try {
    const email = window._rData?.email;
    const pwd   = window._rData?.password;

    if (!Auth.loggedIn) {
      const reg = await api('POST', '/auth/register', { email, password: pwd, tipo: 'restaurante' });
      Auth.set(reg.token, reg.user);
    }

    await api('PUT', '/restaurant/profile', profileData);
    navigate('onboard-r3');
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Continuar →';
  }
};

/* ── Onboarding Restaurante — Passo 3/3 — Cadastro concluído ─────────────────── */
route('onboard-r3', async () => {
  setApp(`<div class="screen"><div class="loading">Carregando…</div></div>`);

  try {
    const { profile } = await api('GET', '/restaurant/profile');
    const foodStr = (JSON.parse(profile.food_types || '[]').join(', ')) || '—';
    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content no-nav">
          <div class="success-wrap">
            <div class="success-icon">✓</div>
            <div class="success-title">Cadastro concluído!</div>
            <div class="success-sub">Seus dados foram salvos. Confira o resumo abaixo.</div>
          </div>
          <div style="margin-bottom:24px;">
            <div class="summary-row">
              <span class="summary-icon">🏪</span>
              <div><div class="summary-label">Estabelecimento</div><div class="summary-value">${profile.nome}</div></div>
            </div>
            <div class="summary-row">
              <span class="summary-icon">🥦</span>
              <div><div class="summary-label">Alimentos</div><div class="summary-value">${foodStr}</div></div>
            </div>
            <div class="summary-row">
              <span class="summary-icon">📦</span>
              <div><div class="summary-label">Volume por doação</div><div class="summary-value">${profile.volume_range || '—'}</div></div>
            </div>
            <div class="summary-row">
              <span class="summary-icon">📅</span>
              <div><div class="summary-label">Frequência ideal</div><div class="summary-value">${profile.frequency || '—'}</div></div>
            </div>
          </div>
          <div class="next-banner">
            <span class="next-banner-icon">💡</span>
            <div>
              <div class="next-banner-title">Próximo passo</div>
              <div class="next-banner-text">Encontre uma ONG parceira na sua região e proponha um acordo de doação programada.</div>
            </div>
          </div>
          <button class="btn btn-orange" onclick="navigate('ongs')">Encontrar ONG parceira →</button>
          <button class="btn btn-ghost" style="margin-top:8px;" onclick="navigate('inicio')">Ir para o início</button>
        </div>
      </div>`);
  } catch (e) {
    navigate('inicio');
  }
});

/* ── Onboarding ONG — Passo 1/4 ──────────────────────────────────────────────── */
route('onboard-o1', () => {
  setApp(`
    <div class="screen">
      ${topbar({ back: "navigate('tipo')", step: '1 de 4' })}
      <div class="screen-content no-nav">
        <div class="onboard-icon" style="background:var(--orange-light)">🤝</div>
        <div class="onboard-title">Dados da ONG</div>
        <div class="onboard-sub">Validamos para proteger todos.</div>
        <div class="input-group">
          <label>CNPJ da ONG</label>
          <input class="input" id="cnpj" type="text" placeholder="00.000.000/0001-00" />
          <div class="input-hint">Verificamos no cadastro da Receita Federal para garantir legitimidade às duas partes.</div>
        </div>
        <div class="input-group">
          <label>Nome da organização</label>
          <input class="input" id="nome" type="text" placeholder="Ex: Ação Comunitária Luz" />
          <div class="input-hint">Esse nome será visível para restaurantes na busca por parceiros.</div>
        </div>
        <div class="input-group">
          <label>Nome do responsável</label>
          <input class="input" id="resp" type="text" placeholder="Nome completo" />
          <div class="input-hint">Quem será o ponto de contato para coletas e acordos.</div>
        </div>
        <div class="input-group">
          <label>Endereço de recebimento</label>
          <input class="input" id="endereco" type="text" placeholder="Rua, número, bairro, cidade" />
          <div class="input-hint">Onde os alimentos serão entregues. Será usado para calcular distâncias.</div>
        </div>
        <div class="input-group">
          <label>Telefone de contato</label>
          <input class="input" id="tel" type="tel" placeholder="(11) 99999-9999" />
        </div>
        <div class="divider"></div>
        <p style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:14px;">Credenciais de acesso</p>
        <div class="input-group">
          <label>E-mail</label>
          <input class="input" id="email" type="email" placeholder="contato@ong.org.br" />
          <div class="input-hint">Usado para entrar na sua conta depois.</div>
        </div>
        <div class="input-group">
          <label>Senha</label>
          <input class="input" id="senha" type="password" placeholder="Mínimo 6 caracteres" />
        </div>
        <p id="err" class="error-msg" style="margin-bottom:12px;"></p>
        <button class="btn btn-primary" onclick="goOnboardO2()">Continuar →</button>
      </div>
    </div>`);
});

window.goOnboardO2 = () => {
  const nome  = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const err   = document.getElementById('err');
  if (!nome)            { err.textContent = 'O nome é obrigatório.'; return; }
  if (!email)           { err.textContent = 'O e-mail é obrigatório.'; return; }
  if (senha.length < 6) { err.textContent = 'A senha deve ter ao menos 6 caracteres.'; return; }
  window._oData = {
    cnpj:        document.getElementById('cnpj').value.trim(),
    nome,
    responsavel: document.getElementById('resp').value.trim(),
    endereco:    document.getElementById('endereco').value.trim(),
    telefone:    document.getElementById('tel').value.trim(),
    email,
    password:    senha,
  };
  navigate('onboard-o2');
};

/* ── Onboarding ONG — Passo 2/4 ──────────────────────────────────────────────── */
route('onboard-o2', () => {
  setApp(`
    <div class="screen">
      ${topbar({ back: "navigate('onboard-o1')", step: '2 de 4' })}
      <div class="screen-content no-nav">
        <div class="onboard-icon" style="background:var(--orange-light)">📋</div>
        <div class="onboard-title">Perfil de recebimento</div>
        <div class="onboard-sub">Ajuda restaurantes a entender o que funciona para vocês.</div>

        <div class="section-title">Capacidade de recebimento</div>
        <div class="chips" id="capChips">
          ${['Até 20kg/semana','20-50kg','50-100kg','100-200kg','Mais de 200kg']
            .map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">Restrições alimentares</div>
        <div class="chips" id="restChips">
          ${['Sem carne de porco','Sem frutos do mar','Sem glúten','Sem lactose','Sem alimentos crus','Nenhuma restrição']
            .map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">Dias disponíveis</div>
        <div class="chips" id="dayChips">
          ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
            .map(d => `<button class="chip" data-value="${d}">${d}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">Horários preferidos</div>
        <div class="chips" id="hourChips">
          ${['Manhã (8-12h)','Tarde (12-18h)','Noite (18-21h)']
            .map(h => `<button class="chip" data-value="${h}">${h}</button>`).join('')}
        </div>

        <p id="err" class="error-msg" style="margin:12px 0;"></p>
        <button class="btn btn-primary" style="margin-top:20px;" onclick="goOnboardO3()">Continuar →</button>
      </div>
    </div>`);

  initChips(document.getElementById('capChips'), true);
  initChips(document.getElementById('restChips'));
  initChips(document.getElementById('dayChips'));
  initChips(document.getElementById('hourChips'), true);
});

window.goOnboardO3 = () => {
  const cap   = getActiveChips(document.getElementById('capChips'));
  const days  = getActiveChips(document.getElementById('dayChips'));
  const hours = getActiveChips(document.getElementById('hourChips'));
  const err   = document.getElementById('err');
  if (!cap.length)   { err.textContent = 'Selecione a capacidade.'; return; }
  if (!days.length)  { err.textContent = 'Selecione ao menos um dia.'; return; }
  if (!hours.length) { err.textContent = 'Selecione um horário.'; return; }
  window._oData = {
    ...(window._oData || {}),
    capacity:     cap[0],
    restrictions: getActiveChips(document.getElementById('restChips')),
    days,
    hours: hours[0],
  };
  navigate('onboard-o3');
};

/* ── Onboarding ONG — Passo 3/4 — Sua região ─────────────────────────────────── */
route('onboard-o3', async () => {
  // Save profile first
  const btn_text = 'Concluir cadastro →';
  setApp(`<div class="screen"><div class="loading">Salvando perfil…</div></div>`);

  try {
    if (!Auth.loggedIn) {
      const email = window._oData?.email;
      const pwd   = window._oData?.password;
      const reg = await api('POST', '/auth/register', { email, password: pwd, tipo: 'ong' });
      Auth.set(reg.token, reg.user);
    }
    await api('PUT', '/ngo/profile', window._oData || {});
    const { restaurants } = await api('GET', '/restaurants');

    setApp(`
      <div class="screen">
        ${topbar({ back: "navigate('onboard-o2')", step: '3 de 4' })}
        <div class="screen-content no-nav">
          <h3 style="margin-bottom:4px;">Sua região</h3>
          <p style="margin-bottom:16px;">Restaurantes cadastrados próximos de você.</p>
          ${restaurants.length === 0
            ? `<div class="empty"><div class="empty-icon">🗺️</div><div class="empty-title">Ainda sem restaurantes</div><div class="empty-sub">Mas sua ONG já está visível para quando chegarem!</div></div>`
            : `<div class="info-box"><span class="info-box-icon">🎉</span><span class="info-box-text">Há <strong>${restaurants.length}</strong> restaurante(s) cadastrado(s) na sua região. Ao concluir o cadastro, você poderá buscar parceiros ou receber propostas.</span></div>
               <div style="margin-top:14px;">
                 ${restaurants.slice(0,4).map(r => `
                   <div class="ong-item" style="cursor:default;">
                     <div class="ong-item-body">
                       <div class="ong-item-name">${r.nome}</div>
                       <div class="ong-item-sub">${r.bairro || ''}</div>
                       <div class="ong-item-tags">${(r.food_types||[]).slice(0,2).map(t => `<span class="badge badge-green">${t}</span>`).join('')}</div>
                     </div>
                   </div>`).join('')}
               </div>`}
          <button class="btn btn-primary" style="margin-top:24px;" onclick="navigate('onboard-o4')">Concluir cadastro →</button>
        </div>
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    navigate('inicio');
  }
});

/* ── Onboarding ONG — Passo 4/4 — Concluído ─────────────────────────────────── */
route('onboard-o4', () => {
  setApp(`
    <div class="screen">
      ${topbar({ logo: true })}
      <div class="screen-content no-nav">
        <div class="success-wrap">
          <div class="success-icon">✓</div>
          <div class="success-title">Cadastro concluído!</div>
          <div class="success-sub">Sua ONG já está visível para restaurantes da região.</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="type-option" onclick="navigate('restaurantes')">
            <div class="type-icon green">🔍</div>
            <div>
              <div class="type-title">Buscar restaurante</div>
              <div class="type-desc">Encontre e proponha um acordo.</div>
            </div>
            <svg class="type-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="type-option" onclick="navigate('inicio')">
            <div class="type-icon orange">⏳</div>
            <div>
              <div class="type-title">Aguardar propostas</div>
              <div class="type-desc">Restaurantes podem encontrar você.</div>
            </div>
            <svg class="type-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>`);
});

/* ── Início ───────────────────────────────────────────────────────────────────── */
route('inicio', async () => {
  setApp(`<div class="screen">${topbar({ logo: true })}<div class="loading">Carregando…</div></div>`);

  try {
    const { agreements } = await api('GET', '/agreements');
    const ativos = agreements.filter(a => a.status === 'ativo');
    const tipo   = Auth.tipo;
    const nomeLabel = tipo === 'restaurante' ? 'ONGs parceiras' : 'Restaurantes parceiros';

    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content">
          <div style="margin-bottom:20px;">
            <p class="eyebrow">Bem-vindo de volta</p>
            <h2 style="margin-bottom:4px;">Olá! 👋</h2>
            <p>${ativos.length} acordo(s) ativo(s)</p>
          </div>

          ${ativos.length === 0
            ? `<div class="empty" style="padding:32px 0;">
                 <div class="empty-icon">🌱</div>
                 <div class="empty-title">Nenhum acordo ativo ainda</div>
                 <div class="empty-sub">Encontre um parceiro e proponha um acordo.</div>
                 <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="navigate('${tipo === 'restaurante' ? 'ongs' : 'restaurantes'}')">
                   Encontrar parceiro →
                 </button>
               </div>`
            : `<div class="section-title">${nomeLabel}</div>
               ${ativos.map(a => `
                 <div class="acordo-banner" style="margin-bottom:10px;">
                   <div class="acordo-banner-header">
                     <span class="acordo-banner-name">${a.ngo_nome || a.restaurant_nome || 'Parceiro'}</span>
                     <span class="badge badge-active">Acordo ativo</span>
                   </div>
                   <div class="acordo-banner-info">
                     <span class="acordo-banner-detail">📅 ${formatDias(a.dias) || 'Dias não informados'}</span>
                     <span class="acordo-banner-detail">📦 ${a.volume}</span>
                   </div>
                   <div style="padding:0 14px 14px;display:flex;gap:8px;">
                     <button class="btn btn-primary btn-sm" onclick="navigate('chat',{agreementId:${a.id}})">💬 Chat</button>
                     <button class="btn btn-secondary btn-sm" onclick="navigate('acordo',{id:${a.id}})">Ver acordo</button>
                   </div>
                 </div>`).join('')}`}

          ${agreements.filter(a => a.status === 'pendente').length > 0
            ? `<div class="section-title" style="margin-top:20px;">Propostas pendentes</div>
               ${agreements.filter(a => a.status === 'pendente').map(a => `
                 <div class="agreement-item" onclick="navigate('acordo',{id:${a.id}})">
                   <div>
                     <div style="font-size:15px;font-weight:600;color:var(--text)">${a.ngo_nome || a.restaurant_nome || 'Parceiro'}</div>
                     <div style="font-size:12px;color:var(--text-3);margin-top:2px;">${a.food_type} · ${a.volume}</div>
                   </div>
                   <span class="badge badge-orange">Pendente</span>
                 </div>`).join('')}`
            : ''}
        </div>
        ${bottomNav('inicio')}
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
  }
});

/* ── 404 ─────────────────────────────────────────────────────────────────────── */
route('404', () => {
  navigate(Auth.loggedIn ? 'inicio' : 'landing');
});
