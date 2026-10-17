'use strict';

/* =========================================================
   Planner — app de gestão do dia a dia
   Dados guardados localmente no dispositivo (localStorage).
   ========================================================= */

const KEY = 'planner.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Datas ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d || 1); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (m, n) => { const d = parse(m + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0, 7); };
const today = () => ymd(new Date());
const fmtDate = (s, opts) => parse(s).toLocaleDateString('pt-PT', opts);
const monthKey = s => s.slice(0, 7);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const monthLabel = m => cap(fmtDate(m + '-01', { month: 'long', year: 'numeric' }));
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const startOfWeek = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };

/* ---------- Constantes ---------- */
const TAGS = {
  pessoal: { label: 'Pessoal', color: 'var(--rose)' },
  trabalho: { label: 'Trabalho', color: 'var(--clay)' },
  casa: { label: 'Casa', color: 'var(--sand)' },
  saude: { label: 'Saúde', color: 'var(--sage)' },
  estudo: { label: 'Estudo', color: 'var(--lilac)' },
};

const EXPENSE = {
  casa: ['Casa & contas', '🏠', '#c08a6a'],
  mercado: ['Supermercado', '🛒', '#9aae96'],
  restaurantes: ['Cafés & restaurantes', '☕', '#d9a6a0'],
  transportes: ['Transportes', '🚗', '#b7a9c9'],
  saude: ['Saúde', '🌿', '#7f9d7a'],
  beleza: ['Beleza & self-care', '💅', '#e3b7b0'],
  compras: ['Compras', '🛍️', '#d8c3a5'],
  lazer: ['Lazer & viagens', '✈️', '#8fa9b8'],
  educacao: ['Educação', '📚', '#a7926f'],
  subscricoes: ['Subscrições', '📱', '#c9a9b8'],
  negocio: ['Despesas do negócio', '💼', '#9c8b7a'],
  outros: ['Outros', '✦', '#bdb2a6'],
};
const INCOME = {
  salario: ['Salário', '💶', '#7f9d7a'],
  vendas: ['Negócio / vendas', '✨', '#9aae96'],
  freelance: ['Freelance', '💻', '#8fa9b8'],
  outros_in: ['Outras receitas', '🎁', '#d8c3a5'],
};
const CATS = { ...EXPENSE, ...INCOME };

const MOODS = [
  ['🥰', 'Radiante'], ['😊', 'Bem'], ['😌', 'Calma'],
  ['😐', 'Assim-assim'], ['😴', 'Cansaço'], ['😔', 'Em baixo'], ['😣', 'Ansiedade'],
];

const AREAS = ['Pessoal', 'Carreira', 'Finanças', 'Saúde', 'Relações', 'Casa', 'Viagens'];

const QUOTES = [
  'Pequenos passos todos os dias criam grandes mudanças.',
  'Tu és a autora da tua própria história.',
  'Devagar também se chega longe.',
  'Cuida de ti como cuidas de quem amas.',
  'A disciplina é a ponte entre os objetivos e as conquistas.',
  'Faz hoje aquilo que o teu “eu” do futuro vai agradecer.',
  'A calma também é uma forma de poder.',
  'Não precisas de fazer tudo. Precisas de fazer o que importa.',
  'Celebra as pequenas vitórias.',
  'O teu ritmo é válido.',
  'Organiza o teu espaço, acalma a tua mente.',
  'Abundância começa com gratidão.',
  'Acredita no processo.',
  'Hoje é uma página em branco — escreve-a com intenção.',
];

/* ---------- Estado ---------- */
const defaults = () => ({
  settings: { name: '', theme: 'auto', currency: 'EUR' },
  tasks: [],
  habits: [],
  transactions: [],
  budgets: {},
  journal: {},
  goals: [],
  weekNotes: {},
  intentions: {},
});

function seed() {
  const s = defaults();
  const t = today();
  s.habits = [
    { id: uid(), name: 'Beber 2L de água', emoji: '💧', log: {} },
    { id: uid(), name: 'Ler 20 minutos', emoji: '📖', log: {} },
    { id: uid(), name: 'Movimento', emoji: '🧘‍♀️', log: {} },
    { id: uid(), name: 'Skincare', emoji: '🧴', log: {} },
  ];
  s.tasks = [
    { id: uid(), title: 'Planear a semana com calma ☕', date: t, done: false, tag: 'pessoal' },
    { id: uid(), title: 'Registar os gastos de hoje', date: t, done: false, tag: 'casa' },
  ];
  s.goals = [{ id: uid(), title: 'Criar um fundo de emergência', area: 'Finanças', deadline: '', progress: 10 }];
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch { /* armazenamento indisponível */ }
  return seed();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('Não foi possível guardar neste dispositivo'); }
}

let state = load();
const ui = { plannerDay: today(), finMonth: monthKey(today()), journalDay: today() };

/* ---------- Utilitários ---------- */
const money = n => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: state.settings.currency || 'EUR' }).format(n || 0);

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite';
}

function quoteOfDay() {
  const d = new Date();
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return QUOTES[day % QUOTES.length];
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2200);
}

function applyTheme() {
  const pref = state.settings.theme;
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('meta[name=theme-color]').setAttribute('content', dark ? '#1f1b19' : '#f6f1ea');
}

function streak(h) {
  let d = today();
  if (!h.log[d]) d = addDays(d, -1);
  let n = 0;
  while (h.log[d]) { n++; d = addDays(d, -1); }
  return n;
}

function monthTotals(m) {
  let inc = 0, out = 0;
  const byCat = {};
  for (const x of state.transactions) {
    if (!x.date.startsWith(m)) continue;
    if (x.type === 'in') inc += x.amount;
    else { out += x.amount; byCat[x.category] = (byCat[x.category] || 0) + x.amount; }
  }
  return { inc, out, bal: inc - out, byCat };
}

/* ---------- Componentes ---------- */
function taskItem(t, { showMove = false } = {}) {
  const tag = TAGS[t.tag];
  return `<li class="task ${t.done ? 'done' : ''}">
    <input type="checkbox" class="check round" data-action="toggle-task" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Concluir tarefa">
    <span class="title">${esc(t.title)}</span>
    ${tag ? `<span class="chip"><i class="dot" style="background:${tag.color}"></i>${tag.label}</span>` : ''}
    ${showMove ? `<button class="btn soft small" data-action="move-today" data-id="${t.id}">→ hoje</button>` : ''}
    <button class="icon-btn" data-action="del-task" data-id="${t.id}" aria-label="Apagar tarefa">✕</button>
  </li>`;
}

function addTaskForm(date) {
  return `<form class="inline-add" data-form="add-task" data-date="${date}">
    <input class="input" name="title" placeholder="Nova tarefa…" autocomplete="off" required>
    <select class="input tag-select" name="tag" aria-label="Etiqueta">
      <option value="">—</option>
      ${Object.entries(TAGS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
    </select>
    <button class="btn">+</button>
  </form>`;
}

function donut(byCat) {
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return '<p class="empty">Ainda sem despesas este mês ✿</p>';
  const r = 60, C = 2 * Math.PI * r;
  let off = 0;
  const arcs = entries.map(([k, v]) => {
    const len = (v / total) * C;
    const a = `<circle r="${r}" cx="85" cy="85" fill="none" stroke="${CATS[k]?.[2] || '#ccc'}" stroke-width="22"
      stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"><title>${esc(CATS[k]?.[0] || k)}: ${money(v)}</title></circle>`;
    off += len;
    return a;
  }).join('');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 170 170" role="img" aria-label="Despesas por categoria">
      <g transform="rotate(-90 85 85)">${arcs}</g>
      <text x="85" y="80" text-anchor="middle" font-size="11" fill="var(--ink-soft)">total</text>
      <text x="85" y="100" text-anchor="middle" font-size="17" font-family="var(--serif)" font-weight="600" fill="var(--ink)">${money(total)}</text>
    </svg>
    <ul class="legend">
      ${entries.map(([k, v]) => `<li><i class="dot" style="background:${CATS[k]?.[2]}"></i><span>${CATS[k]?.[1] || ''} ${esc(CATS[k]?.[0] || k)}</span><span class="muted">${Math.round(v / total * 100)}%</span></li>`).join('')}
    </ul>
  </div>`;
}

/* =========================================================
   Vistas
   ========================================================= */

function viewHoje() {
  const t = today();
  const name = state.settings.name;
  const tasks = state.tasks.filter(x => x.date === t);
  const overdue = state.tasks.filter(x => !x.done && x.date < t);
  const done = tasks.filter(x => x.done).length;
  const fin = monthTotals(monthKey(t));
  const entry = state.journal[t] || {};
  const habitsDone = state.habits.filter(h => h.log[t]).length;

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1>${greeting()}${name ? `, <span class="serif-italic">${esc(name)}</span>` : ''}</h1>
    </div>
  </header>

  <div class="grid">
    <section class="card tint-clay span-12">
      <p class="quote">“${quoteOfDay()}”</p>
    </section>

    <section class="card span-7">
      <div class="card-head"><h2>Tarefas de hoje</h2><span class="chip">${done}/${tasks.length}</span></div>
      ${tasks.length ? `<ul class="list">${tasks.map(x => taskItem(x)).join('')}</ul>` : '<p class="empty">Um dia leve. Adiciona o que importa.</p>'}
      ${addTaskForm(t)}
      ${overdue.length ? `
        <div style="margin-top:22px">
          <div class="card-head"><h3>Ficaram para trás</h3><button class="btn ghost small" data-action="move-all-today">Mover todas para hoje</button></div>
          <ul class="list">${overdue.map(x => taskItem(x, { showMove: true })).join('')}</ul>
        </div>` : ''}
    </section>

    <section class="card span-5">
      <div class="card-head"><h2>Rituais</h2><span class="chip">${habitsDone}/${state.habits.length}</span></div>
      ${state.habits.length ? state.habits.map(h => `
        <button class="today-habit ${h.log[t] ? 'on' : ''}" data-action="toggle-habit" data-id="${h.id}" data-date="${t}">
          <span>${esc(h.emoji)}</span><span style="flex:1">${esc(h.name)}</span>
          <span class="streak">${streak(h) ? `🔥 ${streak(h)}` : ''}</span>
        </button>`).join('') : '<p class="empty">Cria os teus primeiros hábitos ✿</p>'}
      <a href="#habitos" class="small muted">Gerir hábitos →</a>
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>Este mês</h2><button class="btn soft" data-action="add-tx">+ Movimento</button></div>
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:18px">
        <div class="stat"><span class="label">Saldo</span><span class="value ${fin.bal >= 0 ? 'pos' : 'neg'}">${money(fin.bal)}</span></div>
        <div class="stat"><span class="label">Gastos</span><span class="value">${money(fin.out)}</span></div>
      </div>
      <p style="margin-top:14px"><a href="#financas" class="small muted">Ver finanças →</a></p>
    </section>

    <section class="card tint-rose span-6">
      <div class="card-head"><h2>Como te sentes?</h2></div>
      <div class="moods">
        ${MOODS.map(([e, l]) => `<button class="mood ${entry.mood === e ? 'on' : ''}" data-action="set-mood" data-date="${t}" data-mood="${e}"><span class="e">${e}</span><span class="l">${l}</span></button>`).join('')}
      </div>
      <p style="margin-top:14px"><a href="#diario" class="small muted">Escrever no diário →</a></p>
    </section>
  </div>`;
}

function viewPlanner() {
  const sel = ui.plannerDay;
  const ws = startOfWeek(sel);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const t = today();
  const tasks = state.tasks.filter(x => x.date === sel);

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">Planner semanal</p>
      <h1>${fmtDate(ws, { day: 'numeric', month: 'short' })} – ${fmtDate(days[6], { day: 'numeric', month: 'short' })}</h1>
    </div>
    <div class="row">
      <button class="icon-btn" data-action="week" data-n="-7" aria-label="Semana anterior">‹</button>
      <button class="btn soft" data-action="week" data-n="0">Hoje</button>
      <button class="icon-btn" data-action="week" data-n="7" aria-label="Semana seguinte">›</button>
    </div>
  </header>

  <div class="week">
    ${days.map((d, i) => {
      const list = state.tasks.filter(x => x.date === d);
      const open = list.filter(x => !x.done).length;
      return `<button class="day-pill ${d === t ? 'today' : ''} ${d === sel ? 'sel' : ''}" data-action="pick-day" data-date="${d}">
        <span class="dname">${WEEKDAYS[i]}</span>
        <span class="dnum">${parse(d).getDate()}</span>
        <span class="dcount">${list.length ? (open ? '•'.repeat(Math.min(open, 3)) : '✓') : ''}</span>
      </button>`;
    }).join('')}
  </div>

  <div class="grid">
    <section class="card span-8">
      <div class="card-head"><h2>${cap(fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2></div>
      ${tasks.length ? `<ul class="list">${tasks.map(x => taskItem(x)).join('')}</ul>` : '<p class="empty">Nada planeado — espaço para respirar.</p>'}
      ${addTaskForm(sel)}
    </section>
    <section class="card tint-sage span-4">
      <div class="card-head"><h2>Foco da semana</h2></div>
      <textarea class="input" data-input="weeknote" data-week="${ws}" placeholder="As 3 prioridades desta semana…">${esc(state.weekNotes[ws] || '')}</textarea>
    </section>
  </div>`;
}

function viewHabitos() {
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const doneToday = state.habits.filter(h => h.log[t]).length;
  const pct = state.habits.length ? Math.round(doneToday / state.habits.length * 100) : 0;

  return `
  <header class="page-head">
    <div><p class="eyebrow">Hábitos</p><h1>Pequenos <span class="serif-italic">rituais</span></h1></div>
    <button class="btn" data-action="add-habit">+ Hábito</button>
  </header>

  <div class="grid">
    <section class="card span-12">
      ${state.habits.length ? `
        <div class="habit-row head"><span style="text-align:left">Últimos 7 dias</span>${days.map(d => `<span>${fmtDate(d, { weekday: 'narrow' })}<br>${parse(d).getDate()}</span>`).join('')}<span>Série</span><span></span></div>
        ${state.habits.map(h => `
          <div class="habit-row">
            <span class="habit-name"><span>${esc(h.emoji)}</span><span>${esc(h.name)}</span></span>
            ${days.map(d => `<button class="habit-cell ${h.log[d] ? 'on' : ''}" data-action="toggle-habit" data-id="${h.id}" data-date="${d}" aria-label="${esc(h.name)} ${d}"></button>`).join('')}
            <span class="streak">${streak(h) ? `🔥 ${streak(h)}` : '—'}</span>
            <button class="icon-btn" data-action="del-habit" data-id="${h.id}" aria-label="Apagar hábito">✕</button>
          </div>`).join('')}
      ` : '<p class="empty">Ainda sem hábitos. Começa por um só ✿</p>'}
    </section>

    <section class="card tint-sage span-12">
      <div class="progress-ring">
        <div class="stat"><span class="label">Hoje</span><span class="value">${pct}%</span></div>
        <p class="muted">${doneToday} de ${state.habits.length} rituais cumpridos. ${pct === 100 ? 'Dia perfeito! ✨' : 'Um de cada vez.'}</p>
      </div>
    </section>
  </div>`;
}

function viewFinancas() {
  const m = ui.finMonth;
  const fin = monthTotals(m);
  const savings = fin.inc ? Math.round(fin.bal / fin.inc * 100) : 0;
  const txs = state.transactions.filter(x => x.date.startsWith(m)).sort((a, b) => b.date.localeCompare(a.date));
  const budgets = Object.entries(state.budgets).filter(([, v]) => v > 0);

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">Finanças</p>
      <h1>${monthLabel(m)}</h1>
    </div>
    <div class="row">
      <button class="icon-btn" data-action="month" data-n="-1" aria-label="Mês anterior">‹</button>
      <button class="icon-btn" data-action="month" data-n="1" aria-label="Mês seguinte">›</button>
      <button class="btn" data-action="add-tx">+ Movimento</button>
    </div>
  </header>

  <div class="grid">
    <section class="card span-4"><div class="stat"><span class="label">Receitas</span><span class="value pos">${money(fin.inc)}</span></div></section>
    <section class="card span-4"><div class="stat"><span class="label">Despesas</span><span class="value neg">${money(fin.out)}</span></div></section>
    <section class="card tint-clay span-4"><div class="stat"><span class="label">Saldo</span><span class="value">${money(fin.bal)}</span><span class="small muted">${fin.inc ? `Poupaste ${savings}% do que entrou` : 'Regista as tuas receitas'}</span></div></section>

    <section class="card span-6">
      <div class="card-head"><h2>Para onde foi o dinheiro</h2></div>
      ${donut(fin.byCat)}
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>Orçamentos</h2><button class="btn soft" data-action="edit-budgets">Definir</button></div>
      ${budgets.length ? budgets.map(([k, limit]) => {
        const spent = fin.byCat[k] || 0;
        const p = Math.min(100, spent / limit * 100);
        return `<div class="budget">
          <div class="row"><span>${EXPENSE[k]?.[1] || ''} ${esc(EXPENSE[k]?.[0] || k)}</span><span class="muted">${money(spent)} / ${money(limit)}</span></div>
          <div class="bar ${spent > limit ? 'over' : ''}"><i style="width:${p}%"></i></div>
        </div>`;
      }).join('') : '<p class="empty">Define limites mensais por categoria.</p>'}
    </section>

    <section class="card span-12">
      <div class="card-head"><h2>Movimentos</h2><span class="chip">${txs.length}</span></div>
      ${txs.length ? txs.map(x => `
        <div class="tx">
          <div class="tx-ico">${CATS[x.category]?.[1] || '✦'}</div>
          <div class="tx-main">
            <div class="t">${esc(x.note || CATS[x.category]?.[0] || '')}</div>
            <div class="small muted">${esc(CATS[x.category]?.[0] || '')} · ${fmtDate(x.date, { day: 'numeric', month: 'short' })}</div>
          </div>
          <div class="tx-amt ${x.type === 'in' ? 'pos' : ''}">${x.type === 'in' ? '+' : '−'}${money(x.amount)}</div>
          <button class="icon-btn" data-action="del-tx" data-id="${x.id}" aria-label="Apagar movimento">✕</button>
        </div>`).join('') : '<p class="empty">Sem movimentos neste mês.</p>'}
    </section>
  </div>`;
}

function viewDiario() {
  const d = ui.journalDay;
  const e = state.journal[d] || {};
  const m = monthKey(d);
  const first = parse(m + '-01');
  const offset = (first.getDay() + 6) % 7;
  const nDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">Diário</p>
      <h1>${cap(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</h1>
    </div>
    <div class="row">
      <button class="icon-btn" data-action="jday" data-n="-1" aria-label="Dia anterior">‹</button>
      <button class="btn soft" data-action="jday" data-n="0">Hoje</button>
      <button class="icon-btn" data-action="jday" data-n="1" aria-label="Dia seguinte">›</button>
    </div>
  </header>

  <div class="grid">
    <section class="card tint-rose span-7">
      <div class="card-head"><h2>Como te sentes?</h2></div>
      <div class="moods">
        ${MOODS.map(([em, l]) => `<button class="mood ${e.mood === em ? 'on' : ''}" data-action="set-mood" data-date="${d}" data-mood="${em}"><span class="e">${em}</span><span class="l">${l}</span></button>`).join('')}
      </div>
    </section>

    <section class="card span-5">
      <div class="card-head"><h2>${monthLabel(m)}</h2></div>
      <div class="mood-cal">
        ${'<div class="c blank"></div>'.repeat(offset)}
        ${Array.from({ length: nDays }, (_, i) => {
          const key = `${m}-${pad(i + 1)}`;
          const mood = state.journal[key]?.mood;
          return `<div class="c" title="${key}">${mood || `<span class="n">${i + 1}</span>`}</div>`;
        }).join('')}
      </div>
    </section>

    <section class="card tint-sage span-5">
      <div class="card-head"><h2>Hoje estou grata por…</h2></div>
      ${[0, 1, 2].map(i => `<div class="field"><input class="input" data-input="journal" data-date="${d}" data-key="g${i}" value="${esc(e['g' + i] || '')}" placeholder="${i + 1}."></div>`).join('')}
    </section>

    <section class="card span-7">
      <div class="card-head"><h2>Páginas soltas</h2><span class="small muted">guarda automaticamente</span></div>
      <textarea class="input" style="min-height:220px" data-input="journal" data-date="${d}" data-key="text" placeholder="O que está na tua mente hoje?">${esc(e.text || '')}</textarea>
    </section>
  </div>`;
}

function viewMetas() {
  const m = monthKey(today());
  return `
  <header class="page-head">
    <div><p class="eyebrow">Metas & visão</p><h1>Sonhos, em <span class="serif-italic">passos</span></h1></div>
    <button class="btn" data-action="add-goal">+ Meta</button>
  </header>

  <div class="grid">
    <section class="card tint-clay span-12">
      <p class="eyebrow">Intenção para ${monthLabel(m)}</p>
      <input class="input quote" style="background:transparent;border:0;padding:0" data-input="intention" data-month="${m}" value="${esc(state.intentions[m] || '')}" placeholder="Este mês, escolho…">
    </section>

    <section class="card span-12">
      ${state.goals.length ? state.goals.map(g => `
        <div class="goal">
          <div class="row" style="justify-content:space-between">
            <div>
              <h3>${esc(g.title)}</h3>
              <div class="row small muted" style="margin-top:4px">
                <span class="chip">${esc(g.area)}</span>
                ${g.deadline ? `<span>até ${fmtDate(g.deadline, { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : ''}
              </div>
            </div>
            <div class="row">
              <span class="stat"><span class="value" style="font-size:1.5rem"><span class="pct" data-for="${g.id}">${g.progress}</span>%</span></span>
              <button class="icon-btn" data-action="del-goal" data-id="${g.id}" aria-label="Apagar meta">✕</button>
            </div>
          </div>
          <input type="range" min="0" max="100" step="5" value="${g.progress}" style="--p:${g.progress}%" data-input="goal" data-id="${g.id}" aria-label="Progresso">
        </div>`).join('') : '<p class="empty">Escreve a tua primeira meta ✧</p>'}
    </section>
  </div>`;
}

function viewDefinicoes() {
  const s = state.settings;
  const cur = ['EUR', 'BRL', 'USD', 'GBP', 'CHF'];
  return `
  <header class="page-head"><div><p class="eyebrow">Definições</p><h1>A tua app</h1></div></header>
  <div class="grid">
    <section class="card span-6 stack">
      <div class="field"><label>Como te devo chamar?</label><input class="input" data-input="setting" data-key="name" value="${esc(s.name)}" placeholder="O teu nome"></div>
      <div class="field"><label>Tema</label>
        <div class="segmented">
          ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button class="${s.theme === k ? 'on' : ''}" data-action="theme" data-v="${k}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Moeda</label>
        <select class="input" data-change="currency">${cur.map(c => `<option ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
    </section>
    <section class="card span-6 stack">
      <div><h2>Os teus dados</h2><p class="muted small" style="margin-top:6px">Tudo fica guardado apenas neste dispositivo. Faz cópias de segurança de vez em quando.</p></div>
      <div class="row" style="flex-wrap:wrap">
        <button class="btn" data-action="export">Exportar cópia</button>
        <label class="btn ghost">Importar<input type="file" accept="application/json" data-change="import" hidden></label>
      </div>
      <button class="btn danger" data-action="reset">Apagar todos os dados</button>
    </section>
  </div>`;
}

/* =========================================================
   Router & render
   ========================================================= */
const routes = { hoje: viewHoje, planner: viewPlanner, habitos: viewHabitos, financas: viewFinancas, diario: viewDiario, metas: viewMetas, definicoes: viewDefinicoes };
const currentRoute = () => { const r = location.hash.slice(1); return r in routes ? r : 'hoje'; };

let focusAfter = null;
function render(animate = false) {
  const r = currentRoute();
  const view = $('#view');
  view.innerHTML = routes[r]();
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === r));
  if (animate) { view.style.animation = 'none'; void view.offsetWidth; view.style.animation = ''; window.scrollTo(0, 0); }
  if (focusAfter) { $(focusAfter)?.focus(); focusAfter = null; }
}
const commit = () => { save(); render(); };

/* =========================================================
   Modal
   ========================================================= */
let modalCb = null;
function openModal(title, body, cb, ok = 'Guardar') {
  const f = $('#modal-form');
  f.innerHTML = `<h2>${title}</h2>${body}
    <div class="modal-actions"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn">${ok}</button></div>`;
  modalCb = cb;
  $('#modal').showModal();
  f.querySelector('input, select, textarea')?.focus();
}
$('#modal-form').addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  if (modalCb && modalCb(data) === false) return;
  $('#modal').close();
});

/* =========================================================
   Ações
   ========================================================= */
const findTask = id => state.tasks.find(x => x.id === id);

const actions = {
  'toggle-task': el => { const t = findTask(el.dataset.id); t.done = el.checked; commit(); },
  'del-task': el => { state.tasks = state.tasks.filter(x => x.id !== el.dataset.id); commit(); },
  'move-today': el => { findTask(el.dataset.id).date = today(); commit(); },
  'move-all-today': () => { const t = today(); state.tasks.forEach(x => { if (!x.done && x.date < t) x.date = t; }); commit(); toast('Tudo para hoje ✿'); },

  'week': el => { const n = +el.dataset.n; ui.plannerDay = n ? addDays(ui.plannerDay, n) : today(); render(); },
  'pick-day': el => { ui.plannerDay = el.dataset.date; render(); },

  'toggle-habit': el => {
    const h = state.habits.find(x => x.id === el.dataset.id);
    const d = el.dataset.date;
    if (h.log[d]) delete h.log[d]; else h.log[d] = true;
    commit();
  },
  'add-habit': () => openModal('Novo hábito', `
    <div class="row">
      <div class="field" style="flex:0 0 80px"><label>Emoji</label><input class="input" name="emoji" value="✨" maxlength="4"></div>
      <div class="field"><label>Nome</label><input class="input" name="name" required placeholder="ex.: Meditar 10 min"></div>
    </div>`, d => { state.habits.push({ id: uid(), name: d.name.trim(), emoji: d.emoji || '✨', log: {} }); commit(); }),
  'del-habit': el => { if (confirm('Apagar este hábito e o histórico?')) { state.habits = state.habits.filter(x => x.id !== el.dataset.id); commit(); } },

  'month': el => { ui.finMonth = addMonths(ui.finMonth, +el.dataset.n); render(); },
  'add-tx': () => {
    const opts = (group, obj) => `<optgroup label="${group}">${Object.entries(obj).map(([k, [l, e]]) => `<option value="${k}">${e} ${l}</option>`).join('')}</optgroup>`;
    const defDate = currentRoute() === 'financas' && ui.finMonth !== monthKey(today()) ? ui.finMonth + '-01' : today();
    openModal('Novo movimento', `
      <div class="row">
        <div class="field"><label>Valor</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required placeholder="0,00"></div>
        <div class="field"><label>Data</label><input class="input" name="date" type="date" value="${defDate}" required></div>
      </div>
      <div class="field"><label>Categoria</label><select class="input" name="category">${opts('Despesas', EXPENSE)}${opts('Receitas', INCOME)}</select></div>
      <div class="field"><label>Descrição</label><input class="input" name="note" placeholder="ex.: Café com a Rita"></div>`,
      d => {
        state.transactions.push({ id: uid(), amount: Math.abs(parseFloat(d.amount)), date: d.date, category: d.category, note: d.note.trim(), type: d.category in INCOME ? 'in' : 'out' });
        commit(); toast('Movimento registado');
      });
  },
  'del-tx': el => { state.transactions = state.transactions.filter(x => x.id !== el.dataset.id); commit(); },
  'edit-budgets': () => openModal('Orçamento mensal', `
    <p class="muted small" style="margin-bottom:14px">Deixa em branco as categorias sem limite.</p>
    ${Object.entries(EXPENSE).map(([k, [l, e]]) => `
      <div class="row" style="margin-bottom:8px"><span style="flex:1">${e} ${l}</span>
      <input class="input" style="width:120px" name="${k}" type="number" min="0" step="1" inputmode="decimal" value="${state.budgets[k] || ''}"></div>`).join('')}`,
    d => { state.budgets = {}; for (const [k, v] of Object.entries(d)) if (+v > 0) state.budgets[k] = +v; commit(); }),

  'set-mood': el => {
    const d = el.dataset.date;
    const e = state.journal[d] ||= {};
    e.mood = e.mood === el.dataset.mood ? undefined : el.dataset.mood;
    commit();
  },
  'jday': el => { const n = +el.dataset.n; ui.journalDay = n ? addDays(ui.journalDay, n) : today(); render(); },

  'add-goal': () => openModal('Nova meta', `
    <div class="field"><label>Meta</label><input class="input" name="title" required placeholder="ex.: Viajar para o Japão"></div>
    <div class="row">
      <div class="field"><label>Área</label><select class="input" name="area">${AREAS.map(a => `<option>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Prazo</label><input class="input" type="date" name="deadline"></div>
    </div>`, d => { state.goals.push({ id: uid(), title: d.title.trim(), area: d.area, deadline: d.deadline, progress: 0 }); commit(); }),
  'del-goal': el => { if (confirm('Apagar esta meta?')) { state.goals = state.goals.filter(x => x.id !== el.dataset.id); commit(); } },

  'theme': el => { state.settings.theme = el.dataset.v; applyTheme(); commit(); },
  'export': () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `planner-backup-${today()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'reset': () => {
    if (!confirm('Tens a certeza? Isto apaga tudo deste dispositivo.')) return;
    state = defaults();
    commit(); applyTheme(); toast('Dados apagados');
  },
};

/* Inputs que guardam sem voltar a desenhar a página */
const inputs = {
  weeknote: el => { state.weekNotes[el.dataset.week] = el.value; },
  intention: el => { state.intentions[el.dataset.month] = el.value; },
  journal: el => { (state.journal[el.dataset.date] ||= {})[el.dataset.key] = el.value; },
  setting: el => { state.settings[el.dataset.key] = el.value; },
  goal: el => {
    state.goals.find(x => x.id === el.dataset.id).progress = +el.value;
    $(`.pct[data-for="${el.dataset.id}"]`).textContent = el.value;
    el.style.setProperty('--p', el.value + '%');
  },
};

const changes = {
  currency: el => { state.settings.currency = el.value; commit(); },
  import: el => {
    const file = el.files[0];
    if (!file) return;
    file.text().then(txt => {
      const data = JSON.parse(txt);
      if (typeof data !== 'object' || !data.settings) throw new Error();
      state = { ...defaults(), ...data };
      commit(); applyTheme(); toast('Cópia importada ✿');
    }).catch(() => toast('Ficheiro inválido'));
  },
};

/* ---------- Delegação de eventos ---------- */
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { $('#modal').close(); return; }
  const el = e.target.closest('button[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
});

document.addEventListener('change', e => {
  const el = e.target;
  if (el.matches('input[data-action]')) actions[el.dataset.action]?.(el, e);
  else if (el.dataset.change) changes[el.dataset.change]?.(el, e);
});

let saveTimer;
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset.input) return;
  inputs[el.dataset.input]?.(el);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 300);
});

document.addEventListener('submit', e => {
  const form = e.target;
  if (form.dataset.form !== 'add-task') return;
  e.preventDefault();
  const data = new FormData(form);
  const title = data.get('title').trim();
  if (!title) return;
  state.tasks.push({ id: uid(), title, date: form.dataset.date, done: false, tag: data.get('tag') });
  focusAfter = `form[data-form="add-task"] input[name="title"]`;
  commit();
});

window.addEventListener('hashchange', () => render(true));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

applyTheme();
render();
save();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
