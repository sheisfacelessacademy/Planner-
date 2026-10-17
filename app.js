'use strict';

/* =========================================================
   My Planner — app de gestão do dia a dia
   Dados guardados no dispositivo (localStorage) e, se ligares,
   sincronizados com o Supabase (ver sync.js).
   ========================================================= */

const KEY = 'planner.v1';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
const daysInMonth = m => new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();

/* ---------- Ícones (traço fino) ---------- */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="4"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  piggy: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/>',
};
const icon = name => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
const FLOWER = '<svg class="brand-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><ellipse cx="16" cy="8.5" rx="4.5" ry="7"/><ellipse cx="16" cy="23.5" rx="4.5" ry="7"/><ellipse cx="8.5" cy="16" rx="7" ry="4.5"/><ellipse cx="23.5" cy="16" rx="7" ry="4.5"/><circle cx="16" cy="16" r="3.6" fill="var(--bg)"/></svg>';
const SPARK = '<svg class="spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c.6 6.2 5.8 11.4 12 12-6.2.6-11.4 5.8-12 12-.6-6.2-5.8-11.4-12-12C6.2 11.4 11.4 6.2 12 0z"/></svg>';

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

const FONTS = {
  moderna: { label: 'Moderna', head: 'Outfit', body: 'Outfit', q: 'family=Outfit:wght@300;400;500;600;700', weight: 600, track: '-0.02em', scale: 1 },
  editorial: { label: 'Editorial', head: 'Fraunces', body: 'Manrope', q: 'family=Fraunces:ital,wght@0,400;0,600;1,400&family=Manrope:wght@400;500;600', weight: 600, track: '-0.01em', scale: 1 },
  suave: { label: 'Suave', head: 'Quicksand', body: 'Nunito', q: 'family=Quicksand:wght@500;600;700&family=Nunito:wght@400;500;600;700', weight: 700, track: '-0.01em', scale: 1 },
  minimal: { label: 'Minimal', head: 'Space Grotesk', body: 'Inter', q: 'family=Space+Grotesk:wght@400;500;600&family=Inter:wght@400;500;600', weight: 500, track: '-0.03em', scale: 1 },
  classica: { label: 'Clássica', head: 'Playfair Display', body: 'Lato', q: 'family=Playfair+Display:wght@500;600&family=Lato:wght@400;700', weight: 600, track: '0', scale: 1 },
  manuscrita: { label: 'Manuscrita', head: 'Caveat', body: 'Poppins', q: 'family=Caveat:wght@500;600;700&family=Poppins:wght@300;400;500;600', weight: 700, track: '0', scale: 1.3 },
};
const fontUrl = q => `https://fonts.googleapis.com/css2?${q}&display=swap`;

const PALETTES = {
  latte: { label: 'Latte', c: ['#f6f1ea', '#c08a6a', '#9aae96'] },
  rose: { label: 'Rosé', c: ['#f9f0ef', '#c9737f', '#e8a6ad'] },
  salvia: { label: 'Sálvia', c: ['#f2f3ec', '#7d9a78', '#d6b3a3'] },
  lavanda: { label: 'Lavanda', c: ['#f4f1f7', '#9a83b8', '#dcaecb'] },
  oceano: { label: 'Oceano', c: ['#eff3f4', '#5f8fa0', '#e0b4a6'] },
  noir: { label: 'Noir', c: ['#f3f2f0', '#3b3936', '#c9b3a8'] },
};

const CONTENT_STATUS = [['ideia', 'Ideias', '💡'], ['producao', 'Em produção', '🎬'], ['agendado', 'Agendado', '🗓️'], ['publicado', 'Publicado', '✨']];
const FORMATS = ['Carrossel', 'Reel', 'Post', 'Story', 'Skool', 'Email', 'YouTube', 'Outro'];
const BOOK_STATUS = [['quero', 'Quero ler', '🤍'], ['lendo', 'A ler', '📖'], ['lido', 'Lidos', '⭐']];
const DEFAULT_BRANDS = 'She Is Academy\nShe Is Agency\nShe Is Creator\nShe Is Studio\nSFA\nPessoal';
const SOFT_COLORS = ['var(--clay)', 'var(--sage)', 'var(--rose)', 'var(--lilac)', 'var(--sky)', 'var(--sand)'];

/* ---------- Estado ---------- */
const defaults = () => ({
  version: 2,
  updatedAt: 0,
  settings: { name: '', theme: 'auto', currency: 'EUR', font: 'moderna', palette: 'latte', quotes: '', defaultQuotes: true, brands: DEFAULT_BRANDS },
  tasks: [],
  habits: [],
  transactions: [],
  recurring: [],
  budgets: {},
  customCats: [],
  journal: {},
  goals: [],
  weekNotes: {},
  intentions: {},
  lists: { shopping: [], meals: {}, books: [], content: [] },
});

function migrate(d) {
  const base = defaults();
  return { ...base, ...d, version: 2, settings: { ...base.settings, ...d.settings }, lists: { ...base.lists, ...d.lists } };
}

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
  s.goals = [{ id: uid(), title: 'Fundo de emergência', area: 'Finanças', deadline: '', progress: 0, target: 3000, saved: 300 }];
  s.lists.shopping = [{ id: uid(), text: 'Flores frescas 💐', done: false }];
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* armazenamento indisponível */ }
  return seed();
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { toast('Não foi possível guardar neste dispositivo'); }
}

function save() {
  state.updatedAt = Date.now();
  persist();
  Sync.push(state);
}

let state = load();
const ui = {
  plannerDay: today(), finMonth: monthKey(today()), journalDay: today(),
  listTab: 'compras', mealWeek: startOfWeek(today()), just: null,
};

/* ---------- Categorias ---------- */
const customOf = type => Object.fromEntries(state.customCats.filter(c => c.type === type).map(c => [c.key, [c.label, c.emoji, c.color]]));
const expenseCats = () => ({ ...EXPENSE, ...customOf('out') });
const incomeCats = () => ({ ...INCOME, ...customOf('in') });
const allCats = () => ({ ...expenseCats(), ...incomeCats() });
const catType = k => (k in incomeCats() ? 'in' : 'out');

/* ---------- Utilitários ---------- */
const money = n => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: state.settings.currency || 'EUR' }).format(n || 0);
const J = key => (ui.just === key ? ' just' : '');
const goalPct = g => (g.target ? Math.min(100, Math.round((g.saved || 0) / g.target * 100)) : g.progress || 0);
const brands = () => state.settings.brands.split('\n').map(s => s.trim()).filter(Boolean);
const colorFor = s => SOFT_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % SOFT_COLORS.length];
const empty = (em, text) => `<p class="empty"><span class="em">${em}</span>${text}</p>`;

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 20 ? 'Boa tarde' : 'Boa noite';
}

function quoteOfDay() {
  const own = state.settings.quotes.split('\n').map(s => s.trim()).filter(Boolean);
  const pool = [...(state.settings.defaultQuotes ? QUOTES : []), ...own];
  const list = pool.length ? pool : QUOTES;
  const d = new Date();
  const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return list[day % list.length];
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2400);
}

function applyLook() {
  const s = state.settings;
  const root = document.documentElement;
  const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.palette = s.palette in PALETTES ? s.palette : 'latte';
  const f = FONTS[s.font] || FONTS.moderna;
  const link = $('#font-link');
  if (link.getAttribute('href') !== fontUrl(f.q)) link.href = fontUrl(f.q);
  root.style.setProperty('--head', `"${f.head}", system-ui, sans-serif`);
  root.style.setProperty('--sans', `"${f.body}", system-ui, sans-serif`);
  root.style.setProperty('--head-weight', f.weight);
  root.style.setProperty('--head-track', f.track);
  root.style.setProperty('--head-scale', f.scale);
  $('meta[name=theme-color]').setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
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

/* Lança os movimentos fixos (renda, subscrições…) quando chega o dia de cada mês. */
function applyRecurring() {
  const t = today();
  const cur = monthKey(t);
  let changed = false;
  for (const r of state.recurring) {
    r.months ||= [];
    for (let m = r.start; m <= cur; m = addMonths(m, 1)) {
      if (r.months.includes(m)) continue;
      const date = `${m}-${pad(Math.min(r.day, daysInMonth(m)))}`;
      if (date > t) continue;
      state.transactions.push({ id: uid(), amount: r.amount, category: r.category, note: r.note, date, type: catType(r.category), recurringId: r.id });
      r.months.push(m);
      changed = true;
    }
  }
  return changed;
}

/* ---------- Animações ---------- */
function burst(target, { n = 14, spread = 70, emoji = null } = {}) {
  if (REDUCE || !target) return;
  const r = target.getBoundingClientRect ? target.getBoundingClientRect() : target;
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'confetti' + (emoji ? ' emoji' : '');
    if (emoji) s.textContent = emoji;
    else {
      s.style.background = SOFT_COLORS[i % SOFT_COLORS.length];
      if (i % 3 === 0) s.style.borderRadius = '50%';
    }
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    document.body.appendChild(s);
    const a = Math.random() * Math.PI * 2;
    const d = spread * (0.4 + Math.random() * 0.8);
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d - spread * 0.5;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${Math.random() * 200}deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + spread}px)) scale(.8) rotate(${Math.random() * 400}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }
}
const celebrate = () => burst({ left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 }, { n: 70, spread: Math.min(innerWidth, 640) / 2.4 });

function fmtCount(v, fmt) {
  if (fmt === 'money') return money(v);
  if (fmt === 'pct') return Math.round(v) + '%';
  return String(Math.round(v));
}

function animateEnter(view) {
  if (REDUCE) return;
  $$('.page-head, .week, .tabs, .grid > *, .kanban > .col', view).forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 10));
    el.classList.add('rise');
    el.addEventListener('animationend', e => { if (e.target === el) el.classList.remove('rise'); });
  });
  $$('[data-count]', view).forEach(el => {
    const to = +el.dataset.count, fmt = el.dataset.fmt, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 1100);
      el.textContent = fmtCount(to * (1 - Math.pow(1 - p, 3)), fmt);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  $$('.bar > i', view).forEach((el, i) => el.animate([{ width: '0%' }, { width: el.style.width }], { duration: 1100, delay: 200 + i * 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  $$('.donut circle', view).forEach((el, i) => {
    const [len, gap] = el.getAttribute('stroke-dasharray').split(' ').map(Number);
    el.animate([{ strokeDasharray: `0 ${len + gap}` }, { strokeDasharray: `${len} ${gap}` }], { duration: 900, delay: 250 + i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  });
  $$('.ring .fill', view).forEach(el => {
    el.animate([{ strokeDashoffset: el.dataset.c }, { strokeDashoffset: el.getAttribute('stroke-dashoffset') }], { duration: 1300, delay: 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  });
}

/* ---------- Componentes ---------- */
function taskItem(t, { showMove = false } = {}) {
  const tag = TAGS[t.tag];
  return `<li class="task ${t.done ? 'done' : ''}${J('task:' + t.id)}">
    <input type="checkbox" class="check round" data-action="toggle-task" data-id="${t.id}" ${t.done ? 'checked' : ''} aria-label="Concluir tarefa">
    <span class="title"><span>${esc(t.title)}</span></span>
    ${tag ? `<span class="chip"><i class="dot" style="background:${tag.color}"></i>${tag.label}</span>` : ''}
    ${showMove ? `<button class="btn soft sm" data-action="move-today" data-id="${t.id}">hoje ${icon('arrow')}</button>` : ''}
    <button class="icon-btn" data-action="del-task" data-id="${t.id}" aria-label="Apagar tarefa">${icon('x')}</button>
  </li>`;
}

function addTaskForm(date) {
  return `<form class="inline-add" data-form="add-task" data-date="${date}">
    <input class="input" name="title" placeholder="Nova tarefa…" autocomplete="off" required>
    <select class="input tag-select" name="tag" aria-label="Etiqueta">
      <option value="">—</option>
      ${Object.entries(TAGS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
    </select>
    <button class="btn" aria-label="Adicionar">${icon('plus')}</button>
  </form>`;
}

function ring(pct) {
  const r = 34, C = +(2 * Math.PI * r).toFixed(2);
  return `<div class="ring"><svg viewBox="0 0 84 84">
    <circle class="track" cx="42" cy="42" r="${r}" fill="none" stroke-width="8"/>
    <circle class="fill" cx="42" cy="42" r="${r}" fill="none" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - pct / 100)).toFixed(2)}" data-c="${C}"/>
  </svg><span class="val" data-count="${pct}" data-fmt="pct">${pct}%</span></div>`;
}

function donut(byCat) {
  const cats = allCats();
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return empty('🌸', 'Ainda sem despesas este mês');
  const r = 60, C = 2 * Math.PI * r;
  let off = 0;
  const arcs = entries.map(([k, v]) => {
    const len = (v / total) * C;
    const a = `<circle r="${r}" cx="85" cy="85" fill="none" stroke="${cats[k]?.[2] || '#ccc'}" stroke-width="22"
      stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"><title>${esc(cats[k]?.[0] || k)}: ${money(v)}</title></circle>`;
    off += len;
    return a;
  }).join('');
  return `<div class="donut-wrap">
    <svg class="donut" viewBox="0 0 170 170" role="img" aria-label="Despesas por categoria">
      <g transform="rotate(-90 85 85)">${arcs}</g>
      <text x="85" y="80" text-anchor="middle" font-size="11" fill="var(--ink-soft)" font-family="var(--sans)">total</text>
      <text x="85" y="100" text-anchor="middle" font-size="16" font-family="var(--head)" font-weight="600" fill="var(--ink)">${money(total)}</text>
    </svg>
    <ul class="legend">
      ${entries.map(([k, v]) => `<li><i class="dot" style="background:${cats[k]?.[2]}"></i><span>${cats[k]?.[1] || ''} ${esc(cats[k]?.[0] || k)}</span><span class="muted">${Math.round(v / total * 100)}%</span></li>`).join('')}
    </ul>
  </div>`;
}

function catOptions(selected) {
  const group = (label, obj) => `<optgroup label="${label}">${Object.entries(obj).map(([k, [l, e]]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>${e} ${esc(l)}</option>`).join('')}</optgroup>`;
  return group('Despesas', expenseCats()) + group('Receitas', incomeCats());
}

function navHead(action, label) {
  return `<div class="row">
    <button class="icon-btn bordered" data-action="${action}" data-n="-1" aria-label="Anterior">${icon('left')}</button>
    ${label ? `<button class="btn soft" data-action="${action}" data-n="0">${label}</button>` : ''}
    <button class="icon-btn bordered" data-action="${action}" data-n="1" aria-label="Seguinte">${icon('right')}</button>
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
  const habitsDone = state.habits.filter(h => h.log[t]).length;
  const total = tasks.length + state.habits.length;
  const pct = total ? Math.round((done + habitsDone) / total * 100) : 0;
  const fin = monthTotals(monthKey(t));
  const entry = state.journal[t] || {};
  const goals = state.goals.slice(0, 3);

  return `
  <header class="page-head">
    <div>
      <p class="eyebrow">${cap(fmtDate(t, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <h1>${greeting()}${name ? `, <em>${esc(name)}</em>` : ''}</h1>
    </div>
    <div class="day-ring">${ring(pct)}<span class="small muted">do teu dia<br>está feito</span></div>
  </header>

  <div class="grid">
    <section class="card tint-clay span-12 quote-card">
      <p class="quote" style="padding-right:56px">“${esc(quoteOfDay())}”</p>${SPARK}
    </section>

    <section class="card span-7">
      <div class="card-head"><h2>Tarefas de hoje</h2><span class="chip">${done}/${tasks.length}</span></div>
      ${tasks.length ? `<ul class="list">${tasks.map(x => taskItem(x)).join('')}</ul>` : empty('🕊️', 'Um dia leve. Adiciona o que importa.')}
      ${addTaskForm(t)}
      ${overdue.length ? `
        <div style="margin-top:22px">
          <div class="card-head"><h3>Ficaram para trás</h3><button class="btn ghost sm" data-action="move-all-today">Mover todas para hoje</button></div>
          <ul class="list">${overdue.map(x => taskItem(x, { showMove: true })).join('')}</ul>
        </div>` : ''}
    </section>

    <section class="card span-5">
      <div class="card-head"><h2>Rituais</h2><span class="chip">${habitsDone}/${state.habits.length}</span></div>
      ${state.habits.length ? state.habits.map(h => `
        <button class="today-habit ${h.log[t] ? 'on' : ''}${J('habit:' + h.id + t)}" data-action="toggle-habit" data-id="${h.id}" data-date="${t}">
          <span class="em">${esc(h.emoji)}</span><span style="flex:1">${esc(h.name)}</span>
          <span class="streak">${streak(h) ? `🔥 ${streak(h)}` : ''}</span>
        </button>`).join('') : empty('🌱', 'Cria os teus primeiros hábitos')}
      <a href="#habitos" class="link">Gerir hábitos ${icon('arrow')}</a>
    </section>

    <section class="card span-5">
      <div class="card-head"><h2>Este mês</h2><button class="btn soft sm" data-action="add-tx">${icon('plus')} Movimento</button></div>
      <div class="row wrap between" style="gap:18px">
        <div class="stat"><span class="label">Saldo</span><span class="value ${fin.bal >= 0 ? 'pos' : 'neg'}" data-count="${fin.bal}" data-fmt="money">${money(fin.bal)}</span></div>
        <div class="stat"><span class="label">Gastos</span><span class="value" data-count="${fin.out}" data-fmt="money">${money(fin.out)}</span></div>
      </div>
      <p style="margin-top:14px"><a href="#financas" class="link">Ver finanças ${icon('arrow')}</a></p>
    </section>

    <section class="card tint-rose span-7">
      <div class="card-head"><h2>Como te sentes?</h2><a href="#diario" class="link">Diário ${icon('arrow')}</a></div>
      <div class="moods">
        ${MOODS.map(([e, l]) => `<button class="mood ${entry.mood === e ? 'on' : ''}${J('mood:' + t + e)}" data-action="set-mood" data-date="${t}" data-mood="${e}"><span class="e">${e}</span><span class="l">${l}</span></button>`).join('')}
      </div>
    </section>

    ${goals.length ? `
    <section class="card span-12">
      <div class="card-head"><h2>Metas em curso</h2><a href="#metas" class="link">Todas ${icon('arrow')}</a></div>
      <div class="grid">
        ${goals.map(g => `<div class="span-4">
          <div class="row between small"><span>${esc(g.title)}</span><span class="muted">${goalPct(g)}%</span></div>
          <div class="bar accent" style="margin-top:8px"><i style="width:${goalPct(g)}%"></i></div>
        </div>`).join('')}
      </div>
    </section>` : ''}
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
    ${navHead('week', 'Hoje')}
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
      ${tasks.length ? `<ul class="list">${tasks.map(x => taskItem(x)).join('')}</ul>` : empty('☁️', 'Nada planeado — espaço para respirar.')}
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
    <div><p class="eyebrow">Hábitos</p><h1>Pequenos <em>rituais</em></h1></div>
    <button class="btn" data-action="add-habit">${icon('plus')} Hábito</button>
  </header>

  <div class="grid">
    <section class="card span-12">
      ${state.habits.length ? `
        <div class="habit-row head"><span style="text-align:left">Últimos 7 dias</span>${days.map(d => `<span>${WEEKDAYS[(parse(d).getDay() + 6) % 7].charAt(0)}<br>${parse(d).getDate()}</span>`).join('')}<span>Série</span><span></span></div>
        ${state.habits.map(h => `
          <div class="habit-row">
            <span class="habit-name"><span>${esc(h.emoji)}</span><span>${esc(h.name)}</span></span>
            ${days.map(d => `<button class="habit-cell ${h.log[d] ? 'on' : ''}${J('habit:' + h.id + d)}" data-action="toggle-habit" data-id="${h.id}" data-date="${d}" aria-label="${esc(h.name)} ${d}"></button>`).join('')}
            <span class="streak">${streak(h) ? `🔥 ${streak(h)}` : '—'}</span>
            <button class="icon-btn" data-action="del-habit" data-id="${h.id}" aria-label="Apagar hábito">${icon('x')}</button>
          </div>`).join('')}
      ` : empty('🌱', 'Ainda sem hábitos. Começa por um só.')}
    </section>

    <section class="card tint-sage span-12">
      <div class="day-ring">
        ${ring(pct)}
        <p class="muted">${doneToday} de ${state.habits.length} rituais cumpridos hoje. ${pct === 100 ? 'Dia perfeito! ✨' : 'Um de cada vez.'}</p>
      </div>
    </section>
  </div>`;
}

function viewFinancas() {
  const m = ui.finMonth;
  const fin = monthTotals(m);
  const cats = allCats();
  const exp = expenseCats();
  const savings = fin.inc ? Math.round(fin.bal / fin.inc * 100) : 0;
  const txs = state.transactions.filter(x => x.date.startsWith(m)).sort((a, b) => b.date.localeCompare(a.date));
  const budgets = Object.entries(state.budgets).filter(([k, v]) => v > 0 && k in exp);
  const savingGoals = state.goals.filter(g => g.target);
  const savedTotal = savingGoals.reduce((s, g) => s + (g.saved || 0), 0);

  return `
  <header class="page-head">
    <div><p class="eyebrow">Finanças</p><h1>${monthLabel(m)}</h1></div>
    <div class="row">
      ${navHead('month')}
      <button class="btn" data-action="add-tx">${icon('plus')} Movimento</button>
    </div>
  </header>

  <div class="grid">
    <section class="card span-4"><div class="stat"><span class="label">Receitas</span><span class="value pos" data-count="${fin.inc}" data-fmt="money">${money(fin.inc)}</span></div></section>
    <section class="card span-4"><div class="stat"><span class="label">Despesas</span><span class="value neg" data-count="${fin.out}" data-fmt="money">${money(fin.out)}</span></div></section>
    <section class="card tint-clay span-4"><div class="stat"><span class="label">Saldo</span><span class="value" data-count="${fin.bal}" data-fmt="money">${money(fin.bal)}</span><span class="small muted">${fin.inc ? `Poupaste ${savings}% do que entrou` : 'Regista as tuas receitas'}</span></div></section>

    <section class="card span-6">
      <div class="card-head"><h2>Para onde foi o dinheiro</h2></div>
      ${donut(fin.byCat)}
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>Orçamentos</h2><button class="btn soft sm" data-action="edit-budgets">Definir</button></div>
      ${budgets.length ? budgets.map(([k, limit]) => {
        const spent = fin.byCat[k] || 0;
        const p = Math.min(100, spent / limit * 100);
        return `<div class="budget">
          <div class="row"><span>${exp[k][1]} ${esc(exp[k][0])}</span><span class="muted">${money(spent)} / ${money(limit)}</span></div>
          <div class="bar ${spent > limit ? 'over' : ''}"><i style="width:${p.toFixed(1)}%"></i></div>
        </div>`;
      }).join('') : empty('🎯', 'Define limites mensais por categoria.')}
    </section>

    <section class="card span-6">
      <div class="card-head"><h2>${icon('repeat')} Fixos mensais</h2><button class="btn soft sm" data-action="add-recurring">${icon('plus')} Fixo</button></div>
      ${state.recurring.length ? state.recurring.map(r => `
        <div class="tx">
          <div class="tx-ico">${cats[r.category]?.[1] || '✦'}</div>
          <div class="tx-main">
            <div class="t">${esc(r.note || cats[r.category]?.[0] || '')}</div>
            <div class="small muted">Dia ${r.day} · ${r.months?.includes(m) ? '✓ lançado' : 'por lançar'}</div>
          </div>
          <div class="tx-amt ${catType(r.category) === 'in' ? 'pos' : ''}">${money(r.amount)}</div>
          <button class="icon-btn" data-action="del-recurring" data-id="${r.id}" aria-label="Remover fixo">${icon('x')}</button>
        </div>`).join('') : empty('🔁', 'Renda, subscrições, salário… lançados sozinhos todos os meses.')}
    </section>

    <section class="card tint-sage span-6">
      <div class="card-head"><h2>${icon('piggy')} Poupanças</h2><span class="chip">${money(savedTotal)}</span></div>
      ${savingGoals.length ? savingGoals.map(g => `
        <div class="budget">
          <div class="row"><span>${esc(g.title)}</span><span class="row" style="gap:4px"><span class="muted small">${money(g.saved || 0)} / ${money(g.target)}</span><button class="icon-btn" data-action="deposit" data-id="${g.id}" aria-label="Depositar">${icon('plus')}</button></span></div>
          <div class="bar accent"><i style="width:${goalPct(g)}%"></i></div>
        </div>`).join('') : `${empty('🐷', 'Cria uma meta com valor a poupar.')}<p style="text-align:center"><a href="#metas" class="link">Ir para metas ${icon('arrow')}</a></p>`}
    </section>

    <section class="card span-12">
      <div class="card-head"><h2>Movimentos</h2><span class="chip">${txs.length}</span></div>
      ${txs.length ? txs.map(x => `
        <div class="tx">
          <div class="tx-ico">${cats[x.category]?.[1] || '✦'}</div>
          <div class="tx-main">
            <div class="t">${esc(x.note || cats[x.category]?.[0] || '')}</div>
            <div class="small muted">${esc(cats[x.category]?.[0] || '')} · ${fmtDate(x.date, { day: 'numeric', month: 'short' })}${x.recurringId ? ' · fixo' : ''}</div>
          </div>
          <div class="tx-amt ${x.type === 'in' ? 'pos' : ''}">${x.type === 'in' ? '+' : '−'}${money(x.amount)}</div>
          <button class="icon-btn" data-action="del-tx" data-id="${x.id}" aria-label="Apagar movimento">${icon('x')}</button>
        </div>`).join('') : empty('🧾', 'Sem movimentos neste mês.')}
    </section>
  </div>`;
}

function viewDiario() {
  const d = ui.journalDay;
  const e = state.journal[d] || {};
  const m = monthKey(d);
  const first = parse(m + '-01');
  const offset = (first.getDay() + 6) % 7;
  const t = today();

  return `
  <header class="page-head">
    <div><p class="eyebrow">Diário</p><h1>${cap(fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}</h1></div>
    ${navHead('jday', 'Hoje')}
  </header>

  <div class="grid">
    <section class="card tint-rose span-7">
      <div class="card-head"><h2>Como te sentes?</h2></div>
      <div class="moods">
        ${MOODS.map(([em, l]) => `<button class="mood ${e.mood === em ? 'on' : ''}${J('mood:' + d + em)}" data-action="set-mood" data-date="${d}" data-mood="${em}"><span class="e">${em}</span><span class="l">${l}</span></button>`).join('')}
      </div>
    </section>

    <section class="card span-5">
      <div class="card-head"><h2>${monthLabel(m)}</h2></div>
      <div class="mood-cal">
        ${'<div class="c blank"></div>'.repeat(offset)}
        ${Array.from({ length: daysInMonth(m) }, (_, i) => {
          const key = `${m}-${pad(i + 1)}`;
          const mood = state.journal[key]?.mood;
          return `<div class="c ${key === t ? 'is-today' : ''}" title="${key}">${mood || `<span class="n">${i + 1}</span>`}</div>`;
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
    <div><p class="eyebrow">Metas & visão</p><h1>Sonhos, em <em>passos</em></h1></div>
    <button class="btn" data-action="add-goal">${icon('plus')} Meta</button>
  </header>

  <div class="grid">
    <section class="card tint-clay span-12 quote-card">
      <p class="eyebrow">Intenção para ${monthLabel(m)}</p>
      <input class="input quote" style="background:transparent;border:0;padding:0;box-shadow:none" data-input="intention" data-month="${m}" value="${esc(state.intentions[m] || '')}" placeholder="Este mês, escolho…">
      ${SPARK}
    </section>

    <section class="card span-12">
      ${state.goals.length ? state.goals.map(g => {
        const p = goalPct(g);
        return `
        <div class="goal ${p >= 100 ? 'complete' : ''}">
          <div class="row between" style="align-items:flex-start">
            <div style="min-width:0">
              <h3>${esc(g.title)}</h3>
              <div class="row wrap small muted" style="margin-top:6px;gap:8px">
                <span class="chip">${esc(g.area)}</span>
                ${g.deadline ? `<span>até ${fmtDate(g.deadline, { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : ''}
                ${g.target ? `<span>${money(g.saved || 0)} de ${money(g.target)}</span>` : ''}
              </div>
            </div>
            <div class="row" style="gap:4px">
              <span class="stat"><span class="value" style="font-size:1.45rem"><span class="pct" data-for="${g.id}">${p}</span>%</span></span>
              ${g.target ? `<button class="btn soft sm" data-action="deposit" data-id="${g.id}">${icon('plus')} Poupar</button>` : ''}
              <button class="icon-btn" data-action="del-goal" data-id="${g.id}" aria-label="Apagar meta">${icon('x')}</button>
            </div>
          </div>
          ${g.target
            ? `<div class="bar accent"><i style="width:${p}%"></i></div>`
            : `<input type="range" min="0" max="100" step="5" value="${p}" style="--p:${p}%" data-input="goal" data-change="goal-done" data-id="${g.id}" aria-label="Progresso">`}
        </div>`;
      }).join('') : empty('✧', 'Escreve a tua primeira meta.')}
    </section>
  </div>`;
}

const LIST_TABS = [['compras', '🛒', 'Compras'], ['refeicoes', '🍽️', 'Refeições'], ['leituras', '📚', 'Leituras'], ['conteudos', '✍️', 'Conteúdos']];

function viewListas() {
  const tab = ui.listTab;
  const body = { compras: listCompras, refeicoes: listRefeicoes, leituras: listLeituras, conteudos: listConteudos }[tab]();
  return `
  <header class="page-head">
    <div><p class="eyebrow">Listas</p><h1>Tudo no <em>sítio</em></h1></div>
  </header>
  <div class="tabs" style="margin-bottom:20px">
    <div class="segmented">
      ${LIST_TABS.map(([k, e, l]) => `<button class="${tab === k ? 'on' : ''}" data-action="list-tab" data-tab="${k}"><span>${e}</span>${l}</button>`).join('')}
    </div>
  </div>
  ${body}`;
}

function listCompras() {
  const items = [...state.lists.shopping].sort((a, b) => a.done - b.done);
  const bought = items.filter(x => x.done).length;
  return `<div class="grid"><section class="card span-12">
    <div class="card-head"><h2>Lista de compras</h2>${bought ? `<button class="btn ghost sm" data-action="clear-shop">Limpar comprados (${bought})</button>` : ''}</div>
    ${items.length ? `<ul class="list">${items.map(x => `
      <li class="task ${x.done ? 'done' : ''}${J('shop:' + x.id)}">
        <input type="checkbox" class="check" data-action="toggle-shop" data-id="${x.id}" ${x.done ? 'checked' : ''} aria-label="Comprado">
        <span class="title"><span>${esc(x.text)}</span></span>
        <button class="icon-btn" data-action="del-shop" data-id="${x.id}" aria-label="Apagar">${icon('x')}</button>
      </li>`).join('')}</ul>` : empty('🧺', 'A lista está vazia.')}
    <form class="inline-add" data-form="add-shop">
      <input class="input" name="text" placeholder="Adicionar artigo…" autocomplete="off" required>
      <button class="btn" aria-label="Adicionar">${icon('plus')}</button>
    </form>
  </section></div>`;
}

function listRefeicoes() {
  const ws = ui.mealWeek;
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  return `<div class="grid"><section class="card span-12">
    <div class="card-head">
      <h2>Semana de ${fmtDate(ws, { day: 'numeric', month: 'short' })}</h2>
      ${navHead('meal-week', 'Esta semana')}
    </div>
    <div class="meal-grid">
      <span></span><span class="h">Almoço</span><span class="h">Jantar</span>
      ${days.map((d, i) => {
        const meal = state.lists.meals[d] || {};
        return `<span class="d ${d === t ? 'is-today' : ''}">${WEEKDAYS[i]} ${parse(d).getDate()}</span>
          <input class="input" data-input="meal" data-date="${d}" data-key="almoco" value="${esc(meal.almoco || '')}" placeholder="—">
          <input class="input" data-input="meal" data-date="${d}" data-key="jantar" value="${esc(meal.jantar || '')}" placeholder="—">`;
      }).join('')}
    </div>
  </section></div>`;
}

function kanbanCard(listName, x, statuses, inner) {
  const idx = statuses.findIndex(s => s[0] === x.status);
  return `<div class="k-card${J('card:' + x.id)}">
    ${inner}
    <div class="acts">
      ${idx > 0 ? `<button class="icon-btn" data-action="move-card" data-list="${listName}" data-id="${x.id}" data-dir="-1" aria-label="Recuar">${icon('left')}</button>` : ''}
      ${idx < statuses.length - 1 ? `<button class="icon-btn" data-action="move-card" data-list="${listName}" data-id="${x.id}" data-dir="1" aria-label="Avançar">${icon('right')}</button>` : ''}
      <button class="icon-btn" data-action="del-card" data-list="${listName}" data-id="${x.id}" aria-label="Apagar">${icon('x')}</button>
    </div>
  </div>`;
}

function listLeituras() {
  const books = state.lists.books;
  return `<div class="row between" style="margin-bottom:14px"><p class="muted">A tua estante.</p><button class="btn" data-action="add-book">${icon('plus')} Livro</button></div>
  <div class="kanban three">
    ${BOOK_STATUS.map(([k, l, e]) => {
      const items = books.filter(b => b.status === k);
      return `<div class="col">
        <div class="col-head"><span>${e} ${l}</span><span class="chip">${items.length}</span></div>
        ${items.map(b => kanbanCard('books', b, BOOK_STATUS, `
          <div class="t">${esc(b.title)}</div>
          <div class="meta">${b.author ? `<span class="small muted">${esc(b.author)}</span>` : ''}
          ${k === 'lido' ? `<span class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="${(b.rating || 0) >= n ? 'on' : ''}" data-action="rate-book" data-id="${b.id}" data-n="${n}" aria-label="${n} estrelas">★</button>`).join('')}</span>` : ''}</div>`)).join('') || '<p class="small muted" style="text-align:center;padding:8px">—</p>'}
      </div>`;
    }).join('')}
  </div>`;
}

function listConteudos() {
  const items = state.lists.content;
  return `<div class="row between wrap" style="margin-bottom:14px"><p class="muted">O teu quadro de conteúdos.</p><button class="btn" data-action="add-content">${icon('plus')} Ideia</button></div>
  <div class="kanban">
    ${CONTENT_STATUS.map(([k, l, e]) => {
      const col = items.filter(c => c.status === k).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
      return `<div class="col">
        <div class="col-head"><span>${e} ${l}</span><span class="chip">${col.length}</span></div>
        ${col.map(c => kanbanCard('content', c, CONTENT_STATUS, `
          <div class="t">${esc(c.title)}</div>
          <div class="meta">
            ${c.brand ? `<span class="chip"><i class="dot" style="background:${colorFor(c.brand)}"></i>${esc(c.brand)}</span>` : ''}
            <span class="chip">${esc(c.format)}</span>
            ${c.date ? `<span class="small muted">${fmtDate(c.date, { day: 'numeric', month: 'short' })}</span>` : ''}
          </div>`)).join('') || '<p class="small muted" style="text-align:center;padding:8px">—</p>'}
      </div>`;
    }).join('')}
  </div>`;
}

const SYNC_SQL = `create table planner_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table planner_state enable row level security;
create policy "A minha linha" on planner_state
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;

function syncInner() {
  const cfg = Sync.config;
  const cls = { ok: 'ok', busy: 'busy', err: 'err' }[Sync.status] || '';
  const status = `<span class="sync-status small ${cls}"><i class="dot"></i>${esc(Sync.message || 'Desligada')}</span>`;
  if (!cfg.url) {
    return `<p class="muted small">Liga uma base de dados Supabase (gratuita) para teres os mesmos dados no telemóvel e no computador.</p>
      <form data-form="sync-config" style="margin-top:14px">
        <div class="field"><label>Project URL</label><input class="input" name="url" placeholder="https://xxxx.supabase.co" required></div>
        <div class="field"><label>Anon public key</label><input class="input" name="key" placeholder="eyJhbGciOi…" required></div>
        <button class="btn">${icon('cloud')} Ligar</button>
      </form>
      <details class="help" style="margin-top:14px">
        <summary>Como criar (5 minutos)</summary>
        <ol>
          <li>Cria uma conta em <code>supabase.com</code> e um projeto novo.</li>
          <li>Em <b>SQL Editor</b>, corre isto:</li>
        </ol>
        <pre class="sql">${esc(SYNC_SQL)}</pre>
        <ol start="3">
          <li>Em <b>Authentication → URL Configuration</b>, põe o endereço desta app em <i>Site URL</i>.</li>
          <li>Em <b>Project Settings → API</b>, copia o <i>Project URL</i> e a <i>anon public key</i> para aqui.</li>
        </ol>
      </details>`;
  }
  if (!Sync.user) {
    return `${status}
      <form data-form="sync-login" class="inline-add" style="margin-top:14px">
        <input class="input" type="email" name="email" placeholder="o-teu@email.com" required autocomplete="email">
        <button class="btn" style="width:auto;padding:0 16px">Enviar link</button>
      </form>
      <p class="small muted" style="margin-top:8px">Recebes um link mágico no email — abre-o neste dispositivo.</p>
      <button class="btn ghost sm" style="margin-top:12px" data-action="sync-disconnect">Desligar Supabase</button>`;
  }
  return `${status}
    <p class="small" style="margin-top:8px">Ligada como <b>${esc(Sync.user.email || '')}</b></p>
    <div class="row wrap" style="margin-top:14px">
      <button class="btn soft sm" data-action="sync-pull">Sincronizar agora</button>
      <button class="btn ghost sm" data-action="sync-signout">Terminar sessão</button>
      <button class="btn ghost sm" data-action="sync-disconnect">Desligar</button>
    </div>`;
}

function viewDefinicoes() {
  const s = state.settings;
  const cur = ['EUR', 'BRL', 'USD', 'GBP', 'CHF'];
  return `
  <header class="page-head"><div><p class="eyebrow">Definições</p><h1>A tua <em>app</em></h1></div></header>
  <div class="grid">
    <section class="card span-12 stack">
      <h2>Aparência</h2>
      <div class="field"><label>Tema</label>
        <div><div class="segmented">
          ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([k, l]) => `<button class="${s.theme === k ? 'on' : ''}" data-action="theme" data-v="${k}">${l}</button>`).join('')}
        </div></div>
      </div>
      <div class="field"><label>Cores</label>
        <div class="swatches">
          ${Object.entries(PALETTES).map(([k, p]) => `<button class="swatch ${s.palette === k ? 'on' : ''}" data-action="palette" data-v="${k}"><span class="sw">${p.c.map(c => `<i style="background:${c}"></i>`).join('')}</span>${p.label}</button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Letra</label>
        <div class="fonts">
          ${Object.entries(FONTS).map(([k, f]) => `<button class="font-opt ${s.font === k ? 'on' : ''}" data-action="font" data-v="${k}">
            <span class="aa" style="font-family:'${f.head}';font-weight:${f.weight};letter-spacing:${f.track}">Bom dia</span>
            <span class="nm" style="font-family:'${f.body}'">${f.label} · ${f.head}</span>
          </button>`).join('')}
        </div>
      </div>
    </section>

    <section class="card span-6 stack">
      <h2>Perfil</h2>
      <div class="field"><label>Como te devo chamar?</label><input class="input" data-input="setting" data-key="name" value="${esc(s.name)}" placeholder="O teu nome"></div>
      <div class="field"><label>Moeda</label>
        <select class="input" data-change="currency">${cur.map(c => `<option ${s.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>As tuas marcas (uma por linha) — usadas no quadro de conteúdos</label>
        <textarea class="input" style="min-height:120px" data-input="setting" data-key="brands">${esc(s.brands)}</textarea>
      </div>
    </section>

    <section class="card span-6 stack">
      <h2>Frases do dia</h2>
      <div class="field"><label>As tuas frases (uma por linha)</label>
        <textarea class="input" style="min-height:150px" data-input="setting" data-key="quotes" placeholder="Eu sou capaz de tudo o que me proponho.">${esc(s.quotes)}</textarea>
      </div>
      <label class="check-label"><input type="checkbox" class="check" data-change="default-quotes" ${s.defaultQuotes ? 'checked' : ''}> Incluir também as frases da app</label>
    </section>

    <section class="card span-6 stack">
      <div class="card-head" style="margin:0"><h2>Categorias próprias</h2><button class="btn soft sm" data-action="add-cat">${icon('plus')} Categoria</button></div>
      ${state.customCats.length ? `<div class="cat-list">${state.customCats.map(c => `<span class="chip"><i class="dot" style="background:${c.color}"></i>${esc(c.emoji)} ${esc(c.label)} <span class="muted">· ${c.type === 'in' ? 'receita' : 'despesa'}</span><button class="icon-btn" data-action="del-cat" data-key="${c.key}" aria-label="Apagar categoria">${icon('x')}</button></span>`).join('')}</div>` : '<p class="muted small">Cria categorias tuas, como “Pets 🐶” ou “Formações”.</p>'}
    </section>

    <section class="card span-6 stack">
      <h2>${icon('cloud')} Sincronização</h2>
      <div id="sync-box">${syncInner()}</div>
    </section>

    <section class="card span-6 stack">
      <div><h2>Os teus dados</h2><p class="muted small" style="margin-top:6px">Ficam guardados neste dispositivo${Sync.user ? ' e na tua nuvem' : ''}. Faz cópias de vez em quando.</p></div>
      <div class="row wrap">
        <button class="btn" data-action="export">Exportar cópia</button>
        <label class="btn ghost">Importar<input type="file" accept="application/json" data-change="import" hidden></label>
      </div>
      <button class="btn danger" data-action="reset">Apagar todos os dados</button>
    </section>

    <section class="card tint-rose span-6 stack">
      <h2>Instalar no telemóvel</h2>
      <p class="small"><b>iPhone:</b> abre no Safari → botão Partilhar → “Adicionar ao ecrã principal”.</p>
      <p class="small"><b>Android:</b> abre no Chrome → menu ⋮ → “Instalar app”.</p>
    </section>
  </div>`;
}

/* =========================================================
   Router & render
   ========================================================= */
const NAV = [['hoje', 'Hoje', 'sun'], ['planner', 'Planner', 'calendar'], ['habitos', 'Hábitos', 'leaf'], ['financas', 'Finanças', 'wallet'], ['diario', 'Diário', 'book'], ['metas', 'Metas', 'target'], ['listas', 'Listas', 'list']];
const routes = { hoje: viewHoje, planner: viewPlanner, habitos: viewHabitos, financas: viewFinancas, diario: viewDiario, metas: viewMetas, listas: viewListas, definicoes: viewDefinicoes };
const currentRoute = () => { const r = location.hash.slice(1); return r in routes ? r : 'hoje'; };

function renderNav() {
  $('#nav').innerHTML = `<a class="brand" href="#hoje">${FLOWER}<span class="brand-name">my planner</span></a>`
    + NAV.map(([r, l, i]) => `<a class="nav-item" href="#${r}" data-route="${r}">${icon(i)}<span>${l}</span></a>`).join('')
    + `<a class="nav-item nav-settings" href="#definicoes" data-route="definicoes">${icon('settings')}<span>Definições</span></a>`;
  const gear = Object.assign(document.createElement('a'), { className: 'mobile-gear', href: '#definicoes', innerHTML: icon('settings') });
  gear.setAttribute('aria-label', 'Definições');
  document.body.appendChild(gear);
}

/* Carrega todas as letras só quando abres as Definições, para as pré-visualizações. */
function loadFontPreviews() {
  if ($('#font-preview')) return;
  const link = Object.assign(document.createElement('link'), { id: 'font-preview', rel: 'stylesheet', href: fontUrl(Object.values(FONTS).map(f => f.q).join('&')) });
  document.head.appendChild(link);
}

let focusAfter = null;
function render(enter = false) {
  const r = currentRoute();
  if (r === 'definicoes') loadFontPreviews();
  const view = $('#view');
  view.innerHTML = routes[r]();
  ui.just = null;
  $$('#nav .nav-item').forEach(a => a.classList.toggle('active', a.dataset.route === r));
  if (enter) { window.scrollTo(0, 0); animateEnter(view); }
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
const findIn = (list, id) => state.lists[list].find(x => x.id === id);

const actions = {
  'toggle-task': el => {
    const t = findTask(el.dataset.id);
    t.done = el.checked;
    ui.just = 'task:' + t.id;
    if (t.done) {
      burst(el);
      const sameDay = state.tasks.filter(x => x.date === t.date);
      if (sameDay.every(x => x.done) && sameDay.length > 1) { setTimeout(celebrate, 250); toast('Tudo feito! Que orgulho ✨'); }
    }
    commit();
  },
  'del-task': el => { state.tasks = state.tasks.filter(x => x.id !== el.dataset.id); commit(); },
  'move-today': el => { findTask(el.dataset.id).date = today(); commit(); },
  'move-all-today': () => { const t = today(); state.tasks.forEach(x => { if (!x.done && x.date < t) x.date = t; }); commit(); toast('Tudo para hoje ✿'); },

  'week': el => { const n = +el.dataset.n; ui.plannerDay = n ? addDays(ui.plannerDay, n * 7) : today(); render(); },
  'pick-day': el => { ui.plannerDay = el.dataset.date; render(); },

  'toggle-habit': el => {
    const h = state.habits.find(x => x.id === el.dataset.id);
    const d = el.dataset.date;
    if (h.log[d]) delete h.log[d];
    else {
      h.log[d] = true;
      burst(el, { n: 10, spread: 50 });
      if (d === today() && state.habits.every(x => x.log[d])) { setTimeout(celebrate, 250); toast('Todos os rituais cumpridos 🌿'); }
    }
    ui.just = 'habit:' + h.id + d;
    commit();
  },
  'add-habit': () => openModal('Novo hábito', `
    <div class="row">
      <div class="field" style="flex:0 0 80px"><label>Emoji</label><input class="input" name="emoji" value="✨" maxlength="4"></div>
      <div class="field"><label>Nome</label><input class="input" name="name" required placeholder="ex.: Meditar 10 min"></div>
    </div>`, d => { state.habits.push({ id: uid(), name: d.name.trim(), emoji: d.emoji || '✨', log: {} }); commit(); }),
  'del-habit': el => { if (confirm('Apagar este hábito e o histórico?')) { state.habits = state.habits.filter(x => x.id !== el.dataset.id); commit(); } },

  'month': el => { const n = +el.dataset.n; ui.finMonth = addMonths(ui.finMonth, n); render(); },
  'add-tx': () => {
    const defDate = currentRoute() === 'financas' && ui.finMonth !== monthKey(today()) ? ui.finMonth + '-01' : today();
    openModal('Novo movimento', `
      <div class="row">
        <div class="field"><label>Valor</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required placeholder="0,00"></div>
        <div class="field"><label>Data</label><input class="input" name="date" type="date" value="${defDate}" required></div>
      </div>
      <div class="field"><label>Categoria</label><select class="input" name="category">${catOptions()}</select></div>
      <div class="field"><label>Descrição</label><input class="input" name="note" placeholder="ex.: Café com a Rita"></div>`,
      d => {
        state.transactions.push({ id: uid(), amount: Math.abs(parseFloat(d.amount)), date: d.date, category: d.category, note: d.note.trim(), type: catType(d.category) });
        commit(); toast('Movimento registado');
      });
  },
  'del-tx': el => { state.transactions = state.transactions.filter(x => x.id !== el.dataset.id); commit(); },
  'edit-budgets': () => openModal('Orçamento mensal', `
    <p class="muted small" style="margin-bottom:14px">Deixa em branco as categorias sem limite.</p>
    ${Object.entries(expenseCats()).map(([k, [l, e]]) => `
      <div class="row" style="margin-bottom:8px"><span style="flex:1">${e} ${esc(l)}</span>
      <input class="input" style="width:120px" name="${k}" type="number" min="0" step="1" inputmode="decimal" value="${state.budgets[k] || ''}"></div>`).join('')}`,
    d => { state.budgets = {}; for (const [k, v] of Object.entries(d)) if (+v > 0) state.budgets[k] = +v; commit(); }),
  'add-recurring': () => openModal('Novo fixo mensal', `
    <div class="row">
      <div class="field"><label>Valor</label><input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required placeholder="0,00"></div>
      <div class="field"><label>Dia do mês</label><input class="input" name="day" type="number" min="1" max="31" value="${parse(today()).getDate()}" required></div>
    </div>
    <div class="field"><label>Categoria</label><select class="input" name="category">${catOptions('subscricoes')}</select></div>
    <div class="field"><label>Descrição</label><input class="input" name="note" required placeholder="ex.: Renda, Netflix, Ginásio"></div>`,
    d => {
      state.recurring.push({ id: uid(), amount: Math.abs(parseFloat(d.amount)), day: Math.min(31, Math.max(1, +d.day)), category: d.category, note: d.note.trim(), start: monthKey(today()), months: [] });
      applyRecurring();
      commit(); toast('Fixo criado — lançado todos os meses');
    }),
  'del-recurring': el => {
    if (!confirm('Remover este fixo? Os movimentos já lançados ficam.')) return;
    state.recurring = state.recurring.filter(x => x.id !== el.dataset.id);
    commit();
  },

  'set-mood': el => {
    const d = el.dataset.date;
    const e = state.journal[d] ||= {};
    if (e.mood === el.dataset.mood) e.mood = undefined;
    else { e.mood = el.dataset.mood; burst(el, { n: 6, spread: 60, emoji: e.mood }); }
    ui.just = 'mood:' + d + el.dataset.mood;
    commit();
  },
  'jday': el => { const n = +el.dataset.n; ui.journalDay = n ? addDays(ui.journalDay, n) : today(); render(); },

  'add-goal': () => openModal('Nova meta', `
    <div class="field"><label>Meta</label><input class="input" name="title" required placeholder="ex.: Viajar para o Japão"></div>
    <div class="row">
      <div class="field"><label>Área</label><select class="input" name="area">${AREAS.map(a => `<option>${a}</option>`).join('')}</select></div>
      <div class="field"><label>Prazo</label><input class="input" type="date" name="deadline"></div>
    </div>
    <div class="field"><label>Valor a poupar (opcional)</label><input class="input" name="target" type="number" min="0" step="1" inputmode="decimal" placeholder="ex.: 3000"></div>`,
    d => {
      const target = +d.target > 0 ? +d.target : 0;
      state.goals.push({ id: uid(), title: d.title.trim(), area: d.area, deadline: d.deadline, progress: 0, ...(target ? { target, saved: 0 } : {}) });
      commit();
    }),
  'del-goal': el => { if (confirm('Apagar esta meta?')) { state.goals = state.goals.filter(x => x.id !== el.dataset.id); commit(); } },
  'deposit': el => {
    const g = state.goals.find(x => x.id === el.dataset.id);
    openModal(`Poupar para “${esc(g.title)}”`, `
      <div class="field"><label>Valor (usa um número negativo para retirar)</label><input class="input" name="amount" type="number" step="0.01" inputmode="decimal" required placeholder="ex.: 50"></div>`,
      d => {
        const before = goalPct(g);
        g.saved = Math.max(0, (g.saved || 0) + parseFloat(d.amount));
        commit();
        if (before < 100 && goalPct(g) >= 100) { celebrate(); toast('Meta alcançada! 🎉'); }
        else toast(`Já tens ${money(g.saved)} 🐷`);
      });
  },

  'list-tab': el => { ui.listTab = el.dataset.tab; render(true); },
  'toggle-shop': el => { const x = findIn('shopping', el.dataset.id); x.done = el.checked; ui.just = 'shop:' + x.id; commit(); },
  'del-shop': el => { state.lists.shopping = state.lists.shopping.filter(x => x.id !== el.dataset.id); commit(); },
  'clear-shop': () => { state.lists.shopping = state.lists.shopping.filter(x => !x.done); commit(); },
  'meal-week': el => { const n = +el.dataset.n; ui.mealWeek = n ? addDays(ui.mealWeek, n * 7) : startOfWeek(today()); render(); },
  'add-book': () => openModal('Novo livro', `
    <div class="field"><label>Título</label><input class="input" name="title" required></div>
    <div class="field"><label>Autor(a)</label><input class="input" name="author"></div>
    <div class="field"><label>Estado</label><select class="input" name="status">${BOOK_STATUS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>`,
    d => { state.lists.books.push({ id: uid(), title: d.title.trim(), author: d.author.trim(), status: d.status, rating: 0 }); commit(); }),
  'rate-book': el => { const b = findIn('books', el.dataset.id); b.rating = b.rating === +el.dataset.n ? 0 : +el.dataset.n; commit(); },
  'add-content': () => openModal('Nova ideia de conteúdo', `
    <div class="field"><label>Ideia / título</label><input class="input" name="title" required placeholder="ex.: 5 erros ao começar uma conta faceless"></div>
    <div class="row">
      <div class="field"><label>Marca</label><select class="input" name="brand"><option value="">—</option>${brands().map(b => `<option>${esc(b)}</option>`).join('')}</select></div>
      <div class="field"><label>Formato</label><select class="input" name="format">${FORMATS.map(f => `<option>${f}</option>`).join('')}</select></div>
    </div>
    <div class="row">
      <div class="field"><label>Data</label><input class="input" type="date" name="date"></div>
      <div class="field"><label>Estado</label><select class="input" name="status">${CONTENT_STATUS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
    </div>`,
    d => { state.lists.content.push({ id: uid(), title: d.title.trim(), brand: d.brand, format: d.format, date: d.date, status: d.status }); commit(); }),
  'move-card': el => {
    const list = el.dataset.list;
    const statuses = list === 'books' ? BOOK_STATUS : CONTENT_STATUS;
    const x = findIn(list, el.dataset.id);
    const i = statuses.findIndex(s => s[0] === x.status) + +el.dataset.dir;
    x.status = statuses[Math.max(0, Math.min(statuses.length - 1, i))][0];
    ui.just = 'card:' + x.id;
    if (x.status === 'publicado' || x.status === 'lido') { burst(el, { n: 18 }); toast(x.status === 'lido' ? 'Mais um livro! 📚' : 'Publicado! ✨'); }
    commit();
  },
  'del-card': el => {
    if (!confirm('Apagar?')) return;
    const list = el.dataset.list;
    state.lists[list] = state.lists[list].filter(x => x.id !== el.dataset.id);
    commit();
  },

  'theme': el => { state.settings.theme = el.dataset.v; applyLook(); commit(); },
  'palette': el => { state.settings.palette = el.dataset.v; applyLook(); commit(); },
  'font': el => { state.settings.font = el.dataset.v; applyLook(); commit(); toast(`Letra: ${FONTS[el.dataset.v].label}`); },
  'add-cat': () => openModal('Nova categoria', `
    <div class="row">
      <div class="field" style="flex:0 0 80px"><label>Emoji</label><input class="input" name="emoji" value="🐾" maxlength="4"></div>
      <div class="field"><label>Nome</label><input class="input" name="label" required placeholder="ex.: Pets"></div>
    </div>
    <div class="row">
      <div class="field"><label>Tipo</label><select class="input" name="type"><option value="out">Despesa</option><option value="in">Receita</option></select></div>
      <div class="field" style="flex:0 0 90px"><label>Cor</label><input class="input" type="color" name="color" value="#c9a9b8" style="height:46px;padding:4px"></div>
    </div>`,
    d => { state.customCats.push({ key: 'c_' + uid().slice(0, 8), label: d.label.trim(), emoji: d.emoji || '✦', color: d.color, type: d.type }); commit(); }),
  'del-cat': el => {
    if (!confirm('Apagar esta categoria? Os movimentos antigos ficam sem categoria.')) return;
    state.customCats = state.customCats.filter(c => c.key !== el.dataset.key);
    commit();
  },
  'export': () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `planner-backup-${today()}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  },
  'reset': () => {
    if (!confirm('Tens a certeza? Isto apaga tudo deste dispositivo (e da nuvem, se estiver ligada).')) return;
    state = defaults();
    commit(); applyLook(); toast('Dados apagados');
  },

  'sync-pull': () => Sync.pull(),
  'sync-signout': () => Sync.signOut().then(() => render()),
  'sync-disconnect': () => { if (confirm('Desligar a sincronização? Os dados ficam neste dispositivo.')) Sync.disconnect().then(() => render()); },
};

/* Inputs que guardam sem voltar a desenhar a página */
const inputs = {
  weeknote: el => { state.weekNotes[el.dataset.week] = el.value; },
  intention: el => { state.intentions[el.dataset.month] = el.value; },
  journal: el => { (state.journal[el.dataset.date] ||= {})[el.dataset.key] = el.value; },
  meal: el => { (state.lists.meals[el.dataset.date] ||= {})[el.dataset.key] = el.value; },
  setting: el => { state.settings[el.dataset.key] = el.value; },
  goal: el => {
    state.goals.find(x => x.id === el.dataset.id).progress = +el.value;
    $(`.pct[data-for="${el.dataset.id}"]`).textContent = el.value;
    el.style.setProperty('--p', el.value + '%');
  },
};

const changes = {
  currency: el => { state.settings.currency = el.value; commit(); },
  'default-quotes': el => { state.settings.defaultQuotes = el.checked; save(); },
  'goal-done': el => { if (+el.value === 100) { celebrate(); toast('Meta alcançada! 🎉'); render(); } },
  import: el => {
    const file = el.files[0];
    if (!file) return;
    file.text().then(txt => {
      const data = JSON.parse(txt);
      if (typeof data !== 'object' || !data.settings) throw new Error();
      state = migrate(data);
      commit(); applyLook(); toast('Cópia importada ✿');
    }).catch(() => toast('Ficheiro inválido'));
  },
};

const forms = {
  'add-task': (form, data) => {
    const title = data.get('title').trim();
    if (!title) return;
    state.tasks.push({ id: uid(), title, date: form.dataset.date, done: false, tag: data.get('tag') });
    focusAfter = 'form[data-form="add-task"] input[name="title"]';
    commit();
  },
  'add-shop': (_form, data) => {
    const text = data.get('text').trim();
    if (!text) return;
    state.lists.shopping.push({ id: uid(), text, done: false });
    focusAfter = 'form[data-form="add-shop"] input[name="text"]';
    commit();
  },
  'sync-config': async (_form, data) => {
    await Sync.configure(data.get('url'), data.get('key'));
    render();
    if (Sync.status === 'err') toast('Não foi possível ligar — confirma os dados');
  },
  'sync-login': async (_form, data) => {
    try { await Sync.signIn(data.get('email')); toast('Link enviado — vê o teu email 💌'); }
    catch (e) { toast(e.message || 'Erro ao enviar o link'); }
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
  if (el.dataset.change) changes[el.dataset.change]?.(el, e);
  if (el.dataset.input) save();
});

let saveTimer;
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.dataset.input) return;
  inputs[el.dataset.input]?.(el);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
});

document.addEventListener('submit', e => {
  const form = e.target;
  const fn = forms[form.dataset.form];
  if (!fn) return;
  e.preventDefault();
  fn(form, new FormData(form));
});

window.addEventListener('hashchange', () => render(true));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && applyRecurring()) commit();
});

/* ---------- Arranque ---------- */
Sync.onChange(() => { const box = $('#sync-box'); if (box && !box.contains(document.activeElement)) box.innerHTML = syncInner(); });
Sync.init(remote => {
  if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
    state = migrate(remote);
    persist();
    applyLook();
    if (applyRecurring()) save();
    render();
    toast('Dados sincronizados ☁︎');
  } else {
    Sync.push(state);
  }
});

applyLook();
renderNav();
if (applyRecurring()) save(); else persist();
render(true);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
