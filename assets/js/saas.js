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

/* Guarda os textos originais para alternar entre PT e ZH sem duplicar dados. */
CROPS.forEach((c) => { c.nomePt = c.nome; });
Object.values(SYSTEMS).forEach((s) => { s.nomePt = s.nome; s.descPt = s.desc; });
Object.values(SOILS).forEach((s) => { s.nomePt = s.nome; });
Object.values(PLANS).forEach((p) => { p.nomePt = p.nome; p.descPt = p.desc; p.featuresPt = p.features.slice(); p.limitsPt = (p.limits || []).slice(); });

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
  } catch (e) { /* file:// / storage */ }
  return 'pt';
}
let LANG = detectLang();
let LOCALE = LANG === 'zh' ? 'zh-CN' : 'pt-BR';
const tr = (text) => (LANG === 'zh' ? (I18N.zh[text] ?? text) : text);
const trf = (template, ...args) => tr(template).replace(/\{(\d+)\}/g, (_, i) => String(args[i] ?? ''));

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
const dayCount = (n) => LANG === 'zh' ? `${n} 天` : `${n} ${Number(n) === 1 ? 'dia' : 'dias'}`;
const simpleAreaCount = (n) => LANG === 'zh' ? `${n} 块地` : `${n} ${Number(n) === 1 ? 'área' : 'áreas'}`;
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return tr('Bom dia');
  if (h < 18) return tr('Boa tarde');
  return tr('Boa noite');
};
const cityOf = (id) => CITY_BY_ID.get(Number(id)) || CITY_BY_ID.get(DEFAULT_CITY) || CITIES[0];
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

/* ---------- Estado ---------- */
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
  } catch (e) { /* sessão local indisponível */ }
  return null;
}
let authSession = loadAuthSession();
let activeAccountUsername = authSession?.username || 'agricultor';
let state = loadState(activeAccountUsername);

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
    button.setAttribute('aria-label', `${account.farmName || account.name} · ${account.username}`);
    button.innerHTML = `<span class="auth-account-icon farmer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4c-8 .2-13 3.8-13 10a6 6 0 0 0 6 6c6.2 0 9.8-5 10-13l-3 3"/><path d="M4 21c2-4 5-7 10-10"/></svg></span><span class="auth-account-info"><strong>${esc(account.farmName || account.name)}</strong><small>${esc(account.username)} <span class="auth-credential-dot">·</span> ${esc(tr('Acesso recente'))}</small></span><span class="auth-radio"></span>`;
    container.appendChild(button);
  });
}

function renderAuthScreen() {
  const locked = !authSession || authSession.exp <= Date.now();
  if (locked) authSession = null;
  $('#app').classList.toggle('auth-locked', locked);
  $('#app').setAttribute('aria-hidden', locked ? 'true' : 'false');
  $('#authScreen').hidden = !locked;
  $('#adminNavGroup').hidden = authSession?.role !== 'admin';
  if (locked) renderAuthAccounts();
}

function chooseDemoAccount(username) {
  const account = accountForUser(username);
  if (!account) return;
  $('#authUser').value = account.username;
  $('#authPass').value = account.password || '';
  $('#authPass').type = 'password';
  $('#authReveal').setAttribute('aria-pressed', 'false');
  $$('[data-demo-user]').forEach((button) => {
    const selected = button.dataset.demoUser === account.username;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#authError').classList.remove('show');
}

function showRegistration(show) {
  const register = !!show;
  $('#authCard').hidden = register;
  $('#authRegistration').hidden = !register;
  $('#authScreen').classList.toggle('register-mode', register);
  if (register) {
    if (!$('#registerPlantings').children.length) addPlantingRow();
    $('#registerName').focus();
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
    <button class="register-remove" type="button" data-remove-planting aria-label="${esc(tr('Remover plantação'))}" title="${esc(tr('Remover'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14"/></svg></button>`;
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
  error.textContent = message;
  error.classList.toggle('show', !!message);
}

async function createFarmerAccount(event) {
  event.preventDefault();
  setRegisterError('');
  const name = $('#registerName').value.trim();
  const farmName = $('#registerFarm').value.trim();
  const username = $('#registerUsername').value.trim().toLowerCase();
  const password = $('#registerPassword').value;
  const producerTitle = ['produtor', 'produtora', 'produtor(a)'].includes($('#registerTreatment').value) ? $('#registerTreatment').value : 'produtor(a)';
  const cityId = Number($('#registerCity').value) || DEFAULT_CITY;
  const community = $('#registerCommunity').value.trim();
  const rows = $$('#registerPlantings [data-planting-row]');
  const plantings = rows.map((row) => {
    const name = row.querySelector('[data-planting-name]').value.trim();
    const crop = row.querySelector('[data-planting-crop]').value;
    const areaText = row.querySelector('[data-planting-area]').value.trim();
    return { name, crop, areaText, area: Number(areaText.replace(',', '.')) };
  }).filter((plot) => plot.name || plot.crop || plot.areaText);

  if (!name || !farmName || !cityId || !username || !password) return setRegisterError(tr('Preencha seus dados e os campos obrigatórios.'));
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) return setRegisterError(tr('O usuário deve ter de 3 a 24 caracteres: letras, números, ponto, hífen ou sublinhado.'));
  if (accountForUser(username)) return setRegisterError(tr('Esse usuário já está cadastrado. Escolha outro.'));
  if (password.length < 6) return setRegisterError(tr('A senha deve ter pelo menos 6 caracteres.'));
  if (!plantings.length) {
    return setRegisterError(tr('Adicione ao menos uma plantação com nome, cultivo e área.'));
  }
  const incomplete = plantings.find((plot) => !plot.name || !CROP_BY_ID.has(plot.crop) || !(plot.area > 0));
  if (incomplete) {
    const row = rows.find((item) => item.querySelector('[data-planting-name]').value.trim() === incomplete.name
      && item.querySelector('[data-planting-crop]').value === incomplete.crop
      && item.querySelector('[data-planting-area]').value.trim() === incomplete.areaText);
    const missing = row && (!incomplete.name ? row.querySelector('[data-planting-name]')
      : !CROP_BY_ID.has(incomplete.crop) ? row.querySelector('[data-planting-crop]')
      : row.querySelector('[data-planting-area]'));
    setRegisterError(tr('Complete o nome, o cultivo e uma área maior que zero em cada plantação iniciada.'));
    missing?.focus();
    return;
  }

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
    return setRegisterError(tr('Não foi possível salvar o cadastro neste navegador. Verifique o espaço disponível e tente novamente.'));
  }

  $('#authUser').value = username;
  $('#authPass').value = password;
  $('#authPass').type = 'password';
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
    $('#authError').classList.add('show');
    $('#authPass').value = '';
    $('#authPass').focus();
    return false;
  }
  activeAccountUsername = account.username;
  state = loadState(activeAccountUsername);
  if (!state.seeded && activeAccountUsername === 'agricultor') seedDemo();
  else if (!state.seeded) { state.seeded = true; save(); }
  wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
  authSession = { ...safeAccount(account), exp: Date.now() + 8 * 60 * 60 * 1000 };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(authSession)); } catch (e) { /* sessão somente nesta aba */ }
  $('#authError').classList.remove('show');
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
  try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* sessão local indisponível */ }
  chooseDemoAccount(accountForUser(lastUsername) ? lastUsername : 'admin');
  renderAuthScreen();
  $('#authUser').focus();
}

function save() {
  try { localStorage.setItem(stateKey(), JSON.stringify(state)); } catch (e) { /* storage indisponível */ }
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
  } catch (e) { /* quota */ }
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
  // A leitura do sensor usa a ETo climatológica local para manter a demonstração estável.
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
  const cost = energy * state.settings.tariff + volume * state.settings.water;
  const daysToNext = s.depletion >= 0.45 ? 0 : Math.max(1, Math.ceil(((0.45 - s.depletion) * s.taw) / Math.max(0.2, etc)));
  return {
    area, city, crop, sys, soil, weather: w, sensors: s, status: st,
    need, gross, volume, hours, energy, cost, etc, daysToNext,
    moisture: s.avg, depletion: s.depletion, taw: s.taw, deficit: s.deficit,
  };
}

function annualStats(area, systemId) {
  const city = cityOf(area.city);
  const crop = CROP_BY_ID.get(area.crop) || CROPS[0];
  const soil = soilOf(area.soil);
  const sys = SYSTEMS[systemId] || SYSTEMS.gotejamento;
  const kc = kcFor(crop, area.phase || 'prod');
  const ha = Number(area.area || 0);
  let netAnnual = 0;
  for (let i = 0; i < 12; i++) {
    const etc = Number(city.eto[i] || 0) * kc * DAYS[i];
    const rain = Math.max(0, Number(city.chuva[i] || 0) - 5) * 0.8;
    netAnnual += Math.max(0, etc - rain);
  }
  const taw = (soil.fc - soil.pwp) * 10 * crop.raiz;
  const events = clamp(netAnnual / Math.max(1, taw * 0.55), 6, 60);
  const volume = netAnnual / sys.eff * 10 * ha;
  const energyCost = volume * sys.kwh * state.settings.tariff;
  const waterCost = volume * state.settings.water;
  const maint = sys.capex * ha * sys.maint;
  const labor = events * ha * sys.labor * state.settings.labor;
  const annualCost = energyCost + waterCost + maint + labor;
  const capex = sys.capex * ha;
  const tco10 = capex + annualCost * 10;
  const costPerM3 = tco10 / Math.max(1, volume * 10);
  return {
    id: systemId, sys, netAnnual, events, volume, energyCost, waterCost, maint, labor,
    annualCost, capex, tco10, costPerM3,
  };
}

function systemComparison(areaLike) {
  const crop = CROP_BY_ID.get(areaLike.crop) || CROPS[0];
  const rows = SYSTEM_IDS.map((id) => {
    const stats = annualStats(areaLike, id);
    return { ...stats, ...stats.sys, fit: (CROP_FIT[crop.grupo] || {})[id] || 60 };
  });
  const minCost = Math.min(...rows.map((r) => r.costPerM3));
  rows.forEach((r) => {
    const costScore = clamp(100 * (minCost / Math.max(0.0001, r.costPerM3)), 0, 100);
    const waterScore = r.eff * 100;
    r.score = Math.round(0.35 * waterScore + 0.35 * costScore + 0.30 * r.fit);
  });
  rows.sort((a, b) => b.score - a.score);
  return rows;
}

function monthlySavings() {
  let waterBase = 0, waterCur = 0, costBase = 0, costCur = 0;
  state.areas.forEach((a) => {
    const base = annualStats(a, 'sulco');
    const cur = annualStats(a, a.system);
    waterBase += base.volume;
    waterCur += cur.volume;
    costBase += base.annualCost;
    costCur += cur.annualCost;
  });
  const waterSaved = Math.max(0, (waterBase - waterCur) / 12);
  return {
    waterBase: waterBase / 12,
    waterCur: waterCur / 12,
    waterSaved,
    valueSaved: waterSaved * 0.50,
    costBase: costBase / 12,
    costCur: costCur / 12,
    costSaved: Math.max(0, (costBase - costCur) / 12),
  };
}

/* ---------- Calculadora: rascunho ---------- */
function newDraft() {
  const city = cityOf(state.activeCity);
  return {
    city: city.id,
    name: '',
    area: 1,
    crop: 'tomate',
    phase: 'prod',
    soil: 'medio',
    flow: 20,
    planting: todayISO(),
    mode: 'sensor',
    sensors: null,
    sensorsTouched: false,
    eto: city.eto[nowMonth()],
    rain: 0,
    daysSince: 6,
    system: 'gotejamento',
  };
}
let wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
let activeRoute = 'overview';

function ensureDraftSensors() {
  const d = wizard.draft;
  const crop = CROP_BY_ID.get(d.crop) || CROPS[0];
  if (!d.sensors || !d.sensorsTouched) {
    const virtual = {
      city: d.city, crop: d.crop, phase: d.phase, soil: d.soil,
      lastIrrigation: isoOffset(-Number(d.daysSince || 0)),
    };
    const city = cityOf(d.city);
    const eto = Number(d.eto) || city.eto[nowMonth()];
    const sr = sensorReading(virtual, eto * kcFor(crop, d.phase));
    d.sensors = { d20: sr.d20, d40: sr.d40, d60: sr.d60 };
  }
}

function computeDraft() {
  const d = wizard.draft;
  ensureDraftSensors();
  const city = cityOf(d.city);
  const crop = CROP_BY_ID.get(d.crop) || CROPS[0];
  const soil = soilOf(d.soil);
  const sys = SYSTEMS[d.system] || SYSTEMS.gotejamento;
  const kc = kcFor(crop, d.phase);
  const eto = Number(d.eto) || city.eto[nowMonth()];
  const taw = (soil.fc - soil.pwp) * 10 * crop.raiz;

  let avg, depletion;
  if (d.mode === 'sensor') {
    const s = d.sensors || { d20: soil.fc, d40: soil.fc, d60: soil.fc };
    avg = 0.45 * Number(s.d20) + 0.35 * Number(s.d40) + 0.20 * Number(s.d60);
    const avail = clamp((avg - soil.pwp) / Math.max(0.01, soil.fc - soil.pwp), 0, 1);
    depletion = 1 - avail;
  } else {
    const balance = Math.max(0, eto * kc * Number(d.daysSince || 0) - Math.max(0, Number(d.rain || 0)) * 0.8);
    depletion = clamp(0.12 + balance / Math.max(0.01, taw), 0, 1);
    avg = soil.fc - depletion * (soil.fc - soil.pwp);
  }

  const deficit = depletion * taw;
  const st = statusFor(depletion);
  const irrigate = st.irrigate;
  const need = irrigate ? deficit * 0.95 : 0;
  const gross = need / sys.eff;
  const areaHa = Number(d.area) || 0;
  const volume = gross * 10 * areaHa;
  const hours = volume / Math.max(0.5, Number(d.flow) || 6);
  const energy = volume * sys.kwh;
  const cost = energy * state.settings.tariff + volume * state.settings.water;
  const etc = eto * kc;
  const daysToNext = depletion >= 0.45 ? 0 : Math.max(1, Math.ceil(((0.45 - depletion) * taw) / Math.max(0.2, etc)));

  const areaLike = { city: d.city, crop: d.crop, phase: d.phase, area: areaHa, soil: d.soil };
  const rows = systemComparison(areaLike);
  const best = rows[0];
  const current = rows.find((r) => r.id === d.system) || rows[0];
  const currentAnnual = annualStats(areaLike, d.system);
  const bestAnnual = annualStats(areaLike, best.id);

  return {
    city, crop, soil, sys, eto, kc, taw, avg, depletion, deficit, st,
    need, gross, volume, hours, cost, etc, daysToNext,
    rows, best, current, currentAnnual, bestAnnual,
    waterSavedYear: Math.max(0, currentAnnual.volume - bestAnnual.volume),
    costSavedYear: Math.max(0, currentAnnual.annualCost - bestAnnual.annualCost),
  };
}

function recommendationReason(crop, best, rows) {
  const byCost = rows.slice().sort((a, b) => a.costPerM3 - b.costPerM3);
  const rank = byCost.findIndex((r) => r.id === best.id) + 1;
  const costText = rank === 1 ? tr('o menor custo por m³ em 10 anos') : trf('o {0}º menor custo por m³ em 10 anos', rank);
  return trf('{0} oferece o melhor equilíbrio para {1}: {2}% de eficiência hídrica, adequação de {3}/100 à cultura e {4}.',
    best.nome, crop.nome.toLowerCase(), Math.round(best.eff * 100), best.fit, costText);
}

/* ---------- Render: shell ---------- */
function renderShell() {
  const city = cityOf(state.activeCity);
  $('#cityBtnName').textContent = city.nome;
  $('#sideCityName').textContent = city.nome;
  $('#sideCityMeta').textContent = trf('PI · {0} hab', city.pop ? fmt0(city.pop) : '—');
  $('#cityBtn').title = city.nome + ' · ' + (city.pop ? fmt0(city.pop) + ' ' + tr('hab') : '');
  $('#cityBtn').hidden = authSession?.role === 'farmer';
  if (authSession?.role === 'farmer' && authSession.community) {
    $('#sideCityMeta').textContent = `${authSession.community} · ${tr('Piauí')}`;
  }

  const w = todayWeather(city.id);
  const pill = $('#weatherPill');
  if (w.live) {
    pill.classList.remove('offline');
    $('#weatherLabel').textContent = tr('Ao vivo');
    $('#weatherTemp').textContent = Math.round(w.tmax) + '°C';
  } else {
    pill.classList.add('offline');
    $('#weatherLabel').textContent = tr('Clima médio');
    $('#weatherTemp').textContent = fmt(city.t2m[nowMonth()], 0) + '°C';
  }

  const plan = PLANS[state.plan] || PLANS.pro;
  const producerRole = authSession?.producerTitle === 'produtora' ? 'Produtora' : authSession?.producerTitle === 'produtor' ? 'Produtor' : 'Produtor(a)';
  $('#userRole').textContent = authSession ? tr(authSession.role === 'admin' ? 'Administrador' : producerRole) : trf('Plano {0}', plan.nome);
  $('#userName').textContent = authSession ? tr(authSession.role === 'farmer' ? authSession.farmName : authSession.name) : tr('Fazenda Boa Vista');
  const avatar = $('.user-avatar');
  if (avatar) avatar.textContent = authSession ? String(authSession.role === 'farmer' ? authSession.farmName : authSession.name).charAt(0) : 'P';

  const totalHa = state.areas.reduce((s, a) => s + Number(a.area || 0), 0);
  const sensors = state.areas.reduce((s, a) => s + (Number(a.sensors) || 1), 0);
  const planPct = clamp((totalHa / plan.ha) * 100, 0, 100);
  const over = totalHa > plan.ha || state.areas.length > (plan.areas || 99) || sensors > plan.sensors;
  const planCard = $('#planCard');
  if (planCard) {
    const priceText = plan.price === 0 ? tr('Grátis') : trf('R$ {0}/mês', fmt(plan.price, 2));
    planCard.className = 'plan-card ' + plan.id + (over ? ' over' : '');
    planCard.innerHTML = `
      <div class="plan-top"><span>${esc(trf('Plano {0}', plan.nome))}</span><b>${esc(priceText)}</b></div>
      ${plan.trial ? `<div class="plan-trial">${esc(tr('14 dias grátis'))}</div>` : ''}
      ${over ? `<div class="plan-over">${esc(tr('Uso acima do limite do plano'))}</div>` : ''}
      <div class="plan-usage">
        <div class="bar"><i style="width:${planPct}%"></i></div>
        <div class="lbl"><span>${esc(trf('{0} de {1} ha', fmt(totalHa, 1), plan.ha))}</span><span>${esc(trf('{0}/{1} sensores', sensors, plan.sensors))}</span></div>
      </div>
      <button class="btn btn-secondary btn-sm" id="planBtn">${esc(plan.price === 0 ? tr('Conhecer o Pro') : tr('Ver planos'))}</button>`;
  }
  const resetDemo = $('#resetDemo');
  if (resetDemo) resetDemo.hidden = authSession?.username !== 'agricultor';
  const adminLock = $('#adminLock');
  if (adminLock) adminLock.innerHTML = '';
}

/* ---------- Render: visão geral ---------- */
function kpi(label, value, foot, icon, cls = '') {
  return `<div class="card kpi ${cls}">
    <div class="icon"><svg><use href="#i-${icon}"/></svg></div>
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="foot">${foot}</div>
  </div>`;
}

function renderOverview() {
  const city = cityOf(state.activeCity);
  const cityAreas = authSession?.role === 'farmer'
    ? state.areas.slice()
    : state.areas.filter((a) => Number(a.city) === Number(city.id));
  const stats = cityAreas.map((a) => analyzeArea(a)).sort((a, b) => b.depletion - a.depletion);
  const allStats = state.areas.map((a) => analyzeArea(a));
  const totalHa = cityAreas.reduce((s, a) => s + Number(a.area || 0), 0);
  const sensors = cityAreas.reduce((s, a) => s + (Number(a.sensors) || 1), 0);
  const avgAvail = stats.length ? stats.reduce((s, p) => s + (1 - p.depletion) * Number(p.area.area || 0), 0) / Math.max(0.001, stats.reduce((s, p) => s + Number(p.area.area || 0), 0)) : 0;
  const savings = monthlySavings();
  const irrigate = stats.filter((p) => p.need > 0);
  const totalNeed = irrigate.reduce((s, p) => s + p.need, 0);
  const totalVol = irrigate.reduce((s, p) => s + p.volume, 0);
  const totalCost = irrigate.reduce((s, p) => s + p.cost, 0);
  const nextDays = stats.length ? Math.min(...stats.map((p) => p.daysToNext || 99)) : 0;
  const selected = stats.find((p) => p.area.id === Number(state.selectedAreaId)) || stats[0] || null;

  const greetingKey = authSession?.role === 'admin' ? '{0}, administrador'
    : authSession?.producerTitle === 'produtora' ? '{0}, produtora'
    : authSession?.producerTitle === 'produtor' ? '{0}, produtor' : '{0}, produtor(a)';
  $('#ovTitle').textContent = trf(greetingKey, greeting());
  $('#ovSub').textContent = `${city.nome} · ${areaCount(cityAreas.length)} · ${sensorCount(sensors)} · ${tr('última leitura')} ${timeAgo(state.lastSync)}`;
  const dateEl = $('#ovDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');

  const alert = $('#ovAlert');
  if (!stats.length) {
    alert.innerHTML = `<div class="alert good">
      <svg><use href="#i-info"/></svg>
      <div><strong>${esc(trf('Nenhuma área monitorada em {0}.', city.nome))}</strong> ${esc(tr('Cadastre uma área para receber a recomendação de irrigação deste município.'))}</div>
      <span class="spacer"></span>
      <button class="alert-action" data-action="newArea">${esc(tr('Cadastrar área'))}</button>
    </div>`;
  } else if (irrigate.length) {
    const worst = irrigate.some((p) => p.status.key === 'bad');
    const needTitle = LANG === 'zh'
      ? `${irrigate.length} 块地需要灌溉。`
      : `${irrigate.length} ${irrigate.length === 1 ? 'área precisa' : 'áreas precisam'} de irrigação.`;
    alert.innerHTML = `<div class="alert ${worst ? 'danger' : 'warn'} alert-clickable" data-action="selectArea" data-id="${irrigate[0].area.id}" role="button" tabindex="0" aria-label="${esc(needTitle)}">
      <svg><use href="#i-alert"/></svg>
      <div class="alert-main">
        <strong>${esc(needTitle)}</strong>
        <div class="alert-links">
          ${irrigate.map((p) => `<button class="alert-area" data-action="selectArea" data-id="${p.area.id}"><span class="dot"></span>${esc(p.area.name)} <b>${fmt(p.need, 1)} mm</b></button>`).join('')}
        </div>
        <div class="alert-total">${fmt(totalNeed, 1)} mm · ${fmt(totalVol, 1)} m³ · R$ ${fmt(totalCost, 2)} <span class="muted">${esc(tr('Recomendação baseada na leitura dos sensores.'))}</span></div>
      </div>
      <span class="alert-hint">${esc(tr('Clique para ver a área'))} <svg><use href="#i-arrow-right"/></svg></span>
    </div>`;
  } else {
    const nextText = nextDays
      ? (LANG === 'zh' ? ` 预计下次灌溉在 ${dayCount(nextDays)}后。` : ` Próxima janela estimada em ${dayCount(nextDays)}.`)
      : '';
    alert.innerHTML = `<div class="alert good">
      <svg><use href="#i-check"/></svg>
      <div><strong>${esc(tr('Solo em boas condições.'))}</strong> ${esc(tr('Nenhuma irrigação necessária agora.'))}${esc(nextText)}</div>
    </div>`;
  }

  const avgStatus = statusFor(1 - avgAvail);
  const upsell = $('#planUpsell');
  if (upsell) {
    if (state.plan === 'gratuito') {
      upsell.innerHTML = `<div class="upsell">
        <div class="upsell-ico"><svg><use href="#i-shield"/></svg></div>
        <div class="upsell-copy"><b>${esc(tr('Você está no plano Gratuito.'))}</b><span>${esc(tr('Libere o comparativo de sistemas, o histórico e até 20 ha no Pro.'))}</span></div>
        <div class="upsell-price"><b>${esc(trf('R$ {0}/mês', fmt(PLANS.pro.price, 2)))}</b><span>${esc(tr('programa PI'))}</span></div>
        <button class="btn btn-primary btn-sm" data-action="openPlans">${esc(tr('Conhecer o Pro'))}</button>
      </div>`;
    } else {
      upsell.innerHTML = '';
    }
  }
  $('#ovKpis').innerHTML = [
    kpi(tr('Áreas monitoradas'), cityAreas.length, trf('{0} ha · {1} no plano', fmt(totalHa, 1), state.areas.length), 'layers', 'accent'),
    kpi(tr('Sensores ativos'), `${sensors}`, trf('{0} pontos de leitura', sensors * 3), 'wifi'),
    stats.length ? kpi(tr('Umidade média'), `${Math.round(avgAvail * 100)}%`, trf('{0} na zona radicular', avgStatus.label), 'drop', avgAvail < 0.45 ? 'warn' : 'good')
      : kpi(tr('Umidade média'), '—', tr('sem leitura neste município'), 'drop'),
    kpi(tr('Água economizada'), `${fmt0(savings.waterSaved)} <small>m³</small>`, tr('no plano · vs. sulco'), 'leaf', 'good'),
    kpi(tr('Custo evitado'), `R$ ${fmt0(savings.valueSaved)}`, tr('valor da água poupada'), 'money', 'good'),
  ].join('');

  renderRec(stats, selected);
  renderSoil(selected);
  renderTrend(selected);
  renderBalance(selected);
  renderHistory();
  renderWeather(city);
  renderSavings(savings, state.plan);
  renderAreasTable(stats);
}

function renderRec(stats, selected) {
  const hero = $('#recHero');
  const list = $('#recList');
  if (!stats.length) {
    hero.innerHTML = `<div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-leaf"/></svg></div><h3>${esc(tr('Nenhuma área neste município'))}</h3><p>${esc(tr('Cadastre uma área na calculadora para começar a receber recomendações.'))}</p><button class="btn btn-primary btn-sm" data-action="newArea">${esc(tr('Cadastrar área'))}</button></div>`;
    list.innerHTML = '';
    return;
  }
  const p = selected || stats[0];
  const st = p.status;
  const need = p.need;
  const pumpFlow = Math.max(0.5, Number(p.area.flow || 6));
  const chips = need > 0 ? [
    `<span>${esc(tr('Lâmina'))} <b>${fmt(need, 1)} mm</b></span>`,
    `<span>${esc(tr('Volume'))} <b>${fmt(p.volume, 1)} m³</b></span>`,
    `<span>${esc(tr('Custo'))} <b>R$ ${fmt(p.cost, 2)}</b></span>`,
    `<span>${esc(tr('Tempo de bomba'))} <b>${formatHours(p.hours)}</b></span>`,
    `<span>${esc(tr('Vazão da bomba'))} <b>${fmt(pumpFlow, 1)} m³/h</b></span>`,
    `<span>${esc(tr('Melhor horário'))} <b>17:00</b></span>`,
  ] : [
    `<span>${esc(tr('Umidade'))} <b>${fmt(p.moisture, 1)}%</b></span>`,
    `<span>${esc(tr('Água disponível'))} <b>${Math.round((1 - p.depletion) * 100)}%</b></span>`,
    `<span>${esc(tr('Próxima checagem'))} <b>${p.daysToNext ? (LANG === 'zh' ? dayCount(p.daysToNext) + '后' : 'em ' + dayCount(p.daysToNext)) : esc(tr('hoje'))}</b></span>`,
    `<span>${esc(tr('Água no solo'))} <b>${fmt(Math.max(0, p.sensors.taw - p.deficit), 1)} mm</b></span>`,
  ];

  hero.innerHTML = `<div class="rec-hero ${st.key === 'bad' ? '' : st.key === 'warn' ? 'warn' : st.key === 'ok' && p.depletion <= 0.08 ? 'saturated' : 'ideal'}">
    <div class="rh-top">
      <span class="k">${esc(trf('Recomendação para {0}', p.area.name))}</span>
      <span class="live"><i></i>${p.sensors.days === 0 ? esc(tr('leitura de hoje')) : esc(LANG === 'zh' ? dayCount(p.sensors.days) + '前读数' : 'leitura há ' + dayCount(p.sensors.days))}</span>
    </div>
    <div class="rh-title">${st.rec}${need > 0 ? `<small>${fmt(need, 1)} mm</small>` : `<small>${esc(tr('sem lâmina hoje'))}</small>`}</div>
    <div class="rh-sub">${esc(trf('{0} · {1} ha · {2} · {3}. {4}', p.crop.nome, fmt(p.area.area, 2), p.sys.nome, p.city.nome, need > 0 ? tr('Aplique na janela indicada para reduzir perdas por evaporação.') : tr('O solo ainda tem água disponível; aguarde a próxima leitura.')))}</div>
    <div class="rh-chips">${chips.join('')}</div>
    <div class="rh-actions">
      ${need > 0 ? `<button class="btn btn-sm solid" data-action="irrigate" data-id="${p.area.id}"><svg><use href="#i-drop"/></svg>${esc(tr('Registrar irrigação'))}</button>` : `<button class="btn btn-sm" data-action="refreshSensors"><svg><use href="#i-refresh"/></svg>${esc(tr('Atualizar leitura'))}</button>`}
      <button class="btn btn-sm" data-action="calcArea" data-id="${p.area.id}"><svg><use href="#i-calc"/></svg>${esc(tr('Ajustar cálculo'))}</button>
    </div>
  </div>`;

  list.innerHTML = stats.map((r) => {
    const active = r.area.id === p.area.id;
    return `<div class="rec-row ${active ? 'active' : ''}">
      <div class="area">
        <i style="background:${r.status.cls === 'red' ? 'var(--red)' : r.status.cls === 'amber' ? 'var(--amber)' : r.status.cls === 'blue' ? 'var(--blue)' : 'var(--brand)'}"></i>
        <div style="min-width:0"><div class="nm">${esc(r.area.name)}</div><div class="meta">${esc(trf('{0} · {1} ha · {2}', r.crop.nome, fmt(r.area.area, 2), r.sys.nome))}</div></div>
      </div>
      <span class="badge ${r.status.cls}">${r.status.label}</span>
      <div class="num">${r.need > 0 ? fmt(r.need, 1) + ' mm' : '—'}<small>${r.need > 0 ? fmt(r.volume, 0) + ' m³' : esc(tr('sem lâmina'))}</small></div>
      <div class="num">${r.need > 0 ? 'R$ ' + fmt(r.cost, 2) : '—'}<small>${r.need > 0 ? formatHours(r.hours) : esc(tr('aguardar'))}</small></div>
      <button class="go" data-action="selectArea" data-id="${r.area.id}">${esc(tr('Ver solo'))}</button>
    </div>`;
  }).join('');
}

function renderSoil(p) {
  const body = $('#soilBody');
  const badge = $('#soilStatus');
  const name = $('#soilAreaName');
  if (!p) {
    name.textContent = tr('Nenhuma área');
    badge.className = 'badge gray';
    badge.textContent = '—';
    body.innerHTML = `<div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-drop"/></svg></div><h3>${esc(tr('Sem leitura de solo'))}</h3><p>${esc(tr('Cadastre uma área para ver a umidade por profundidade.'))}</p></div>`;
    return;
  }
  const s = p.sensors;
  const soil = p.soil;
  const avail = 1 - p.depletion;
  const gaugeCls = p.status.key === 'bad' ? 'bad' : p.status.key === 'warn' ? 'warn' : '';
  name.textContent = p.area.name + ' · ' + p.crop.nome;
  badge.className = 'badge ' + p.status.cls;
  badge.textContent = p.status.label;

  const depth = (label, sub, value) => {
    const frac = clamp((value - soil.pwp) / Math.max(0.01, soil.fc - soil.pwp), 0, 1);
    const st = statusFor(1 - frac);
    return `<div class="sensor-row ${st.key}">
      <div class="dp">${label}<small>${esc(tr(sub))}</small></div>
      <div class="track"><i style="width:${Math.round(frac * 100)}%"></i></div>
      <div class="val">${fmt(value, 1)}%</div>
    </div>`;
  };

  body.innerHTML = `
    <div class="soil-gauge">
      <div class="gauge ${gaugeCls}" style="--p:${Math.round(avail * 100)}">
        <div class="gauge-in"><b>${Math.round(avail * 100)}%</b><span>${esc(tr('água disponível'))}</span></div>
      </div>
      <div class="soil-side">
        <div class="big">${esc(tr('Umidade atual'))} <span>${fmt(p.moisture, 1)}%</span></div>
        <div class="rows">
          <div>${esc(tr('Capacidade de campo'))}<b>${fmt(soil.fc, 1)}%</b></div>
          <div>${esc(tr('Ponto de murcha'))}<b>${fmt(soil.pwp, 1)}%</b></div>
          <div>${esc(tr('Água disponível'))}<b>${fmt((1 - p.depletion) * p.taw, 1)} mm</b></div>
          <div>${esc(tr('Déficit atual'))}<b>${fmt(p.deficit, 1)} mm</b></div>
        </div>
      </div>
    </div>
    <div class="sensor-list">
      ${depth('20 cm', 'superficial', s.d20)}
      ${depth('40 cm', 'zona radicular', s.d40)}
      ${depth('60 cm', 'profunda', s.d60)}
    </div>
    <div class="sensor-meta">
      <span><svg><use href="#i-wifi"/></svg>${esc(trf('Sinal {0}/4', s.signal))}</span>
      <span><svg><use href="#i-battery"/></svg>${esc(trf('Bateria {0}%', s.battery))}</span>
      <span><svg><use href="#i-refresh"/></svg>${timeAgo(s.lastSync)}</span>
    </div>`;
}

function renderTrend(p) {
  const box = $('#trendBody');
  const sub = $('#trendSub');
  if (!box) return;
  if (!p) {
    if (sub) sub.textContent = tr('Selecione uma área');
    box.innerHTML = `<div class="empty" style="padding:28px 12px"><div class="ico"><svg width="20" height="20"><use href="#i-chart"/></svg></div><h3>${esc(tr('Sem dados de tendência'))}</h3><p>${esc(tr('Cadastre uma área para ver a projeção de umidade.'))}</p></div>`;
    return;
  }
  if (sub) sub.textContent = trf('{0} · projeção sem irrigação', p.area.name);
  const days = forecastFor(p.city.id);
  const soil = p.soil;
  const fc = soil.fc;
  const pwp = soil.pwp;
  const kc = kcFor(p.crop, p.area.phase || 'prod');
  const start = p.sensors;
  const series = {
    d20: [start.d20],
    d40: [start.d40],
    d60: [start.d60],
  };
  let dep = p.depletion;
  for (let i = 1; i < 7; i++) {
    const day = days[i] || days[days.length - 1];
    const deltaMm = day.eto * kc - Math.max(0, day.rain) * 0.8;
    dep = clamp(dep + deltaMm / Math.max(0.01, p.taw), 0, 1);
    const deltaPct = (deltaMm / Math.max(0.01, p.taw)) * (fc - pwp);
    series.d20.push(clamp(start.d20 - deltaPct, pwp - 3, fc + 1));
    series.d40.push(clamp(start.d40 - deltaPct, pwp - 3, fc + 1));
    series.d60.push(clamp(start.d60 - deltaPct, pwp - 3, fc + 1));
  }

  const W = 430, H = 190, pad = { l: 30, r: 8, t: 10, b: 22 };
  const allValues = [...series.d20, ...series.d40, ...series.d60];
  const yMinRaw = Math.min(pwp - 2, ...allValues);
  const yMaxRaw = Math.max(fc, ...allValues) + 1;
  const step = Math.max(5, Math.ceil((yMaxRaw - yMinRaw) / 4 / 5) * 5);
  const yMin = Math.floor(yMinRaw / step) * step;
  const yMax = Math.ceil(yMaxRaw / step) * step;
  const range = Math.max(step, yMax - yMin);
  const xAt = (i) => pad.l + (i * (W - pad.l - pad.r)) / 6;
  const yAt = (v) => pad.t + (1 - (v - yMin) / range) * (H - pad.t - pad.b);
  const line = (arr, color) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
  const dots = (arr, color) => arr.map((v, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="2.4" fill="${color}"/>`).join('');
  const idealTop = fc;
  const idealBottom = pwp + 0.45 * (fc - pwp);
  const idealY = yAt(idealTop);
  const idealH = Math.max(0, yAt(idealBottom) - idealY);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = yMin + t * range;
    return `<line x1="${pad.l}" y1="${yAt(v)}" x2="${W - pad.r}" y2="${yAt(v)}" stroke="#edf3ef" stroke-width="1"/><text x="${pad.l - 5}" y="${yAt(v) + 3}" text-anchor="end" font-size="8" fill="#84958d">${Math.round(v)}%</text>`;
  }).join('');
  const xLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = days[i] || days[days.length - 1];
    const label = i === 0 ? tr('Hoje') : dateShort(d.date);
    return `<text x="${xAt(i)}" y="${H - 5}" text-anchor="middle" font-size="8" fill="#84958d">${esc(label)}</text>`;
  }).join('');

  const svg = `<svg class="trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr('Tendência de umidade do solo'))}">
    <rect x="${pad.l}" y="${idealY}" width="${W - pad.l - pad.r}" height="${idealH}" fill="rgba(15,107,79,.07)" rx="2"/>
    ${gridLines}
    <line x1="${pad.l}" y1="${yAt(pwp)}" x2="${W - pad.r}" y2="${yAt(pwp)}" stroke="#b42318" stroke-width="1" stroke-dasharray="3 3" opacity=".65"/>
    <path d="${line(series.d20, '#59c894')}" fill="none" stroke="#59c894" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${line(series.d40, '#0f6b4f')}" fill="none" stroke="#0f6b4f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${line(series.d60, '#0e7490')}" fill="none" stroke="#0e7490" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots(series.d20, '#59c894')}${dots(series.d40, '#0f6b4f')}${dots(series.d60, '#0e7490')}
    ${xLabels}
  </svg>`;
  box.innerHTML = `<div class="trend-wrap">${svg}</div>
    <div class="trend-legend">
      <span><i style="background:#59c894"></i>20 cm</span>
      <span><i style="background:#0f6b4f"></i>40 cm</span>
      <span><i style="background:#0e7490"></i>60 cm</span>
    </div>
    <div class="trend-note"><svg><use href="#i-info"/></svg>${esc(tr('Projeção sem irrigação; a linha tracejada é o ponto de murcha.'))}</div>
    <div class="trend-stats">
      <div><span>${esc(tr('Umidade atual'))}</span><b>${fmt(p.moisture, 1)}%</b></div>
      <div><span>${esc(tr('Água disponível'))}</span><b>${Math.round((1 - p.depletion) * 100)}%</b></div>
      <div><span>${esc(tr('Status'))}</span><b style="color:${p.status.key === 'bad' ? 'var(--red)' : p.status.key === 'warn' ? 'var(--amber)' : 'var(--brand-700)'}">${p.status.label}</b></div>
    </div>`;
}


function renderBalance(p) {
  const box = $('#balanceBody');
  const sub = $('#balanceSub');
  if (!box) return;
  if (!p) {
    if (sub) sub.textContent = tr('Selecione uma área');
    box.innerHTML = `<div class="empty" style="padding:28px 12px"><div class="ico"><svg width="20" height="20"><use href="#i-chart"/></svg></div><h3>${esc(tr('Sem dados de balanço'))}</h3><p>${esc(tr('Cadastre uma área para ver o balanço hídrico.'))}</p></div>`;
    return;
  }
  if (sub) sub.textContent = trf('{0} · demanda da cultura × chuva prevista', p.area.name);
  const days = forecastFor(p.city.id);
  const kc = kcFor(p.crop, p.area.phase || 'prod');
  const rows = days.map((d) => ({ ...d, etc: Number(d.eto || 0) * kc }));
  const max = Math.max(1, ...rows.map((d) => Math.max(d.etc, d.rain)));
  const totalEtc = rows.reduce((s, d) => s + d.etc, 0);
  const totalRain = rows.reduce((s, d) => s + Number(d.rain || 0), 0);
  const net = Math.max(0, totalEtc - totalRain);
  box.innerHTML = `
    <div class="balance-chart">${rows.map((d, i) => `<div class="balance-col">
      <div class="balance-bars">
        <i class="bar bar-etc" style="height:${Math.max(2, (d.etc / max) * 100)}%" title="${esc(tr('Demanda da cultura'))}: ${fmt(d.etc, 1)} mm"></i>
        <i class="bar bar-rain" style="height:${Math.max(2, (Number(d.rain || 0) / max) * 100)}%" title="${esc(tr('Chuva'))}: ${fmt(d.rain, 1)} mm"></i>
      </div>
      <div class="balance-x">${i === 0 ? esc(tr('Hoje')) : dateShort(d.date)}</div>
    </div>`).join('')}</div>
    <div class="balance-legend">
      <span><i class="bar-etc"></i>${esc(tr('Demanda da cultura'))}</span>
      <span><i class="bar-rain"></i>${esc(tr('Chuva'))}</span>
    </div>
    <div class="balance-stats">
      <div><span>${esc(tr('Demanda 7d'))}</span><b>${fmt(totalEtc, 1)} mm</b></div>
      <div><span>${esc(tr('Chuva 7d'))}</span><b>${fmt(totalRain, 1)} mm</b></div>
      <div><span>${esc(tr('Déficit 7d'))}</span><b>${fmt(net, 1)} mm</b></div>
    </div>`;
}

function renderHistory() {
  const box = $('#historyBody');
  const count = $('#historyCount');
  if (!box) return;
  const rows = state.history.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 4);
  if (count) count.textContent = trf('{0} registros', state.history.length);
  if (!rows.length) {
    box.innerHTML = `<div class="empty" style="padding:26px 12px"><div class="ico"><svg width="20" height="20"><use href="#i-history"/></svg></div><h3>${esc(tr('Nenhuma irrigação registrada'))}</h3><p>${esc(tr('As irrigações registradas aparecem aqui.'))}</p></div>`;
    return;
  }
  box.innerHTML = `<div class="history-list">${rows.map((h) => `<div class="history-row">
    <div class="h-date">${dateShort(h.date)}</div>
    <div class="h-main"><div class="nm">${esc(h.name)}</div><div class="meta">${fmt(h.mm, 1)} mm · ${fmt(h.m3, 0)} m³</div></div>
    <div class="h-cost">R$ ${fmt(h.cost, 2)}</div>
  </div>`).join('')}</div>`;
}


function renderWeather(city) {
  const days = forecastFor(city.id);
  const live = days.some((d) => d.live);
  $('#weatherBadge').className = 'badge ' + (live ? 'green' : 'amber');
  $('#weatherBadge').innerHTML = live ? `<span class="dot"></span>${esc(tr('Ao vivo'))}` : esc(tr('Climatologia'));
  $('#weatherSub').textContent = trf('{0} · {1}', city.nome, live ? tr('previsão Open-Meteo') : tr('média histórica NASA POWER'));
  $('#weatherStrip').innerHTML = days.map((d, i) => {
    const dt = new Date(d.date + 'T12:00:00');
    const label = i === 0 ? tr('Hoje') : dt.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');
    return `<div class="wday ${i === 0 ? 'today' : ''}">
      <div class="d">${label}</div>
      <div class="i">${iconFor(d.rain, d.prob)}</div>
      <div class="r">${fmt(d.rain, 1)} mm</div>
      <div class="t">${fmt(d.tmax, 0)}° / ${fmt(d.tmin, 0)}°</div>
    </div>`;
  }).join('');
  const foot = $('#weatherFoot');
  if (foot) {
    const rain7 = days.reduce((s, d) => s + Number(d.rain || 0), 0);
    const etoAvg = days.reduce((s, d) => s + Number(d.eto || 0), 0) / Math.max(1, days.length);
    foot.innerHTML = `<div><span>${esc(tr('Chuva em 7 dias'))}</span><b>${fmt(rain7, 1)} mm</b></div>
      <div><span>${esc(tr('ETo média'))}</span><b>${fmt(etoAvg, 2)} mm/dia</b></div>`;
  }
}

function renderSavings(savings, planId) {
  const plan = PLANS[planId] || PLANS.pro;
  const waterPct = savings.waterBase > 0 ? clamp(((savings.waterBase - savings.waterCur) / savings.waterBase) * 100, 0, 99) : 0;
  const proPrice = PLANS.pro.price;
  const netSaving = Math.max(0, savings.valueSaved - proPrice);
  $('#savingsBody').innerHTML = `
    <div class="savings-head">
      <div>
        <div class="big">${fmt0(savings.waterSaved)} <small>${esc(tr('m³/mês'))}</small></div>
        <div class="sub">${esc(tr('água que deixa de ser bombeada com a irrigação de precisão'))}</div>
      </div>
      <div class="pill">${esc(trf('{0}% menos água', Math.round(waterPct)))}</div>
    </div>
    <div class="bar-compare">
      <div class="bar-line"><span class="lbl">${esc(tr('Tradicional'))}</span><div class="track"><i style="width:100%"></i></div><b>${fmt0(savings.waterBase)} m³</b></div>
      <div class="bar-line accent"><span class="lbl">AgroÁgua</span><div class="track"><i style="width:${Math.max(8, Math.round((savings.waterCur / Math.max(1, savings.waterBase)) * 100))}%"></i></div><b>${fmt0(savings.waterCur)} m³</b></div>
    </div>
    <div class="savings-foot">
      <div>${esc(tr('Custo operacional'))}<b>R$ ${fmt0(savings.costCur)}</b></div>
      <div>${esc(tr('Valor da água poupada'))}<b>R$ ${fmt0(savings.valueSaved)}</b></div>
      <div>${esc(tr('Custo do Pro'))}<b>${esc(trf('R$ {0}/mês', fmt(proPrice, 2)))}</b></div>
      <div>${esc(tr('Economia líquida'))}<b>R$ ${fmt0(netSaving)}</b></div>
    </div>`;
}

function renderAreasTable(stats) {
  const body = $('#areasBody');
  $('#areasSub').textContent = LANG === 'zh'
    ? `${stats.length} 块地 · 传感器湿度与今日建议`
    : `${simpleAreaCount(stats.length)} · umidade por sensores e recomendação do dia`;
  if (!stats.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-leaf"/></svg></div><h3>${esc(tr('Nenhuma área neste município'))}</h3><p>${esc(tr('Cadastre uma área na calculadora para começar a receber recomendações.'))}</p><button class="btn btn-primary btn-sm" data-action="newArea">${esc(tr('Cadastrar área'))}</button></div></td></tr>`;
    return;
  }
  body.innerHTML = stats.map((p) => `<tr>
    <td><div class="area-cell"><span class="nm">${esc(p.area.name)}</span><span class="sub">${esc(trf('{0} · {1} ha', p.city.nome, fmt(p.area.area, 2)))}</span></div></td>
    <td>${esc(p.crop.nome)}</td>
    <td>${esc(p.sys.nome)}<div class="cell-sub">${esc(trf('{0}% eficiência', Math.round(p.sys.eff * 100)))}</div></td>
    <td class="t-right"><div class="moist">${fmt(p.moisture, 1)}%<small>${esc(trf('{0}% disponível', Math.round((1 - p.depletion) * 100)))}</small></div></td>
    <td><span class="badge ${p.status.cls}">${p.status.label}</span></td>
    <td>${p.need > 0 ? `<strong>${fmt(p.need, 1)} mm</strong><div class="cell-sub">${fmt(p.volume, 1)} m³ · R$ ${fmt(p.cost, 2)}</div>` : `<span class="muted">${esc(tr('Aguardar'))}</span><div class="cell-sub">${p.daysToNext ? esc(LANG === 'zh' ? dayCount(p.daysToNext) + '后检查' : 'checar em ' + dayCount(p.daysToNext)) : esc(tr('checar hoje'))}</div>`}</td>
    <td><div class="row-actions">
      <button class="icon-btn" title="${esc(tr('Ver solo'))}" data-action="selectArea" data-id="${p.area.id}"><svg><use href="#i-drop"/></svg></button>
      <button class="icon-btn" title="${esc(tr('Calcular'))}" data-action="calcArea" data-id="${p.area.id}"><svg><use href="#i-calc"/></svg></button>
    </div></td>
  </tr>`).join('');
}

function addHours(hour, hours) {
  const total = Math.round((hour + Number(hours || 0)) * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function formatHours(h) {
  const n = Number(h || 0);
  if (n < 1) return Math.round(n * 60) + (LANG === 'zh' ? '分钟' : ' min');
  const hh = Math.floor(n);
  const mm = Math.round((n - hh) * 60);
  if (LANG === 'zh') return hh + '小时' + (mm ? mm + '分钟' : '');
  return hh + 'h' + (mm ? String(mm).padStart(2, '0') : '');
}

/* ---------- Render: calculadora ---------- */
function renderWizard() {
  const step = wizard.step;
  $$('#wizSteps .step').forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('active', n === step);
    el.classList.toggle('done', n < step);
  });
  $$('.step-pane').forEach((el) => el.classList.remove('active'));
  const pane = $('#step' + step);
  if (pane) pane.classList.add('active');

  if (step === 1) renderStep1();
  if (step === 2) renderStep2();
  if (step === 3) renderStep3();
  renderWizardSummary();

  $('#wizBack').disabled = step === 1;
  const next = $('#wizNext');
  next.hidden = step === 3;
  next.innerHTML = (step === 2 ? tr('Ver recomendação') : tr('Continuar')) + '<svg><use href="#i-arrow-right"/></svg>';
}

function renderStep1() {
  const d = wizard.draft;
  const city = cityOf(d.city);
  const crop = CROP_BY_ID.get(d.crop) || CROPS[0];
  $('#step1').innerHTML = `
    <h2>${esc(tr('Onde e o que você planta?'))}</h2>
    <p class="sub">${esc(tr('Informe a área e a cultura. O clima do município entra automaticamente no cálculo.'))}</p>
    <div class="calc-section">
      <div class="form-grid-3">
        <div class="field"><label>${esc(tr('Município'))}</label><select id="cCity">${CITIES_ALPHA.map((c) => `<option value="${c.id}" ${Number(d.city) === Number(c.id) ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>${esc(tr('Nome da área'))}</label><input id="cName" type="text" value="${esc(d.name)}" placeholder="${esc(tr('Ex.: Horta da Dona Zefa'))}"></div>
        <div class="field"><label>${esc(tr('Hectares'))}</label><input id="cArea" type="number" min="0.05" step="0.05" value="${d.area}"><span class="hint">${esc(tr('Área efetivamente irrigada'))}</span></div>
        <div class="field"><label>${esc(tr('Vazão da bomba (m³/h)'))}</label><input id="cFlow" type="number" min="0.5" step="0.5" value="${d.flow}"></div>
        <div class="field"><label>${esc(tr('Solo'))}</label><select id="cSoil">${Object.values(SOILS).map((s) => `<option value="${s.id}" ${d.soil === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>${esc(tr('Data de plantio'))}</label><input id="cPlanting" type="date" value="${d.planting}"></div>
      </div>
    </div>
    <div class="calc-section">
      <div class="calc-section-title"><h3>${esc(tr('Cultura'))}</h3><span>${esc(trf('Kc FAO-56 · {0} dias de ciclo', crop.ciclo))}</span></div>
      <div class="search"><svg><use href="#i-search"/></svg><input id="cropSearch" placeholder="${esc(tr('Buscar cultura...'))}" value="${esc(wizard.cropQ)}" autocomplete="off"></div>
      <div class="crop-grid mt14" id="cropGrid">${cropCardsHtml()}</div>
    </div>
    <div class="calc-section">
      <div class="calc-section-title"><h3>${esc(tr('Fase da cultura'))}</h3><span>${esc(tr('ajusta o Kc e a necessidade hídrica'))}</span></div>
      <div class="seg-row" id="phaseSeg">${['ini', 'cresc', 'prod', 'final'].map((p) => `<button data-phase="${p}" class="${d.phase === p ? 'active' : ''}">${phaseName(p)}</button>`).join('')}</div>
    </div>
    <div class="notice"><svg><use href="#i-info"/></svg><span>${esc(tr('Dica: para hortaliças e frutíferas, o gotejamento costuma ter o melhor custo-benefício. Para grãos, a aspersão costuma ser mais viável.'))}</span></div>`;
}

function cropCardsHtml() {
  const d = wizard.draft;
  const q = norm(wizard.cropQ);
  const list = CROPS.filter((c) => !q || norm(c.nome).includes(q) || norm(c.nomePt).includes(q) || norm(c.id).includes(q));
  if (!list.length) return `<div class="empty" style="grid-column:1/-1"><h3>${esc(tr('Nenhuma cultura encontrada'))}</h3><p>${esc(tr('Tente outro nome.'))}</p></div>`;
  return list.map((c) => `<button class="crop-card ${d.crop === c.id ? 'sel' : ''}" data-crop="${c.id}">
    <div class="nm">${esc(c.nome)}</div>
    <div class="meta">${esc(trf('{0} dias · raiz {1} m', c.ciclo, fmt(c.raiz, 2)))}</div>
    <div class="kc">${esc(trf('Kc {0}', fmt(kcFor(c, d.phase), 2)))}</div>
  </button>`).join('');
}

function renderStep2() {
  const d = wizard.draft;
  const preview = computeDraft();
  const sensorMode = d.mode === 'sensor';
  $('#step2').innerHTML = `
    <h2>${esc(tr('Quanta água existe no solo?'))}</h2>
    <p class="sub">${esc(tr('Use a leitura dos sensores ou estime pelo clima. A lâmina é calculada sobre a zona radicular.'))}</p>
    <div class="seg-row" id="modeSeg">
      <button data-mode="sensor" class="${sensorMode ? 'active' : ''}">${esc(tr('Sensor no solo'))}</button>
      <button data-mode="climate" class="${!sensorMode ? 'active' : ''}">${esc(tr('Estimativa pelo clima'))}</button>
    </div>
    <div class="calc-section">
      ${sensorMode ? sensorPanelHtml(preview) : climatePanelHtml()}
      <div class="water-preview" id="waterPreview">${waterPreviewHtml(preview)}</div>
    </div>
    <div class="calc-section">
      <div class="calc-section-title"><h3>${esc(tr('Sistema que você usa hoje'))}</h3><span>${esc(tr('usado na comparação de economia'))}</span></div>
      <div class="sys-grid" id="sysGrid">${systemCardsHtml()}</div>
    </div>
    <div class="notice"><svg><use href="#i-info"/></svg><span>${esc(tr('A recomendação final compara os 4 sistemas por eficiência, investimento, custo anual e adequação à cultura.'))}</span></div>`;
}

function sensorPanelHtml(preview) {
  const d = wizard.draft;
  const s = d.sensors || {};
  const row = (key, label, sub) => `<div class="slider-row">
    <label>${label}<small>${esc(tr(sub))}</small></label>
    <input type="range" min="5" max="45" step="0.5" value="${Number(s[key] || 20)}" data-sensor="${key}">
    <output id="out-${key}">${fmt(s[key] || 20, 1)}%</output>
  </div>`;
  return `<div class="sensor-panel">
    <div class="sp-head"><b>${esc(tr('Leituras de umidade'))}</b><span>${esc(tr('% de água no solo por profundidade'))}</span></div>
    ${row('d20', '20 cm', 'superficial')}
    ${row('d40', '40 cm', 'zona radicular')}
    ${row('d60', '60 cm', 'profunda')}
    <button class="btn btn-secondary btn-sm" id="simulateSensors"><svg><use href="#i-refresh"/></svg>${esc(tr('Recalcular leitura'))}</button>
    <div class="sensor-hint"><svg><use href="#i-info"/></svg>${esc(tr('Média ponderada: 45% em 20 cm, 35% em 40 cm e 20% em 60 cm.'))}</div>
  </div>`;
}

function climatePanelHtml() {
  const d = wizard.draft;
  return `<div class="sensor-panel">
    <div class="sp-head"><b>${esc(tr('Estimativa pelo clima'))}</b><span>${esc(tr('sem sensor instalado'))}</span></div>
    <div class="form-grid">
      <div class="field"><label>${esc(tr('ETo de hoje (mm/dia)'))}</label><input id="cEto" type="number" min="0.1" step="0.1" value="${fmt(d.eto, 2)}"></div>
      <div class="field"><label>${esc(tr('Chuva prevista (mm)'))}</label><input id="cRain" type="number" min="0" step="0.1" value="${d.rain}"></div>
      <div class="field"><label>${esc(tr('Dias desde a última irrigação'))}</label><input id="cDays" type="number" min="0" step="1" value="${d.daysSince}"></div>
    </div>
    <div class="sensor-hint"><svg><use href="#i-info"/></svg>${esc(tr('Usamos ETo × Kc para estimar o consumo diário da cultura.'))}</div>
  </div>`;
}

function waterPreviewHtml(p) {
  const cls = p.st.key;
  return `<div class="wp"><div class="k">${esc(tr('Umidade média'))}</div><div class="v">${fmt(p.avg, 1)}<small>%</small></div><div class="s">${esc(p.soil.nome.toLowerCase())}</div></div>
    <div class="wp"><div class="k">${esc(tr('Déficit de água'))}</div><div class="v">${fmt(p.deficit, 1)}<small> mm</small></div><div class="s">${esc(trf('de {0} mm na zona radicular', fmt(p.taw, 1)))}</div></div>
    <div class="wp"><div class="k">${esc(tr('Lâmina líquida'))}</div><div class="v">${fmt(p.need, 1)}<small> mm</small></div><div class="s">${esc(p.need > 0 ? tr('reposição recomendada') : tr('sem necessidade hoje'))}</div></div>
    <div class="wp"><div class="k">${esc(tr('Status'))}</div><div class="v" style="color:${cls === 'bad' ? 'var(--red)' : cls === 'warn' ? 'var(--amber)' : 'var(--brand-700)'}">${p.st.label}</div><div class="s">${p.st.rec}</div></div>`;
}

function systemCardsHtml() {
  const d = wizard.draft;
  return SYSTEM_IDS.map((id) => {
    const s = SYSTEMS[id];
    return `<button class="sys-card ${d.system === id ? 'sel' : ''}" data-system="${id}">
      <div class="nm">${esc(s.nome)}</div>
      <div class="eff">${esc(trf('{0}% de eficiência', Math.round(s.eff * 100)))}</div>
      <div class="d">${esc(s.desc)}</div>
    </button>`;
  }).join('');
}

function renderStep3() {
  const r = computeDraft();
  const d = wizard.draft;
  const best = r.best;
  const current = r.current;
  const reason = recommendationReason(r.crop, best, r.rows);
  const savingText = current.id === best.id
    ? tr('Você já usa o sistema com melhor custo-benefício para esta cultura.')
    : trf('Trocar {0} por {1} pode economizar {2} m³ de água e R$ {3} por ano.', current.nome, best.nome, fmt0(r.waterSavedYear), fmt0(r.costSavedYear));

  const schedule = scheduleForDraft(r);

  $('#step3').innerHTML = `
    <h2>${esc(trf('Recomendação para {0}', d.name || tr('sua área')))}</h2>
    <p class="sub">${esc(trf('{0} · {1} ha · {2} · {3} · {4}', r.crop.nome, fmt(d.area, 2), r.soil.nome, r.city.nome, phaseName(d.phase)))}</p>

    <div class="result-top">
      <div class="result-hero">
        <div class="k">${esc(tr('Sistema com melhor custo-benefício'))}</div>
        <div class="v">${esc(best.nome)} <small>${best.score}/100</small></div>
        <div class="n">${esc(reason)}</div>
        <div class="result-mini">
          <div class="m"><div class="k">${esc(tr('Investimento'))}</div><div class="v">R$ ${fmt0(best.capex)}</div></div>
          <div class="m"><div class="k">${esc(tr('Custo anual'))}</div><div class="v">R$ ${fmt0(best.annualCost)}</div></div>
          <div class="m"><div class="k">${esc(tr('TCO 10 anos'))}</div><div class="v">R$ ${fmt0(best.tco10)}</div></div>
          <div class="m"><div class="k">${esc(tr('Custo por m³'))}</div><div class="v">R$ ${fmt(best.costPerM3, 2)}</div></div>
        </div>
      </div>
      <div class="result-now">
        <div class="k">${esc(tr('Necessidade de hoje'))}</div>
        <div class="v">${fmt(r.need, 1)} <small>mm</small></div>
        <div class="n">${r.st.rec} · ${esc(d.name || tr('área sem nome'))}</div>
        <div class="now-grid">
          <div><div class="k2">${esc(tr('Volume'))}</div><div class="v2">${fmt(r.volume, 1)} m³</div></div>
          <div><div class="k2">${esc(tr('Custo'))}</div><div class="v2 money-now">R$ ${fmt(r.cost, 2)}</div></div>
          <div><div class="k2">${esc(tr('Tempo de bomba'))}</div><div class="v2">${formatHours(r.hours)}</div></div>
          <div><div class="k2">${esc(tr('Próxima checagem'))}</div><div class="v2">${r.daysToNext ? esc(LANG === 'zh' ? dayCount(r.daysToNext) + '后' : 'em ' + dayCount(r.daysToNext)) : esc(tr('hoje'))}</div></div>
        </div>
      </div>
    </div>

    <div class="result-reason"><svg><use href="#i-leaf"/></svg><div><strong>${esc(tr('Por que recomendamos:'))}</strong> ${esc(reason)} ${r.need > 0 ? esc(trf('A lâmina bruta de hoje é {0} mm com eficiência de {1}% do sistema atual.', fmt(r.gross, 1), Math.round(r.sys.eff * 100))) : esc(tr('Hoje não há lâmina necessária; a recomendação vale para a próxima janela de irrigação.'))}</div></div>

    <div class="calc-section">
      <div class="calc-section-title"><h3>${esc(tr('Comparativo de custo-benefício'))}</h3><span>${esc(trf('{0} ha · horizonte de 10 anos', fmt(d.area, 2)))}</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${esc(tr('Sistema'))}</th><th class="t-right">${esc(tr('Eficiência'))}</th><th class="t-right">${esc(tr('Investimento'))}</th><th class="t-right">${esc(tr('Água/ano'))}</th><th class="t-right">${esc(tr('Custo/ano'))}</th><th class="t-right">${esc(tr('TCO 10 anos'))}</th><th class="t-right">R$/m³</th><th class="t-right">${esc(tr('Score'))}</th></tr></thead>
          <tbody>${r.rows.map((row) => `<tr class="${row.id === best.id ? 'best-row' : ''} ${row.id === d.system ? 'current-row' : ''}">
            <td><strong>${esc(row.nome)}</strong>${row.id === best.id ? `<span class="best-badge">${esc(tr('melhor'))}</span>` : ''}${row.id === d.system ? `<span class="badge blue" style="margin-left:5px">${esc(tr('atual'))}</span>` : ''}</td>
            <td class="t-right">${Math.round(row.eff * 100)}%</td>
            <td class="t-right">R$ ${fmt0(row.capex)}</td>
            <td class="t-right">${fmt0(row.volume)} m³</td>
            <td class="t-right">R$ ${fmt0(row.annualCost)}</td>
            <td class="t-right">R$ ${fmt0(row.tco10)}</td>
            <td class="t-right">${fmt(row.costPerM3, 2)}</td>
            <td class="t-right"><span class="score-pill ${row.id === best.id ? 'top' : ''}">${row.score}</span></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="src">${esc(tr('Projeção anual com a área irrigada ao longo do ano. Para culturas de ciclo curto, o custo por ciclo é proporcional aos dias do ciclo. Valores de investimento e eficiência são referências típicas de literatura.'))}</p>
    </div>

    <div class="grid g2 mt14">
      <div class="card">
        <div class="card-head"><div><h2>${esc(tr('Economia estimada'))}</h2><p>${current.id === best.id ? esc(tr('Você já está no melhor cenário')) : esc(tr('Comparado ao sistema atual'))}</p></div><span class="badge ${current.id === best.id ? 'green' : 'amber'}">${current.id === best.id ? esc(tr('Ótimo')) : esc(tr('Oportunidade'))}</span></div>
        <div class="card-body">
          <div class="water-preview" style="grid-template-columns:1fr 1fr;margin-top:0">
            <div class="wp"><div class="k">${esc(tr('Água por ano'))}</div><div class="v">${fmt0(r.waterSavedYear)}<small> m³</small></div><div class="s">${current.id === best.id ? esc(tr('já otimizado')) : esc(tr('menos que o sistema atual'))}</div></div>
            <div class="wp"><div class="k">${esc(tr('Custo por ano'))}</div><div class="v">R$ ${fmt0(r.costSavedYear)}</div><div class="s">${current.id === best.id ? esc(tr('custo já enxuto')) : esc(tr('de economia operacional'))}</div></div>
          </div>
          <p class="small muted" style="margin-top:10px">${esc(savingText)}</p>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><div><h2>${esc(tr('Agenda de 7 dias'))}</h2><p>${esc(tr('Projeção com a previsão do tempo'))}</p></div><span class="badge blue">${esc(r.city.nome)}</span></div>
        <div class="card-body"><div class="schedule">${schedule}</div></div>
      </div>
    </div>

    <div class="result-actions">
      <button class="btn btn-primary" data-action="saveCalc"><svg><use href="#i-check"/></svg>${esc(tr('Salvar no painel'))}</button>
      <button class="btn btn-secondary" data-action="printCalc"><svg><use href="#i-print"/></svg>${esc(tr('Imprimir / PDF'))}</button>
      <button class="btn btn-ghost" data-action="editCalc"><svg><use href="#i-arrow-left"/></svg>${esc(tr('Editar dados'))}</button>
    </div>`;
}

function scheduleForDraft(r) {
  const days = forecastFor(wizard.draft.city);
  const kc = kcFor(r.crop, wizard.draft.phase);
  let dep = r.depletion;
  return days.map((day, i) => {
    if (i > 0) dep = clamp(dep + (day.eto * kc - Math.max(0, day.rain) * 0.8) / Math.max(0.01, r.taw), 0, 1);
    const st = statusFor(dep);
    const need = st.irrigate ? dep * r.taw * 0.95 : 0;
    const isRain = day.rain >= 5;
    const label = isRain ? tr('Chuva') : need > 0 ? st.rec : tr('Aguardar');
    return `<div class="sch-day ${i === 0 ? 'now' : ''} ${isRain ? 'rain' : need > 0 ? 'dry' : ''}">
      <div class="d">${i === 0 ? esc(tr('Hoje')) : dateShort(day.date)}</div>
      <div class="i">${iconFor(day.rain, day.prob)}</div>
      <div class="r">${label}</div>
      <div class="m">${need > 0 ? fmt(need, 1) + ' mm' : isRain ? esc(trf('{0} mm chuva', fmt(day.rain, 1))) : esc(tr('sem lâmina'))}</div>
    </div>`;
  }).join('');
}

function renderWizardSummary() {
  const d = wizard.draft;
  const city = cityOf(d.city);
  const crop = CROP_BY_ID.get(d.crop) || CROPS[0];
  const sys = SYSTEMS[d.system] || SYSTEMS.gotejamento;
  const r = computeDraft();
  const step = wizard.step;
  const footExtra = step >= 2
    ? trf('Custo-benefício em 10 anos: R$ {0}.', fmt0(r.best.tco10))
    : tr('Ajuste os dados para ver a recomendação.');
  $('#wizSummary').innerHTML = `
    <div class="summary-head">
      <div class="k">${esc(tr('Resumo do cálculo'))}</div>
      <div class="v">${esc(d.name || tr('Nova área'))} · ${esc(city.nome)}</div>
    </div>
    <div class="summary-body">
      <div class="sum-row"><span class="k">${esc(tr('Cultura'))}</span><span class="v">${esc(crop.nome)} <small>${phaseName(d.phase)}</small></span></div>
      <div class="sum-row"><span class="k">${esc(tr('Área'))}</span><span class="v">${fmt(d.area, 2)} ha</span></div>
      <div class="sum-row"><span class="k">${esc(tr('Solo'))}</span><span class="v">${esc(r.soil.nome)}</span></div>
      <div class="sum-row"><span class="k">${esc(tr('Sistema atual'))}</span><span class="v">${esc(sys.nome)}</span></div>
      <div class="sum-row"><span class="k">${esc(tr('Umidade'))}</span><span class="v">${fmt(r.avg, 1)}% <small>${r.st.label}</small></span></div>
      <div class="sum-row"><span class="k">${esc(tr('Lâmina líquida'))}</span><span class="v">${fmt(r.need, 1)} mm</span></div>
      <div class="sum-row"><span class="k">${esc(tr('Volume'))}</span><span class="v">${fmt(r.volume, 1)} m³</span></div>
      <div class="sum-row"><span class="k">${esc(tr('Custo de hoje'))}</span><span class="v">R$ ${fmt(r.cost, 2)}</span></div>
      ${step >= 2 ? `<div class="sum-row"><span class="k">${esc(tr('Recomendado'))}</span><span class="v">${esc(r.best.nome)} <small>${r.best.score}/100</small></span></div>` : ''}
    </div>
    <div class="summary-foot">${esc(trf('ETo {0} mm/dia · Kc {1} · {2}. {3}', fmt(r.eto, 2), fmt(r.kc, 2), r.st.rec, footExtra))}</div>`;
}

/* ---------- Render: base de dados ---------- */
function renderData() {
  const D = BASE;
  const versionEl = $('#dataVersion');
  if (versionEl) versionEl.textContent = trf('Versão {0} · atualizado em {1}', D.versao, D.atualizado);

  const indBox = $('#dataIndicators');
  if (indBox) {
    indBox.innerHTML = D.indicadores.map((i) => {
      const label = LANG === 'zh' ? (i.labelZh || i.labelPt) : i.labelPt;
      const val = i.sufixo ? fmt(i.valor, 1) + i.sufixo : fmt0(i.valor);
      return `<div class="card data-indicator">
        <div class="label">${esc(label)}</div>
        <div class="value">${val}</div>
        <div class="source">${esc(tr('Fonte'))}: <a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.fonte)}</a></div>
      </div>`;
    }).join('');
  }

  const srcBox = $('#dataSources');
  if (srcBox) {
    srcBox.innerHTML = D.fontes.map((f) => {
      const tipo = LANG === 'zh' ? (f.tipoZh || f.tipoPt) : f.tipoPt;
      const desc = LANG === 'zh' ? (f.descZh || f.descPt) : f.descPt;
      return `<div class="source-card">
        <div class="top"><span class="nm">${esc(f.nome)}</span><span class="tag">${esc(tipo)}</span></div>
        <div class="desc">${esc(desc)}</div>
        <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(tr('Abrir fonte oficial'))} ↗</a>
      </div>`;
    }).join('');
  }

  const crops = $('#dataCrops');
  if (crops) {
    crops.innerHTML = `<div class="table-wrap data-table-wrap"><table class="data-table">
      <thead><tr><th>${esc(tr('Cultura'))}</th><th class="t-right">${esc(tr('Ciclo'))}</th><th class="t-right">Kc ini</th><th class="t-right">Kc prod</th><th class="t-right">Kc final</th><th class="t-right">${esc(tr('Raiz'))}</th></tr></thead>
      <tbody>${CROPS.map((c) => `<tr><td>${esc(c.nome)}</td><td class="t-right">${c.ciclo} ${esc(tr('dias'))}</td><td class="t-right">${fmt(c.kc[0], 2)}</td><td class="t-right">${fmt(c.kc[1], 2)}</td><td class="t-right">${fmt(c.kc[2], 2)}</td><td class="t-right">${fmt(c.raiz, 2)} m</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="data-foot">${esc(tr('Fonte: FAO-56 / Embrapa Meio-Norte.'))}</p>`;
  }

  const soils = $('#dataSoils');
  if (soils) {
    soils.innerHTML = `<div class="table-wrap data-table-wrap"><table class="data-table">
      <thead><tr><th>${esc(tr('Classe de solo'))}</th><th class="t-right">CC (%)</th><th class="t-right">PMP (%)</th><th class="t-right">CAD (mm/m)</th></tr></thead>
      <tbody>${Object.values(SOILS).map((s) => `<tr><td>${esc(s.nome)}</td><td class="t-right">${fmt(s.fc, 1)}</td><td class="t-right">${fmt(s.pwp, 1)}</td><td class="t-right">${fmt((s.fc - s.pwp) * 10, 0)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="data-foot">${esc(tr('Fonte: Embrapa Solos / SiBCS. Valores típicos por classe textural; calibre com análise de solo.'))}</p>`;
  }

  const systems = $('#dataSystems');
  if (systems) {
    systems.innerHTML = `<div class="table-wrap data-table-wrap"><table class="data-table">
      <thead><tr><th>${esc(tr('Sistema'))}</th><th class="t-right">${esc(tr('Eficiência'))}</th><th class="t-right">${esc(tr('Investimento'))}</th><th class="t-right">${esc(tr('Vida útil'))}</th></tr></thead>
      <tbody>${SYSTEM_IDS.map((id) => { const s = SYSTEMS[id]; return `<tr><td>${esc(s.nome)}<span class="mini">${esc(s.desc)}</span></td><td class="t-right">${Math.round(s.eff * 100)}%</td><td class="t-right">R$ ${fmt0(s.capex)}/ha</td><td class="t-right">${s.life} ${esc(tr('anos'))}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <p class="data-foot">${esc(tr('Fonte: Embrapa / ANA — valores típicos de literatura para projeto e comparação.'))}</p>`;
  }

  const muni = $('#dataMunicipal');
  if (muni) {
    const rains = CITIES.map((c) => Number(c.chuvaAnual) || 0);
    const etos = CITIES.map((c) => Number(c.etoAnual) || 0);
    const deficits = CITIES.map((c) => Number(c.deficit) || 0);
    const dry = CITIES.map((c) => Number(c.mesesSecos) || 0);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    const min = (arr) => Math.min(...arr);
    const max = (arr) => Math.max(...arr);
    const card = (label, value, sub) => `<div class="data-muni"><div class="k">${esc(label)}</div><div class="v">${value}</div><div class="s">${esc(sub)}</div></div>`;
    muni.innerHTML = `<div class="data-municipal">
      ${card(tr('Municípios cobertos'), fmt0(CITIES.length), tr('Todos os municípios do Piauí'))}
      ${card(tr('Chuva anual média'), fmt0(avg(rains)) + ' mm', trf('{0}–{1} mm', fmt0(min(rains)), fmt0(max(rains))))}
      ${card(tr('ETo anual média'), fmt0(avg(etos)) + ' mm', trf('{0}–{1} mm', fmt0(min(etos)), fmt0(max(etos))))}
      ${card(tr('Déficit médio'), fmt0(avg(deficits)) + ' mm', trf('{0}–{1} mm', fmt0(min(deficits)), fmt0(max(deficits))))}
      ${card(tr('Meses secos'), fmt(avg(dry), 1), trf('{0}–{1} meses', fmt0(min(dry)), fmt0(max(dry))))}
    </div>
    <p class="data-foot">${esc(tr('Fonte: NASA POWER / MERRA-2 (2001–2025) e IBGE (2023).'))}</p>`;
  }

  const method = $('#dataMethod');
  if (method) {
    method.innerHTML = `<div class="method-grid">${D.metodo.map((m) => `<div class="method-item"><h4>${esc(LANG === 'zh' ? (m.tituloZh || m.tituloPt) : m.tituloPt)}</h4><p>${esc(LANG === 'zh' ? (m.textoZh || m.textoPt) : m.textoPt)}</p></div>`).join('')}</div>
      <div class="divider"></div>
      <ul class="list-clean">${D.notas.map((n) => `<li><svg><use href="#i-info"/></svg><span>${esc(LANG === 'zh' ? (n.zh || n.pt) : n.pt)}</span></li>`).join('')}</ul>`;
  }

  const foot = $('#dataFoot');
  if (foot) foot.textContent = trf('Base {0} · atualizada em {1} · uso educacional e demonstração. Consulte sempre a fonte oficial antes de decisões de investimento.', D.versao, D.atualizado);
}

function csvCell(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

function renderAdmin() {
  if (authSession?.role !== 'admin') return;
  const accounts = [DEMO_ACCOUNTS.find((item) => item.username === 'agricultor'), ...registeredFarmers()]
    .filter((item, index, all) => item && all.findIndex((candidate) => candidate.username === item.username) === index)
    .sort((a, b) => String(a.farmName || a.name).localeCompare(String(b.farmName || b.name), 'pt-BR'));
  const farms = accounts.map((account) => {
    const farmState = loadState(account.username);
    const city = cityOf(account.cityId || farmState.activeCity);
    const totalHa = farmState.areas.reduce((sum, area) => sum + Number(area.area || 0), 0);
    return { account, state: farmState, city, totalHa };
  });
  const plantings = farms.reduce((sum, farm) => sum + farm.state.areas.length, 0);
  const totalHa = farms.reduce((sum, farm) => sum + farm.totalHa, 0);
  $('#adminFarmKpis').innerHTML = [
    kpi(tr('Fazendas cadastradas'), fmt0(farms.length), tr('Perfis de agricultores'), 'user'),
    kpi(tr('Plantações monitoradas'), fmt0(plantings), tr('Em todas as fazendas'), 'leaf'),
    kpi(tr('Área acompanhada'), fmt(totalHa, 2) + ' ha', tr('Soma dos hectares cadastrados'), 'layers'),
  ].join('');
  $('#adminFarmList').innerHTML = farms.length ? farms.map(({ account, state: farmState, city, totalHa: hectares }) => {
    const location = [account.community, city.nome].filter(Boolean).join(' · ');
    const cropRows = farmState.areas.map((area) => {
      const crop = CROP_BY_ID.get(area.crop);
      return `<div class="admin-plant-row"><span class="admin-plant-name">${esc(area.name)}</span><span class="admin-plant-crop">${esc(crop?.nome || area.crop)} · ${esc(cityOf(area.city).nome)}</span><strong>${fmt(area.area, 2)} ha</strong></div>`;
    }).join('');
    return `<article class="card admin-farm-card">
      <div class="admin-farm-head"><div class="admin-farm-avatar">${esc(String(account.name || '?').trim().charAt(0).toUpperCase())}</div><div class="admin-farm-identity"><span class="eyebrow">${esc(account.name || tr('Agricultor'))}</span><h2>${esc(account.farmName || tr('Fazenda sem nome'))}</h2><p>${esc(location)}${account.community ? ` · ${esc(tr('povoado'))}` : ''}</p></div><div class="admin-farm-count"><strong>${fmt0(farmState.areas.length)}</strong><span>${esc(tr('plantações'))}</span></div></div>
      <div class="admin-farm-summary"><span>${esc(tr('Área total'))}<strong>${fmt(hectares, 2)} ha</strong></span><span>${esc(tr('Usuário'))}<strong>${esc(account.username)}</strong></span><span>${esc(tr('Cadastro'))}<strong>${esc(account.createdAt ? new Date(account.createdAt).toLocaleDateString(LOCALE) : tr('Conta de demonstração'))}</strong></span></div>
      <div class="admin-plant-list">${cropRows || `<div class="admin-plant-empty">${esc(tr('Nenhuma plantação cadastrada.'))}</div>`}</div>
    </article>`;
  }).join('') : `<div class="empty"><p>${esc(tr('Nenhuma fazenda cadastrada ainda.'))}</p></div>`;
}

function downloadCSV(filename, rows) {
  const csv = '\ufeff' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
function exportDataCSV() {
  const rows = [
    [tr('Indicador'), tr('Valor'), tr('Fonte'), tr('Ano')],
    ...BASE.indicadores.map((i) => [LANG === 'zh' ? (i.labelZh || i.labelPt) : i.labelPt, i.valor + (i.sufixo || ''), i.fonte, i.ano]),
    [],
    [tr('Cultura'), tr('Ciclo'), 'Kc ini', 'Kc prod', 'Kc final', tr('Raiz') + ' (m)'],
    ...CROPS.map((c) => [c.nome, c.ciclo, c.kc[0], c.kc[1], c.kc[2], c.raiz]),
    [],
    [tr('Classe de solo'), 'CC (%)', 'PMP (%)', 'CAD (mm/m)'],
    ...Object.values(SOILS).map((s) => [s.nome, s.fc, s.pwp, (s.fc - s.pwp) * 10]),
    [],
    [tr('Sistema'), tr('Eficiência') + ' (%)', tr('Investimento') + ' (R$/ha)', tr('Vida útil') + ' (anos)'],
    ...SYSTEM_IDS.map((id) => [SYSTEMS[id].nome, Math.round(SYSTEMS[id].eff * 100), SYSTEMS[id].capex, SYSTEMS[id].life]),
  ];
  downloadCSV('agroagua_base_dados_' + BASE.versao.replace(/\W+/g, '_') + '.csv', rows);
  toast(tr('Base de dados exportada em CSV.'));
}


function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');
  m.setAttribute('aria-hidden', 'false');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  m.setAttribute('aria-hidden', 'true');
}
function renderCityList() {
  const q = norm($('#citySearch')?.value || '');
  const list = CITIES_ALPHA.filter((c) => !q || norm(c.nome).includes(q)).sort((a, b) => {
    const ae = q && norm(a.nome) === q ? 0 : 1;
    const be = q && norm(b.nome) === q ? 0 : 1;
    return ae - be || a.nome.localeCompare(b.nome, 'pt-BR');
  });
  const box = $('#cityList');
  if (!box) return;
  box.innerHTML = list.length ? list.map((c) => `<button class="city-row ${Number(state.activeCity) === Number(c.id) ? 'sel' : ''}" data-city="${c.id}">
    <div class="info"><div class="nm">${esc(c.nome)}</div><div class="meta">${esc(trf('{0} hab · {1} mm/ano · {2} meses secos', fmt0(c.pop), fmt0(c.chuvaAnual), fmt0(c.mesesSecos)))}</div></div>
    <div class="vals"><b>${esc(trf('ETo {0}', fmt(c.eto[nowMonth()], 1)))}</b>${esc(tr('mm/dia'))}</div>
  </button>`).join('') : `<div class="empty"><h3>${esc(tr('Município não encontrado'))}</h3><p>${esc(tr('Tente outro nome.'))}</p></div>`;
  const count = $('#cityCount');
  if (count) count.textContent = trf('{0} de {1} municípios', list.length, CITIES.length);
}
function renderPlanModal() {
  const body = $('#planBody');
  if (!body) return;
  const plans = Object.values(PLANS);
  body.innerHTML = `<div class="plan-grid two">${plans.map((p) => {
    const current = state.plan === p.id;
    const priceText = p.price === 0 ? 'R$ 0' : trf('R$ {0}', fmt(p.price, 2)) + `<small>${esc(tr('/mês'))}</small>`;
    const tag = current ? tr('Atual') : p.id === 'pro' ? tr('Recomendado') : tr('Grátis');
    const buttonText = current ? tr('Plano atual') : p.id === 'gratuito' ? tr('Começar grátis') : tr('Testar 14 dias grátis');
    return `<div class="plan-option ${current ? 'current' : ''} ${p.id === 'pro' ? 'featured' : ''}">
      <span class="tag">${esc(tag)}</span>
      <h3>${esc(p.nome)}</h3>
      <div class="price">${priceText}</div>
      <div class="desc">${esc(p.desc)}</div>
      <ul>${p.features.map((f) => `<li><svg><use href="#i-check"/></svg>${esc(f)}</li>`).join('')}${(p.limits || []).map((l) => `<li class="limit"><svg><use href="#i-x"/></svg>${esc(l)}</li>`).join('')}</ul>
      <button class="btn ${current ? 'btn-secondary' : p.id === 'pro' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-plan="${p.id}">${esc(buttonText)}</button>
    </div>`;
  }).join('')}</div>
  <p class="plan-note">${esc(tr('Programa de incentivo do Governo do Piauí para os planos Gratuito e Pro. Condições sujeitas à adesão do Estado.'))}</p>`;
}

/* ---------- Ações ---------- */
const ROUTES = ['overview', 'calculator', 'automation', 'data', 'admin'];
const routeTitle = (r) => ({ overview: tr('Visão geral'), calculator: tr('Calculadora'), automation: tr('Automação ESP32'), data: tr('Base de dados'), admin: tr('Agricultores e fazendas') })[r];
const routeEyebrow = (r) => ({ overview: tr('Operação'), calculator: tr('Recomendador'), automation: tr('Operação'), data: tr('Análise'), admin: tr('Administração') })[r];

/* ---------- Automação ESP32 (iframe automacao-esp32.html) ---------- */
function renderAutomation() {
  const frame = $('#espFrame');
  if (frame && !frame.getAttribute('src')) {
    const src = new URL(frame.dataset.src, location.href);
    src.searchParams.set('lang', LANG);
    frame.setAttribute('src', src.href);
  }
  const fullScreenLink = $('#view-automation .page-actions a[href^="automacao-esp32.html"]');
  if (fullScreenLink) {
    const fullScreenUrl = new URL('automacao-esp32.html', location.href);
    fullScreenUrl.searchParams.set('lang', LANG);
    fullScreenLink.href = fullScreenUrl.href;
  }
  if (frame && frame.contentWindow) {
    try { frame.contentWindow.postMessage({ type: 'esp32-language', lang: LANG }, '*'); } catch (e) { /* noop */ }
  }
  
  // Sincroniza dados da área selecionada com a simulação
  const area = state.areas.find(a => a.id === state.selectedAreaId) || state.areas[0];
  if (area && frame && frame.contentWindow) {
    const stats = analyzeArea(area);
    try {
      frame.contentWindow.postMessage({
        type: 'esp32-sync',
        lang: LANG,
        moisture: [stats.sensors.d20, stats.sensors.d40, stats.sensors.d60],
        crop: stats.crop.nome
      }, '*');
    } catch (e) {}
  }
}
function setAutomationVisible(visible) {
  const frame = $('#espFrame');
  if (frame && frame.contentWindow) {
    try { frame.contentWindow.postMessage({ type: 'esp32-visibility', visible }, '*'); } catch (e) { /* noop */ }
  }
}
window.addEventListener('message', (e) => {
  const d = e.data;
  if (!d || typeof d !== 'object') return;
  const frame = $('#espFrame');
  if (d.type === 'esp32-height' && frame && e.source === frame.contentWindow) {
    frame.style.height = Math.max(400, Number(d.height) || 0) + 'px';
  } else if (d.type === 'esp32-status' && frame && e.source === frame.contentWindow) {
    const pump = $('#espPump'), tank = $('#espTank'), sec = $('#espSectors');
    if (pump) { pump.textContent = d.pump ? tr('Ligada') : tr('Desligada'); pump.style.color = d.pump ? 'var(--brand)' : 'var(--muted)'; }
    if (tank) { tank.textContent = d.tank + '%' + (d.tankLock ? ' · ' + tr('bloqueado') : ''); tank.style.color = d.tankLock ? 'var(--red)' : ''; }
    if (sec && Array.isArray(d.sectors)) {
      sec.innerHTML = d.sectors.map((s) => `<div>${s.open ? '💧' : s.waiting ? '⏳' : '✔'} ${esc(tr(s.name))}: ${s.moisture}%</div>`).join('');
    }
  }
});

function navigate(route) {
  if (!authSession) return;
  if (!ROUTES.includes(route)) route = 'overview';
  if (route === 'admin' && authSession.role !== 'admin') route = 'overview';
  activeRoute = route;
  $$('.view').forEach((v) => v.classList.remove('active'));
  const view = $('#view-' + route);
  if (view) view.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  $('#pageTitle').textContent = routeTitle(route);
  $('#pageEyebrow').textContent = routeEyebrow(route);
  try { history.replaceState(null, '', '#' + route); } catch (e) { /* file:// */ }
  closeSidebar();
  setAutomationVisible(route === 'automation');
  if (route === 'overview') renderOverview();
  else if (route === 'calculator') renderWizard();
  else if (route === 'automation') renderAutomation();
  else if (route === 'data') renderData();
  else if (route === 'admin') renderAdmin();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadAreaIntoWizard(id) {
  const area = state.areas.find((a) => Number(a.id) === Number(id));
  if (!area) return;
  const city = cityOf(area.city);
  const crop = CROP_BY_ID.get(area.crop) || CROPS[0];
  const days = Math.max(0, daysBetween(area.lastIrrigation, todayISO()));
  const sr = sensorReading(area, city.eto[nowMonth()] * kcFor(crop, area.phase || 'prod'));
  const w = todayWeather(area.city);
  wizard = {
    step: 3,
    editId: area.id,
    cropQ: '',
    draft: {
      city: area.city,
      name: area.name,
      area: Number(area.area),
      crop: area.crop,
      phase: area.phase || 'prod',
      soil: area.soil,
      flow: Number(area.flow || 6),
      planting: area.planting || todayISO(),
      mode: 'sensor',
      sensors: { d20: sr.d20, d40: sr.d40, d60: sr.d60 },
      sensorsTouched: true,
      eto: city.eto[nowMonth()],
      rain: w.rain,
      daysSince: days,
      system: area.system,
    },
  };
  navigate('calculator');
}

function registerIrrigation(id) {
  const area = state.areas.find((a) => Number(a.id) === Number(id));
  if (!area) return;
  const p = analyzeArea(area);
  area.lastIrrigation = todayISO();
  state.history.push({
    id: Date.now() + Math.random(),
    areaId: area.id,
    name: area.name,
    date: todayISO(),
    mm: p.need,
    m3: p.volume,
    cost: p.cost,
  });
  if (state.history.length > 500) state.history = state.history.slice(-500);
  state.lastSync = Date.now();
  state.selectedAreaId = area.id;
  save();
  renderOverview();
  toast(p.need > 0 ? trf('Irrigação registrada: {0} mm · {1} m³.', fmt(p.need, 1), fmt(p.volume, 1)) : tr('Leitura atualizada: solo ainda com água disponível.'));
}

function saveCalc() {
  const d = wizard.draft;
  if (!d.name || !String(d.name).trim()) {
    toast(tr('Informe o nome da área para salvar.'), 'error');
    wizard.step = 1;
    renderWizard();
    return;
  }
  if (!(Number(d.area) > 0)) {
    toast(tr('Informe uma área maior que zero.'), 'error');
    wizard.step = 1;
    renderWizard();
    return;
  }
  const plan = PLANS[state.plan] || PLANS.pro;
  if (state.plan === 'gratuito' && !wizard.editId && state.areas.length >= plan.areas) {
    toast(tr('O plano Gratuito permite 1 área. Conheça o Pro.'), 'error');
    renderPlanModal();
    openModal('planModal');
    return;
  }
  if (state.plan === 'gratuito' && Number(d.area) > plan.ha) {
    toast(trf('O plano Gratuito permite até {0} ha por área. Conheça o Pro.', plan.ha), 'error');
    renderPlanModal();
    openModal('planModal');
    return;
  }
  const payload = {
    name: String(d.name).trim(),
    city: Number(d.city),
    crop: d.crop,
    phase: d.phase,
    area: Number(d.area),
    system: d.system,
    soil: d.soil,
    flow: Number(d.flow),
    planting: d.planting,
    lastIrrigation: isoOffset(-Number(d.daysSince || 0)),
  };
  let area;
  if (wizard.editId) {
    area = state.areas.find((a) => Number(a.id) === Number(wizard.editId));
    if (area) Object.assign(area, payload);
  }
  if (!area) {
    area = { id: state.nextId++, sensors: 1, createdAt: new Date().toISOString(), ...payload };
    state.areas.push(area);
  }
  state.activeCity = Number(d.city);
  state.selectedAreaId = area.id;
  state.lastSync = Date.now();
  save();
  wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
  navigate('overview');
  renderShell();
  toast(trf('Área "{0}" salva no painel.', area.name));
}

function selectCity(id) {
  state.activeCity = Number(id);
  state.selectedAreaId = null;
  save();
  closeModal('cityModal');
  renderShell();
  if (activeRoute === 'calculator' && wizard.step === 1) {
    wizard.draft.city = Number(id);
    wizard.draft.eto = cityOf(id).eto[nowMonth()];
    wizard.draft.sensors = null;
    wizard.draft.sensorsTouched = false;
    renderWizard();
  } else {
    renderOverview();
  }
  ensureWeather(id).then(() => { renderShell(); if (activeRoute === 'overview') renderOverview(); });
  toast(trf('{0} definido como município ativo.', cityOf(id).nome));
}

function selectPlan(id) {
  if (!PLANS[id]) return;
  state.plan = id;
  save();
  closeModal('planModal');
  renderShell();
  if (activeRoute === 'overview') renderOverview();
  toast(trf('Plano {0} selecionado.', PLANS[id].nome));
}

function selectCrop(id) {
  if (!CROP_BY_ID.has(id)) return;
  wizard.draft.crop = id;
  wizard.draft.sensors = null;
  wizard.draft.sensorsTouched = false;
  const grid = $('#cropGrid');
  if (grid) grid.innerHTML = cropCardsHtml();
  const crop = CROP_BY_ID.get(id);
  const title = $('#step1 .calc-section-title span');
  if (title) title.textContent = trf('Kc FAO-56 · {0} dias de ciclo', crop.ciclo);
  renderWizardSummary();
}

function selectPhase(phase) {
  wizard.draft.phase = phase;
  $$('#phaseSeg button').forEach((b) => b.classList.toggle('active', b.dataset.phase === phase));
  const grid = $('#cropGrid');
  if (grid) grid.innerHTML = cropCardsHtml();
  renderWizardSummary();
}

function updateWaterPreview() {
  const box = $('#waterPreview');
  if (!box) return;
  const p = computeDraft();
  box.innerHTML = waterPreviewHtml(p);
  renderWizardSummary();
}

function handleAction(action, el) {
  const id = Number(el.dataset.id);
  if (action === 'selectArea') {
    state.selectedAreaId = id;
    save();
    renderOverview();
    setTimeout(() => {
      const card = $('#recHero') ? $('#recHero').closest('.card') : null;
      if (card) {
        card.classList.add('flash');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => card.classList.remove('flash'), 1400);
      }
    }, 40);
  } else if (action === 'calcArea') {
    loadAreaIntoWizard(id);
  } else if (action === 'irrigate') {
    registerIrrigation(id);
  } else if (action === 'saveCalc') {
    saveCalc();
  } else if (action === 'printCalc') {
    window.print();
  } else if (action === 'editCalc') {
    wizard.step = 1;
    renderWizard();
  } else if (action === 'newArea') {
    wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
    navigate('calculator');
  } else if (action === 'openPlans') {
    renderPlanModal();
    openModal('planModal');
  } else if (action === 'refreshSensors') {
    refreshSensors();
  }
}

function refreshSensors() {
  state.lastSync = Date.now();
  save();
  ensureWeather(state.activeCity, true).then(() => {
    renderShell();
    renderOverview();
    toast(tr('Sensores sincronizados. Leituras atualizadas.'));
  });
}

function closeSidebar() {
  const s = $('#sidebar');
  const b = $('#sidebarBackdrop');
  if (s) s.classList.remove('open');
  if (b) b.classList.remove('show');
}

/* ---------- Eventos ---------- */
function bindEvents() {
  $('#authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loginDemo($('#authUser').value, $('#authPass').value);
  });
  $('#registerForm').addEventListener('submit', createFarmerAccount);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#showRegisterBtn')) { showRegistration(true); return; }
    if (e.target.closest('#backToLogin')) { showRegistration(false); setRegisterError(''); return; }
    if (e.target.closest('#addPlanting')) { addPlantingRow(); return; }
    const removePlanting = e.target.closest('[data-remove-planting]');
    if (removePlanting && !removePlanting.disabled) {
      removePlanting.closest('[data-planting-row]').remove();
      Array.from($('#registerPlantings').querySelectorAll('[data-remove-planting]')).forEach((button) => { button.disabled = $('#registerPlantings').children.length <= 1; });
      return;
    }
    const demoAccount = e.target.closest('[data-demo-user]');
    if (demoAccount) { chooseDemoAccount(demoAccount.dataset.demoUser); return; }
    if (e.target.closest('#authReveal')) {
      const password = $('#authPass');
      const visible = password.type === 'password';
      password.type = visible ? 'text' : 'password';
      $('#authReveal').setAttribute('aria-pressed', String(visible));
      $('#authReveal').setAttribute('aria-label', tr(visible ? 'Ocultar senha' : 'Mostrar senha'));
      return;
    }
    if (e.target.closest('#authLangBtn')) { setLang(LANG === 'zh' ? 'pt' : 'zh'); return; }
    if (e.target.closest('#logoutBtn')) { logoutDemo(); return; }

    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) { navigate(routeBtn.dataset.route); return; }

    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) { closeModal(closeBtn.dataset.close); return; }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) { handleAction(actionBtn.dataset.action, actionBtn); return; }

    const stepBtn = e.target.closest('#wizSteps .step');
    if (stepBtn) {
      const n = Number(stepBtn.dataset.step);
      if (n < wizard.step) { wizard.step = n; renderWizard(); }
      return;
    }
    const cropBtn = e.target.closest('[data-crop]');
    if (cropBtn) { selectCrop(cropBtn.dataset.crop); return; }

    const phaseBtn = e.target.closest('[data-phase]');
    if (phaseBtn) { selectPhase(phaseBtn.dataset.phase); return; }

    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) {
      wizard.draft.mode = modeBtn.dataset.mode;
      wizard.draft.sensorsTouched = false;
      renderWizard();
      return;
    }
    const sysBtn = e.target.closest('[data-system]');
    if (sysBtn) {
      wizard.draft.system = sysBtn.dataset.system;
      renderWizard();
      return;
    }
    const cityRow = e.target.closest('[data-city]');
    if (cityRow) { selectCity(Number(cityRow.dataset.city)); return; }

    const planBtn = e.target.closest('[data-plan]');
    if (planBtn) { selectPlan(planBtn.dataset.plan); return; }

    if (e.target.closest('#planBtn')) { renderPlanModal(); openModal('planModal'); return; }
    if (e.target.closest('#userBtn')) { renderPlanModal(); openModal('planModal'); return; }
    if (e.target.closest('#langBtn')) { setLang(LANG === 'zh' ? 'pt' : 'zh'); return; }
    if (e.target.closest('#cityBtn')) { renderCityList(); openModal('cityModal'); return; }
    if (e.target.closest('#menuBtn')) {
      $('#sidebar').classList.add('open');
      $('#sidebarBackdrop').classList.add('show');
      return;
    }
    if (e.target.closest('#sidebarBackdrop')) { closeSidebar(); return; }
    if (e.target.closest('#refreshSensors')) { refreshSensors(); return; }
    if (e.target.closest('#printDashboard')) { window.print(); return; }
    if (e.target.closest('#dataExport')) { exportDataCSV(); return; }
    if (e.target.closest('#calcHelp')) { openModal('helpModal'); return; }
    if (e.target.closest('#resetDemo')) {
      if (authSession?.username !== 'agricultor') return;
      try {
        localStorage.removeItem(stateKey());
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) { /* ignore */ }
      location.reload();
      return;
    }
    if (e.target.closest('#simulateSensors')) {
      wizard.draft.sensors = null;
      wizard.draft.sensorsTouched = false;
      ensureDraftSensors();
      wizard.draft.sensorsTouched = true;
      renderWizard();
      toast(tr('Leitura recalculada a partir do balanço hídrico.'));
      return;
    }
    if (e.target.closest('#wizBack')) {
      if (wizard.step > 1) { wizard.step--; renderWizard(); }
      return;
    }
    if (e.target.closest('#wizNext')) {
      if (wizard.step === 1) {
        if (!wizard.draft.name || !String(wizard.draft.name).trim()) { toast(tr('Dê um nome para a área antes de continuar.'), 'error'); return; }
        if (!(Number(wizard.draft.area) > 0)) { toast(tr('Informe uma área maior que zero.'), 'error'); return; }
      }
      if (wizard.step < 3) { wizard.step++; renderWizard(); }
      return;
    }
    if (e.target.closest('#wizReset')) {
      wizard = { step: 1, draft: newDraft(), cropQ: '', editId: null };
      renderWizard();
      toast(tr('Novo cálculo iniciado.'));
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'cropSearch') {
      wizard.cropQ = t.value;
      const grid = $('#cropGrid');
      if (grid) grid.innerHTML = cropCardsHtml();
      return;
    }
    if (t.id === 'cName') { wizard.draft.name = t.value; renderWizardSummary(); return; }
    if (t.id === 'cArea') { wizard.draft.area = Number(t.value); renderWizardSummary(); return; }
    if (t.id === 'cFlow') { wizard.draft.flow = Number(t.value); renderWizardSummary(); return; }
    if (t.id === 'cPlanting') { wizard.draft.planting = t.value; return; }
    if (t.id === 'cEto') { wizard.draft.eto = Number(t.value); updateWaterPreview(); return; }
    if (t.id === 'cRain') { wizard.draft.rain = Number(t.value); updateWaterPreview(); return; }
    if (t.id === 'cDays') { wizard.draft.daysSince = Number(t.value); updateWaterPreview(); return; }
    if (t.dataset && t.dataset.sensor) {
      wizard.draft.sensors = wizard.draft.sensors || {};
      wizard.draft.sensors[t.dataset.sensor] = Number(t.value);
      wizard.draft.sensorsTouched = true;
      const out = document.getElementById('out-' + t.dataset.sensor);
      if (out) out.textContent = fmt(t.value, 1) + '%';
      updateWaterPreview();
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'cCity') {
      wizard.draft.city = Number(t.value);
      const city = cityOf(t.value);
      wizard.draft.eto = city.eto[nowMonth()];
      wizard.draft.sensors = null;
      wizard.draft.sensorsTouched = false;
      renderWizard();
      return;
    }
    if (t.id === 'cSoil') {
      wizard.draft.soil = t.value;
      wizard.draft.sensors = null;
      wizard.draft.sensorsTouched = false;
      renderWizard();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal.open').forEach((m) => closeModal(m.id));
      closeSidebar();
    }
  });

  const citySearch = $('#citySearch');
  if (citySearch) citySearch.addEventListener('input', renderCityList);
}

/* ---------- Idioma: aplicação e troca ---------- */
function applyStaticI18n() {
  document.documentElement.lang = LOCALE;
  document.title = tr('AgroÁgua — Irrigação de precisão');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', tr('Plataforma de irrigação de precisão para pequenos e médios produtores: sensores de solo, recomendação de irrigação e melhor custo-benefício por cultura.'));
  $$('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
  $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = tr(el.dataset.i18nPlaceholder); });
  $$('[data-i18n-title]').forEach((el) => { el.title = tr(el.dataset.i18nTitle); });
}

function updateLangButton() {
  const b = $('#langBtn');
  if (!b) return;
  b.textContent = LANG === 'zh' ? '中文' : 'PT';
  b.title = LANG === 'zh' ? 'Mudar para português' : '切换到中文';
}

function setLang(lang) {
  LANG = lang === 'zh' ? 'zh' : 'pt';
  LOCALE = LANG === 'zh' ? 'zh-CN' : 'pt-BR';
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* storage */ }
  localizeData();
  applyStaticI18n();
  updateLangButton();
  $('#pageTitle').textContent = routeTitle(activeRoute);
  $('#pageEyebrow').textContent = routeEyebrow(activeRoute);
  renderShell();
  if (activeRoute === 'overview') renderOverview();
  else if (activeRoute === 'calculator') renderWizard();
  else if (activeRoute === 'automation') renderAutomation();
  else if (activeRoute === 'data') renderData();
  else if (activeRoute === 'admin') renderAdmin();
  toast(LANG === 'zh' ? '已切换为中文界面' : 'Interface em português.');
}

/* ---------- Inicialização ---------- */
function init() {
  if (!state.lastSync || Date.now() - state.lastSync > 10 * 60000) {
    state.lastSync = Date.now() - 4 * 60000;
  }
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* storage */ }
  localizeData();
  applyStaticI18n();
  updateLangButton();
  renderAuthScreen();
  populateRegisterCities();
  renderShell();
  bindEvents();
  const hash = (location.hash || '').replace('#', '');
  navigate(ROUTES.includes(hash) ? hash : 'automation');
  ensureWeather(state.activeCity).then(() => {
    renderShell();
    if (activeRoute === 'overview') renderOverview();
  });
  window.addEventListener('hashchange', () => {
    const r = (location.hash || '').replace('#', '');
    navigate(ROUTES.includes(r) ? r : 'overview');
  });
}

init();
