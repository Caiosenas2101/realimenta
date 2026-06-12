/* ═══════════════════════════════════════════════════════════════════════════
   ReAlimenta — Telas principais
   (ONGs, Restaurantes, Perfil, Propor acordo, Status, Chat, Impacto)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Lista de ONGs (para restaurante) ───────────────────────────────────────── */
route('ongs', async () => {
  setApp(`<div class="screen">${topbar({ logo: true })}<div class="loading">Carregando ONGs…</div></div>`);
  try {
    const { ngos } = await api('GET', '/ngos');
    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content">
          <h3 style="margin-bottom:4px;">Encontre uma ONG</h3>
          <p style="margin-bottom:14px;">ONGs próximas compatíveis com seu perfil de doação.</p>
          <div class="search-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input class="search-input" id="search" placeholder="Buscar por nome…" oninput="filterONGs()" />
          </div>
          <div id="ong-list">
            ${renderONGList(ngos)}
          </div>
        </div>
        ${bottomNav('ongs')}
      </div>`);

    window._allNGOs = ngos;
  } catch (e) {
    toast(e.message, 'error');
  }
});

function renderONGList(ngos) {
  if (!ngos.length) return `
    <div class="empty">
      <div class="empty-icon">🤝</div>
      <div class="empty-title">Nenhuma ONG encontrada</div>
      <div class="empty-sub">Tente buscar por outro nome ou aguarde novas ONGs se cadastrarem.</div>
    </div>`;

  return ngos.map(n => `
    <div class="ong-item" onclick="navigate('ong-perfil',{id:${n.id}})">
      <div class="ong-item-body">
        <div class="ong-item-name">${n.nome}</div>
        <div class="ong-item-sub">${[n.bairro, n.cidade].filter(Boolean).join(' · ') || 'Localização não informada'}</div>
        <div class="ong-item-tags">
          ${n.days?.slice(0,3).map(d => `<span class="badge badge-green">${d}</span>`).join('') || ''}
          ${n.capacity ? `<span class="badge badge-gray">${n.capacity}</span>` : ''}
        </div>
        ${n.acordos_ativos > 0 ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px;">🤝 ${n.acordos_ativos} acordo(s) ativo(s)</div>` : ''}
      </div>
      <svg class="ong-item-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>`).join('');
}

window.filterONGs = () => {
  const q = document.getElementById('search').value.toLowerCase();
  const filtered = (window._allNGOs || []).filter(n =>
    n.nome.toLowerCase().includes(q) ||
    (n.bairro || '').toLowerCase().includes(q)
  );
  document.getElementById('ong-list').innerHTML = renderONGList(filtered);
};

/* ── Perfil da ONG ───────────────────────────────────────────────────────────── */
route('ong-perfil', async (params) => {
  const id = params.id || params._id;
  setApp(`<div class="screen">${topbar({ back: "navigate('ongs')" })}<div class="loading">Carregando…</div></div>`);
  try {
    const { ngo } = await api('GET', `/ngos/${id}`);
    const days = (ngo.days || []).join(', ') || '—';
    setApp(`
      <div class="screen">
        ${topbar({ back: "navigate('ongs')", title: '' })}
        <div class="screen-content no-nav" style="padding-bottom:100px;">
          <div class="ong-profile-header">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div class="ong-profile-name">${ngo.nome}</div>
              <svg width="18" height="18" fill="none" viewBox="0 0 18 18" style="color:var(--text-3)"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M9 8v4M9 6h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </div>
            <div class="ong-profile-addr">
              📍 ${[ngo.endereco, ngo.bairro, ngo.cidade].filter(Boolean).join(' — ') || 'Endereço não informado'}
            </div>
            <div class="ong-profile-desc">Organização parceira cadastrada na plataforma ReAlimenta.</div>
          </div>

          <div class="profile-stat-row">
            <div class="profile-stat">
              <div class="profile-stat-val">📅</div>
              <div class="profile-stat-val" style="font-size:18px;">${ngo.acordos_ativos || 0}</div>
              <div class="profile-stat-label">acordos ativos</div>
            </div>
            <div class="profile-stat-divider"></div>
            <div class="profile-stat">
              <div class="profile-stat-val">🤝</div>
              <div class="profile-stat-val" style="font-size:18px;">${ngo.parceiros_totais || 0}</div>
              <div class="profile-stat-label">parceiros totais</div>
            </div>
            ${ngo.membro_desde ? `<div class="profile-stat-divider"></div>
            <div class="profile-stat">
              <div class="profile-stat-val">🗓️</div>
              <div class="profile-stat-val" style="font-size:14px;">${ngo.membro_desde}</div>
              <div class="profile-stat-label">na plataforma</div>
            </div>` : ''}
          </div>

          <div class="divider"></div>

          <div class="section-title">Alimentos aceitos</div>
          <div class="chips" style="margin-bottom:16px;">
            ${(ngo.restrictions || []).length === 0
              ? '<span class="badge badge-green">Sem restrições</span>'
              : (ngo.restrictions || []).map(r => `<span class="badge badge-gray">${r}</span>`).join('')}
          </div>

          <div class="section-title">Dias disponíveis</div>
          <div class="chips" style="margin-bottom:4px;">
            ${(ngo.days || []).map(d => `<span class="chip active" style="pointer-events:none;">${d}</span>`).join('') || '—'}
          </div>
          ${ngo.hours ? `<p style="font-size:13px;color:var(--text-3);margin-top:8px;">🕐 ${ngo.hours}</p>` : ''}

          ${ngo.capacity ? `
          <div class="section-title" style="margin-top:16px;">Capacidade de recebimento</div>
          <span class="badge badge-green">${ngo.capacity}</span>` : ''}

          <div class="section-title" style="margin-top:20px;">O que parceiros dizem</div>
          <div class="review">
            <div class="stars">★★★★★</div>
            <div class="review-text">"Sempre pontual, comunicação excelente."</div>
            <div class="review-author">— Restaurante Vila Rica</div>
          </div>
          <div class="review">
            <div class="stars">★★★★★</div>
            <div class="review-text">"Parceria confiável há 6 meses."</div>
            <div class="review-author">— Padaria do João</div>
          </div>
        </div>

        <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;padding:16px 20px;background:var(--bg);border-top:1px solid var(--border);">
          <button class="btn btn-orange" onclick="navigate('propor-acordo',{ngoId:${ngo.id},ngoNome:'${encodeURIComponent(ngo.nome)}'})">
            Propor acordo
          </button>
        </div>
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    navigate('ongs');
  }
});

/* ── Propor acordo ───────────────────────────────────────────────────────────── */
route('propor-acordo', (params) => {
  const ngoId  = params.ngoId || params._id;
  const ngoNome = decodeURIComponent(params.ngoNome || 'ONG');

  setApp(`
    <div class="screen">
      ${topbar({ back: `navigate('ong-perfil',{id:${ngoId}})`, title: '' })}
      <div class="screen-content no-nav" style="padding-bottom:140px;">
        <div style="margin-bottom:20px;">
          <p style="font-size:13px;color:var(--text-3);">Propor acordo</p>
          <h3>para ${ngoNome}</h3>
        </div>

        <div class="section-title">📅 Dias de coleta</div>
        <div class="chips" id="diasChips">
          ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
            .map(d => `<button class="chip" data-value="${d}">${d}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">🕐 Horário preferido</div>
        <div class="time-chips" id="horarioChips">
          ${['08:00','10:00','12:00','14:00','16:00','18:00']
            .map(h => `<button class="time-chip" data-value="${h}">${h}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">📦 Volume estimado</div>
        <div class="chips" id="volChips">
          ${['Até 10kg','10-30kg','30-50kg','50-100kg']
            .map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">🥦 Tipo de alimento</div>
        <div class="chips" id="foodChips">
          ${['Pratos preparados','Hortifruti','Padaria','Laticínios','Carnes e proteínas','Enlatados e secos']
            .map(f => `<button class="chip" data-value="${f}">${f}</button>`).join('')}
        </div>

        <div class="proposal-summary" id="summary" style="display:none;">
          <div class="proposal-summary-title">Resumo da proposta</div>
          <div class="proposal-summary-val" id="summary-val"></div>
        </div>

        <p id="err" class="error-msg" style="margin-bottom:8px;"></p>
      </div>

      <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;padding:16px 20px;background:var(--bg);border-top:1px solid var(--border);">
        <button class="btn btn-orange" id="sendBtn" onclick="enviarProposta(${ngoId})">Enviar proposta →</button>
      </div>
    </div>`);

  // Init chips
  initChips(document.getElementById('diasChips'));
  initChips(document.getElementById('volChips'), true);
  initChips(document.getElementById('foodChips'), true);

  // Time chips (single select)
  document.getElementById('horarioChips').querySelectorAll('.time-chip').forEach(c => {
    c.addEventListener('click', () => {
      document.getElementById('horarioChips').querySelectorAll('.time-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      updateSummary();
    });
  });

  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', updateSummary));

  function updateSummary() {
    const dias    = getActiveChips(document.getElementById('diasChips'));
    const horario = [...document.getElementById('horarioChips').querySelectorAll('.time-chip.active')].map(c => c.dataset.value)[0];
    const vol     = getActiveChips(document.getElementById('volChips'))[0];
    const food    = getActiveChips(document.getElementById('foodChips'))[0];
    if (dias.length && horario && vol && food) {
      document.getElementById('summary').style.display = 'block';
      document.getElementById('summary-val').textContent = `${dias.join(', ')} às ${horario} · ${vol} de ${food}`;
    }
  }
});

window.enviarProposta = async (ngoId) => {
  const dias    = getActiveChips(document.getElementById('diasChips'));
  const horario = [...document.getElementById('horarioChips').querySelectorAll('.time-chip.active')].map(c => c.dataset.value)[0];
  const volume  = getActiveChips(document.getElementById('volChips'))[0];
  const food    = getActiveChips(document.getElementById('foodChips'))[0];
  const err     = document.getElementById('err');

  if (!dias.length)  { err.textContent = 'Selecione os dias de coleta.'; return; }
  if (!horario)      { err.textContent = 'Selecione o horário.'; return; }
  if (!volume)       { err.textContent = 'Selecione o volume.'; return; }
  if (!food)         { err.textContent = 'Selecione o tipo de alimento.'; return; }
  err.textContent = '';

  const btn = document.getElementById('sendBtn');
  btn.disabled = true; btn.textContent = 'Enviando…';

  try {
    const { agreement } = await api('POST', '/agreements', {
      ngo_id: Number(ngoId), dias, horario, volume, food_type: food
    });
    navigate('proposta-enviada', { agreementId: agreement.id });
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Enviar proposta →';
  }
};

/* ── Proposta enviada — status ───────────────────────────────────────────────── */
route('proposta-enviada', async (params) => {
  const aId = params.agreementId || params._id;
  setApp(`<div class="screen">${topbar({ back: "navigate('ongs')" })}<div class="loading">Carregando…</div></div>`);

  try {
    const { agreement: a } = await api('GET', `/agreements/${aId}`);
    const isPendente = a.status === 'pendente';

    setApp(`
      <div class="screen">
        ${topbar({ back: "navigate('inicio')" })}
        <div class="screen-content no-nav">
          <div class="success-wrap">
            <div class="success-icon" style="background:${isPendente ? 'var(--orange-light)' : 'var(--green-light)'};">
              ${isPendente ? '⏳' : '✓'}
            </div>
            <div class="success-title">${isPendente ? 'Proposta enviada' : 'Acordo ativo!'}</div>
            <div class="success-sub">Agora é com ${a.ngo_nome || 'a ONG'}.</div>
          </div>

          <div class="section-title">Status em tempo real</div>
          <div class="status-track">
            <div class="status-step">
              <div class="status-dot done"></div>
              <div>
                <div class="status-step-label">Proposta enviada</div>
                <div class="status-step-sub">Hoje às ${a.created_at ? a.created_at.slice(11, 16) : ''}</div>
              </div>
            </div>
            <div class="status-step">
              <div class="status-dot ${a.status === 'pendente' ? 'pending' : 'done'}"></div>
              <div>
                <div class="status-step-label">Aguardando análise</div>
                <div class="status-step-sub">A ONG tem até 48h para responder.</div>
              </div>
            </div>
            <div class="status-step">
              <div class="status-dot ${a.status === 'ativo' ? 'done' : ''}"></div>
              <div>
                <div class="status-step-label">Resposta da ONG</div>
                <div class="status-step-sub">${a.status === 'ativo' ? 'Acordo aceito! ✅' : a.status === 'recusado' ? 'Proposta recusada.' : 'Aguardando…'}</div>
              </div>
            </div>
          </div>

          <div class="info-box">
            <span class="info-box-icon">🔔</span>
            <span class="info-box-text">Você receberá uma notificação assim que a ONG responder. A maioria das respostas acontece em menos de 24 horas.</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;margin-top:24px;">
            <button class="btn btn-primary" onclick="navigate('chat',{agreementId:${a.id}})">💬 Enviar mensagem para a ONG</button>
            <button class="btn btn-ghost" onclick="navigate('inicio')">Voltar ao início</button>
          </div>
        </div>
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    navigate('inicio');
  }
});

/* ── Acordo (detalhe + aceitar/recusar para ONG) ─────────────────────────────── */
route('acordo', async (params) => {
  const aId = params.id || params._id;
  setApp(`<div class="screen">${topbar({ back: "navigate('inicio')" })}<div class="loading">Carregando…</div></div>`);

  try {
    const { agreement: a } = await api('GET', `/agreements/${aId}`);
    const tipo = Auth.tipo;
    const partnerName = a.ngo_nome || a.restaurant_nome || 'Parceiro';
    const dias = Array.isArray(a.dias) ? a.dias.join(', ') : (JSON.parse(a.dias || '[]')).join(', ');
    const canRespond = a.status === 'pendente' && (
      (tipo === 'ong'         && a.iniciado_por === 'restaurante') ||
      (tipo === 'restaurante' && a.iniciado_por === 'ong')
    );

    setApp(`
      <div class="screen">
        ${topbar({ back: "navigate('inicio')", title: partnerName })}
        <div class="screen-content no-nav" style="padding-bottom:${canRespond ? '120px' : '24px'};">
          <div class="card" style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <h3>${partnerName}</h3>
              <span class="badge ${a.status === 'ativo' ? 'badge-active' : a.status === 'pendente' ? 'badge-orange' : 'badge-gray'}">${a.status}</span>
            </div>
            <div class="summary-row" style="padding:8px 0;">
              <span class="summary-icon">📅</span>
              <div><div class="summary-label">Dias de coleta</div><div class="summary-value">${dias}</div></div>
            </div>
            <div class="summary-row" style="padding:8px 0;">
              <span class="summary-icon">🕐</span>
              <div><div class="summary-label">Horário</div><div class="summary-value">${a.horario}</div></div>
            </div>
            <div class="summary-row" style="padding:8px 0;">
              <span class="summary-icon">📦</span>
              <div><div class="summary-label">Volume</div><div class="summary-value">${a.volume}</div></div>
            </div>
            <div class="summary-row" style="padding:8px 0;">
              <span class="summary-icon">🥦</span>
              <div><div class="summary-label">Tipo de alimento</div><div class="summary-value">${a.food_type}</div></div>
            </div>
          </div>

          ${a.status === 'ativo' ? `
            <button class="btn btn-primary" onclick="navigate('chat',{agreementId:${a.id}})">💬 Abrir chat</button>
            <button class="btn btn-secondary" style="margin-top:8px;" onclick="encerrarAcordo(${a.id})">Encerrar acordo</button>` : ''}
          ${a.status === 'pendente' && tipo === 'restaurante' && a.iniciado_por === 'restaurante' ? `
            <div class="info-box"><span class="info-box-icon">⏳</span><span class="info-box-text">Aguardando resposta da ONG.</span></div>` : ''}
          ${a.status === 'pendente' && tipo === 'ong' && a.iniciado_por === 'ong' ? `
            <div class="info-box"><span class="info-box-icon">⏳</span><span class="info-box-text">Aguardando resposta do restaurante.</span></div>` : ''}
          <p id="err" class="error-msg" style="margin-top:12px;"></p>
        </div>

        ${canRespond ? `
          <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;padding:16px 20px;background:var(--bg);border-top:1px solid var(--border);display:flex;gap:10px;">
            <button class="btn btn-secondary" style="flex:1;" onclick="responderAcordo(${a.id},'reject')">Recusar</button>
            <button class="btn btn-primary"   style="flex:2;" onclick="responderAcordo(${a.id},'accept')">✓ Aceitar acordo</button>
          </div>` : ''}
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    navigate('inicio');
  }
});

window.responderAcordo = async (id, action) => {
  try {
    await api('PATCH', `/agreements/${id}/${action}`);
    toast(action === 'accept' ? 'Acordo aceito! ✅' : 'Proposta recusada.');
    navigate('inicio');
  } catch (e) {
    document.getElementById('err').textContent = e.message;
  }
};

window.encerrarAcordo = async (id) => {
  if (!confirm('Tem certeza que quer encerrar este acordo?')) return;
  try {
    await api('PATCH', `/agreements/${id}/close`);
    toast('Acordo encerrado.');
    navigate('inicio');
  } catch (e) {
    document.getElementById('err').textContent = e.message;
  }
};

/* ── Lista de restaurantes (para ONG) ────────────────────────────────────────── */
route('restaurantes', async () => {
  setApp(`<div class="screen">${topbar({ logo: true })}<div class="loading">Carregando…</div></div>`);
  try {
    const { restaurants } = await api('GET', '/restaurants');
    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content">
          <h3 style="margin-bottom:4px;">Encontre um restaurante</h3>
          <p style="margin-bottom:14px;">Restaurantes cadastrados na plataforma.</p>
          <div class="search-wrap">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" stroke-width="1.6" stroke-linecap="round">
              <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
            </svg>
            <input class="search-input" id="search" placeholder="Buscar por nome…" oninput="filterRestaurantes()" />
          </div>
          <div id="rest-list">
            ${renderRestList(restaurants)}
          </div>
        </div>
        ${bottomNav('restaurantes')}
      </div>`);
    window._allRestaurantes = restaurants;
  } catch (e) {
    toast(e.message, 'error');
  }
});

function renderRestList(list) {
  if (!list.length) return `
    <div class="empty">
      <div class="empty-icon">🏪</div>
      <div class="empty-title">Nenhum restaurante encontrado</div>
      <div class="empty-sub">Aguarde novos restaurantes se cadastrarem.</div>
    </div>`;

  return list.map(r => `
    <div class="ong-item" onclick="navigate('restaurante-perfil',{id:${r.id}})">
      <div class="ong-item-body">
        <div class="ong-item-name">${r.nome}</div>
        <div class="ong-item-sub">${[r.bairro, r.cidade].filter(Boolean).join(' · ') || 'Localização não informada'}</div>
        <div class="ong-item-tags">
          ${(r.food_types || []).slice(0,2).map(t => `<span class="badge badge-green">${t}</span>`).join('')}
          ${r.frequency ? `<span class="badge badge-gray">${r.frequency}</span>` : ''}
        </div>
      </div>
      <svg class="ong-item-arrow" width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>`).join('');
}

window.filterRestaurantes = () => {
  const q = document.getElementById('search').value.toLowerCase();
  const filtered = (window._allRestaurantes || []).filter(r =>
    r.nome.toLowerCase().includes(q) ||
    (r.bairro || '').toLowerCase().includes(q)
  );
  document.getElementById('rest-list').innerHTML = renderRestList(filtered);
};

/* ── Perfil do restaurante (para ONG) ────────────────────────────────────────── */
route('restaurante-perfil', async (params) => {
  const id = params.id || params._id;
  setApp(`<div class="screen">${topbar({ back: "navigate('restaurantes')" })}<div class="loading">Carregando…</div></div>`);
  try {
    const { restaurant: r } = await api('GET', `/restaurants/${id}`);
    setApp(`
      <div class="screen">
        ${topbar({ back: "navigate('restaurantes')" })}
        <div class="screen-content no-nav" style="padding-bottom:100px;">
          <h2 style="margin-bottom:4px;">${r.nome}</h2>
          <p style="margin-bottom:16px;">📍 ${[r.bairro, r.cidade].filter(Boolean).join(', ') || 'Localização não informada'}</p>

          <div class="section-title">Alimentos doados</div>
          <div class="chips" style="margin-bottom:16px;">
            ${(r.food_types || []).map(t => `<span class="badge badge-green">${t}</span>`).join('') || '<span class="badge badge-gray">Não informado</span>'}
          </div>

          ${r.frequency ? `
          <div class="section-title">Frequência de doação</div>
          <span class="badge badge-gray" style="margin-bottom:16px;display:inline-flex;">${r.frequency}</span>` : ''}

          ${r.volume_range ? `
          <div class="section-title">Volume por doação</div>
          <span class="badge badge-green" style="margin-bottom:16px;display:inline-flex;">${r.volume_range}</span>` : ''}
        </div>

        <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;padding:16px 20px;background:var(--bg);border-top:1px solid var(--border);">
          <button class="btn btn-orange" onclick="navigate('propor-acordo-ong',{restauranteId:${r.id},restauranteNome:'${encodeURIComponent(r.nome)}'})">
            Propor acordo
          </button>
        </div>
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    navigate('restaurantes');
  }
});

/* ── Propor acordo (ONG → Restaurante) ───────────────────────────────────────── */
route('propor-acordo-ong', (params) => {
  const rId   = params.restauranteId || params._id;
  const rNome = decodeURIComponent(params.restauranteNome || 'Restaurante');

  setApp(`
    <div class="screen">
      ${topbar({ back: `navigate('restaurante-perfil',{id:${rId}})` })}
      <div class="screen-content no-nav" style="padding-bottom:140px;">
        <div style="margin-bottom:20px;">
          <p style="font-size:13px;color:var(--text-3);">Propor acordo</p>
          <h3>para ${rNome}</h3>
        </div>

        <div class="section-title">📅 Dias disponíveis</div>
        <div class="chips" id="diasChips">
          ${['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
            .map(d => `<button class="chip" data-value="${d}">${d}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">🕐 Horário preferido</div>
        <div class="time-chips" id="horarioChips">
          ${['08:00','10:00','12:00','14:00','16:00','18:00']
            .map(h => `<button class="time-chip" data-value="${h}">${h}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">📦 Volume que consegue receber</div>
        <div class="chips" id="volChips">
          ${['Até 10kg','10-30kg','30-50kg','50-100kg']
            .map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('')}
        </div>

        <div class="section-title" style="margin-top:20px;">🥦 Tipo de alimento</div>
        <div class="chips" id="foodChips">
          ${['Pratos preparados','Hortifruti','Padaria','Laticínios','Carnes e proteínas','Enlatados e secos']
            .map(f => `<button class="chip" data-value="${f}">${f}</button>`).join('')}
        </div>

        <p id="err" class="error-msg" style="margin-top:12px;"></p>
      </div>

      <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;padding:16px 20px;background:var(--bg);border-top:1px solid var(--border);">
        <button class="btn btn-orange" id="sendBtn" onclick="enviarPropostaONG(${rId})">Enviar proposta →</button>
      </div>
    </div>`);

  initChips(document.getElementById('diasChips'));
  initChips(document.getElementById('volChips'), true);
  initChips(document.getElementById('foodChips'), true);
  document.getElementById('horarioChips').querySelectorAll('.time-chip').forEach(c => {
    c.addEventListener('click', () => {
      document.getElementById('horarioChips').querySelectorAll('.time-chip').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
    });
  });
});

window.enviarPropostaONG = async (restauranteId) => {
  const dias    = getActiveChips(document.getElementById('diasChips'));
  const horario = [...document.getElementById('horarioChips').querySelectorAll('.time-chip.active')].map(c => c.dataset.value)[0];
  const volume  = getActiveChips(document.getElementById('volChips'))[0];
  const food    = getActiveChips(document.getElementById('foodChips'))[0];
  const err     = document.getElementById('err');
  if (!dias.length || !horario || !volume || !food) { err.textContent = 'Preencha todos os campos.'; return; }
  err.textContent = '';
  const btn = document.getElementById('sendBtn');
  btn.disabled = true; btn.textContent = 'Enviando…';
  try {
    const { agreement } = await api('POST', '/agreements', {
      restaurant_id: Number(restauranteId), dias, horario, volume, food_type: food
    });
    navigate('proposta-enviada', { agreementId: agreement.id });
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Enviar proposta →';
  }
};

/* ── Chat ─────────────────────────────────────────────────────────────────────── */
route('chat', async (params) => {
  const aId = params.agreementId || params._id;

  // Se não tem agreementId, busca acordos e usa o primeiro ativo
  if (!aId) {
    try {
      const { agreements } = await api('GET', '/agreements');
      const ativo = agreements.find(a => a.status === 'ativo');
      if (ativo) return navigate('chat', { agreementId: ativo.id });
    } catch {}
    setApp(`<div class="screen">${bottomNav('chat')}<div class="empty" style="flex:1;"><div class="empty-icon">💬</div><div class="empty-title">Nenhum acordo ativo</div><div class="empty-sub">Faça um acordo para conversar.</div></div></div>`);
    return;
  }

  setApp(`<div class="screen">${topbar({ back: "navigate('inicio')" })}<div class="loading">Carregando…</div></div>`);

  try {
    const { agreement: a } = await api('GET', `/agreements/${aId}`);
    const partnerName = a.ngo_nome || a.restaurant_nome || 'Parceiro';
    const { messages, proxima_coleta } = await api('GET', `/agreements/${aId}/messages`);

    renderChat(a, messages, proxima_coleta, partnerName);
    window._chatAgreementId = aId;
  } catch (e) {
    toast(e.message, 'error');
    navigate('inicio');
  }
});

function renderChat(a, messages, proxima_coleta, partnerName) {
  const dias = Array.isArray(a.dias) ? a.dias.join(', ') : (JSON.parse(a.dias || '[]')).join(', ');
  const isActive = a.status === 'ativo';
  const isRestaurant = Auth.tipo === 'restaurante';
  const statusClass = isActive ? 'badge-active' : a.status === 'pendente' ? 'badge-orange' : 'badge-gray';
  setApp(`
    <div class="screen" style="height:100vh;">
      ${topbar({ back: "navigate('inicio')", title: partnerName })}
      <div style="padding:8px 16px;background:var(--bg-gray);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span class="badge ${statusClass}">Acordo ${a.status}</span>
          <span style="font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📅 ${dias} · 📦 ${a.volume}</span>
        </div>
        ${isActive && isRestaurant ? `<button class="btn-coleta" onclick="abrirModalColeta(${a.id})">📦 Registrar coleta</button>` : ''}
      </div>
      <div class="chat-area" id="chatArea">
        ${messages.map(m => renderMessage(m)).join('')}
        ${proxima_coleta ? `<div class="msg-reminder">Lembrete: próxima coleta ${proxima_coleta}</div>` : ''}
        ${messages.length === 0 ? `<div class="msg-reminder">Início da conversa — diga olá!</div>` : ''}
        ${!isActive ? `<div class="msg-reminder">Este acordo está ${a.status}; o envio de novas mensagens está bloqueado.</div>` : ''}
      </div>
      <div class="chat-input-bar">
        <input class="chat-input" id="msgInput" placeholder="${isActive ? 'Escreva uma mensagem…' : 'Chat indisponível para acordo não ativo'}" ${isActive ? '' : 'disabled'} />
        <button class="chat-send" onclick="sendMessage()" ${isActive ? '' : 'disabled'}>
          <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M16 2L2 8l5 3 3 5 6-14z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/></svg>
        </button>
      </div>
      ${bottomNav('chat')}
    </div>`);

  // Controle de mensagens já renderizadas (evita duplicatas entre carga inicial e stream)
  window._chatRenderedIds = new Set(messages.map(m => m.id));
  window._chatCanSend = isActive;

  // Scroll to bottom
  const area = document.getElementById('chatArea');
  if (area) area.scrollTop = area.scrollHeight;

  document.getElementById('msgInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Conecta o stream em tempo real apenas para chats ativos
  if (isActive) {
    startChatStream(a.id);
  } else if (window._chatES) {
    try { window._chatES.close(); } catch {}
    window._chatES = null;
  }
}

function appendMessage(m) {
  if (!m || m.id == null) return;
  if (!window._chatRenderedIds) window._chatRenderedIds = new Set();
  if (window._chatRenderedIds.has(m.id)) return;
  window._chatRenderedIds.add(m.id);

  const area = document.getElementById('chatArea');
  if (!area) return;
  area.insertAdjacentHTML('beforeend', renderMessage(m));
  area.scrollTop = area.scrollHeight;
}

function startChatStream(agreementId) {
  // Fecha um stream anterior, se houver
  if (window._chatES) { try { window._chatES.close(); } catch {} window._chatES = null; }
  if (!Auth.token || typeof EventSource === 'undefined') return;

  const url = `${API}/agreements/${agreementId}/messages/stream?token=${encodeURIComponent(Auth.token)}`;
  const es = new EventSource(url);
  es.addEventListener('message', e => {
    try { appendMessage(JSON.parse(e.data)); } catch {}
  });
  // Em erro o próprio navegador tenta reconectar automaticamente.
  window._chatES = es;
}

function renderMessage(m) {
  const isMe = m.sender_id === Auth.user?.id;
  const time = m.created_at ? m.created_at.slice(11, 16) : '';
  return `
    <div class="msg ${isMe ? 'mine' : 'theirs'}">
      <div class="msg-bubble">${escHtml(m.texto)}</div>
      <div class="msg-time">${time}</div>
    </div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

window.abrirModalColeta = (agreementId) => {
  const existing = document.getElementById('modalColeta');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'modalColeta';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">📦 Registrar coleta</div>
      <p class="modal-sub">Informe o volume de alimentos coletados nesta entrega.</p>
      <div style="margin:16px 0;">
        <label class="field-label">Volume (kg)</label>
        <input id="coletaKg" type="number" min="0.1" step="0.1" placeholder="Ex: 25" class="input" style="margin-top:6px;" autofocus />
      </div>
      <p id="coletaErr" class="error-msg"></p>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <button class="btn btn-secondary" style="flex:1;" onclick="fecharModalColeta()">Cancelar</button>
        <button class="btn btn-primary" style="flex:2;" onclick="confirmarColeta(${agreementId})">Confirmar coleta</button>
      </div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) fecharModalColeta(); });
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('modal-visible'));
  document.getElementById('coletaKg').focus();
};

window.fecharModalColeta = () => {
  const modal = document.getElementById('modalColeta');
  if (!modal) return;
  modal.classList.remove('modal-visible');
  setTimeout(() => modal.remove(), 200);
};

window.confirmarColeta = async (agreementId) => {
  const input = document.getElementById('coletaKg');
  const err   = document.getElementById('coletaErr');
  const kg    = parseFloat(input.value);
  if (!kg || kg <= 0) { err.textContent = 'Informe um volume válido.'; return; }

  const btn = document.querySelector('#modalColeta .btn-primary');
  btn.disabled = true; btn.textContent = 'Registrando…';

  try {
    await api('POST', `/agreements/${agreementId}/donations`, { volume_kg: kg });
    fecharModalColeta();
    toast(`✅ ${kg}kg registrados com sucesso!`);
  } catch (e) {
    err.textContent = e.message;
    btn.disabled = false; btn.textContent = 'Confirmar coleta';
  }
};

window.sendMessage = async () => {
  if (!window._chatCanSend) return;
  const input = document.getElementById('msgInput');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  const aId = window._chatAgreementId;

  try {
    // A mensagem salva volta aqui (e também pelo stream); appendMessage deduplica por id.
    const { message } = await api('POST', `/agreements/${aId}/messages`, { texto });
    appendMessage(message);
  } catch (e) {
    toast(e.message, 'error');
    input.value = texto;
  }
};

/* ── Impacto ─────────────────────────────────────────────────────────────────── */
route('impacto', async () => {
  setApp(`<div class="screen">${topbar({ logo: true })}<div class="loading">Carregando…</div></div>`);

  try {
    const tipo     = Auth.tipo;
    const endpoint = tipo === 'restaurante' ? '/restaurant/impact' : '/ngo/impact';
    const data     = await api('GET', endpoint);
    const impact   = data.impact;

    const isRest = tipo === 'restaurante';
    const totalKg = impact.total_kg || 0;
    const mesKg   = impact.mes_atual_kg || 0;

    // ── Gráfico de barras semanal ──────────────────────────────────────────────
    const weekly = impact.weekly_kg || [];
    const maxKg  = Math.max(...weekly.map(w => w.kg), 1);
    const hasWeeklyData = weekly.some(w => w.kg > 0);

    const barChart = `
      <div class="chart-wrap">
        <div class="chart-title">Volume semanal (kg) — últimas 4 semanas</div>
        <div class="bar-chart" style="height:100px;">
          ${weekly.map(w => `
            <div class="bar-col">
              <div class="bar-value">${w.kg > 0 ? w.kg + 'kg' : ''}</div>
              <div class="bar ${w.kg === 0 ? 'bar-empty' : ''}" style="height:${Math.max(Math.round((w.kg / maxKg) * 64), w.kg > 0 ? 4 : 0)}px;"></div>
              <div class="bar-label">${w.label}</div>
            </div>`).join('')}
        </div>
        ${!hasWeeklyData ? '<div style="text-align:center;font-size:12px;color:var(--text-3);margin-top:8px;">Registre doações para ver seu histórico</div>' : ''}
      </div>`;

    // ── Parceiros com barra de progresso ──────────────────────────────────────
    const parceiros = isRest ? (impact.por_ong || []) : (impact.por_restaurante || []);
    const maxParcKg = Math.max(...parceiros.map(p => p.kg), 1);
    const parceirosHtml = parceiros.length > 0
      ? `<div class="section-title">${isRest ? 'Doações por ONG parceira' : 'Recebimentos por restaurante'}</div>
         <div class="card">
           ${parceiros.map(p => `
             <div class="partner-row">
               <div class="partner-info">
                 <span class="partner-name">${escHtml(p.nome || 'Parceiro')}</span>
                 <span class="partner-kg">${p.kg}kg</span>
               </div>
               <div class="partner-bar-track">
                 <div class="partner-bar-fill" style="width:${Math.round((p.kg / maxParcKg) * 100)}%"></div>
               </div>
             </div>`).join('')}
         </div>`
      : '';

    // ── Card do mês atual ──────────────────────────────────────────────────────
    const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    const mesCard = mesKg > 0
      ? `<div class="month-card">
           <div class="month-card-icon">📅</div>
           <div>
             <div class="month-card-label">Em ${mesNome}</div>
             <div class="month-card-value">${mesKg}kg ${isRest ? 'doados' : 'recebidos'}</div>
           </div>
         </div>`
      : '';

    // ── Conquista/destaque ─────────────────────────────────────────────────────
    let achievement = '';
    if (totalKg >= 100) {
      achievement = `<div class="achievement"><span class="achievement-icon">🏆</span><span class="achievement-text">Mais de 100kg doados — você faz a diferença!</span></div>`;
    } else if (totalKg >= 10) {
      achievement = `<div class="achievement"><span class="achievement-icon">⭐</span><span class="achievement-text">${Math.round(100 - totalKg)}kg para atingir 100kg de impacto!</span></div>`;
    } else if (impact.acordos_ativos > 0) {
      achievement = `<div class="achievement"><span class="achievement-icon">🌱</span><span class="achievement-text">Você tem ${impact.acordos_ativos} acordo${impact.acordos_ativos > 1 ? 's' : ''} ativo${impact.acordos_ativos > 1 ? 's' : ''}. Registre a primeira coleta!</span></div>`;
    }

    // ── Tipo mais doado (só restaurante) ──────────────────────────────────────
    const tipoTag = isRest && impact.tipo_mais_doado
      ? `<span style="font-size:12px;background:var(--green-light);color:var(--green);padding:3px 10px;border-radius:var(--radius-pill);font-weight:600;">
           Mais doado: ${impact.tipo_mais_doado}
         </span>`
      : '';

    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content" style="padding-bottom:80px;">

          <!-- Hero -->
          <div class="impact-hero">
            <div class="impact-hero-label">${isRest ? 'Total doado' : 'Total recebido'}</div>
            <div class="impact-hero-value">${totalKg}kg</div>
            <div class="impact-hero-sub">
              = <strong>${impact.refeicoes || 0} refeições</strong> ${isRest ? 'viabilizadas' : 'garantidas'}
              ${isRest && impact.pessoas_estimadas ? `· <strong>${impact.pessoas_estimadas}</strong> pessoas` : ''}
            </div>
            ${tipoTag ? `<div style="margin-top:12px;">${tipoTag}</div>` : ''}
          </div>

          <!-- Mês atual -->
          ${mesCard}

          <!-- Conquista -->
          ${achievement}

          <!-- Grid de stats -->
          <div class="stat-grid" style="margin-bottom:16px;">
            <div class="stat-card">
              <div class="stat-icon">📦</div>
              <div class="stat-value">${impact.total_coletas || 0}</div>
              <div class="stat-label">coletas realizadas</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🤝</div>
              <div class="stat-value">${impact.acordos_ativos || 0}</div>
              <div class="stat-label">acordos ativos</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">${isRest ? '🏥' : '🏪'}</div>
              <div class="stat-value">${impact.parceiros_total || 0}</div>
              <div class="stat-label">${isRest ? 'ONGs parceiras' : 'restaurantes parceiros'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🍽️</div>
              <div class="stat-value">${impact.refeicoes || 0}</div>
              <div class="stat-label">refeições</div>
            </div>
          </div>

          <!-- Gráfico semanal -->
          ${barChart}

          <!-- Parceiros -->
          ${parceirosHtml}

          <button class="btn btn-orange" style="margin-top:24px;" onclick="compartilharImpacto()">
            🔗 Compartilhar impacto
          </button>
        </div>
        ${bottomNav('impacto')}
      </div>`);
  } catch (e) {
    toast(e.message, 'error');
    setApp(`
      <div class="screen">
        ${topbar({ logo: true })}
        <div class="screen-content">
          <div class="empty">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Não foi possível carregar seu impacto</div>
            <div class="empty-sub">${e.message || 'Tente novamente em alguns instantes.'}</div>
            <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="navigate('impacto')">
              Tentar novamente
            </button>
          </div>
        </div>
        ${bottomNav('impacto')}
      </div>`);
  }
});

window.compartilharImpacto = () => {
  const text = 'Estou ajudando a combater o desperdício de alimentos com o ReAlimenta! 🌱';
  if (navigator.share) {
    navigator.share({ title: 'ReAlimenta', text });
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Link copiado!'));
  }
};
