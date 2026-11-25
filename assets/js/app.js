/* ============================================================
   AgroÁgua Piauí — aplicação
   ============================================================ */
'use strict';

const AGRO_PI_DATA = window.MUNICIPIOS_PI;
const CITIES = (AGRO_PI_DATA && AGRO_PI_DATA.municipios) || [];
const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_LONG = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const CROPS = [
  { id: 'alface', nome: 'Alface', ciclo: 50, kc: [0.70, 1.00, 0.95], raiz: 0.25 },
  { id: 'coentro', nome: 'Cebolinha / coentro', ciclo: 45, kc: [0.70, 1.00, 0.95], raiz: 0.20 },
  { id: 'tomate', nome: 'Tomate', ciclo: 130, kc: [0.60, 1.15, 0.80], raiz: 0.70 },
  { id: 'pimentao', nome: 'Pimentão', ciclo: 130, kc: [0.60, 1.05, 0.90], raiz: 0.50 },
  { id: 'pepino', nome: 'Pepino', ciclo: 65, kc: [0.60, 1.00, 0.75], raiz: 0.40 },
  { id: 'quiabo', nome: 'Quiabo', ciclo: 90, kc: [0.50, 1.00, 0.80], raiz: 0.45 },
  { id: 'melancia', nome: 'Melancia', ciclo: 85, kc: [0.40, 1.00, 0.75], raiz: 0.60 },
  { id: 'feijao', nome: 'Feijão', ciclo: 80, kc: [0.40, 1.15, 0.35], raiz: 0.50 },
  { id: 'milho', nome: 'Milho', ciclo: 115, kc: [0.30, 1.20, 0.50], raiz: 0.60 },
  { id: 'mandioca', nome: 'Mandioca', ciclo: 330, kc: [0.30, 0.80, 0.30], raiz: 0.60 },
  { id: 'arroz', nome: 'Arroz', ciclo: 110, kc: [1.05, 1.20, 0.90], raiz: 0.30 },
  { id: 'banana', nome: 'Banana', ciclo: 365, kc: [0.50, 1.20, 1.10], raiz: 0.50 },
  { id: 'manga', nome: 'Manga', ciclo: 365, kc: [0.50, 0.90, 0.75], raiz: 1.00 },
  { id: 'coco', nome: 'Coco', ciclo: 365, kc: [0.50, 1.00, 0.90], raiz: 0.80 },
  { id: 'maracuja', nome: 'Maracujá', ciclo: 365, kc: [0.50, 1.05, 0.90], raiz: 0.60 },
];
const CROP_BY_ID = new Map(CROPS.map((c) => [c.id, c]));

const SYSTEMS = {
  gotejamento: { nome: 'Gotejamento', eff: 0.90, desc: 'Maior economia de água' },
  micro: { nome: 'Microaspersão', eff: 0.85, desc: 'Boa uniformidade' },
  aspersao: { nome: 'Aspersão', eff: 0.70, desc: 'Uso comum em grãos' },
  sulco: { nome: 'Sulco / inundação', eff: 0.55, desc: 'Menor eficiência' },
};
const SOILS = {
  arenoso: { nome: 'Arenoso', aw: 70 },
  medio: { nome: 'Médio', aw: 130 },
  argiloso: { nome: 'Argiloso', aw: 180 },
};

const DEFAULT_SETTINGS = { tariff: 1.05, kwh: 0.15, source: 20, water: 0 };
const STORAGE_KEY = 'agroagua_pi_v2';
const WEATHER_KEY = 'agroagua_pi_weather_v2';
const SESSION_KEY = 'agroagua_pi_admin_session';
const USER_SESSION_KEY = 'agroagua_pi_user_session';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '2026';
const SESSION_MS = 8 * 60 * 60 * 1000;
const DEFAULT_CITY = 2211001;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmt = (n, d = 1) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const isoOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const dateShort = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const dateLong = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
};
const timeShort = (ts) => new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const kcFor = (crop, phase) => {
  if (!crop) return 1;
  if (phase === 'ini') return crop.kc[0];
  if (phase === 'cresc') return (crop.kc[0] + crop.kc[1]) / 2;
  if (phase === 'final') return crop.kc[2];
  return crop.kc[1];
};
const phaseName = (p) => ({ ini: 'Inicial', cresc: 'Crescimento', prod: 'Produção', final: 'Final' }[p] || 'Produção');
const cityOf = (id) => CITY_BY_ID.get(Number(id)) || CITY_BY_ID.get(DEFAULT_CITY) || CITIES[0] || {
  id: DEFAULT_CITY, nome: 'Teresina', pop: 866300, chuvaAnual: 1300, etoAnual: 1800,
  lat: -5.09, lon: -42.8, chuva: Array(12).fill(100), eto: Array(12).fill(5), t2m: Array(12).fill(28), deficit: 500,
};
const nowMonth = () => new Date().getMonth();
const findCity = (name) => CITIES.find((c) => norm(c.nome) === norm(name));

function toast(msg, type = '') {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3000);
}

function freshState() {
  return {
    activeCity: DEFAULT_CITY,
    areas: [],
    history: [],
    settings: { ...DEFAULT_SETTINGS },
    admin: { inactive: [], log: [], demo: false },
    seeded: false,
    nextId: 1,
  };
}
function loadState() {
  const base = freshState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    const areas = Array.isArray(s.areas) ? s.areas : [];
    const maxId = areas.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
    return {
      ...base,
      ...s,
      settings: { ...base.settings, ...(s.settings || {}) },
      admin: { ...base.admin, ...(s.admin || {}) },
      areas,
      history: Array.isArray(s.history) ? s.history : [],
      nextId: Math.max(Number(s.nextId) || 1, maxId + 1),
    };
  } catch (e) { return base; }
}
let state = loadState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function log(type, msg) {
  state.admin.log.unshift({ id: Date.now() + Math.random(), ts: Date.now(), type, msg });
  state.admin.log = state.admin.log.slice(0, 250);
  save();
}

function seedDemo() {
  const id = (name) => (findCity(name) || cityOf(DEFAULT_CITY)).id;
  const mk = (name, cityName, crop, area, system, soil, source, flow, days) => ({
    id: state.nextId++,
    name, city: id(cityName), crop, phase: 'prod', area, system, soil,
    planting: isoOffset(-days), source, flow, createdAt: new Date().toISOString(),
  });
  state.areas = [
    mk('Horta da Dona Zefa', 'Teresina', 'alface', 0.2, 'gotejamento', 'medio', 40, 4, 25),
    mk('Roçado do Seu Antônio', 'Teresina', 'milho', 1.2, 'aspersao', 'arenoso', 140, 14, 38),
    mk('Pomar de Manga', 'Teresina', 'manga', 0.8, 'micro', 'argiloso', 60, 6, 420),
    mk('Tomate de Oeiras', 'Oeiras', 'tomate', 0.5, 'gotejamento', 'medio', 50, 5, 30),
    mk('Melancia de Bom Jesus', 'Bom Jesus', 'melancia', 2.0, 'gotejamento', 'arenoso', 200, 12, 22),
    mk('Banana de Parnaíba', 'Parnaíba', 'banana', 0.6, 'micro', 'medio', 80, 6, 180),
  ];
  state.history = [];
  state.admin.demo = true;
  state.seeded = true;
  state.activeCity = DEFAULT_CITY;
  save();
}

/* ============================================================
   Session / auth
   ============================================================ */
let session = null;
let userSession = null;

function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s && s.exp > Date.now()) return s;
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {}
  return null;
}
function loadUserSession() {
  try {
    const s = JSON.parse(localStorage.getItem(USER_SESSION_KEY) || 'null');
    if (s && s.exp > Date.now()) return s;
    localStorage.removeItem(USER_SESSION_KEY);
  } catch (e) {}
  return null;
}
session = loadSession();
userSession = loadUserSession();
const isAdmin = () => !!session && session.exp > Date.now();
const isLoggedIn = () => isAdmin() || (!!userSession && userSession.exp > Date.now());

function applyAuthVisibility() {
  const screen = $('#authScreen');
  const appEl = $('#app');
  if (isLoggedIn()) {
    if (screen) screen.hidden = true;
    if (appEl) {
      appEl.classList.remove('auth-locked');
      appEl.setAttribute('aria-hidden', 'false');
    }
  } else {
    if (screen) screen.hidden = false;
    if (appEl) {
      appEl.classList.add('auth-locked');
      appEl.setAttribute('aria-hidden', 'true');
    }
  }
}

function doLogin(user, pass) {
  const u = String(user || '').trim().toLowerCase();
  const p = String(pass || '');
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    session = { user: ADMIN_USER, exp: Date.now() + SESSION_MS };
    userSession = { user: ADMIN_USER, role: 'Administrador', exp: Date.now() + SESSION_MS };
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userSession));
    } catch (e) {}
    log('login', 'Login administrativo realizado');
    return true;
  }
  if ((u === 'agricultor' || u === 'produtor') && p === ADMIN_PASS) {
    session = null;
    userSession = { user: u, role: 'Agricultor', exp: Date.now() + SESSION_MS };
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(userSession));
    } catch (e) {}
    return true;
  }
  return false;
}
function doLogout() {
  if (session) log('logout', 'Sessão administrativa encerrada');
  session = null;
  userSession = null;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_SESSION_KEY);
  } catch (e) {}
  applyAuthVisibility();
  renderShell();
}

/* ============================================================
   Weather
   ============================================================ */
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

/* ============================================================
   Calculation engine
   ============================================================ */
function compute(p) {
  const crop = CROP_BY_ID.get(p.crop) || CROPS[2];
  const eff = SYSTEMS[p.system]?.eff ?? 0.9;
  const aw = SOILS[p.soil]?.aw ?? 130;
  const area = Math.max(0.01, Number(p.area) || 0.01);
  const eto = Math.max(0.2, Number(p.eto) || 0);
  const rain = Math.max(0, Number(p.rain) || 0);
  const kc = kcFor(crop, p.phase);
  const etc = eto * kc;
  const rainEff = Math.min(rain * 0.8, etc);
  const net = Math.max(0, etc - rainEff);
  const gross = net / eff;
  const volume = gross * 10 * area;
  const flow = Math.max(0.1, Number(p.flow) || 1);
  const hours = volume / flow;
  const kwh = Number(p.kwh ?? state.settings.kwh) || 0;
  const tariff = Number(p.tariff ?? state.settings.tariff) || 0;
  const water = Number(p.water ?? state.settings.water) || 0;
  const cost = volume * (kwh * tariff + water);
  const available = aw * crop.raiz * 0.4;
  const interval = Math.max(1, Math.min(10, Math.round(available / Math.max(etc, 0.1))));
  const eventMm = (net / eff) * interval;
  const eventM3 = eventMm * 10 * area;
  return { crop, kc, eff, aw, area, eto, rain, etc, rainEff, net, gross, volume, flow, hours, cost, interval, eventMm, eventM3, available };
}

function areaDemand(area, useRain = true) {
  const w = todayWeather(area.city);
  return compute({
    crop: area.crop, phase: area.phase || 'prod', area: area.area, system: area.system, soil: area.soil,
    eto: w.eto, rain: useRain ? w.rain : 0, flow: area.flow || 6,
    tariff: state.settings.tariff, kwh: state.settings.kwh, water: state.settings.water,
  });
}
function areaForDay(area, day) {
  return compute({
    crop: area.crop, phase: area.phase || 'prod', area: area.area, system: area.system, soil: area.soil,
    eto: day.eto, rain: day.rain, flow: area.flow || 6,
    tariff: state.settings.tariff, kwh: state.settings.kwh, water: state.settings.water,
  });
}

/* ============================================================
   Router & views
   ============================================================ */
const ROUTES = {
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

function activeCity() { return cityOf(state.activeCity); }
function activeCities() {
  const off = new Set(state.admin.inactive.map(Number));
  return CITIES.filter((c) => !off.has(c.id));
}
function cityPopulation(city) { return city.pop ? fmt0(city.pop) + ' hab' : '—'; }
function cityRain(city) { return fmt0(city.chuvaAnual) + ' mm'; }
function cityEto(city) { return fmt0(city.etoAnual) + ' mm'; }

function statusFor(p) {
  if (p.net === 0) return { label: 'Chuva cobre', cls: 'blue' };
  if (p.interval <= 1) return { label: 'Irrigar hoje', cls: 'green' };
  return { label: 'Em ' + p.interval + ' dias', cls: 'amber' };
}
function recFor(p) {
  if (p.net === 0) return { label: 'Não irrigar', cls: 'blue' };
  if (p.rain > 5) return { label: 'Reduzir', cls: 'amber' };
  return { label: 'Irrigar', cls: 'green' };
}
function iconFor(rain, prob) {
  if (rain >= 5) return '🌧️';
  if (rain >= 1) return '🌦️';
  if (prob >= 40) return '⛅';
  return '☀️';
}

function navigate(route, initial = false) {
  if (!ROUTES[route]) route = 'overview';
  activeRoute = route;
  $$('.view').forEach((v) => v.classList.remove('active'));
  const view = $('#view-' + route);
  if (view) view.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  if ($('#pageTitle')) $('#pageTitle').textContent = ROUTES[route].title;
  if ($('#pageEyebrow')) $('#pageEyebrow').textContent = ROUTES[route].eyebrow;
  if (!initial) {
    try { history.replaceState(null, '', '#' + route); } catch (e) {}
  }
  closeSidebar();
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: initial ? 'auto' : 'smooth' });
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
  const lang = document.documentElement.lang && document.documentElement.lang.startsWith('zh') ? 'zh' : 'pt';
  const target = 'automacao-esp32.html?embed=1&lang=' + lang;
  if (frame.getAttribute('src') !== target) frame.setAttribute('src', target);
}

function renderShell() {
  const city = activeCity();
  if ($('#cityBtnName')) $('#cityBtnName').textContent = city.nome;
  if ($('#cityBtn')) $('#cityBtn').title = city.nome + ' · ' + cityPopulation(city);
  if ($('#sideCityName')) $('#sideCityName').textContent = city.nome;
  if ($('#sideCityMeta')) $('#sideCityMeta').textContent = 'PI · ' + cityPopulation(city);
  if ($('#navAreasCount')) $('#navAreasCount').textContent = state.areas.length;
  const w = todayWeather(city.id);
  const pill = $('#weatherPill');
  if (pill) {
    if (w.live) {
      pill.classList.remove('offline');
      if ($('#weatherLabel')) $('#weatherLabel').textContent = 'Ao vivo';
      if ($('#weatherTemp')) $('#weatherTemp').textContent = Math.round(w.tmax) + '°C';
    } else {
      pill.classList.add('offline');
      if ($('#weatherLabel')) $('#weatherLabel').textContent = 'Clima médio';
      if ($('#weatherTemp')) $('#weatherTemp').textContent = fmt(city.t2m[nowMonth()], 0) + '°C';
    }
  }
  if ($('#userAvatar')) $('#userAvatar').innerHTML = isAdmin() ? 'A' : '<svg><use href="#i-user"/></svg>';
  if ($('#userRole')) $('#userRole').textContent = isAdmin() ? 'Administrador' : (userSession?.role || 'Acesso');
  if ($('#userName')) $('#userName').textContent = isAdmin() ? 'admin' : (userSession?.user || 'Entrar');
  if ($('#adminLock')) {
    $('#adminLock').innerHTML = '<svg><use href="#i-lock"/></svg>';
    $('#adminLock').closest('.nav-btn')?.classList.toggle('admin-on', isAdmin());
  }
}

function renderOverview() {
  const city = activeCity();
  const areas = state.areas.filter((a) => Number(a.city) === Number(city.id));
  const rows = areas.map((a) => ({ area: a, p: areaDemand(a, false) }));
  const todayRows = areas.map((a) => ({ area: a, p: areaDemand(a) }));
  const todayDemand = todayRows.reduce((s, r) => s + r.p.volume, 0);
  const totalHa = areas.reduce((s, a) => s + Number(a.area || 0), 0);
  const demand = rows.reduce((s, r) => s + r.p.volume, 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  const source = areas.reduce((s, a) => s + (Number(a.source) || state.settings.source), 0) || state.settings.source;
  let design = 0, current = 0;
  rows.forEach((r) => {
    const noRain = compute({ crop: r.area.crop, phase: 'prod', area: r.area.area, system: r.area.system, soil: r.area.soil, eto: r.p.eto, rain: 0, flow: r.area.flow || 6, tariff: state.settings.tariff, kwh: state.settings.kwh, water: 0 });
    design += (noRain.net / 0.7) * 10 * Number(r.area.area);
    current += noRain.volume;
  });
  const savedPct = design > 0 ? ((design - current) / design) * 100 : 0;

  if ($('#ovSub')) $('#ovSub').textContent = city.nome + ' · ' + areas.length + ' áreas · ' + fmt(totalHa, 1) + ' ha monitorados';
  if ($('#ovKpis')) {
    $('#ovKpis').innerHTML = [
      kpi('Áreas', areas.length, totalHa.toFixed(1) + ' ha', 'layers', 'brand'),
      kpi('Demanda de projeto', fmt(demand, 1), 'hoje: ' + fmt(todayDemand, 1) + ' m³', 'drop'),
      kpi('Custo operacional', 'R$ ' + fmt(cost, 2), 'energia + água', 'calc'),
      kpi('Economia potencial', fmt(savedPct, 0) + '%', 'vs. aspersão', 'leaf', savedPct >= 15 ? 'good' : ''),
      kpi('Fonte de água', fmt(source, 0), 'm³/dia', 'map', demand > source ? 'bad' : 'good'),
    ].join('');
  }
  renderDemoNotice();
  renderWater(rows, demand, source, todayDemand);
  renderOverviewWeather(city);
  renderChart($('#ovChart'), city);
  if ($('#ovDeficit')) $('#ovDeficit').textContent = 'déficit ' + fmt0(city.deficit) + ' mm/ano';
  if ($('#ovChartSub')) $('#ovChartSub').textContent = city.nome + ' · médias mensais 2001–2025';
  renderOverviewAlerts(city, todayRows, todayDemand, source);
  renderOverviewAreas(rows);
}

function kpi(label, value, foot, icon, cls = '') {
  const mod = cls === 'brand' ? 'accent' : cls;
  return `<div class="card kpi ${mod}"><span class="label">${esc(label)}</span><span class="value">${value}</span><span class="foot">${esc(foot)}</span><span class="icon"><svg><use href="#i-${icon}"/></svg></span></div>`;
}

function renderDemoNotice() {
  const el = $('#demoNotice');
  if (!el) return;
  if (!state.admin.demo) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="notice warn">
    <svg><use href="#i-info"/></svg>
    <span><strong>Dados de exemplo.</strong> Explore à vontade. Ao cadastrar sua primeira área, os exemplos podem ser limpos.</span>
    <span class="spacer"></span>
    <button class="btn btn-secondary btn-sm" data-action="demoKeep">Manter</button>
    <button class="btn btn-danger btn-sm" data-action="demoClear">Limpar exemplo</button>
  </div>`;
}

function renderWater(rows, demand, source, todayDemand) {
  const el = $('#ovWater');
  if (!el) return;
  const pct = source > 0 ? Math.min(100, (demand / source) * 100) : 0;
  const color = pct > 100 ? 'var(--red)' : pct > 85 ? 'var(--amber)' : 'var(--brand)';
  const areas = rows.length;
  const ha = rows.reduce((s, r) => s + Number(r.area.area), 0);
  if ($('#ovWaterBadge')) {
    $('#ovWaterBadge').innerHTML = demand > source
      ? '<span class="badge red"><span class="dot"></span>Fonte insuficiente</span>'
      : '<span class="badge green"><span class="dot"></span>Dentro da capacidade</span>';
  }
  el.innerHTML = `
    <div class="hbar">
      <div class="top"><span>Demanda de projeto</span><span class="v">${fmt(demand, 1)} de ${fmt(source, 0)} m³/dia</span></div>
      <div class="track"><i style="width:${pct}%;background:${color}"></i></div>
    </div>
    <div class="grid g3 mt14" style="gap:10px">
      <div><div class="tiny muted">Áreas</div><div style="font-size:17px;font-weight:800">${areas}</div></div>
      <div><div class="tiny muted">Área total</div><div style="font-size:17px;font-weight:800">${fmt(ha, 1)} ha</div></div>
      <div><div class="tiny muted">Hoje, com chuva</div><div style="font-size:17px;font-weight:800">${fmt(todayDemand, 1)} m³</div></div>
    </div>
    <div class="divider"></div>
    <p class="small muted">${areas ? 'A demanda de projeto considera a ETo local sem desconto de chuva. Hoje, a previsão reduz a necessidade para ' + fmt(todayDemand, 1) + ' m³/dia.' : 'Cadastre uma área para calcular a demanda e comparar com sua fonte de água.'}</p>`;
}

function renderOverviewWeather(city) {
  const days = forecastFor(city.id);
  const live = days.some((d) => d.live);
  if ($('#ovForecastSub')) $('#ovForecastSub').textContent = city.nome + ' · ' + (live ? 'previsão ao vivo' : 'estimativa climática');
  if ($('#ovForecastBadge')) {
    $('#ovForecastBadge').innerHTML = live
      ? '<span class="badge green"><span class="dot"></span>ao vivo</span>'
      : '<span class="badge amber"><span class="dot"></span>offline</span>';
  }
  if ($('#ovWeather')) {
    $('#ovWeather').innerHTML = days.map((d) => `
      <div class="wday ${d.date === todayISO() ? 'today' : ''}">
        <div class="d">${d.date === todayISO() ? 'Hoje' : dateLong(d.date).split(',')[0]}</div>
        <div class="i">${iconFor(d.rain, d.prob)}</div>
        <div class="r">${fmt(d.rain, 1)} mm</div>
        <div class="t">${fmt(d.tmin, 0)}° / ${fmt(d.tmax, 0)}°</div>
      </div>`).join('');
  }
  if ($('#ovWeatherNote')) {
    $('#ovWeatherNote').textContent = live
      ? 'Atualizado agora via Open-Meteo. A previsão usa o ponto do município.'
      : 'Sem conexão: usando a climatologia do município. Os valores são estimativas.';
  }
}

function renderChart(el, city) {
  if (!el) return;
  const rain = city.chuva;
  const eto = city.eto.map((v, i) => v * DAYS[i]);
  const max = Math.max(...rain, ...eto, 1);
  el.innerHTML = MONTHS.map((m, i) => `
    <div class="chart-col" title="${m}: chuva ${fmt(rain[i], 0)} mm · ETo ${fmt(eto[i], 0)} mm">
      <div class="chart-bars">
        <span class="bar rain" style="height:${(rain[i] / max) * 100}%"></span>
        <span class="bar eto" style="height:${(eto[i] / max) * 100}%"></span>
      </div>
      <span class="chart-x">${m}</span>
    </div>`).join('');
}

function renderOverviewAlerts(city, rows, demand, source) {
  const el = $('#ovAlerts');
  if (!el) return;
  const alerts = [];
  const days = forecastFor(city.id);
  const next3 = days.slice(0, 3).reduce((s, d) => s + d.rain, 0);
  const next7 = days.slice(0, 7).reduce((s, d) => s + d.rain, 0);
  const eto = todayWeather(city.id).eto;

  if (!rows.length) {
    alerts.push(alertBox('info', 'Comece por uma área', 'Cadastre um talhão para ver demanda, custo e agenda personalizada.'));
  } else {
    if (demand === 0) {
      alerts.push(alertBox('good', 'Chuva cobre a demanda de hoje', 'A previsão atende à necessidade hídrica das áreas. Aproveite para poupar energia e reprogramar a irrigação.'));
    } else if (demand > source) {
      alerts.push(alertBox('danger', 'Demanda maior que a fonte', `Você precisa de ${fmt(demand, 1)} m³/dia e a fonte entrega ${fmt(source, 0)}. Reduza a área irrigada ou amplie o reservatório.`));
    } else {
      alerts.push(alertBox('good', 'Água suficiente hoje', `Demanda de ${fmt(demand, 1)} m³/dia para uma fonte de ${fmt(source, 0)} m³/dia.`));
    }
    if (next3 < 3 && eto > 5) {
      alerts.push(alertBox('warn', 'Veranico provável', `Apenas ${fmt(next3, 1)} mm de chuva em 3 dias e ETo de ${fmt(eto, 1)} mm/dia. Priorize irrigar no início da manhã ou à noite.`));
    }
    if (next7 > 20) {
      alerts.push(alertBox('info', 'Chuva a caminho', `${fmt(next7, 0)} mm previstos em 7 dias. Suspenda a irrigação nos dias de chuva.`));
    }
    if (state.areas.some((a) => Number(a.city) === city.id && (a.system === 'aspersao' || a.system === 'sulco'))) {
      alerts.push(alertBox('info', 'Dá para economizar até 22%', 'Trocar aspersão ou sulco por gotejamento reduz a lâmina bruta para a mesma produção.'));
    }
  }
  el.innerHTML = alerts.join('');
}

function alertBox(type, title, text) {
  const icon = type === 'good' ? 'check' : type === 'danger' ? 'alert' : type === 'warn' ? 'sun' : 'info';
  return `<div class="alert ${type}"><svg><use href="#i-${icon}"/></svg><div><strong>${esc(title)}</strong>${esc(text)}</div></div>`;
}

function renderOverviewAreas(rows) {
  const el = $('#ovAreas');
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-layers"/></svg></div><h3>Nenhuma área neste município</h3><p>Cadastre a primeira área para acompanhar água, energia e produtividade.</p><button class="btn btn-primary btn-sm" data-route="calculator"><svg><use href="#i-plus"/></svg>Cadastrar área</button></div>`;
    return;
  }
  const list = rows.slice(0, 5);
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Área</th><th>Cultura</th><th class="t-right">Área</th><th>Sistema</th><th class="t-right">Demanda</th><th>Status</th></tr></thead>
    <tbody>${list.map((r) => {
      const today = areaDemand(r.area);
      const st = statusFor(today);
      return `<tr>
        <td><div class="cell-main">${esc(r.area.name)}</div><div class="cell-sub">${esc(cityOf(r.area.city).nome)}</div></td>
        <td>${esc(CROP_BY_ID.get(r.area.crop)?.nome || r.area.crop)}</td>
        <td class="t-right num">${fmt(r.area.area, 2)} ha</td>
        <td>${esc(SYSTEMS[r.area.system]?.nome || r.area.system)}</td>
        <td class="t-right num">${fmt(r.p.volume, 1)} m³</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

/* ============================================================
   Wizard / calculadora
   ============================================================ */
let wizard = null;

function newDraft() {
  const city = activeCity();
  const w = todayWeather(city.id);
  return {
    city: city.id, name: '', area: 0.5, flow: 6, source: state.settings.source,
    crop: 'tomate', phase: 'prod', system: 'gotejamento', soil: 'medio',
    eto: Number(w.eto.toFixed(2)), rain: 0,
    tariff: state.settings.tariff, planting: todayISO(), etoTouched: false, rainTouched: true,
  };
}
function ensureWizard() {
  if (!wizard) wizard = { step: 1, draft: newDraft(), cropSearch: '' };
  if (Number(wizard.draft.city) !== Number(state.activeCity)) {
    const old = wizard.draft;
    wizard.draft = { ...old, city: state.activeCity };
    const w = todayWeather(state.activeCity);
    if (!old.etoTouched) wizard.draft.eto = Number(w.eto.toFixed(2));
    if (!old.rainTouched) wizard.draft.rain = Number(w.rain.toFixed(1));
  }
}

function renderWizard() {
  ensureWizard();
  const d = wizard.draft;
  const step = wizard.step;
  if ($('#wizBadge')) $('#wizBadge').textContent = 'Passo ' + step + ' de 4';
  $$('#wizSteps .step').forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('active', n === step);
    el.classList.toggle('done', n < step);
  });
  $$('.step-pane').forEach((el) => el.classList.toggle('active', Number(el.dataset.step) === step));
  if ($('#wizBack')) $('#wizBack').disabled = step === 1;
  const next = $('#wizNext');
  if (next) next.style.visibility = step === 4 ? 'hidden' : 'visible';

  setVal('#wCity', cityOf(d.city).nome);
  if ($('#wCityHint')) $('#wCityHint').textContent = 'Clima de ' + cityOf(d.city).nome + ' · ETo ' + fmt(d.eto, 2) + ' mm/dia';
  setVal('#wName', d.name);
  setVal('#wArea', d.area);
  setVal('#wFlow', d.flow);
  setVal('#wSource', d.source);
  setVal('#wPlanting', d.planting);
  setVal('#wPhase', d.phase);
  setVal('#wSoil', d.soil);
  setVal('#wEto', d.eto);
  setVal('#wRain', d.rain);
  setVal('#wTariff', d.tariff);
  if ($('#wEtoHint')) $('#wEtoHint').textContent = todayWeather(d.city).live ? 'Preenchida pela previsão de hoje.' : 'Estimativa pela climatologia do município.';
  const wRainHint = $('#wRainHint');
  if (wRainHint) {
    const rToday = todayWeather(d.city).rain;
    wRainHint.textContent = rToday > 0
      ? 'Previsão de hoje: ' + fmt(rToday, 1) + ' mm. 80% é considerada aproveitável.'
      : 'Sem chuva prevista hoje. 80% da chuva informada é aproveitável.';
  }
  renderCropGrid();
  renderSystemGrid();
  if ($('#wKc')) $('#wKc').value = fmt(kcFor(CROP_BY_ID.get(d.crop), d.phase), 2);
  renderWizardSummary();
  if (step === 4) renderWizardResult();
}

function setVal(sel, value) {
  const el = $(sel);
  if (!el) return;
  if (document.activeElement === el) return;
  el.value = value;
}

function renderCropGrid() {
  const grid = $('#wCropGrid');
  if (!grid) return;
  const q = norm(wizard.cropSearch);
  const list = CROPS.filter((c) => !q || norm(c.nome).includes(q));
  grid.innerHTML = list.map((c) => `
    <button type="button" class="crop-card ${wizard.draft.crop === c.id ? 'sel' : ''}" data-crop="${c.id}">
      <div class="nm"><span>${esc(c.nome)}</span>${wizard.draft.crop === c.id ? '<svg width="13" height="13" style="color:var(--brand)"><use href="#i-check"/></svg>' : ''}</div>
      <div class="meta">${c.ciclo} dias · raiz ${(c.raiz * 100).toFixed(0)} cm</div>
      <div class="kc">Kc ${c.kc[0].toFixed(2)} / ${c.kc[1].toFixed(2)} / ${c.kc[2].toFixed(2)}</div>
    </button>`).join('');
}

function renderSystemGrid() {
  const grid = $('#wSysGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(SYSTEMS).map(([id, s]) => `
    <button type="button" class="sys-card ${wizard.draft.system === id ? 'sel' : ''}" data-system="${id}">
      <div class="nm">${esc(s.nome)}</div>
      <div class="eff">${(s.eff * 100).toFixed(0)}% de eficiência</div>
      <div class="d">${esc(s.desc)}</div>
    </button>`).join('');
}

function renderWizardSummary() {
  ensureWizard();
  const d = wizard.draft;
  const p = compute(d);
  const el = $('#wSummary');
  if (!el) return;
  el.innerHTML = `
    <div class="sum-row"><span>Cultura</span><strong>${esc(p.crop.nome)} (${esc(phaseName(d.phase))})</strong></div>
    <div class="sum-row"><span>Área e sistema</span><strong>${fmt(d.area, 2)} ha · ${esc(SYSTEMS[d.system]?.nome || d.system)} (${(p.eff * 100).toFixed(0)}%)</strong></div>
    <div class="sum-row"><span>ETo e chuva</span><strong>${fmt(p.eto, 2)} mm/d · ${fmt(p.rain, 1)} mm</strong></div>
    <div class="sum-row"><span>Lâmina bruta</span><strong>${fmt(p.gross, 2)} mm/dia</strong></div>
    <div class="sum-row"><span>Volume diário</span><strong>${fmt(p.volume, 1)} m³/dia</strong></div>
    <div class="sum-row"><span>Tempo de bomba</span><strong>${fmt(p.hours, 1)} h/dia</strong></div>
    <div class="sum-row"><span>Custo estimado</span><strong>R$ ${fmt(p.cost, 2)}/dia</strong></div>
    <div class="sum-row"><span>Turno de rega</span><strong>A cada ${p.interval} ${p.interval === 1 ? 'dia' : 'dias'} (${fmt(p.eventM3, 1)} m³)</strong></div>`;
}

function renderWizardResult() {
  ensureWizard();
  const d = wizard.draft;
  const p = compute(d);
  const st = statusFor(p);
  const rec = recFor(p);
  const el = $('#wResult');
  if (!el) return;
  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Resultado da recomendação</h2>
          <p>${esc(d.name || 'Área sem nome')} · ${esc(cityOf(d.city).nome)} · ${esc(p.crop.nome)}</p>
        </div>
        <span class="badge ${rec.cls}">${rec.label}</span>
      </div>
      <div class="card-body space-y-3">
        <div class="grid g3">
          <div><div class="tiny muted">Volume necessário</div><div style="font-size:20px;font-weight:800">${fmt(p.volume, 1)} m³/dia</div></div>
          <div><div class="tiny muted">Tempo de operação</div><div style="font-size:20px;font-weight:800">${fmt(p.hours, 1)} h/dia</div></div>
          <div><div class="tiny muted">Custo operacional</div><div style="font-size:20px;font-weight:800">R$ ${fmt(p.cost, 2)}/dia</div></div>
        </div>
        <div class="divider"></div>
        <div class="small muted">
          ETc: <b>${fmt(p.etc, 2)} mm/dia</b> · Chuva aproveitável: <b>${fmt(p.rainEff, 2)} mm/dia</b> ·
          Lâmina líquida: <b>${fmt(p.net, 2)} mm/dia</b> · Lâmina bruta: <b>${fmt(p.gross, 2)} mm/dia</b> ·
          Intervalo sugerido: <b>${p.interval} ${p.interval === 1 ? 'dia' : 'dias'}</b> (${st.label}).
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-primary" id="wSaveArea"><svg><use href="#i-check"/></svg>Salvar área no painel</button>
          <button type="button" class="btn btn-secondary" id="wLogIrrigation"><svg><use href="#i-drop"/></svg>Registrar irrigação hoje</button>
          <button type="button" class="btn btn-ghost" id="wResetWiz">Novo cálculo</button>
        </div>
      </div>
    </div>`;

  const saveBtn = $('#wSaveArea');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const areaObj = {
        id: state.nextId++,
        name: (d.name || '').trim() || (p.crop.nome + ' · ' + cityOf(d.city).nome),
        city: Number(d.city),
        crop: d.crop,
        phase: d.phase || 'prod',
        area: clamp(d.area, 0.01, 50000),
        system: d.system || 'gotejamento',
        soil: d.soil || 'medio',
        planting: d.planting || todayISO(),
        source: clamp(d.source, 1, 100000),
        flow: clamp(d.flow, 0.1, 50000),
        createdAt: new Date().toISOString(),
      };
      state.areas.unshift(areaObj);
      state.admin.demo = false;
      save();
      log('area', 'Área salva: ' + areaObj.name);
      renderShell();
      toast('Área "' + areaObj.name + '" salva no painel.');
      navigate('areas');
    };
  }

  const logBtn = $('#wLogIrrigation');
  if (logBtn) {
    logBtn.onclick = () => {
      state.history.unshift({
        id: Date.now() + Math.random(),
        date: todayISO(),
        city: Number(d.city),
        areaName: (d.name || '').trim() || p.crop.nome,
        crop: p.crop.nome,
        volume: Number(p.volume.toFixed(1)),
        cost: Number(p.cost.toFixed(2)),
      });
      state.history = state.history.slice(0, 200);
      save();
      log('irrigation', 'Irrigação registrada: ' + fmt(p.volume, 1) + ' m³');
      toast('Irrigação registrada no histórico.');
    };
  }

  const resetBtn = $('#wResetWiz');
  if (resetBtn) {
    resetBtn.onclick = () => {
      wizard = { step: 1, draft: newDraft(), cropSearch: '' };
      renderWizard();
    };
  }
}

function renderAreas() {
  const el = $('#areasList');
  if (!el) return;
  if (!state.areas.length) {
    el.innerHTML = `<div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-layers"/></svg></div><h3>Nenhuma área cadastrada</h3><p>Use a calculadora para dimensionar e salvar suas áreas irrigadas.</p><button class="btn btn-primary btn-sm" data-route="calculator"><svg><use href="#i-calc"/></svg>Abrir calculadora</button></div>`;
    return;
  }
  el.innerHTML = `<div class="grid g2">${state.areas.map((a) => {
    const p = areaDemand(a);
    const st = statusFor(p);
    const cName = CROP_BY_ID.get(a.crop)?.nome || a.crop;
    return `<div class="card">
      <div class="card-head">
        <div><h2>${esc(a.name)}</h2><p>${esc(cityOf(a.city).nome)} · ${esc(cName)} · ${fmt(a.area, 2)} ha</p></div>
        <span class="badge ${st.cls}">${st.label}</span>
      </div>
      <div class="card-body space-y-2">
        <div class="small muted">Sistema: <b>${esc(SYSTEMS[a.system]?.nome || a.system)}</b> · Solo: <b>${esc(SOILS[a.soil]?.nome || a.soil)}</b></div>
        <div class="small">Demanda hoje: <b>${fmt(p.volume, 1)} m³</b> (${fmt(p.hours, 1)} h) · Custo: <b>R$ ${fmt(p.cost, 2)}</b></div>
        <div class="flex gap-2 pt-1">
          <button type="button" class="btn btn-secondary btn-sm" data-action="irrigateArea" data-id="${a.id}"><svg><use href="#i-drop"/></svg>Irrigar agora</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="deleteArea" data-id="${a.id}"><svg><use href="#i-trash"/></svg>Excluir</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderAgenda() {
  const el = $('#agendaBody');
  if (!el) return;
  const city = activeCity();
  const days = forecastFor(city.id);
  const areas = state.areas.filter((a) => Number(a.city) === Number(city.id));
  if (!areas.length) {
    el.innerHTML = `<div class="empty"><p>Cadastre uma área em ${esc(city.nome)} para montar a agenda de 7 dias.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Dia</th><th>Clima</th><th class="t-right">Chuva</th><th class="t-right">ETo</th><th class="t-right">Demanda total</th><th>Ação</th></tr></thead>
    <tbody>${days.map((d) => {
      const vol = areas.reduce((s, a) => s + areaForDay(a, d).volume, 0);
      const action = vol <= 0.05 ? 'Suspender / chuva cobre' : 'Irrigar ' + fmt(vol, 1) + ' m³';
      const cls = vol <= 0.05 ? 'blue' : 'green';
      return `<tr>
        <td>${esc(d.date === todayISO() ? 'Hoje (' + dateShort(d.date) + ')' : dateLong(d.date))}</td>
        <td>${iconFor(d.rain, d.prob)}</td>
        <td class="t-right num">${fmt(d.rain, 1)} mm</td>
        <td class="t-right num">${fmt(d.eto, 2)} mm</td>
        <td class="t-right num">${fmt(vol, 1)} m³</td>
        <td><span class="badge ${cls}">${esc(action)}</span></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function renderClimate() {
  const city = activeCity();
  renderChart($('#climChart'), city);
  const q = norm($('#citySearch')?.value || '');
  const list = activeCities().filter((c) => !q || norm(c.nome).includes(q)).slice(0, 60);
  const tbody = $('#citiesBody');
  if (!tbody) return;
  tbody.innerHTML = list.map((c) => `
    <tr>
      <td><b>${esc(c.nome)}</b></td>
      <td class="t-right num">${cityPopulation(c)}</td>
      <td class="t-right num">${cityRain(c)}</td>
      <td class="t-right num">${cityEto(c)}</td>
      <td class="t-right"><button type="button" class="btn btn-secondary btn-sm" data-action="selectCity" data-id="${c.id}">Usar</button></td>
    </tr>`).join('');
}

function renderReports() {
  const el = $('#reportHistory');
  if (!el) return;
  if (!state.history.length) {
    el.innerHTML = `<p class="small muted">Nenhuma irrigação registrada ainda.</p>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Área</th><th>Cultura</th><th class="t-right">Volume</th><th class="t-right">Custo</th></tr></thead>
    <tbody>${state.history.map((h) => `
      <tr>
        <td>${esc(dateShort(h.date))}</td>
        <td>${esc(h.areaName)}</td>
        <td>${esc(h.crop)}</td>
        <td class="t-right num">${fmt(h.volume, 1)} m³</td>
        <td class="t-right num">R$ ${fmt(h.cost, 2)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

function renderData() {
  const el = $('#dataSummary');
  if (!el) return;
  el.innerHTML = `<p class="small muted">Municípios carregados: <b>${CITIES.length}</b> · Culturas cadastradas: <b>${CROPS.length}</b> · Sistemas: <b>${Object.keys(SYSTEMS).length}</b>.</p>`;
}

function renderAdmin() {
  const el = $('#adminLog');
  if (!el) return;
  if (!isAdmin()) {
    el.innerHTML = `<div class="notice warn"><svg><use href="#i-lock"/></svg><span>Entre como <strong>admin</strong> para gerenciar configurações e logs.</span></div>`;
    return;
  }
  el.innerHTML = state.admin.log.length
    ? `<ul class="space-y-1 small">${state.admin.log.slice(0, 25).map((item) => `<li><b>[${esc(timeShort(item.ts))}]</b> ${esc(item.msg)}</li>`).join('')}</ul>`
    : `<p class="small muted">Sem registros no log.</p>`;
}

function openSidebar() {
  $('#sidebar')?.classList.add('open');
  $('#sidebarBackdrop')?.classList.add('open');
}
function closeSidebar() {
  $('#sidebar')?.classList.remove('open');
  $('#sidebarBackdrop')?.classList.remove('open');
}

function bindEvents() {
  const authForm = $('#authForm');
  if (authForm && !authForm.dataset.appAuthBound) {
    authForm.dataset.appAuthBound = '1';
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = $('#authUser')?.value ?? '';
      const p = $('#authPass')?.value ?? '';
      const err = $('#authError');
      if (doLogin(u, p)) {
        if (err) err.classList.remove('show');
        applyAuthVisibility();
        renderShell();
        navigate(activeRoute, true);
      } else if (err) {
        err.classList.add('show');
      }
    });
  }

  $$('[data-demo-user]').forEach((btn) => {
    if (btn.dataset.appDemoBound) return;
    btn.dataset.appDemoBound = '1';
    btn.addEventListener('click', () => {
      const u = btn.dataset.demoUser;
      if ($('#authUser')) $('#authUser').value = u;
      if ($('#authPass')) $('#authPass').value = ADMIN_PASS;
      $$('[data-demo-user]').forEach((b) => {
        const sel = b === btn;
        b.classList.toggle('selected', sel);
        b.setAttribute('aria-pressed', String(sel));
      });
    });
  });

  $('#authReveal')?.addEventListener('click', () => {
    const passEl = $('#authPass');
    if (!passEl) return;
    const isPw = passEl.type === 'password';
    passEl.type = isPw ? 'text' : 'password';
    $('#authReveal')?.setAttribute('aria-pressed', String(isPw));
  });

  $('#logoutBtn')?.addEventListener('click', () => {
    doLogout();
  });

  document.addEventListener('click', (e) => {
    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) {
      e.preventDefault();
      navigate(routeBtn.dataset.route);
      return;
    }
    const cropBtn = e.target.closest('[data-crop]');
    if (cropBtn && wizard) {
      wizard.draft.crop = cropBtn.dataset.crop;
      renderWizard();
      return;
    }
    const sysBtn = e.target.closest('[data-system]');
    if (sysBtn && wizard) {
      wizard.draft.system = sysBtn.dataset.system;
      renderWizard();
      return;
    }
    const actBtn = e.target.closest('[data-action]');
    if (!actBtn) return;
    const action = actBtn.dataset.action;
    const id = Number(actBtn.dataset.id);
    if (action === 'selectCity' && id) {
      state.activeCity = id;
      save();
      renderShell();
      ensureWeather(id);
      renderRoute(activeRoute);
      toast('Município alterado para ' + cityOf(id).nome);
    } else if (action === 'deleteArea' && id) {
      state.areas = state.areas.filter((a) => Number(a.id) !== id);
      save();
      renderShell();
      renderAreas();
      toast('Área removida.');
    } else if (action === 'irrigateArea' && id) {
      const area = state.areas.find((a) => Number(a.id) === id);
      if (area) {
        const p = areaDemand(area);
        state.history.unshift({
          id: Date.now() + Math.random(),
          date: todayISO(),
          city: area.city,
          areaName: area.name,
          crop: p.crop.nome,
          volume: Number(p.volume.toFixed(1)),
          cost: Number(p.cost.toFixed(2)),
        });
        state.history = state.history.slice(0, 200);
        save();
        toast('Irrigação de ' + fmt(p.volume, 1) + ' m³ registrada para ' + area.name);
      }
    } else if (action === 'demoKeep') {
      state.admin.demo = false;
      save();
      renderDemoNotice();
    } else if (action === 'demoClear') {
      state.areas = [];
      state.admin.demo = false;
      save();
      renderShell();
      renderOverview();
      toast('Dados de exemplo removidos.');
    }
  });

  $('#menuBtn')?.addEventListener('click', openSidebar);
  $('#sidebarBackdrop')?.addEventListener('click', closeSidebar);
  $('#refreshSensors')?.addEventListener('click', () => {
    ensureWeather(state.activeCity, true).then(() => {
      renderShell();
      renderRoute(activeRoute);
      toast('Dados climáticos atualizados.');
    });
  });

  $('#wizBack')?.addEventListener('click', () => {
    if (wizard && wizard.step > 1) { wizard.step--; renderWizard(); }
  });
  $('#wizNext')?.addEventListener('click', () => {
    if (wizard && wizard.step < 4) { wizard.step++; renderWizard(); }
  });
  $('#wCropSearch')?.addEventListener('input', (e) => {
    if (!wizard) return;
    wizard.cropSearch = e.target.value;
    renderCropGrid();
  });

  const bindField = (sel, key, parser = (v) => v, touchKey = null) => {
    $(sel)?.addEventListener('input', (e) => {
      if (!wizard) return;
      wizard.draft[key] = parser(e.target.value);
      if (touchKey) wizard.draft[touchKey] = true;
      renderWizardSummary();
    });
  };
  bindField('#wName', 'name', (v) => v);
  bindField('#wArea', 'area', (v) => clamp(v, 0.01, 50000));
  bindField('#wFlow', 'flow', (v) => clamp(v, 0.1, 50000));
  bindField('#wSource', 'source', (v) => clamp(v, 1, 100000));
  bindField('#wPlanting', 'planting', (v) => v);
  bindField('#wPhase', 'phase', (v) => v);
  bindField('#wSoil', 'soil', (v) => v);
  bindField('#wEto', 'eto', (v) => clamp(v, 0.2, 20), 'etoTouched');
  bindField('#wRain', 'rain', (v) => clamp(v, 0, 500), 'rainTouched');
  bindField('#wTariff', 'tariff', (v) => clamp(v, 0, 50));

  $('#citySearch')?.addEventListener('input', renderClimate);

  window.addEventListener('hashchange', () => {
    const r = location.hash.replace(/^#/, '');
    if (r && ROUTES[r] && r !== activeRoute) navigate(r, true);
  });
}

(function init() {
  if (!state.seeded && !state.areas.length) {
    seedDemo();
  }
  bindEvents();
  applyAuthVisibility();
  renderShell();
  const initialRoute = ROUTES[location.hash.replace(/^#/, '')] ? location.hash.replace(/^#/, '') : 'overview';
  navigate(initialRoute, true);
  ensureWeather(state.activeCity).then(() => {
    renderShell();
    renderRoute(activeRoute);
  });
})();
