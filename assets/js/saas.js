/* ============================================================
   AgroÁgua SaaS — visão geral + calculadora de irrigação
   Sensores de solo · recomendação por cultura · custo-benefício
   ============================================================ */
'use strict';

/* ---------- Base de dados ---------- */
const DATA = window.MUNICIPIOS_PI;
const CITIES = ((DATA && DATA.municipios) || []).slice();
const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));
const CITIES_ALPHA = CITIES.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const CROPS = [
  { id: 'alface', nome: 'Alface', ciclo: 50, kc: [0.70, 1.00, 0.95], raiz: 0.25, grupo: 'hortalica' },
  { id: 'coentro', nome: 'Cebolinha / coentro', ciclo: 45, kc: [0.70, 1.00, 0.95], raiz: 0.20, grupo: 'hortalica' },
  { id: 'tomate', nome: 'Tomate', ciclo: 130, kc: [0.60, 1.15, 0.80], raiz: 0.70, grupo: 'hortalica' },
  { id: 'pimentao', nome: 'Pimentão', ciclo: 130, kc: [0.60, 1.05, 0.90], raiz: 0.50, grupo: 'hortalica' },
  { id: 'pepino', nome: 'Pepino', ciclo: 65, kc: [0.60, 1.00, 0.75], raiz: 0.40, grupo: 'hortalica' },
  { id: 'quiabo', nome: 'Quiabo', ciclo: 90, kc: [0.50, 1.00, 0.80], raiz: 0.45, grupo: 'hortalica' },
  { id: 'melancia', nome: 'Melancia', ciclo: 85, kc: [0.40, 1.00, 0.75], raiz: 0.60, grupo: 'hortalica' },
  { id: 'feijao', nome: 'Feijão', ciclo: 80, kc: [0.40, 1.15, 0.35], raiz: 0.50, grupo: 'graos' },
  { id: 'milho', nome: 'Milho', ciclo: 115, kc: [0.30, 1.20, 0.50], raiz: 0.60, grupo: 'graos' },
  { id: 'arroz', nome: 'Arroz', ciclo: 110, kc: [1.05, 1.20, 0.90], raiz: 0.30, grupo: 'graos' },
  { id: 'soja', nome: 'Soja', ciclo: 120, kc: [0.40, 1.15, 0.50], raiz: 0.60, grupo: 'graos' },
  { id: 'mandioca', nome: 'Mandioca', ciclo: 330, kc: [0.30, 0.80, 0.30], raiz: 0.60, grupo: 'tuberosa' },
  { id: 'banana', nome: 'Banana', ciclo: 365, kc: [0.50, 1.20, 1.10], raiz: 0.50, grupo: 'frutifera' },
  { id: 'manga', nome: 'Manga', ciclo: 365, kc: [0.50, 0.90, 0.75], raiz: 1.00, grupo: 'frutifera' },
  { id: 'coco', nome: 'Coco', ciclo: 365, kc: [0.50, 1.00, 0.90], raiz: 0.80, grupo: 'frutifera' },
  { id: 'maracuja', nome: 'Maracujá', ciclo: 365, kc: [0.50, 1.05, 0.90], raiz: 0.60, grupo: 'frutifera' },
  { id: 'pastagem', nome: 'Pastagem', ciclo: 365, kc: [0.75, 0.95, 0.85], raiz: 0.50, grupo: 'pastagem' },
];
const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));

const SYSTEMS = {
  gotejamento: { id: 'gotejamento', nome: 'Gotejamento', eff: 0.90, capex: 7200, life: 10, maint: 0.030, kwh: 0.18, labor: 0.3, desc: 'Maior economia de água' },
  micro: { id: 'micro', nome: 'Microaspersão', eff: 0.85, capex: 5200, life: 9, maint: 0.035, kwh: 0.22, labor: 0.5, desc: 'Boa uniformidade' },
  aspersao: { id: 'aspersao', nome: 'Aspersão', eff: 0.70, capex: 3500, life: 12, maint: 0.030, kwh: 0.28, labor: 0.8, desc: 'Uso comum em grãos' },
  sulco: { id: 'sulco', nome: 'Sulco / inundação', eff: 0.55, capex: 1800, life: 15, maint: 0.020, kwh: 0.05, labor: 3.0, desc: 'Menor eficiência' },
};
const SYSTEM_IDS = ['gotejamento', 'micro', 'aspersao', 'sulco'];

const CROP_FIT = {
  hortalica: { gotejamento: 100, micro: 92, aspersao: 70, sulco: 40 },
  graos: { aspersao: 100, gotejamento: 78, micro: 70, sulco: 55 },
  frutifera: { micro: 100, gotejamento: 95, aspersao: 65, sulco: 45 },
  tuberosa: { aspersao: 95, sulco: 80, gotejamento: 75, micro: 70 },
  pastagem: { aspersao: 95, sulco: 70, micro: 60, gotejamento: 50 },
};

const SOILS = {
  arenoso: { id: 'arenoso', nome: 'Arenoso', fc: 14, pwp: 6 },
  medio: { id: 'medio', nome: 'Médio', fc: 26, pwp: 13 },
  argiloso: { id: 'argiloso', nome: 'Argiloso', fc: 36, pwp: 18 },
};

const PLANS = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    price: 0,
    ha: 2,
    sensors: 1,
    areas: 1,
    desc: 'Para começar e testar a recomendação.',
    features: ['2 ha monitorados', '1 sensor de solo', '1 área monitorada', 'Recomendação diária', 'Calculadora básica', 'Previsão de 7 dias'],
    limits: ['Sem comparativo de sistemas', 'Sem histórico de irrigações'],
    cta: 'Começar grátis',
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    price: 29.9,
    ha: 20,
    sensors: 8,
    areas: 99,
    desc: 'Para produzir com decisão e economia.',
    features: ['20 ha monitorados', '8 sensores de solo', 'Áreas ilimitadas', 'Comparativo de 4 sistemas', 'Histórico e custo-benefício', 'Alertas por WhatsApp', 'Suporte prioritário'],
    cta: 'Testar 14 dias grátis',
    trial: true,
  },
};

CROPS.forEach((c) => { c.nomePt = c.nome; });
Object.values(SYSTEMS).forEach((s) => { s.nomePt = s.nome; s.descPt = s.desc; });
Object.values(SOILS).forEach((s) => { s.nomePt = s.nome; });
Object.values(PLANS).forEach((p) => { p.nomePt = p.nome; p.descPt = p.desc; p.featuresPt = p.features.slice(); p.limitsPt = (p.limits || []).slice(); });

const DEFAULT_SETTINGS = { tariff: 1.05, water: 0, labor: 18 };
const STORAGE_KEY = 'agroagua_saas_v3';
const WEATHER_KEY = 'agroagua_saas_weather_v3';
const LANG_KEY = 'agroagua_lang';
const AUTH_KEY = 'agroagua_saas_demo_session';
const USERS_KEY = 'agroagua_saas_farmer_accounts';
const DEMO_ACCOUNTS = [
  { username: 'admin', password: '2026', role: 'admin', name: 'Admin AgroÁgua' },
  { username: 'agricultor', password: '2026', role: 'farmer', name: 'Produtor de demonstração', farmName: 'Fazenda Boa Vista', cityId: 2211001, producerTitle: 'produtor' },
];
const DEFAULT_CITY = 2211001;

/* ---------- Idioma ---------- */
const I18N = window.AGRO_I18N || { zh: {} };
const BASE = window.AGRO_BASE_DADOS || { indicadores: [], fontes: [], metodo: [], notas: [], versao: '—', atualizado: '—' };
function detectLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'zh' || q === 'pt') return q;
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'zh' || saved === 'pt') return saved;
  } catch (e) {}
  return 'pt';
}
let LANG = detectLang();
let LOCALE = LANG === 'zh' ? 'zh-CN' : 'pt-BR';
const tr = (text) => (LANG === 'zh' ? (I18N.zh[text] ?? text) : text);
const trf = (template, ...args) => tr(template).replace(/\{(\d+)\}/g, (_, i) => String(args[i] ?? ''));

function localizeData() {
  CROPS.forEach((c) => { c.nome = LANG === 'zh' ? tr(c.nomePt) : c.nomePt; });
  Object.values(SYSTEMS).forEach((s) => {
    s.nome = LANG === 'zh' ? tr(s.nomePt) : s.nomePt;
    s.desc = LANG === 'zh' ? tr(s.descPt) : s.descPt;
  });
  Object.values(SOILS).forEach((s) => { s.nome = LANG === 'zh' ? tr(s.nomePt) : s.nomePt; });
  Object.values(PLANS).forEach((p) => {
    p.nome = LANG === 'zh' ? tr(p.nomePt) : p.nomePt;
    p.desc = LANG === 'zh' ? tr(p.descPt) : p.descPt;
    p.features = LANG === 'zh' ? p.featuresPt.map((f) => tr(f)) : p.featuresPt.slice();
    p.limits = LANG === 'zh' ? p.limitsPt.map((l) => tr(l)) : p.limitsPt.slice();
  });
}

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (n, d = 1) => Number(n || 0).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n) => Number(n || 0).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const isoOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const daysBetween = (fromISO, toISO) => {
  if (!fromISO) return 0;
  const a = new Date(fromISO + 'T12:00:00');
  const b = new Date((toISO || todayISO()) + 'T12:00:00');
  return Math.max(0, Math.round((b - a) / 86400000));
};
const dateShort = (iso) => {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' });
};
const dateLong = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(LOCALE, { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
};
const nowMonth = () => new Date().getMonth();
const timeAgo = (ts) => {
  const mins = Math.max(0, Math.round((Date.now() - Number(ts || Date.now())) / 60000));
  if (mins < 1) return tr('agora');
  if (mins === 1) return tr('há 1 min');
  if (mins < 60) return trf('há {0} min', mins);
  const h = Math.floor(mins / 60);
  return trf('há {0} h', h);
};
const areaCount = (n) => LANG === 'zh' ? `${n} 块监测地块` : `${n} ${Number(n) === 1 ? 'área monitorada' : 'áreas monitoradas'}`;
const sensorCount = (n) => LANG === 'zh' ? `${n} 个传感器` : `${n} ${Number(n) === 1 ? 'sensor' : 'sensores'}`;
const cityOf = (id) => CITY_BY_ID.get(Number(id)) || CITY_BY_ID.get(DEFAULT_CITY) || CITIES[0] || {
  id: DEFAULT_CITY, nome: 'Teresina', pop: 866300, chuvaAnual: 1300, etoAnual: 1800,
  lat: -5.09, lon: -42.8, chuva: Array(12).fill(100), eto: Array(12).fill(5), t2m: Array(12).fill(28), deficit: 500,
};
const findCity = (name) => CITIES.find((c) => norm(c.nome) === norm(name));
const kcFor = (crop, phase) => {
  if (!crop) return 1;
  if (phase === 'ini') return crop.kc[0];
  if (phase === 'cresc') return (crop.kc[0] + crop.kc[1]) / 2;
  if (phase === 'final') return crop.kc[2];
  return crop.kc[1];
};
const phaseName = (p) => tr({ ini: 'Inicial', cresc: 'Crescimento', prod: 'Produção', final: 'Final' }[p] || 'Produção');
const soilOf = (id) => SOILS[id] || SOILS.medio;

function toast(msg, type = '') {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
}

/* ---------- Estado e autenticação ---------- */
function freshState() {
  return {
    activeCity: DEFAULT_CITY,
    areas: [],
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    plan: 'pro',
    selectedAreaId: null,
    lastSync: 0,
    seeded: false,
    nextId: 1,
  };
}
function stateKey(username = activeAccountUsername) {
  return `${STORAGE_KEY}::${username || 'agricultor'}`;
}
function loadState(username = activeAccountUsername) {
  const base = freshState();
  try {
    const key = stateKey(username);
    let raw = localStorage.getItem(key);
    if (!raw && username === 'agricultor') {
      raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(key, raw);
    }
    if (!raw) return base;
    const s = JSON.parse(raw);
    const areas = Array.isArray(s.areas) ? s.areas : [];
    const maxId = areas.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
    return {
      ...base,
      ...s,
      settings: { ...base.settings, ...(s.settings || {}) },
      areas,
      history: Array.isArray(s.history) ? s.history : [],
      plan: PLANS[s.plan] ? s.plan : 'pro',
      nextId: Math.max(Number(s.nextId) || 1, maxId + 1),
    };
  } catch (e) { return base; }
}

function registeredFarmers() {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    return Array.isArray(users) ? users.filter((u) => u && u.role === 'farmer' && u.username) : [];
  } catch (e) { return []; }
}
function accountForUser(username) {
  const clean = String(username || '').trim().toLowerCase();
  return DEMO_ACCOUNTS.find((item) => item.username === clean) || registeredFarmers().find((item) => item.username === clean) || null;
}
function safeAccount(account) {
  if (!account) return null;
  const { password, passwordHash, ...profile } = account;
  return profile;
}
async function hashPassword(password, salt = '') {
  if (!window.crypto?.subtle) throw new Error('secure_hash_unavailable');
  const bytes = new TextEncoder().encode(`${salt}:${String(password)}`);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function loadAuthSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    const account = accountForUser(saved?.username);
    if (account && saved.exp > Date.now()) return { ...safeAccount(account), exp: saved.exp };
    localStorage.removeItem(AUTH_KEY);
  } catch (e) {}
  return null;
}
let authSession = loadAuthSession();
let activeAccountUsername = authSession?.username || 'agricultor';
let state = loadState(activeAccountUsername);

function save() {
  try { localStorage.setItem(stateKey(), JSON.stringify(state)); } catch (e) {}
}

function seedDemo() {
  const id = (name) => (findCity(name) || cityOf(DEFAULT_CITY)).id;
  const mk = (name, cityName, crop, area, system, soil, lastDays, flow) => ({
    id: state.nextId++,
    name,
    city: id(cityName),
    crop,
    phase: 'prod',
    area,
    system,
    soil,
    flow,
    planting: isoOffset(-(lastDays + 35)),
    lastIrrigation: isoOffset(-lastDays),
    sensors: 1,
    createdAt: new Date().toISOString(),
  });
  state.areas = [
    mk('Horta da Dona Zefa', 'Teresina', 'alface', 0.2, 'gotejamento', 'medio', 4, 4),
    mk('Roçado do Seu Antônio', 'Teresina', 'milho', 1.2, 'aspersao', 'arenoso', 3, 14),
    mk('Pomar de Manga', 'Teresina', 'manga', 0.8, 'micro', 'argiloso', 6, 6),
    mk('Tomate de Oeiras', 'Oeiras', 'tomate', 0.5, 'gotejamento', 'medio', 2, 5),
    mk('Melancia de Bom Jesus', 'Bom Jesus', 'melancia', 2.0, 'gotejamento', 'arenoso', 5, 12),
  ];
  state.history = [
    { id: 1001, areaId: state.areas[0].id, name: state.areas[0].name, city: state.areas[0].city, date: isoOffset(-2), mm: 22, m3: 44, cost: 8.4 },
    { id: 1002, areaId: state.areas[1].id, name: state.areas[1].name, city: state.areas[1].city, date: isoOffset(-3), mm: 26, m3: 430, cost: 126.0 },
    { id: 1003, areaId: state.areas[2].id, name: state.areas[2].name, city: state.areas[2].city, date: isoOffset(-6), mm: 18, m3: 120, cost: 22.0 },
    { id: 1004, areaId: state.areas[3].id, name: state.areas[3].name, city: state.areas[3].city, date: isoOffset(-4), mm: 30, m3: 150, cost: 28.0 },
  ];
  state.activeCity = DEFAULT_CITY;
  state.plan = 'pro';
  state.seeded = true;
  state.lastSync = Date.now() - 4 * 60000;
  save();
}

if (!state.seeded && activeAccountUsername === 'agricultor') seedDemo();
else if (!state.seeded) { state.seeded = true; save(); }

function renderAuthAccounts() {
  const container = $('#authAccounts');
  if (!container) return;
  container.querySelectorAll('[data-registered-account]').forEach((button) => button.remove());
  const selectedUser = String($('#authUser')?.value || '').trim().toLowerCase();
  const recent = registeredFarmers()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 2);
  recent.forEach((account) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'auth-account' + (selectedUser === account.username ? ' selected' : '');
    button.dataset.demoUser = account.username;
    button.dataset.registeredAccount = 'true';
    button.setAttribute('aria-pressed', String(selectedUser === account.username));
    button.innerHTML = `<span class="auth-account-info"><strong>${esc(account.farmName || account.name)}</strong><small>${esc(account.username)} · ${esc(tr('Acesso recente'))}</small></span><span class="auth-radio"></span>`;
    container.appendChild(button);
  });
}

function renderAuthScreen() {
  const locked = !authSession || authSession.exp <= Date.now();
  if (locked) authSession = null;
  const appEl = $('#app');
  const screen = $('#authScreen');
  if (appEl) {
    appEl.classList.toggle('auth-locked', locked);
    appEl.setAttribute('aria-hidden', locked ? 'true' : 'false');
  }
  if (screen) {
    screen.hidden = !locked;
    screen.style.display = locked ? '' : 'none';
  }
  if ($('#adminNavGroup')) $('#adminNavGroup').hidden = authSession?.role !== 'admin';
  if (locked) renderAuthAccounts();
}

function chooseDemoAccount(username) {
  const account = accountForUser(username);
  if (!account) return;
  if ($('#authUser')) $('#authUser').value = account.username;
  if ($('#authPass')) {
    $('#authPass').value = account.password || '';
    $('#authPass').type = 'password';
  }
  $('#authReveal')?.setAttribute('aria-pressed', 'false');
  $$('[data-demo-user]').forEach((button) => {
    const selected = button.dataset.demoUser === account.username;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#authError')?.classList.remove('show');
}

function showRegistration(show) {
  const register = !!show;
  if ($('#authCard')) $('#authCard').hidden = register;
  if ($('#authRegistration')) $('#authRegistration').hidden = !register;
  $('#authScreen')?.classList.toggle('register-mode', register);
  if (register) {
    if ($('#registerPlantings') && !$('#registerPlantings').children.length) addPlantingRow();
    $('#registerName')?.focus();
  }
}

function addPlantingRow() {
  const list = $('#registerPlantings');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'register-planting-row';
  row.dataset.plantingRow = 'true';
  row.innerHTML = `
    <label><span>${esc(tr('Plantação'))}</span><input data-planting-name type="text" maxlength="60" placeholder="${esc(tr('Ex.: Horta de tomate'))}" required></label>
    <label><span>${esc(tr('Cultivo'))}</span><select data-planting-crop required><option value="" selected disabled>${esc(tr('Selecione o cultivo'))}</option>${CROPS.map((crop) => `<option value="${esc(crop.id)}">${esc(crop.nome)}</option>`).join('')}</select></label>
    <label><span>${esc(tr('Área (ha)'))}</span><input data-planting-area type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="1,0" required></label>
    <button class="register-remove" type="button" data-remove-planting aria-label="${esc(tr('Remover plantação'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14"/></svg></button>`;
  list.appendChild(row);
  Array.from(list.querySelectorAll('[data-remove-planting]')).forEach((button) => { button.disabled = list.children.length <= 1; });
  applyStaticI18n();
}

function populateRegisterCities() {
  const select = $('#registerCity');
  if (!select || select.dataset.ready === 'true') return;
  select.innerHTML = CITIES_ALPHA.map((city) => `<option value="${Number(city.id)}">${esc(city.nome)}</option>`).join('');
  select.value = String(DEFAULT_CITY);
  select.dataset.ready = 'true';
}

function setRegisterError(message) {
  const error = $('#registerError');
  if (!error) return;
  error.textContent = message;
  error.classList.toggle('show', !!message);
}

async function createFarmerAccount(event) {
  event.preventDefault();
  setRegisterError('');
  const name = ($('#registerName')?.value || '').trim();
  const farmName = ($('#registerFarm')?.value || '').trim();
  const username = ($('#registerUsername')?.value || '').trim().toLowerCase();
  const password = $('#registerPassword')?.value || '';
  const producerTitle = ['produtor', 'produtora', 'produtor(a)'].includes($('#registerTreatment')?.value) ? $('#registerTreatment').value : 'produtor(a)';
  const cityId = Number($('#registerCity')?.value) || DEFAULT_CITY;
  const community = ($('#registerCommunity')?.value || '').trim();
  const rows = $$('#registerPlantings [data-planting-row]');
  const plantings = rows.map((row) => {
    const pName = (row.querySelector('[data-planting-name]')?.value || '').trim();
    const crop = row.querySelector('[data-planting-crop]')?.value || '';
    const areaText = (row.querySelector('[data-planting-area]')?.value || '').trim();
    return { name: pName, crop, areaText, area: Number(areaText.replace(',', '.')) };
  }).filter((plot) => plot.name || plot.crop || plot.areaText);

  if (!name || !farmName || !cityId || !username || !password) return setRegisterError(tr('Preencha seus dados e os campos obrigatórios.'));
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) return setRegisterError(tr('O usuário deve ter de 3 a 24 caracteres: letras, números, ponto, hífen ou sublinhado.'));
  if (accountForUser(username)) return setRegisterError(tr('Esse usuário já está cadastrado. Escolha outro.'));
  if (password.length < 6) return setRegisterError(tr('A senha deve ter pelo menos 6 caracteres.'));
  if (!plantings.length) return setRegisterError(tr('Adicione ao menos uma plantação com nome, cultivo e área.'));

  const incomplete = plantings.find((plot) => !plot.name || !CROP_BY_ID.has(plot.crop) || !(plot.area > 0));
  if (incomplete) return setRegisterError(tr('Complete o nome, o cultivo e uma área maior que zero em cada plantação iniciada.'));

  let passwordHash;
  try { passwordHash = await hashPassword(password, username); }
  catch (e) { return setRegisterError(tr('Este navegador não oferece suporte ao cadastro seguro. Abra o app em um navegador atualizado.')); }

  const account = { username, passwordHash, role: 'farmer', name, farmName, cityId, community, producerTitle, createdAt: new Date().toISOString() };
  const nextState = freshState();
  nextState.activeCity = cityId;
  nextState.plan = 'gratuito';
  nextState.seeded = true;
  nextState.lastSync = Date.now();
  nextState.areas = plantings.map((plot, index) => ({
    id: index + 1,
    name: plot.name,
    city: cityId,
    crop: plot.crop,
    phase: 'prod',
    area: plot.area,
    system: 'gotejamento',
    soil: 'medio',
    flow: 20,
    planting: todayISO(),
    lastIrrigation: isoOffset(-2),
    sensors: 1,
    createdAt: new Date().toISOString(),
  }));
  nextState.nextId = nextState.areas.length + 1;

  try {
    const users = registeredFarmers();
    localStorage.setItem(stateKey(username), JSON.stringify(nextState));
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, account]));
  } catch (e) {
    return setRegisterError(tr('Não foi possível salvar o cadastro neste navegador.'));
  }

  if ($('#authUser')) $('#authUser').value = username;
  if ($('#authPass')) {
    $('#authPass').value = password;
    $('#authPass').type = 'password';
  }
  await loginDemo(username, password);
}

async function loginDemo(username, password) {
  const account = accountForUser(username);
  let valid = false;
  try {
    valid = !!account && (account.password != null
      ? account.password === String(password || '')
      : account.passwordHash === await hashPassword(password || '', account.username));
  } catch (e) { valid = false; }
  if (!valid) {
    $('#authError')?.classList.add('show');
    if ($('#authPass')) {
      $('#authPass').value = '';
      $('#authPass').focus();
    }
    return false;
  }
  activeAccountUsername = account.username;
  state = loadState(activeAccountUsername);
  if (!state.seeded && activeAccountUsername === 'agricultor') seedDemo();
  else if (!state.seeded) { state.seeded = true; save(); }
  wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
  authSession = { ...safeAccount(account), exp: Date.now() + 8 * 60 * 60 * 1000 };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(authSession)); } catch (e) {}
  $('#authError')?.classList.remove('show');
  renderAuthScreen();
  renderShell();
  const requested = (location.hash || '').slice(1);
  const route = authSession.role === 'admin' && requested === 'admin' ? 'admin' : requested === 'calculator' ? 'calculator' : 'overview';
  navigate(route);
  const loggedInUsername = account.username;
  ensureWeather(state.activeCity).then(() => {
    if (authSession?.username !== loggedInUsername) return;
    renderShell();
    if (activeRoute === 'overview') renderOverview();
  });
  toast(tr('Acesso liberado.'));
  return true;
}

function logoutDemo() {
  const lastUsername = authSession?.username;
  authSession = null;
  try { localStorage.removeItem(AUTH_KEY); } catch (e) {}
  chooseDemoAccount(accountForUser(lastUsername) ? lastUsername : 'admin');
  renderAuthScreen();
  $('#authUser')?.focus();
}

/* ---------- Clima ---------- */
let weather = {};
try { weather = JSON.parse(localStorage.getItem(WEATHER_KEY) || '{}') || {}; } catch (e) { weather = {}; }
const weatherPromises = {};

function saveWeather() {
  try {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    for (const id of Object.keys(weather)) {
      if (!weather[id] || !weather[id].ts || weather[id].ts < cutoff) delete weather[id];
    }
    localStorage.setItem(WEATHER_KEY, JSON.stringify(weather));
  } catch (e) {}
}
function weatherFresh(w) { return !!(w && w.daily && w.ts && Date.now() - w.ts < 30 * 60 * 1000); }

function ensureWeather(cityId, force = false) {
  const id = Number(cityId);
  if (!force && weatherFresh(weather[id])) return Promise.resolve(weather[id]);
  if (weatherPromises[id]) return weatherPromises[id];
  const city = cityOf(id);
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon
    + '&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration'
    + '&timezone=America%2FFortaleza&forecast_days=8';
  weatherPromises[id] = fetch(url)
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then((d) => {
      if (!d.daily || !Array.isArray(d.daily.time)) throw new Error('formato');
      weather[id] = { ts: Date.now(), daily: d.daily };
      saveWeather();
      return weather[id];
    })
    .catch(() => weather[id] || { ts: 0, daily: null })
    .finally(() => { delete weatherPromises[id]; });
  return weatherPromises[id];
}

function liveDay(cityId) {
  const w = weather[Number(cityId)];
  if (!w || !w.daily || !Array.isArray(w.daily.time)) return null;
  let i = w.daily.time.indexOf(todayISO());
  if (i < 0) i = 0;
  return {
    date: w.daily.time[i],
    eto: Number(w.daily.et0_fao_evapotranspiration?.[i] ?? 0),
    rain: Number(w.daily.precipitation_sum?.[i] ?? 0),
    prob: Number(w.daily.precipitation_probability_max?.[i] ?? 0),
    tmax: Number(w.daily.temperature_2m_max?.[i] ?? 0),
    tmin: Number(w.daily.temperature_2m_min?.[i] ?? 0),
  };
}
function todayWeather(cityId) {
  const city = cityOf(cityId);
  const live = liveDay(cityId);
  if (live && live.eto > 0) return { ...live, live: true };
  return {
    date: todayISO(),
    eto: city.eto[nowMonth()],
    rain: 0,
    prob: 0,
    tmax: city.t2m[nowMonth()] + 5,
    tmin: city.t2m[nowMonth()] - 5,
    live: false,
  };
}
function forecastFor(cityId) {
  const city = cityOf(cityId);
  const w = weather[Number(cityId)];
  const out = [];
  if (w && w.daily && Array.isArray(w.daily.time)) {
    let start = w.daily.time.indexOf(todayISO());
    if (start < 0) start = 0;
    for (let k = 0; k < 7; k++) {
      const i = start + k;
      if (i >= w.daily.time.length) break;
      out.push({
        date: w.daily.time[i],
        eto: Number(w.daily.et0_fao_evapotranspiration?.[i] ?? city.eto[nowMonth()]),
        rain: Number(w.daily.precipitation_sum?.[i] ?? 0),
        prob: Number(w.daily.precipitation_probability_max?.[i] ?? 0),
        tmax: Number(w.daily.temperature_2m_max?.[i] ?? 0),
        tmin: Number(w.daily.temperature_2m_min?.[i] ?? 0),
        live: true,
      });
    }
  }
  if (!out.length) {
    for (let k = 0; k < 7; k++) {
      out.push({
        date: isoOffset(k),
        eto: city.eto[nowMonth()],
        rain: 0,
        prob: 0,
        tmax: city.t2m[nowMonth()] + 5,
        tmin: city.t2m[nowMonth()] - 5,
        live: false,
      });
    }
  }
  return out;
}
const iconFor = (rain, prob) => {
  if (rain >= 5) return '🌧️';
  if (rain >= 1) return '🌦️';
  if (prob >= 40) return '⛅';
  return '☀️';
};

/* ---------- Cálculos agronômicos ---------- */
function statusFor(depletion) {
  if (depletion <= 0.10) return { label: tr('Recém-irrigado'), cls: 'blue', rec: tr('Aguardar'), tone: 'ok', key: 'ok', irrigate: false };
  if (depletion >= 0.65) return { label: tr('Crítico'), cls: 'red', rec: tr('Irrigar agora'), tone: 'bad', key: 'bad', irrigate: true };
  if (depletion >= 0.45) return { label: tr('Atenção'), cls: 'amber', rec: tr('Irrigar hoje'), tone: 'warn', key: 'warn', irrigate: true };
  return { label: tr('Ideal'), cls: 'green', rec: tr('Aguardar'), tone: 'ok', key: 'ok', irrigate: false };
}

function sensorReading(area, etcOverride) {
  const crop = CROP_BY_ID.get(area.crop) || CROPS[0];
  const soil = soilOf(area.soil);
  const taw = (soil.fc - soil.pwp) * 10 * crop.raiz;
  const days = Math.max(0, daysBetween(area.lastIrrigation, todayISO()));
  const etc = etcOverride != null ? Number(etcOverride) : todayWeather(area.city).eto * kcFor(crop, area.phase || 'prod');
  const depletedMm = clamp(0.05 * taw + Math.max(0, etc * days), 0, taw);
  const avg = soil.fc - (depletedMm / Math.max(0.01, taw)) * (soil.fc - soil.pwp);
  const d20 = clamp(avg - 0.10 * (soil.fc - soil.pwp), soil.pwp - 3, soil.fc + 1);
  const d40 = clamp(avg, soil.pwp - 3, soil.fc + 1);
  const d60 = clamp(avg + 0.06 * (soil.fc - soil.pwp), soil.pwp - 3, soil.fc + 1);
  const avgW = 0.45 * d20 + 0.35 * d40 + 0.20 * d60;
  const avail = clamp((avgW - soil.pwp) / Math.max(0.01, soil.fc - soil.pwp), 0, 1);
  const depletion = 1 - avail;
  return {
    d20, d40, d60, avg: avgW,
    depletion,
    taw,
    deficit: depletion * taw,
    days,
    etc,
    battery: 84 + (Number(area.id || 1) * 7) % 15,
    signal: 3 + (Number(area.id || 1) % 2),
    lastSync: state.lastSync || Date.now(),
  };
}

function analyzeArea(area) {
  const city = cityOf(area.city);
  const crop = CROP_BY_ID.get(area.crop) || CROPS[0];
  const sys = SYSTEMS[area.system] || SYSTEMS.gotejamento;
  const soil = soilOf(area.soil);
  const w = todayWeather(city.id);
  const etoBase = Number(city.eto[nowMonth()] || w.eto);
  const etc = etoBase * kcFor(crop, area.phase || 'prod');
  const s = sensorReading(area, etc);
  const st = statusFor(s.depletion);
  const irrigate = st.irrigate;
  const need = irrigate ? s.deficit * 0.95 : 0;
  const gross = need / sys.eff;
  const volume = gross * 10 * Number(area.area || 0);
  const hours = volume / Math.max(0.5, Number(area.flow || 6));
  const energy = volume * sys.kwh;
  const cost = energy * (Number(state.settings?.tariff) || DEFAULT_SETTINGS.tariff)
    + volume * (Number(state.settings?.water) || DEFAULT_SETTINGS.water)
    + hours * sys.labor * (Number(state.settings?.labor) || DEFAULT_SETTINGS.labor);
  const annualCapex = (sys.capex * Number(area.area || 0)) / Math.max(1, sys.life);
  const annualMaint = sys.capex * Number(area.area || 0) * sys.maint;
  const annualOpex = cost * 180 + annualMaint;
  const annualCost = annualCapex + annualOpex;
  const score = clamp(
    Math.round(
      (CROP_FIT[crop.grupo]?.[sys.id] ?? 70) * 0.55
      + sys.eff * 35
      - (sys.id === 'sulco' && soil.id === 'arenoso' ? 15 : 0)
    ),
    10,
    100
  );

  return {
    city, crop, sys, soil, weather: w, sensor: s, status: st,
    irrigate, need, gross, volume, hours, energy, cost,
    annualCapex, annualMaint, annualOpex, annualCost, score,
  };
}

function planLimits() {
  return PLANS[state.plan] || PLANS.gratuito;
}

function applyStaticI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'pt-BR';
  LOCALE = LANG === 'zh' ? 'zh-CN' : 'pt-BR';
  localizeData();
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18nPt || el.textContent.trim();
    if (!el.dataset.i18nPt) el.dataset.i18nPt = key;
    el.textContent = tr(el.dataset.i18nPt);
  });
  $$('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPhPt || el.getAttribute('placeholder') || '';
    if (!el.dataset.i18nPhPt) el.dataset.i18nPhPt = key;
    el.setAttribute('placeholder', tr(el.dataset.i18nPhPt));
  });
  if ($('#langBtn')) $('#langBtn').textContent = LANG === 'zh' ? '中文' : 'PT';
}

/* ---------- Navegação e renderização ---------- */
const SAAS_ROUTES = {
  automation: { title: 'Automação ESP32', eyebrow: 'Operação' },
  overview: { title: 'Visão geral', eyebrow: 'Operação' },
  calculator: { title: 'Calculadora', eyebrow: 'Operação' },
  areas: { title: 'Minhas áreas', eyebrow: 'Operação' },
  agenda: { title: 'Agenda', eyebrow: 'Operação' },
  climate: { title: 'Clima & municípios', eyebrow: 'Análise' },
  reports: { title: 'Relatórios', eyebrow: 'Análise' },
  data: { title: 'Base de dados', eyebrow: 'Análise' },
  admin: { title: 'Administração', eyebrow: 'Gestão' },
};
let activeRoute = 'overview';
let wizard = null;

function activeCity() {
  return cityOf(state.activeCity);
}

function openSidebar() {
  $('#sidebar')?.classList.add('open');
  $('#sidebarBackdrop')?.classList.add('open');
}

function closeSidebar() {
  $('#sidebar')?.classList.remove('open');
  $('#sidebarBackdrop')?.classList.remove('open');
}

function navigate(route) {
  if (!SAAS_ROUTES[route]) route = 'overview';
  if (route === 'admin' && authSession?.role !== 'admin') route = 'overview';
  activeRoute = route;
  $$('.view').forEach((v) => v.classList.remove('active'));
  const view = $('#view-' + route);
  if (view) view.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  if ($('#pageTitle')) $('#pageTitle').textContent = tr(SAAS_ROUTES[route].title);
  if ($('#pageEyebrow')) $('#pageEyebrow').textContent = tr(SAAS_ROUTES[route].eyebrow);
  try { history.replaceState(null, '', '#' + route); } catch (e) {}
  closeSidebar();
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderRoute(route) {
  switch (route) {
    case 'automation': renderAutomationEmbed(); break;
    case 'overview': renderOverview(); break;
    case 'calculator': renderWizard(); break;
    case 'areas': renderAreas(); break;
    case 'agenda': renderAgenda(); break;
    case 'climate': renderClimate(); break;
    case 'reports': renderReports(); break;
    case 'data': renderData(); break;
    case 'admin': renderAdmin(); break;
  }
}

function renderAutomationEmbed() {
  const frame = $('#automationFrame');
  if (!frame) return;
  const target = 'automacao-esp32.html?embed=1&lang=' + LANG;
  if (frame.getAttribute('src') !== target) frame.setAttribute('src', target);
}

function renderShell() {
  const city = activeCity();
  if ($('#cityBtnName')) $('#cityBtnName').textContent = city?.nome || 'Teresina';
  if ($('#sideCityName')) $('#sideCityName').textContent = city?.nome || 'Teresina';
  if ($('#sideCityMeta')) $('#sideCityMeta').textContent = 'PI · ' + (city?.pop ? fmt0(city.pop) + ' ' + tr('hab') : '—');
  if ($('#navAreasCount')) $('#navAreasCount').textContent = state.areas.length;

  const w = todayWeather(city?.id);
  const pill = $('#weatherPill');
  if (pill) {
    pill.classList.toggle('offline', !w.live);
    if ($('#weatherLabel')) $('#weatherLabel').textContent = w.live ? tr('Ao vivo') : tr('Clima médio');
    if ($('#weatherTemp')) $('#weatherTemp').textContent = Math.round(w.tmax) + '°C';
  }

  const plan = planLimits();
  if ($('#planCard')) {
    $('#planCard').innerHTML = `
      <div class="plan-top"><strong>${esc(tr('Plano'))} ${esc(plan.nome)}</strong><span>${plan.price > 0 ? 'R$ ' + fmt(plan.price, 2) + '/' + tr('mês') : tr('Grátis')}</span></div>
      <div class="plan-sub">${esc(trf('Até {0} ha · {1}', fmt0(plan.ha), sensorCount(plan.sensors)))}</div>`;
  }

  const acc = authSession;
  if ($('#userRole')) $('#userRole').textContent = acc?.role === 'admin' ? tr('Administrador') : (acc?.farmName || tr('Plano Produtor'));
  if ($('#userName')) $('#userName').textContent = acc?.name || acc?.username || tr('Produtor');
  if ($('#userAvatar')) $('#userAvatar').textContent = (acc?.name || acc?.username || 'P').slice(0, 1).toUpperCase();
}

function renderOverview() {
  const city = activeCity();
  const areas = state.areas.filter((a) => Number(a.city) === Number(city.id));
  const analyses = areas.map((a) => ({ area: a, info: analyzeArea(a) }));
  const totalHa = areas.reduce((s, a) => s + Number(a.area || 0), 0);
  const needIrrigate = analyses.filter((x) => x.info.irrigate).length;
  const totalVol = analyses.reduce((s, x) => s + (x.info.irrigate ? x.info.volume : 0), 0);
  const totalCost = analyses.reduce((s, x) => s + (x.info.irrigate ? x.info.cost : 0), 0);
  const avgDepl = analyses.length
    ? analyses.reduce((s, x) => s + x.info.sensor.depletion * 100, 0) / analyses.length
    : 0;

  if ($('#ovSub')) $('#ovSub').textContent = `${city.nome} · ${areaCount(areas.length)} · ${fmt(totalHa, 1)} ha`;
  if ($('#ovDate')) $('#ovDate').textContent = tr('Atualizado') + ' ' + timeAgo(state.lastSync || Date.now());

  if ($('#ovKpis')) {
    $('#ovKpis').innerHTML = [
      `<div class="card kpi accent"><span class="label">${esc(tr('Áreas monitoradas'))}</span><span class="value">${areas.length}</span><span class="foot">${fmt(totalHa, 1)} ha</span></div>`,
      `<div class="card kpi"><span class="label">${esc(tr('Irrigar hoje'))}</span><span class="value">${needIrrigate}</span><span class="foot">${fmt(totalVol, 1)} m³</span></div>`,
      `<div class="card kpi"><span class="label">${esc(tr('Custo estimado hoje'))}</span><span class="value">R$ ${fmt(totalCost, 2)}</span><span class="foot">${esc(tr('Energia + água'))}</span></div>`,
      `<div class="card kpi"><span class="label">${esc(tr('Déficit médio'))}</span><span class="value">${fmt(avgDepl, 0)}%</span><span class="foot">${esc(tr('Água disponível'))}</span></div>`,
      `<div class="card kpi good"><span class="label">${esc(tr('Estação / clima'))}</span><span class="value">${Math.round(todayWeather(city.id).tmax)}°C</span><span class="foot">${esc(city.nome)}</span></div>`,
    ].join('');
  }

  const sel = analyses.find((x) => Number(x.area.id) === Number(state.selectedAreaId)) || analyses[0];
  if ($('#recHero')) {
    if (!sel) {
      $('#recHero').innerHTML = `<p class="small muted">${esc(tr('Cadastre uma área na calculadora para ver recomendações de irrigação.'))}</p>`;
    } else {
      const { area, info } = sel;
      $('#recHero').innerHTML = `
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div class="small muted">${esc(area.name)} · ${esc(info.crop.nome)} · ${esc(info.sys.nome)}</div>
            <div style="font-size:20px;font-weight:800">${esc(info.status.rec)} — ${fmt(info.volume, 1)} m³ (${fmt(info.hours, 1)} h)</div>
          </div>
          <span class="badge ${info.status.cls}">${esc(info.status.label)}</span>
        </div>`;
    }
  }

  if ($('#recList')) {
    $('#recList').innerHTML = analyses.slice(0, 6).map(({ area, info }) => `
      <div class="flex items-center justify-between py-2 border-b text-sm">
        <div><b>${esc(area.name)}</b> <span class="muted">(${esc(info.crop.nome)})</span></div>
        <span class="badge ${info.status.cls}">${esc(info.status.rec)} · ${fmt(info.volume, 1)} m³</span>
      </div>`).join('');
  }

  if ($('#soilAreaName')) $('#soilAreaName').textContent = sel ? sel.area.name : tr('Selecione uma área');
  if ($('#soilStatus')) {
    $('#soilStatus').textContent = sel ? sel.info.status.label : '—';
    $('#soilStatus').className = 'badge ' + (sel ? sel.info.status.cls : 'gray');
  }
  if ($('#soilBody')) {
    $('#soilBody').innerHTML = sel
      ? `<div class="small muted">Umidade média: <b>${fmt(sel.info.sensor.avg, 1)}%</b> · 20cm: <b>${fmt(sel.info.sensor.d20, 1)}%</b> · 40cm: <b>${fmt(sel.info.sensor.d40, 1)}%</b> · 60cm: <b>${fmt(sel.info.sensor.d60, 1)}%</b></div>`
      : `<p class="small muted">${esc(tr('Sem dados de sensor para este município.'))}</p>`;
  }

  const days = forecastFor(city.id);
  if ($('#weatherStrip')) {
    $('#weatherStrip').innerHTML = days.map((d) => `
      <div class="wday ${d.date === todayISO() ? 'today' : ''}">
        <div class="d">${d.date === todayISO() ? esc(tr('Hoje')) : esc(dateLong(d.date).split(',')[0])}</div>
        <div class="i">${iconFor(d.rain, d.prob)}</div>
        <div class="r">${fmt(d.rain, 1)} mm</div>
        <div class="t">${fmt(d.tmin, 0)}° / ${fmt(d.tmax, 0)}°</div>
      </div>`).join('');
  }
  if ($('#weatherFoot')) {
    $('#weatherFoot').textContent = days.some((d) => d.live)
      ? tr('Previsão atualizada via Open-
