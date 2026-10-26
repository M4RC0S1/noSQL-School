/* Interface da noSQL School: rotas, painel, aulas, simulado, dataset, timer. */
(function () {
  'use strict';
  const C = window.COURSE, E = window.Engine, St = window.Store, cfg = C.config;

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const app = $('#app');
  let uid = 0;

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- índice do curso ---------- */
  const weeks = C.weeks, lessons = [], exById = {};
  weeks.forEach((w) => w.lessons.forEach((l, k) => {
    l.week = w.n; l.pos = k + 1; l.order = lessons.length; lessons.push(l);
    [['guided', 'g'], ['challenge', 'c']].forEach(([role, s]) => {
      const ex = l[role];
      if (ex) { ex.id = l.id + '-' + s; ex.role = role; ex.lessonId = l.id; ex.order = l.order; exById[ex.id] = ex; }
    });
  }));
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]));
  const hasActivities = (l) => !!(l.guided || l.challenge);

  const lessonDone = (l) => {
    if (l.simulado) return St.bestSim() >= cfg.simPass;
    if (!hasActivities(l)) return !!St.state.lessons[l.id];
    return ['guided', 'challenge'].every((r) => !l[r] || St.ex(l[r].id).ok);
  };
  const weekRatio = (w) => w.lessons.filter(lessonDone).length / w.lessons.length;
  const weekUnlocked = (w) => cfg.unlockAll || w.n === 1 || (weekRatio(weeks[w.n - 2]) >= cfg.passRatio && weekUnlocked(weeks[w.n - 2]));

  /* ---------- componente de exercício ---------- */
  /* o.mode: guided | challenge | review | sim ; o.onChange() ; o.onSubmit(ok, resposta) (sim) */
  function mountExercise(host, ex, o) {
    const mode = o.mode, sim = mode === 'sim', id = ++uid;
    const key = mode === 'review' ? 'rev:' + ex.id : ex.id;
    const rec = sim ? { attempts: 0, ok: false, hints: 0, solution: false, code: null } : St.ex(key);
    const solAfter = mode === 'guided' ? 1 : 2;
    const persist = () => { if (!sim) St.save(); };

    host.innerHTML = '<div class="prompt">' + fmt(ex.prompt) + '</div><div class="ex-body"></div><div class="aids"></div><div class="feedback" role="status"></div>';
    const body = $('.ex-body', host), aids = $('.aids', host), fb = $('.feedback', host);
    const setFb = (cls, msg) => { fb.className = 'feedback ' + cls; fb.innerHTML = msg; };

    const solutionHtml = () => {
      if (ex.type === 'query') return '<div class="solution"><strong>Gabarito</strong><pre class="code-block">' + esc(ex.solution) + '</pre></div>';
      if (ex.type === 'mcq') return '<div class="solution"><strong>Gabarito:</strong> ' + fmt(ex.options[ex.answer]) + (ex.explanation ? '<p>' + fmt(ex.explanation) + '</p>' : '') + '</div>';
      const filled = ex.template.replace(/\{\{(\d+)\}\}/g, (_, i) => ex.blanks[i][0]);
      return '<div class="solution"><strong>Gabarito</strong><pre class="code-block">' + esc(filled) + '</pre>' + (ex.explanation ? '<p>' + fmt(ex.explanation) + '</p>' : '') + '</div>';
    };

    function renderAids() {
      if (sim) { aids.innerHTML = ''; return; }
      const hints = ex.hints || [], maxH = Math.min(2, hints.length);
      let html = '';
      if (maxH && !rec.ok) {
        html += hints.slice(0, rec.hints).map((h, i) => '<div class="hint"><strong>💡 Dica ' + (i + 1) + ':</strong> ' + fmt(h) + '</div>').join('');
        if (rec.hints < maxH) html += '<button class="btn ghost sm" data-act="hint">💡 ' + (rec.hints ? 'Outra dica' : 'Pedir dica') + ' (' + rec.hints + '/' + maxH + ')</button> ';
      }
      if (!rec.ok && !rec.solution) {
        if (rec.attempts >= solAfter) html += '<button class="btn ghost sm" data-act="sol">👁 Ver gabarito</button>';
        else if (mode !== 'guided') html += '<span class="muted small">Gabarito liberado após ' + solAfter + ' tentativas (' + rec.attempts + '/' + solAfter + ').</span>';
      }
      if (rec.solution && !rec.ok) html += solutionHtml();
      aids.innerHTML = html;
    }
    aids.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'hint') rec.hints++;
      if (b.dataset.act === 'sol') { rec.solution = true; if (ex.type === 'query') showExpected(); }
      persist(); renderAids();
    });

    function fail(msg) {
      rec.attempts++;
      if (!sim) { if (mode !== 'review') St.markWrong(ex.id, ex.order); }
      persist(); renderAids();
      setFb('bad', '❌ ' + esc(msg));
      o.onChange && o.onChange();
    }
    function success(extra) {
      rec.ok = true;
      if (mode === 'review') { St.ex(ex.id).ok = true; St.clearWrong(ex.id); }
      persist(); renderAids();
      setFb('ok', '✅ Correto! ' + (extra || ''));
      o.onChange && o.onChange();
    }
    const skipBtn = sim ? '<button class="btn ghost" data-act="skip">Pular</button>' : '';

    /* ----- query ----- */
    let showExpected = () => {};
    if (ex.type === 'query') {
      const initial = rec.code != null ? rec.code : (ex.starter || '');
      const rows = Math.max(4, Math.min(12, initial.split('\n').length + 1));
      body.innerHTML =
        '<textarea class="code" spellcheck="false" autocapitalize="off" autocomplete="off" rows="' + rows + '" aria-label="Editor de query"></textarea>' +
        '<div class="row"><button class="btn primary" data-act="run">▶ ' + (sim ? 'Testar' : 'Executar') + '</button>' +
        (sim ? '<button class="btn" data-act="confirm">Confirmar resposta</button>' : '') + skipBtn +
        '<button class="btn ghost" data-act="restore">Restaurar</button><span class="muted small kbd">Ctrl + Enter</span></div>' +
        '<div class="panes' + (sim ? ' single' : '') + '"><section><h5>Seu resultado <small data-c="u"></small></h5><pre class="out" data-p="u">—</pre></section>' +
        (sim ? '' : '<section><h5>Resultado esperado <small data-c="e"></small></h5><pre class="out" data-p="e"></pre></section>') + '</div>';
      const ta = $('textarea', body), uo = $('[data-p=u]', body), uc = $('[data-c=u]', body);
      ta.value = initial;
      const count = (r) => (r && !r.error && Array.isArray(r.result) && !r.wrote ? '· ' + r.result.length + ' doc(s)' : '');
      const showUser = (r) => { uo.textContent = E.display(r, ex); uo.classList.toggle('err', !!r.error); uc.textContent = count(r); };
      showExpected = () => {
        if (sim) return;
        const eo = $('[data-p=e]', body), ec = $('[data-c=e]', body);
        const visible = mode === 'guided' || rec.ok || rec.solution;
        if (!visible) { eo.textContent = 'Escondido no desafio: acerte ou libere o gabarito para ver.'; eo.classList.add('muted'); ec.textContent = ''; return; }
        const r = E.run(ex.solution);
        eo.classList.remove('muted'); eo.textContent = E.display(r, ex); ec.textContent = count(r);
      };
      showExpected();
      if (rec.ok && rec.code) showUser(E.run(rec.code));

      const exec = (confirm) => {
        const code = ta.value;
        if (!code.trim()) { setFb('bad', 'Digite uma query antes de executar.'); return; }
        if (sim) {
          if (confirm) return o.onSubmit(E.evaluate(ex, code).ok, code);
          return showUser(E.run(code));
        }
        rec.code = code;
        const res = E.evaluate(ex, code);
        showUser(res.user);
        if (res.ok) { success(); showExpected(); } else if (!rec.ok) fail(res.message); else setFb('bad', '❌ ' + esc(res.message));
      };
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'run') exec(false);
        if (b.dataset.act === 'confirm') exec(true);
        if (b.dataset.act === 'skip') o.onSubmit(false, '(em branco)');
        if (b.dataset.act === 'restore') { ta.value = ex.starter || ''; ta.focus(); }
      });
      ta.addEventListener('input', () => { if (!sim) { rec.code = ta.value; persist(); } });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(false); }
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = ta.selectionStart;
          ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
          ta.selectionStart = ta.selectionEnd = s + 2;
        }
      });
    }

    /* ----- múltipla escolha ----- */
    if (ex.type === 'mcq') {
      body.innerHTML = '<div class="opts">' + ex.options.map((t, i) =>
        '<label class="opt"><input type="radio" name="o' + id + '" value="' + i + '"><span>' + fmt(t) + '</span></label>').join('') + '</div>' +
        '<div class="row"><button class="btn primary" data-act="check">' + (sim ? 'Confirmar resposta' : 'Verificar') + '</button>' + skipBtn + '</div>';
      const labels = $$('.opt', body);
      if (rec.ok) { labels[ex.answer].classList.add('right'); $('input', labels[ex.answer]).checked = true; }
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'skip') return o.onSubmit(false, '(em branco)');
        const sel = $('input:checked', body);
        if (!sel) return setFb('bad', 'Escolha uma alternativa.');
        const i = +sel.value, ok = i === ex.answer;
        if (sim) return o.onSubmit(ok, ex.options[i]);
        labels.forEach((l) => l.classList.remove('right', 'wrong'));
        labels[i].classList.add(ok ? 'right' : 'wrong');
        if (ok) success(ex.explanation ? fmt(ex.explanation) : ''); else if (!rec.ok) fail('Alternativa incorreta.'); else setFb('bad', '❌ Alternativa incorreta.');
      });
    }

    /* ----- complete o comando ----- */
    if (ex.type === 'fill') {
      const parts = ex.template.split(/\{\{(\d+)\}\}/);
      body.innerHTML = '<pre class="fill">' + parts.map((p, i) => i % 2
        ? '<input class="blank" data-i="' + p + '" size="' + Math.max(6, ex.blanks[p][0].length + 2) + '" spellcheck="false" autocomplete="off" aria-label="Lacuna ' + (+p + 1) + '">'
        : esc(p)).join('') + '</pre>' +
        '<div class="row"><button class="btn primary" data-act="check">' + (sim ? 'Confirmar resposta' : 'Verificar') + '</button>' + skipBtn + '</div>';
      const inputs = $$('.blank', body);
      if (rec.ok) inputs.forEach((inp) => { inp.value = ex.blanks[inp.dataset.i][0]; inp.classList.add('right'); });
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'skip') return o.onSubmit(false, '(em branco)');
        const vals = inputs.map((inp) => inp.value);
        const r = E.checkFill(ex, vals);
        if (sim) return o.onSubmit(r.ok, vals.join(' | '));
        inputs.forEach((inp, i) => { inp.classList.toggle('right', r.flags[i]); inp.classList.toggle('wrong', !r.flags[i]); });
        if (r.ok) success(ex.explanation ? fmt(ex.explanation) : ''); else if (!rec.ok) fail('Há lacunas incorretas ou vazias.'); else setFb('bad', '❌ Há lacunas incorretas.');
      });
    }

    if (rec.ok && !sim) setFb('ok', '✅ Concluído.');
    renderAids();
  }

  /* ---------- cabeçalho: meta do dia, streak, timer, tema ---------- */
  function updateHeader() {
    const min = Math.floor(St.todaySeconds() / 60);
    $('#goal-pill').textContent = '🎯 ' + Math.min(min, 99) + '/' + cfg.dailyGoalMin + ' min';
    $('#goal-pill').classList.toggle('done', min >= cfg.dailyGoalMin);
    $('#streak-pill').textContent = '🔥 ' + St.streak();
  }
  let lastAct = Date.now(), tick = 0;
  ['pointerdown', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach((ev) => addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastAct < 60000) {
      const before = Math.floor(St.todaySeconds() / 60);
      St.addSeconds(1);
      if (++tick % 5 === 0) { St.save(); updateHeader(); }
      if (before < cfg.dailyGoalMin && Math.floor(St.todaySeconds() / 60) >= cfg.dailyGoalMin) toast('🎯 Meta de ' + cfg.dailyGoalMin + ' min de hoje cumprida!');
    }
  }, 1000);

  const T = { left: cfg.timerMin * 60, iv: null };
  const clock = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  function drawTimer() { $('#timer-btn').textContent = (T.iv ? '⏸ ' : '⏱ ') + clock(T.left); $('#timer-btn').classList.toggle('active', !!T.iv); }
  $('#timer-btn').addEventListener('click', () => {
    if (T.iv) { clearInterval(T.iv); T.iv = null; } else {
      T.iv = setInterval(() => {
        if (--T.left <= 0) { clearInterval(T.iv); T.iv = null; T.left = cfg.timerMin * 60; toast('⏰ Sessão de ' + cfg.timerMin + ' min concluída! Hora de uma pausa.'); }
        drawTimer();
      }, 1000);
    }
    drawTimer();
  });
  $('#timer-reset').addEventListener('click', () => { clearInterval(T.iv); T.iv = null; T.left = cfg.timerMin * 60; drawTimer(); });
  drawTimer();

  const applyTheme = () => {
    const t = St.state.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
    $('#theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
    $('#theme-btn').setAttribute('aria-label', t === 'dark' ? 'Tema claro' : 'Tema escuro');
  };
  $('#theme-btn').addEventListener('click', () => {
    St.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); applyTheme();
  });
  applyTheme();

  /* ---------- gaveta do dataset ---------- */
  const drawer = $('#drawer');
  let dsTab = Object.keys(window.DATASETS)[0], dsMode = 'table';
  function renderDataset() {
    const names = Object.keys(window.DATASETS), docs = window.DATASETS[dsTab];
    let view;
    if (dsMode === 'json') {
      view = '<pre class="out json-view">' + esc(JSON.stringify(docs, null, 2)) + '</pre>';
    } else {
      const cols = [];
      docs.forEach((d) => Object.keys(d).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
      const cell = (v) => v === undefined ? '<span class="absent">ausente</span>'
        : Array.isArray(v) ? (v.length ? esc(JSON.stringify(v)) : '<span class="empty">[ ]</span>') : esc(JSON.stringify(v));
      view = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
        docs.map((d) => '<tr>' + cols.map((c) => '<td>' + cell(d[c]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    }
    $('#drawer-body').innerHTML =
      '<div class="tabs">' + names.map((n) => '<button class="tab' + (n === dsTab ? ' on' : '') + '" data-tab="' + n + '">' + n + ' <small>(' + window.DATASETS[n].length + ')</small></button>').join('') + '</div>' +
      '<div class="seg"><button class="' + (dsMode === 'table' ? 'on' : '') + '" data-mode="table">Tabela</button><button class="' + (dsMode === 'json' ? 'on' : '') + '" data-mode="json">JSON</button></div>' +
      view +
      '<p class="muted small">Cada execução parte desta cópia original. Campos <span class="absent">ausentes</span> e arrays vazios são casos de borda propositais. A coleção <code>canteiros.horta</code> referencia <code>hortas._id</code>.</p>';
  }
  const toggleDrawer = (open) => {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    $('#scrim').classList.toggle('show', open);
    if (open) renderDataset();
  };
  $('#dataset-btn').addEventListener('click', () => toggleDrawer(!drawer.classList.contains('open')));
  $('#fab').addEventListener('click', () => toggleDrawer(true));
  $('#drawer-close').addEventListener('click', () => toggleDrawer(false));
  $('#scrim').addEventListener('click', () => toggleDrawer(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleDrawer(false); });
  $('#drawer-body').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'), m = e.target.closest('[data-mode]');
    if (t) dsTab = t.dataset.tab; if (m) dsMode = m.dataset.mode;
    if (t || m) renderDataset();
  });

  /* ---------- tela inicial ---------- */
  function nextLesson() {
    return lessons.find((l) => weekUnlocked(weeks[l.week - 1]) && !lessonDone(l)) || null;
  }
  const pendingWrong = () => Object.keys(St.state.wrong).filter((id) => exById[id]).sort((a, b) => exById[a].order - exById[b].order);

  function ring(frac, label) {
    const r = 34, c = 2 * Math.PI * r;
    return '<svg class="ring" viewBox="0 0 80 80" role="img" aria-label="' + label + '"><circle cx="40" cy="40" r="' + r + '" class="ring-bg"/><circle cx="40" cy="40" r="' + r +
      '" class="ring-fg" stroke-dasharray="' + (c * Math.min(1, frac)).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 40 40)"/></svg>';
  }

  function viewHome() {
    const nx = nextLesson(), done = lessons.filter(lessonDone).length, rev = pendingWrong().length;
    const min = Math.floor(St.todaySeconds() / 60), best = St.bestSim();
    app.innerHTML =
      '<section class="hero card"><div class="hero-text"><h1>🌱 noSQL School</h1>' +
      '<p>Trilha de ' + weeks.length + ' semanas para chegar pronto na prova de MongoDB. Uma aula de ~10 min por dia: teoria curta, atividade guiada e desafio.</p>' +
      '<div class="hero-actions">' +
      (nx ? '<a class="btn primary" href="#/aula/' + nx.id + '">▶ Continuar: ' + esc(nx.title) + '</a>' : '<span class="tag">🎉 Trilha concluída!</span>') +
      '<a class="btn" href="#/simulado">📝 Modo Simulado</a>' +
      '<a class="btn" href="#/revisao">🔁 Revisão' + (rev ? ' (' + rev + ')' : '') + '</a></div></div>' +
      '<div class="stats">' +
      '<div class="stat">' + ring(St.todaySeconds() / (cfg.dailyGoalMin * 60), 'Meta diária') + '<div><b>' + min + '/' + cfg.dailyGoalMin + ' min</b><span>meta de hoje</span></div></div>' +
      '<div class="stat"><div class="big">🔥</div><div><b>' + St.streak() + ' dia(s)</b><span>sequência (≥ 1 min/dia)</span></div></div>' +
      '<div class="stat"><div class="big">✅</div><div><b>' + done + '/' + lessons.length + '</b><span>aulas concluídas</span></div></div>' +
      '<div class="stat"><div class="big">🏆</div><div><b>' + (St.state.sims.length ? (best * 10).toFixed(1).replace('.', ',') : '—') + '</b><span>melhor simulado</span></div></div>' +
      '</div></section>' +
      '<section class="weeks">' + weeks.map(weekCard).join('') + '</section>' +
      '<p class="foot"><button class="btn ghost sm danger" id="reset">Resetar progresso</button></p>';
    $('#reset').addEventListener('click', () => {
      if (confirm('Apagar TODO o progresso, streak e histórico de simulados? Esta ação não pode ser desfeita.')) { St.reset(); toast('Progresso resetado.'); viewHome(); updateHeader(); }
    });
  }

  function weekCard(w) {
    const open = weekUnlocked(w), ratio = weekRatio(w), pct = Math.round(ratio * 100);
    const prev = weeks[w.n - 2];
    const items = w.lessons.map((l) => {
      const d = lessonDone(l), draft = !hasActivities(l) && !l.simulado;
      const inner = '<span class="dot' + (d ? ' done' : '') + '">' + (d ? '✓' : l.pos) + '</span><span class="lt">' + esc(l.title) + '</span>' + (draft ? '<span class="chip">em breve</span>' : '');
      return open ? '<li><a href="#/aula/' + l.id + '">' + inner + '</a></li>' : '<li class="off"><span>' + inner + '</span></li>';
    }).join('');
    return '<article class="week card' + (open ? '' : ' locked') + '"><header><div><span class="tag">Semana ' + w.n + '</span><h2>' + esc(w.title) + '</h2><p class="muted">' + esc(w.summary) + '</p></div>' +
      '<div class="wpct">' + (open ? pct + '%' : '🔒') + '</div></header>' +
      '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i><u style="left:' + cfg.passRatio * 100 + '%" title="meta de liberação"></u></div>' +
      (open ? '' : '<p class="lock-msg">Conclua ' + Math.round(cfg.passRatio * 100) + '% da Semana ' + prev.n + ' para liberar.</p>') +
      '<ul class="lessons">' + items + '</ul></article>';
  }

  /* ---------- página de aula ---------- */
  function theoryHtml(l) {
    const t = l.theory;
    return '<div class="theory">' + fmt(t.text) + '</div>' + (t.example
      ? '<div class="example"><div class="example-head"><span>Exemplo</span>' + (t.runnable !== false ? '<button class="btn ghost sm" data-ex-run>▶ Rodar exemplo</button>' : '<span class="chip">só leitura</span>') +
        '</div><pre class="code-block">' + esc(t.example) + '</pre><pre class="out hidden" data-ex-out></pre></div>' : '');
  }

  function viewLesson(id) {
    const l = byId[id];
    if (!l) return viewHome();
    if (!weekUnlocked(weeks[l.week - 1])) { toast('🔒 Semana ainda bloqueada.'); location.hash = '#/'; return; }
    const prev = lessons[l.order - 1], next = lessons[l.order + 1];
    const nextOpen = next && weekUnlocked(weeks[next.week - 1]);
    const reviews = pendingWrong().filter((x) => exById[x].order < l.order).slice(0, 3);

    let activities;
    if (l.simulado) {
      activities = '<section class="card"><h2><span class="step">2</span> Simulado final</h2><p>Faça o Modo Simulado e obtenha pelo menos <b>' + Math.round(cfg.simPass * 100) + '%</b> para concluir. Melhor nota atual: <b>' + (St.state.sims.length ? (St.bestSim() * 10).toFixed(1).replace('.', ',') : '—') + '</b>.</p><a class="btn primary" href="#/simulado">📝 Iniciar simulado</a></section>';
    } else if (!hasActivities(l)) {
      activities = '<section class="card soon"><h2><span class="step">2</span> Atividades</h2><p class="muted">🚧 As atividades desta aula ainda serão adicionadas em <code>js/data/lessons.js</code>. Por enquanto, leia a teoria e marque como lida para avançar na trilha.</p><label class="check"><input type="checkbox" id="read"' + (St.state.lessons[l.id] ? ' checked' : '') + '> Marcar aula como lida</label></section>';
    } else {
      activities =
        (l.guided ? '<section class="card"><h2><span class="step">2</span> Atividade guiada</h2><div id="ex-g"></div></section>' : '') +
        (l.challenge ? '<section class="card"><h2><span class="step">3</span> Desafio</h2><div id="ex-c"></div></section>' : '');
    }

    app.innerHTML =
      '<nav class="crumbs"><a href="#/">Início</a> › Semana ' + l.week + ' › Aula ' + l.pos + '</nav>' +
      '<header class="lesson-head"><div><span class="tag">Semana ' + l.week + ' · Aula ' + l.pos + ' de ' + weeks[l.week - 1].lessons.length + ' · ~' + l.minutes + ' min</span><h1>' + esc(l.title) + '</h1></div><div id="lstatus" class="status-pill"></div></header>' +
      (reviews.length ? '<details class="card review" open><summary>🔁 Revisão espaçada <span class="chip">' + reviews.length + '</span></summary><p class="muted small">Questões que você errou antes voltam aqui. Acerte para tirá-las da fila.</p><div id="rev"></div></details>' : '') +
      '<section class="card"><h2><span class="step">1</span> Teoria</h2>' + theoryHtml(l) + '</section>' +
      activities +
      '<nav class="pager">' + (prev ? '<a class="btn" href="#/aula/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? (nextOpen ? '<a class="btn primary" href="#/aula/' + next.id + '">Próxima: ' + esc(next.title) + ' →</a>' : '<span class="btn disabled" title="Conclua 80% da semana atual">🔒 Próxima semana bloqueada</span>') : '<span></span>') + '</nav>';

    /* exemplo da teoria */
    const exBtn = $('[data-ex-run]');
    if (exBtn) exBtn.addEventListener('click', () => {
      const out = $('[data-ex-out]'), r = E.run(l.theory.example);
      out.textContent = E.display(r, { collection: 'canteiros' }); out.classList.remove('hidden'); out.classList.toggle('err', !!r.error);
    });

    let wasDone = lessonDone(l);
    const refresh = () => {
      const d = lessonDone(l);
      const total = [l.guided, l.challenge].filter(Boolean).length, n = [l.guided, l.challenge].filter((x) => x && St.ex(x.id).ok).length;
      const pill = $('#lstatus');
      pill.className = 'status-pill' + (d ? ' done' : '');
      pill.textContent = d ? '✅ Aula concluída' : (total ? n + '/' + total + ' atividades' : 'Em andamento');
      if (d && !wasDone) toast('🌱 Aula concluída! Continue assim.');
      wasDone = d; updateHeader();
    };
    refresh();
    if (l.guided) mountExercise($('#ex-g'), l.guided, { mode: 'guided', onChange: refresh });
    if (l.challenge) mountExercise($('#ex-c'), l.challenge, { mode: 'challenge', onChange: refresh });
    const read = $('#read');
    if (read) read.addEventListener('change', () => { St.setLessonRead(l.id, read.checked); refresh(); });
    if (reviews.length) {
      const host = $('#rev');
      reviews.forEach((rid) => {
        const ex = exById[rid], box = document.createElement('div');
        box.className = 'rev-item';
        box.innerHTML = '<div class="muted small">Da aula: ' + esc(byId[ex.lessonId].title) + '</div><div class="slot"></div>';
        host.appendChild(box);
        mountExercise($('.slot', box), ex, { mode: 'review', onChange: refresh });
      });
    }
  }

  /* ---------- revisão (todas as pendentes) ---------- */
  function viewReview() {
    const ids = pendingWrong();
    app.innerHTML = '<nav class="crumbs"><a href="#/">Início</a> › Revisão</nav><header class="lesson-head"><div><span class="tag">Revisão espaçada</span><h1>Questões para revisar</h1></div></header><div id="rev-all"></div>';
    const host = $('#rev-all');
    if (!ids.length) { host.innerHTML = '<div class="card empty">🌿 Nada para revisar. Questões erradas aparecem aqui e também no começo das aulas seguintes.</div>'; return; }
    ids.forEach((rid) => {
      const ex = exById[rid], box = document.createElement('section');
      box.className = 'card';
      box.innerHTML = '<div class="muted small">Aula: ' + esc(byId[ex.lessonId].title) + '</div><div class="slot"></div>';
      host.appendChild(box);
      mountExercise($('.slot', box), ex, { mode: 'review', onChange: updateHeader });
    });
  }

  /* ---------- modo simulado ---------- */
  let sim = null, simIv = null;
  function clearSim() { clearInterval(simIv); simIv = null; sim = null; }
  const nota = (c, t) => (c / t * 10).toFixed(1).replace('.', ',');

  function viewSim() {
    clearSim();
    const pool = Object.values(exById).filter((ex) => weekUnlocked(weeks[byId[ex.lessonId].week - 1]));
    const hist = St.state.sims.slice(-5).reverse().map((s) => '<li>' + new Date(s.date).toLocaleDateString('pt-BR') + ' — nota <b>' + nota(s.correct, s.total) + '</b> (' + s.correct + '/' + s.total + ')</li>').join('');
    app.innerHTML = '<nav class="crumbs"><a href="#/">Início</a> › Simulado</nav><section class="card"><h1>📝 Modo Simulado</h1>' +
      '<ul class="rules"><li><b>' + Math.min(cfg.simSize, pool.length) + ' questões</b> sorteadas das semanas liberadas (' + pool.length + ' disponíveis).</li>' +
      '<li>Cronometrado: <b>' + cfg.simMinutes + ' minutos</b> no total.</li><li><b>Sem dicas</b> e sem gabarito durante a prova. Você pode <i>Testar</i> uma query antes de confirmar.</li>' +
      '<li>Ao final: nota de 0 a 10 e lista dos erros. Questões erradas entram na revisão espaçada.</li></ul>' +
      '<button class="btn primary" id="sim-go"' + (pool.length ? '' : ' disabled') + '>Começar simulado</button>' +
      (hist ? '<h3>Últimas notas</h3><ul class="hist">' + hist + '</ul>' : '') + '</section>';
    $('#sim-go').addEventListener('click', () => {
      sim = { qs: shuffle(pool).slice(0, cfg.simSize), i: 0, res: [], end: Date.now() + cfg.simMinutes * 60000 };
      simIv = setInterval(simTick, 500);
      simQuestion();
    });
  }
  function simTick() {
    if (!sim) return;
    const left = Math.max(0, Math.ceil((sim.end - Date.now()) / 1000)), el = $('#sim-time');
    if (el) { el.textContent = '⏳ ' + clock(left); el.classList.toggle('warn', left <= 60); }
    if (left <= 0) { toast('⏰ Tempo esgotado!'); simFinish(); }
  }
  function simQuestion() {
    const ex = sim.qs[sim.i], total = sim.qs.length;
    app.innerHTML = '<section class="sim-head card"><div><b>Questão ' + (sim.i + 1) + ' de ' + total + '</b><div class="bar"><i style="width:' + (sim.i / total * 100) + '%"></i></div></div><span id="sim-time" class="pill"></span></section>' +
      '<section class="card"><div id="sim-ex"></div></section>';
    simTick();
    mountExercise($('#sim-ex'), ex, {
      mode: 'sim',
      onSubmit(ok, ans) {
        sim.res.push({ ex, ok, ans });
        if (++sim.i >= total) simFinish(); else simQuestion();
      }
    });
  }
  function simFinish() {
    if (!sim) return;
    const s = sim; clearInterval(simIv); simIv = null;
    while (s.res.length < s.qs.length) s.res.push({ ex: s.qs[s.res.length], ok: false, ans: '(sem resposta)' });
    const correct = s.res.filter((r) => r.ok).length, total = s.res.length;
    St.addSim({ date: new Date().toISOString(), correct, total });
    s.res.filter((r) => !r.ok).forEach((r) => St.markWrong(r.ex.id, r.ex.order));
    const errs = s.res.filter((r) => !r.ok);
    const ansText = (ex) => ex.type === 'query' ? ex.solution : ex.type === 'mcq' ? ex.options[ex.answer] : ex.template.replace(/\{\{(\d+)\}\}/g, (_, i) => ex.blanks[i][0]);
    const pass = correct / total >= cfg.simPass;
    app.innerHTML = '<section class="card result"><h1>Resultado</h1><div class="score ' + (pass ? 'pass' : 'fail') + '">' + nota(correct, total) + '</div>' +
      '<p>' + correct + ' de ' + total + ' questões corretas. ' + (pass ? '🎉 Muito bem!' : 'Revise os erros abaixo e tente de novo.') + '</p>' +
      '<div class="hero-actions"><button class="btn primary" id="again">Refazer</button><a class="btn" href="#/">Início</a></div></section>' +
      (errs.length ? '<h2 class="sec">Erros (' + errs.length + ')</h2>' + errs.map((r) =>
        '<section class="card err-card"><div class="prompt">' + fmt(r.ex.prompt) + '</div><h5>Sua resposta</h5><pre class="code-block">' + esc(r.ans) + '</pre><h5>Gabarito</h5><pre class="code-block">' + esc(ansText(r.ex)) + '</pre>' +
        (r.ex.explanation ? '<p class="muted small">' + fmt(r.ex.explanation) + '</p>' : '') + '</section>').join('') : '<div class="card empty">🌟 Gabaritou!</div>');
    $('#again').addEventListener('click', viewSim);
    sim = null; updateHeader();
  }

  /* ---------- roteador ---------- */
  function route() {
    clearSim();
    const [r, arg] = location.hash.replace(/^#\/?/, '').split('/');
    scrollTo(0, 0);
    if (r === 'aula') viewLesson(arg);
    else if (r === 'simulado') viewSim();
    else if (r === 'revisao') viewReview();
    else viewHome();
    $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === (r || 'home')));
    updateHeader();
    document.title = 'noSQL School';
  }
  addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => St.save());
  route();
})();
