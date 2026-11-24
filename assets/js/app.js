/* ============================================================
   AgroÁgua Piauí — aplicação
   ============================================================ */
'use strict';

const DATA = window.MUNICIPIOS_PI;
const CITIES = (DATA && DATA.municipios) || [];
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
const ADMIN_USER = 'admin';
const ADMIN_PASS = '2026';
const SESSION_MS = 8 * 60 * 60 * 1000;
const DEFAULT_CITY = 2211001; // Teresina

/* ============================================================
   Helpers
   ============================================================ */
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
const cityOf = (id) => CITY_BY_ID.get(Number(id)) || CITY_BY_ID.get(DEFAULT_CITY) || CITIES[0];
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

/* ============================================================
   State
   ============================================================ */
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage cheio/privado */ }
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
function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (s && s.exp > Date.now()) return s;
    localStorage.removeItem(SESSION_KEY);
  } catch (e) { /* ignore */ }
  return null;
}
session = loadSession();
const isAdmin = () => !!session && session.exp > Date.now();

function doLogin(user, pass) {
  if (String(user).trim().toLowerCase() === ADMIN_USER && String(pass) === ADMIN_PASS) {
    session = { user: ADMIN_USER, exp: Date.now() + SESSION_MS };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    log('login', 'Login administrativo realizado');
    return true;
  }
  return false;
}
function doLogout() {
  if (session) log('logout', 'Sessão administrativa encerrada');
  session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
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
   View helpers
   ============================================================ */
const ROUTES = {
  overview: { title: 'Visão geral', eyebrow: 'Operação' },
  calculator: { title: 'Calculadora', eyebrow: 'Operação' },
  areas: { title: 'Minhas áreas', eyebrow: 'Operação' },
  agenda: { title: 'Agenda', eyebrow: 'Operação' },
  climate: { title: 'Clima & municípios', eyebrow: 'Análise' },
  reports: { title: 'Relatórios', eyebrow: 'Análise' },
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

/* ============================================================
   Router
   ============================================================ */
function navigate(route, initial = false) {
  if (!ROUTES[route]) route = 'overview';
  activeRoute = route;
  $$('.view').forEach((v) => v.classList.remove('active'));
  const view = $('#view-' + route);
  if (view) view.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.route === route));
  $('#pageTitle').textContent = ROUTES[route].title;
  $('#pageEyebrow').textContent = ROUTES[route].eyebrow;
  if (!initial) {
    try { history.replaceState(null, '', '#' + route); } catch (e) {}
  }
  closeSidebar();
  renderRoute(route);
  window.scrollTo({ top: 0, behavior: initial ? 'auto' : 'smooth' });
}

function renderRoute(route) {
  switch (route) {
    case 'overview': renderOverview(); break;
    case 'calculator': renderWizard(); break;
    case 'areas': renderAreas(); break;
    case 'agenda': renderAgenda(); break;
    case 'climate': renderClimate(); break;
    case 'reports': renderReports(); break;
    case 'admin': renderAdmin(); break;
  }
}
function renderShell() {
  const city = activeCity();
  $('#cityBtnName').textContent = city.nome;
  $('#cityBtn').title = city.nome + ' · ' + cityPopulation(city);
  $('#sideCityName').textContent = city.nome;
  $('#sideCityMeta').textContent = 'PI · ' + cityPopulation(city);
  $('#navAreasCount').textContent = state.areas.length;
  const w = todayWeather(city.id);
  const pill = $('#weatherPill');
  if (w.live) {
    pill.classList.remove('offline');
    $('#weatherLabel').textContent = 'Ao vivo';
    $('#weatherTemp').textContent = Math.round(w.tmax) + '°C';
  } else {
    pill.classList.add('offline');
    $('#weatherLabel').textContent = 'Clima médio';
    $('#weatherTemp').textContent = fmt(city.t2m[nowMonth()], 0) + '°C';
  }
  if (isAdmin()) {
    $('#userAvatar').innerHTML = 'A';
    $('#userRole').textContent = 'Administrador';
    $('#userName').textContent = 'admin';
    $('#adminLock').innerHTML = '<svg><use href="#i-lock"/></svg>';
  } else {
    $('#userAvatar').innerHTML = '<svg><use href="#i-user"/></svg>';
    $('#userRole').textContent = 'Acesso';
    $('#userName').textContent = 'Entrar';
    $('#adminLock').innerHTML = '<svg><use href="#i-lock"/></svg>';
  }
  $('#adminLock').closest('.nav-btn').classList.toggle('admin-on', isAdmin());
}

/* ============================================================
   Overview
   ============================================================ */
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

  $('#ovSub').textContent = city.nome + ' · ' + areas.length + ' áreas · ' + fmt(totalHa, 1) + ' ha monitorados';

  $('#ovKpis').innerHTML = [
    kpi('Áreas', areas.length, totalHa.toFixed(1) + ' ha', 'layers', 'brand'),
    kpi('Demanda de projeto', fmt(demand, 1), 'hoje: ' + fmt(todayDemand, 1) + ' m³', 'drop'),
    kpi('Custo operacional', 'R$ ' + fmt(cost, 2), 'energia + água', 'calc'),
    kpi('Economia potencial', fmt(savedPct, 0) + '%', 'vs. aspersão', 'leaf', savedPct >= 15 ? 'good' : ''),
    kpi('Fonte de água', fmt(source, 0), 'm³/dia', 'map', demand > source ? 'bad' : 'good'),
  ].join('');

  renderDemoNotice();
  renderWater(rows, demand, source, todayDemand);
  renderOverviewWeather(city);
  renderChart($('#ovChart'), city);
  $('#ovDeficit').textContent = 'déficit ' + fmt0(city.deficit) + ' mm/ano';
  $('#ovChartSub').textContent = city.nome + ' · médias mensais 2001–2025';
  renderOverviewAlerts(city, todayRows, todayDemand, source);
  renderOverviewAreas(rows);
}

function kpi(label, value, foot, icon, cls = '') {
  const mod = cls === 'brand' ? 'accent' : cls;
  return `<div class="card kpi ${mod}"><span class="label">${esc(label)}</span><span class="value">${value}</span><span class="foot">${esc(foot)}</span><span class="icon"><svg><use href="#i-${icon}"/></svg></span></div>`;
}

function renderDemoNotice() {
  const el = $('#demoNotice');
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
  const pct = source > 0 ? Math.min(100, (demand / source) * 100) : 0;
  const color = pct > 100 ? 'var(--red)' : pct > 85 ? 'var(--amber)' : 'var(--brand)';
  const areas = rows.length;
  const ha = rows.reduce((s, r) => s + Number(r.area.area), 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  $('#ovWaterBadge').innerHTML = demand > source
    ? '<span class="badge red"><span class="dot"></span>Fonte insuficiente</span>'
    : '<span class="badge green"><span class="dot"></span>Dentro da capacidade</span>';
  $('#ovWater').innerHTML = `
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
  $('#ovForecastSub').textContent = city.nome + ' · ' + (live ? 'previsão ao vivo' : 'estimativa climática');
  $('#ovForecastBadge').innerHTML = live
    ? '<span class="badge green"><span class="dot"></span>ao vivo</span>'
    : '<span class="badge amber"><span class="dot"></span>offline</span>';
  $('#ovWeather').innerHTML = days.map((d, i) => `
    <div class="wday ${d.date === todayISO() ? 'today' : ''}">
      <div class="d">${d.date === todayISO() ? 'Hoje' : dateLong(d.date).split(',')[0]}</div>
      <div class="i">${iconFor(d.rain, d.prob)}</div>
      <div class="r">${fmt(d.rain, 1)} mm</div>
      <div class="t">${fmt(d.tmin, 0)}° / ${fmt(d.tmax, 0)}°</div>
    </div>`).join('');
  $('#ovWeatherNote').textContent = live
    ? 'Atualizado agora via Open-Meteo. A previsão usa o ponto do município.'
    : 'Sem conexão: usando a climatologia do município. Os valores são estimativas.';
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
  const alerts = [];
  const days = forecastFor(city.id);
  const next3 = days.slice(0, 3).reduce((s, d) => s + d.rain, 0);
  const next7 = days.slice(0, 7).reduce((s, d) => s + d.rain, 0);
  const eto = todayWeather(city.id).eto;

  if (!rows.length) {
    alerts.push(alertBox('info', 'Comece por uma área', 'Cadastre um talhão para ver demanda, custo e agenda personalizada.'));
  } else {
    if (demand === 0) {
      alerts.push(alertBox('good', 'Chuva cobre a demanda de hoje', `A previsão atende à necessidade hídrica das áreas. Aproveite para poupar energia e reprogramar a irrigação.`));
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
  $('#ovAlerts').innerHTML = alerts.join('');
}

function alertBox(type, title, text) {
  const icon = type === 'good' ? 'check' : type === 'danger' ? 'alert' : type === 'warn' ? 'sun' : 'info';
  return `<div class="alert ${type}"><svg><use href="#i-${icon}"/></svg><div><strong>${esc(title)}</strong>${esc(text)}</div></div>`;
}

function renderOverviewAreas(rows) {
  if (!rows.length) {
    $('#ovAreas').innerHTML = `<div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-layers"/></svg></div><h3>Nenhuma área neste município</h3><p>Cadastre a primeira área para acompanhar água, energia e produtividade.</p><button class="btn btn-primary btn-sm" data-route="areas"><svg><use href="#i-plus"/></svg>Cadastrar área</button></div>`;
    return;
  }
  const list = rows.slice(0, 5);
  $('#ovAreas').innerHTML = `<div class="table-wrap"><table>
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
   Wizard
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
  $('#wizBadge').textContent = 'Passo ' + step + ' de 4';
  $$('#wizSteps .step').forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('active', n === step);
    el.classList.toggle('done', n < step);
  });
  $$('.step-pane').forEach((el) => el.classList.toggle('active', Number(el.dataset.step) === step));
  $('#wizBack').disabled = step === 1;
  const next = $('#wizNext');
  next.style.visibility = step === 4 ? 'hidden' : 'visible';

  setVal('#wCity', cityOf(d.city).nome);
  $('#wCityHint').textContent = 'Clima de ' + cityOf(d.city).nome + ' · ETo ' + fmt(d.eto, 2) + ' mm/dia';
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
  $('#wEtoHint').textContent = todayWeather(d.city).live ? 'Preenchida pela previsão de hoje.' : 'Estimativa pela climatologia do município.';
  const wRainHint = $('#wRainHint');
  if (wRainHint) {
    const rToday = todayWeather(d.city).rain;
    wRainHint.textContent = rToday > 0
      ? 'Previsão de hoje: ' + fmt(rToday, 1) + ' mm. 80% é considerada aproveitável.'
      : 'Sem chuva prevista hoje. 80% da chuva informada é aproveitável.';
  }
  renderCropGrid();
  renderSystemGrid();
  $('#wKc').value = fmt(kcFor(CROP_BY_ID.get(d.crop), d.phase), 2);
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
  const q = norm(wizard.cropSearch);
  const list = CROPS.filter((c) => !q || norm(c.nome).includes(q));
  $('#wCropGrid').innerHTML = list.map((c) => `
    <button type="button" class="crop-card ${wizard.draft.crop === c.id ? 'sel' : ''}" data-crop="${c.id}">
      <div class="nm"><span>${esc(c.nome)}</span>${wizard.draft.crop === c.id ? '<svg width="13" height="13" style="color:var(--brand)"><use href="#i-check"/></svg>' : ''}</div>
      <div class="meta">${c.ciclo} dias · raiz ${(c.raiz * 100).toFixed(0)} cm</div>
      <div class="kc">Kc ${c.kc[0].toFixed(2)} / ${c.kc[1].toFixed(2)} / ${c.kc[2].toFixed(2)}</div>
    </button>`).join('');
}

function renderSystemGrid() {
  $('#wSysGrid').innerHTML = Object.entries(SYSTEMS).map(([id, s]) => `
    <button type="button" class="sys-card ${wizard.draft.system === id ? 'sel' : ''}" data-system="${id}">
      <div class="nm">${esc(s.nome)}</div>
      <div class="eff">${(s.eff * 100).toFixed(0)}% de eficiência</div>
      <div class="d">${esc(s.desc)}</div>
    </button>`).join('');
}

function renderWizardSummary() {
  const d = wizard.draft;
  const crop = CROP_BY_ID.get(d.crop);
  $('#sumCity').textContent = cityOf(d.city).nome + ' · PI';
  $('#sumBody').innerHTML = [
    sumRow('Cultura', crop?.nome || '—'),
    sumRow('Fase', phaseName(d.phase)),
    sumRow('Área', fmt(d.area, 2) + ' ha'),
    sumRow('Sistema', SYSTEMS[d.system]?.nome || '—'),
    sumRow('Solo', SOILS[d.soil]?.nome || '—'),
    sumRow('ETo de hoje', fmt(d.eto, 2) + ' mm'),
    sumRow('Chuva 24h', fmt(d.rain, 1) + ' mm'),
  ].join('');
  $('#sumFoot').textContent = 'Kc ' + fmt(kcFor(crop, d.phase), 2) + ' · eficiência ' + ((SYSTEMS[d.system]?.eff || 0) * 100).toFixed(0) + '%';
}
function sumRow(k, v) {
  return `<div class="sum-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`;
}

function renderWizardResult() {
  const d = wizard.draft;
  const p = compute({ ...d, kwh: state.settings.kwh, water: state.settings.water });
  const crop = p.crop;
  $('#wResultSub').textContent = `${crop.nome} · ${fmt(d.area, 2)} ha · ${SYSTEMS[d.system].nome} · ${cityOf(d.city).nome}`;
  $('#wVol').textContent = fmt(p.volume, 1);
  $('#wEtc').textContent = fmt(p.etc, 2);
  $('#wGross').textContent = fmt(p.gross, 2);
  $('#wHours').textContent = fmt(p.hours, 1);
  $('#wCost').textContent = fmt(p.cost, 2);
  $('#wVolNote').textContent = p.net === 0
    ? 'A chuva prevista cobre a demanda de hoje. Não precisa irrigar.'
    : `${crop.nome} · Kc ${fmt(p.kc, 2)} · eficiência ${fmt(p.eff * 100, 0)}%`
      + (p.rain > 0 ? ` · com ${fmt(p.rain, 1)} mm de chuva; sem chuva: ${fmt((p.etc / p.eff) * 10 * p.area, 1)} m³/dia` : '');
  $('#wIntervalNote').textContent = `Água disponível na zona radicular: ${fmt(p.available, 0)} mm (solo + raiz de ${fmt(crop.raiz * 100, 0)} cm).`;
  $('#wInterval').textContent = p.interval;
  $('#wEvent').textContent = fmt(p.eventM3, 1);

  const base = Math.max(0.001, (p.net / 0.70) * 10 * p.area);
  const rows = Object.entries(SYSTEMS).map(([id, s]) => ({ id, nome: s.nome, vol: (p.net / s.eff) * 10 * p.area }));
  const max = Math.max(...rows.map((r) => r.vol), 0.001);
  $('#wCompare').innerHTML = rows.map((r) => `
    <div class="compare-row ${r.id === 'gotejamento' ? 'best' : ''}">
      <span>${esc(r.nome)}</span>
      <div class="track"><i style="width:${(r.vol / max) * 100}%"></i></div>
      <span class="val">${fmt(r.vol, 1)} m³</span>
    </div>`).join('');

  const days = forecastFor(d.city);
  $('#wSchedule').innerHTML = days.map((day) => {
    const dd = day.date === todayISO() ? { ...day, rain: p.rain } : day;
    const dp = areaForDay({ ...d, area: d.area }, dd);
    const rec = recFor(dp);
    return `<tr>
      <td>${day.date === todayISO() ? 'Hoje' : dateLong(day.date).split(',')[0]} <span class="tiny muted">${dateShort(day.date)}</span></td>
      <td class="t-right num">${fmt(dd.rain, 1)} mm</td>
      <td class="t-right num">${fmt(dp.gross, 1)} mm</td>
      <td class="t-right num">${fmt(dp.volume, 1)} m³</td>
      <td><span class="badge ${rec.cls}">${rec.label}</span></td>
    </tr>`;
  }).join('');
}

/* ============================================================
   Areas
   ============================================================ */
const areasFilter = { q: '', city: 'all', system: 'all', page: 1 };
const AREAS_PER_PAGE = 10;

function renderAreas() {
  const all = state.areas;
  const totalHa = all.reduce((s, a) => s + Number(a.area), 0);
  const rows = all.map((a) => ({ area: a, p: areaDemand(a, false) }));
  const todayTotal = all.reduce((s, a) => s + areaDemand(a).volume, 0);
  const demand = rows.reduce((s, r) => s + r.p.volume, 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  let design = 0, current = 0;
  rows.forEach((r) => {
    const nr = compute({ crop: r.area.crop, phase: 'prod', area: r.area.area, system: r.area.system, soil: r.area.soil, eto: r.p.eto, rain: 0, flow: r.area.flow || 6, tariff: state.settings.tariff, kwh: state.settings.kwh, water: 0 });
    design += (nr.net / 0.7) * 10 * Number(r.area.area);
    current += nr.volume;
  });
  const pct = design > 0 ? ((design - current) / design) * 100 : 0;
  const savedM3 = Math.max(0, design - current);
  const savedRs = savedM3 * (state.settings.kwh * state.settings.tariff + state.settings.water);

  $('#areasKpis').innerHTML = [
    kpi('Áreas', all.length, 'em ' + new Set(all.map((a) => a.city)).size + ' municípios', 'layers', 'brand'),
    kpi('Área total', fmt(totalHa, 1), 'hectares', 'map'),
    kpi('Demanda de projeto', fmt(demand, 1), 'hoje: ' + fmt(todayTotal, 1) + ' m³', 'drop'),
    kpi('Economia potencial', fmt(pct, 0) + '%', 'R$ ' + fmt(savedRs * 30, 0) + '/mês', 'leaf', pct >= 15 ? 'good' : ''),
  ].join('');

  const cityValues = [...new Set(all.map((a) => Number(a.city)))];
  const optsCity = ['<option value="all">Todos os municípios</option>']
    .concat(cityValues.sort((a, b) => cityOf(a).nome.localeCompare(cityOf(b).nome, 'pt-BR')).map((id) => `<option value="${id}">${esc(cityOf(id).nome)}</option>`));
  $('#areasCityFilter').innerHTML = optsCity.join('');
  $('#areasCityFilter').value = areasFilter.city;
  $('#areasSysFilter').innerHTML = '<option value="all">Todos os sistemas</option>' + Object.entries(SYSTEMS).map(([id, s]) => `<option value="${id}">${esc(s.nome)}</option>`).join('');
  $('#areasSysFilter').value = areasFilter.system;

  renderAreasTable();
}

function filteredAreas() {
  const q = norm(areasFilter.q);
  return state.areas.filter((a) => {
    if (areasFilter.city !== 'all' && Number(a.city) !== Number(areasFilter.city)) return false;
    if (areasFilter.system !== 'all' && a.system !== areasFilter.system) return false;
    if (q && !norm(a.name + ' ' + (CROP_BY_ID.get(a.crop)?.nome || '') + ' ' + cityOf(a.city).nome).includes(q)) return false;
    return true;
  });
}

function renderAreasTable() {
  const list = filteredAreas();
  const pages = Math.max(1, Math.ceil(list.length / AREAS_PER_PAGE));
  areasFilter.page = Math.min(areasFilter.page, pages);
  const slice = list.slice((areasFilter.page - 1) * AREAS_PER_PAGE, areasFilter.page * AREAS_PER_PAGE);

  $('#areasBody').innerHTML = slice.length ? slice.map((a) => {
    const p = areaDemand(a, false);
    const today = areaDemand(a);
    const st = statusFor(today);
    return `<tr>
      <td><div class="cell-main">${esc(a.name)}</div><div class="cell-sub">${fmt(a.area, 2)} ha</div></td>
      <td>${esc(cityOf(a.city).nome)}</td>
      <td>${esc(CROP_BY_ID.get(a.crop)?.nome || a.crop)}</td>
      <td class="t-right num">${fmt(a.area, 2)} ha</td>
      <td>${esc(SYSTEMS[a.system]?.nome || a.system)}</td>
      <td class="t-right num">${fmt(p.volume, 1)} m³<div class="cell-sub">hoje ${fmt(today.volume, 1)}</div></td>
      <td class="t-right num">R$ ${fmt(p.cost, 2)}</td>
      <td><span class="badge ${st.cls}">${st.label}</span></td>
      <td><div class="row-actions">
        <button class="icon-btn" title="Registrar irrigação" data-action="irrigate" data-id="${a.id}"><svg><use href="#i-drop"/></svg></button>
        <button class="icon-btn" title="Remover área" data-action="delArea" data-id="${a.id}"><svg><use href="#i-trash"/></svg></button>
      </div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="9"><div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-layers"/></svg></div><h3>Nenhuma área encontrada</h3><p>Ajuste os filtros ou cadastre uma nova área.</p><button class="btn btn-primary btn-sm" id="emptyNew">Cadastrar área</button></div></td></tr>`;

  $('#areasPager').innerHTML = pagerHtml(list.length, areasFilter.page, pages, 'areas');
  const en = $('#emptyNew');
  if (en) en.addEventListener('click', () => openAreaModal());
}

function pagerHtml(total, page, pages, scope) {
  if (!total) return `<span>0 registros</span><span></span>`;
  const start = (page - 1) * (scope === 'cities' ? 12 : scope === 'adminCities' ? 12 : scope === 'adminAreas' ? 9 : AREAS_PER_PAGE) + 1;
  return `<span>${start}–${Math.min(total, start + (scope === 'cities' ? 11 : scope === 'adminCities' ? 11 : scope === 'adminAreas' ? 8 : 9))} de ${total}</span>
    <span class="pager-btns">
      <button data-page="${scope}" data-dir="-1" ${page <= 1 ? 'disabled' : ''}>‹</button>
      <button class="active">${page}</button>
      <button data-page="${scope}" data-dir="1" ${page >= pages ? 'disabled' : ''}>›</button>
    </span>`;
}

/* ============================================================
   Agenda
   ============================================================ */
let agendaOffset = 0;

function renderAgenda() {
  const city = activeCity();
  const areas = state.areas.filter((a) => Number(a.city) === Number(city.id));
  const days = forecastFor(city.id);
  const day = days[Math.min(agendaOffset, days.length - 1)];
  const rows = areas.map((a) => ({ area: a, p: areaForDay(a, day) }));
  const total = rows.reduce((s, r) => s + r.p.volume, 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  const today = todayWeather(city.id);
  const next = rows.length ? Math.min(...rows.map((r) => r.p.interval)) : 0;

  $('#agendaKpis').innerHTML = [
    kpi('Áreas', areas.length, 'em ' + city.nome, 'layers', 'brand'),
    kpi('Volume do dia', fmt(total, 1), 'm³', 'drop'),
    kpi('Custo estimado', 'R$ ' + fmt(cost, 2), 'energia + água', 'calc'),
    kpi('Próxima irrigação', next ? next + ' dia' + (next > 1 ? 's' : '') : '—', 'recomendação', 'calendar'),
  ].join('');

  $('#agendaDays').innerHTML = days.map((d, i) => `<button data-day="${i}" class="${i === agendaOffset ? 'active' : ''}">${d.date === todayISO() ? 'Hoje' : dateLong(d.date).split(',')[0]}</button>`).join('');
  $('#agendaDayTitle').textContent = day.date === todayISO() ? 'Hoje, ' + dateShort(day.date) : dateLong(day.date);
  $('#agendaDaySub').textContent = (day.live ? 'Previsão ao vivo' : 'Climatologia') + ' · ETo ' + fmt(day.eto, 2) + ' mm/dia · chuva ' + fmt(day.rain, 1) + ' mm';

  $('#agendaBody').innerHTML = rows.length ? rows.map((r) => {
    const rec = recFor(r.p);
    return `<tr>
      <td><div class="cell-main">${esc(r.area.name)}</div><div class="cell-sub">${esc(cityOf(r.area.city).nome)}</div></td>
      <td>${esc(CROP_BY_ID.get(r.area.crop)?.nome || r.area.crop)}</td>
      <td class="t-right num">${fmt(r.p.etc, 1)} mm</td>
      <td class="t-right num">${fmt(day.rain, 1)} mm</td>
      <td class="t-right num">${fmt(r.p.gross, 1)} mm</td>
      <td class="t-right num">${fmt(r.p.volume, 1)} m³</td>
      <td><span class="badge ${rec.cls}">${rec.label}</span></td>
      <td><button class="btn btn-secondary btn-sm" data-action="irrigateDay" data-id="${r.area.id}" data-date="${day.date}">Registrar</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="8"><div class="empty"><div class="ico"><svg width="20" height="20"><use href="#i-calendar"/></svg></div><h3>Sem áreas neste município</h3><p>Cadastre uma área para gerar a agenda de irrigação.</p><button class="btn btn-primary btn-sm" data-route="areas">Cadastrar área</button></div></td></tr>`;

  renderHistory();
}

function renderHistory() {
  const list = state.history.slice().reverse().slice(0, 12);
  $('#histCount').textContent = state.history.length + ' registro' + (state.history.length === 1 ? '' : 's');
  $('#agendaHistory').innerHTML = list.length ? `<div class="table-wrap"><table>
    <thead><tr><th>Data</th><th>Área</th><th>Município</th><th class="t-right">Volume</th><th class="t-right">Custo</th></tr></thead>
    <tbody>${list.map((h) => `<tr><td>${dateShort(h.date)}</td><td>${esc(h.name)}</td><td>${esc(cityOf(h.city).nome)}</td><td class="t-right num">${fmt(h.m3, 1)} m³</td><td class="t-right num">R$ ${fmt(h.cost || 0, 2)}</td></tr>`).join('')}</tbody>
  </table></div>` : '<div class="empty" style="padding:24px"><p>Nenhuma irrigação registrada ainda.</p></div>';
}

/* ============================================================
   Climate
   ============================================================ */
const citiesExplorer = { q: '', page: 1 };
const CITIES_PER_PAGE = 12;

function renderClimate() {
  const city = activeCity();
  const rain = city.chuva;
  const etoMes = city.eto.map((v, i) => v * DAYS[i]);
  const janApr = rain.slice(0, 4).reduce((a, b) => a + b, 0);
  const share = city.chuvaAnual > 0 ? (janApr / city.chuvaAnual) * 100 : 0;
  const peak = city.eto.indexOf(Math.max(...city.eto));
  const dry = MONTHS.filter((m, i) => rain[i] < 60);

  $('#climateKpis').innerHTML = [
    kpi('População', fmt0(city.pop), 'habitantes (IBGE 2023)', 'user', 'brand'),
    kpi('Chuva anual', fmt0(city.chuvaAnual), 'mm/ano', 'cloud'),
    kpi('ETo anual', fmt0(city.etoAnual), 'mm/ano', 'sun'),
    kpi('Déficit hídrico', fmt0(city.deficit), 'mm/ano', 'alert', city.deficit > 400 ? 'warn' : ''),
  ].join('');

  $('#climateChartSub').textContent = city.nome + ' · médias 2001–2025';
  $('#climateTableSub').textContent = city.nome + ' · série mensal';
  renderChart($('#climateChart'), city);

  $('#climateInsights').innerHTML = `
    <ul class="list-clean">
      <li><svg><use href="#i-check"/></svg><span><strong>${fmt(share, 0)}%</strong> da chuva cai entre janeiro e abril.</span></li>
      <li><svg><use href="#i-check"/></svg><span><strong>${dry.length} meses</strong> com menos de 60 mm (${dry.join(', ')}).</span></li>
      <li><svg><use href="#i-check"/></svg><span>Pico de ETo em <strong>${MONTHS[peak]}</strong>: ${fmt(city.eto[peak], 2)} mm/dia.</span></li>
      <li><svg><use href="#i-check"/></svg><span>Déficit anual de <strong>${fmt0(city.deficit)} mm</strong>: a irrigação repõe o que a chuva não cobre.</span></li>
    </ul>
    <div class="notice" style="margin-top:12px"><svg><use href="#i-info"/></svg><span>Quanto maior o déficit, maior a dependência de irrigação e de uma fonte confiável.</span></div>`;

  $('#climateTable').innerHTML = MONTHS.map((m, i) => {
    const bal = rain[i] - etoMes[i];
    const cond = bal < -80 ? '<span class="badge red">déficit alto</span>' : bal < 0 ? '<span class="badge amber">déficit</span>' : '<span class="badge green">superávit</span>';
    return `<tr>
      <td><strong>${m}</strong></td>
      <td class="t-right num">${fmt(rain[i], 0)} mm</td>
      <td class="t-right num">${fmt(etoMes[i], 0)} mm</td>
      <td class="t-right num">${fmt(city.t2m[i], 1)} °C</td>
      <td class="t-right num" style="color:${bal < 0 ? 'var(--amber)' : 'var(--brand-700)'}">${bal > 0 ? '+' : ''}${fmt(bal, 0)} mm</td>
      <td>${cond}</td>
    </tr>`;
  }).join('');

  citiesExplorer.q = $('#citiesSearch') ? $('#citiesSearch').value : citiesExplorer.q;
  renderCitiesTable();
}

function renderCitiesTable() {
  const q = norm(citiesExplorer.q);
  const list = CITIES.filter((c) => !q || norm(c.nome).includes(q));
  const pages = Math.max(1, Math.ceil(list.length / CITIES_PER_PAGE));
  citiesExplorer.page = Math.min(citiesExplorer.page, pages);
  const slice = list.slice((citiesExplorer.page - 1) * CITIES_PER_PAGE, citiesExplorer.page * CITIES_PER_PAGE);
  $('#citiesBody').innerHTML = slice.map((c) => `<tr>
    <td><div class="cell-main">${esc(c.nome)}</div><div class="cell-sub">${c.id}</div></td>
    <td class="t-right num">${fmt0(c.pop)}</td>
    <td class="t-right num">${fmt0(c.chuvaAnual)} mm</td>
    <td class="t-right num">${fmt0(c.etoAnual)} mm</td>
    <td class="t-right num" style="color:var(--amber)">${fmt0(c.deficit)} mm</td>
    <td class="t-right num">${c.mesesSecos}</td>
    <td class="t-right"><button class="btn btn-secondary btn-sm" data-action="useCity" data-id="${c.id}">${Number(c.id) === Number(state.activeCity) ? 'Ativo' : 'Usar'}</button></td>
  </tr>`).join('');
  $('#citiesPager').innerHTML = `<span>${(citiesExplorer.page - 1) * CITIES_PER_PAGE + 1}–${Math.min(list.length, citiesExplorer.page * CITIES_PER_PAGE)} de ${list.length}</span>
    <span class="pager-btns"><button data-page="cities" data-dir="-1" ${citiesExplorer.page <= 1 ? 'disabled' : ''}>‹</button><button class="active">${citiesExplorer.page}</button><button data-page="cities" data-dir="1" ${citiesExplorer.page >= pages ? 'disabled' : ''}>›</button></span>`;
}

/* ============================================================
   Reports
   ============================================================ */
function renderReports() {
  const rows = state.areas.map((a) => ({ area: a, p: areaDemand(a, false) }));
  const demand = rows.reduce((s, r) => s + r.p.volume, 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  let design = 0, current = 0;
  rows.forEach((r) => {
    const nr = compute({ crop: r.area.crop, phase: 'prod', area: r.area.area, system: r.area.system, soil: r.area.soil, eto: r.p.eto, rain: 0, flow: r.area.flow || 6, tariff: state.settings.tariff, kwh: state.settings.kwh, water: 0 });
    design += (nr.net / 0.7) * 10 * Number(r.area.area);
    current += nr.volume;
  });
  const saved = Math.max(0, design - current);
  const savedRs = saved * (state.settings.kwh * state.settings.tariff + state.settings.water);

  $('#reportKpis').innerHTML = [
    kpi('Demanda de projeto', fmt(demand, 1), 'm³/dia', 'drop', 'brand'),
    kpi('Custo diário', 'R$ ' + fmt(cost, 2), 'energia + água', 'calc'),
    kpi('Projeção mensal', fmt(demand * 30, 0), 'm³/mês', 'calendar'),
    kpi('Economia potencial', 'R$ ' + fmt(savedRs * 30, 0), 'por mês vs. aspersão', 'leaf', savedRs > 0 ? 'good' : ''),
  ].join('');

  $('#reportAreasCount').textContent = rows.length + ' área' + (rows.length === 1 ? '' : 's');
  $('#reportAreas').innerHTML = rows.length ? rows.map((r) => `<tr>
    <td><div class="cell-main">${esc(r.area.name)}</div><div class="cell-sub">${esc(cityOf(r.area.city).nome)}</div></td>
    <td>${esc(CROP_BY_ID.get(r.area.crop)?.nome || r.area.crop)}</td>
    <td class="t-right num">${fmt(r.p.volume, 1)}</td>
    <td class="t-right num">R$ ${fmt(r.p.cost, 2)}</td>
    <td class="t-right num">R$ ${fmt(r.p.cost * 30, 0)}</td>
  </tr>`).join('') : '<tr><td colspan="5"><div class="empty"><p>Nenhuma área cadastrada.</p></div></td></tr>';

  $('#reportProjection').innerHTML = `
    <div class="hbar"><div class="top"><span>Volume mensal</span><span class="v">${fmt(demand * 30, 0)} m³</span></div><div class="track"><i style="width:100%"></i></div></div>
    <div class="hbar"><div class="top"><span>Custo mensal estimado</span><span class="v">R$ ${fmt(cost * 30, 2)}</span></div><div class="track"><i style="width:${cost > 0 ? 100 : 0}%;background:var(--amber)"></i></div></div>
    <div class="divider"></div>
    <div class="sum-row"><span class="k">Economia de água vs. aspersão</span><span class="v">${fmt(saved, 1)} m³/dia</span></div>
    <div class="sum-row"><span class="k">Economia financeira estimada</span><span class="v">R$ ${fmt(savedRs, 2)}/dia</span></div>
    <div class="sum-row"><span class="k">Projeção em 12 meses</span><span class="v">R$ ${fmt(savedRs * 365, 0)}</span></div>
    <p class="src">Premissas: 30 dias/mês, ${fmt(state.settings.kwh, 2)} kWh/m³ e R$ ${fmt(state.settings.tariff, 2)}/kWh${state.settings.water > 0 ? ' + R$ ' + fmt(state.settings.water, 2) + '/m³ de água' : ''}.</p>`;

  const hist = state.history.slice().reverse();
  $('#reportHistory').innerHTML = hist.length ? hist.slice(0, 30).map((h) => `<tr>
    <td>${dateShort(h.date)}</td><td>${esc(h.name)}</td><td>${esc(cityOf(h.city).nome)}</td><td class="t-right num">${fmt(h.m3, 1)} m³</td>
  </tr>`).join('') : '<tr><td colspan="4"><div class="empty"><p>Nenhuma irrigação registrada.</p></div></td></tr>';
}

/* ============================================================
   Admin
   ============================================================ */
const adminState = { tab: 'overview', cityQ: '', cityPage: 1, areaQ: '', areaPage: 1 };
const ADMIN_PER_PAGE = 12;

function renderAdmin() {
  const login = $('#adminLogin');
  const panel = $('#adminPanel');
  if (!isAdmin()) {
    login.hidden = false;
    panel.hidden = true;
    setTimeout(() => $('#loginPass')?.focus(), 80);
    return;
  }
  login.hidden = true;
  panel.hidden = false;
  $('#adminSession').textContent = 'Sessão ativa · ' + session.user;
  $$('#adminNav button').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === adminState.tab));
  $$('.admin-tab').forEach((t) => { t.hidden = t.id !== 'admin' + adminState.tab.charAt(0).toUpperCase() + adminState.tab.slice(1); });
  renderAdminTab(adminState.tab);
}

function setAdminTab(tab) {
  adminState.tab = tab;
  $$('#adminNav button').forEach((b) => b.classList.toggle('active', b.dataset.adminTab === tab));
  $$('.admin-tab').forEach((t) => { t.hidden = t.id !== 'admin' + tab.charAt(0).toUpperCase() + tab.slice(1); });
  renderAdminTab(tab);
}

function renderAdminTab(tab) {
  if (tab === 'overview') renderAdminOverview();
  if (tab === 'cities') renderAdminCities();
  if (tab === 'areas') renderAdminAreas();
  if (tab === 'settings') renderAdminSettings();
  if (tab === 'audit') renderAdminAudit();
}

function allAreaRows() {
  return state.areas.map((a) => ({ area: a, p: areaDemand(a, false) }));
}

function renderAdminOverview() {
  const rows = allAreaRows();
  const ha = rows.reduce((s, r) => s + Number(r.area.area), 0);
  const demand = rows.reduce((s, r) => s + r.p.volume, 0);
  const cost = rows.reduce((s, r) => s + r.p.cost, 0);
  const active = activeCities().length;
  $('#adminKpis').innerHTML = [
    kpi('Municípios ativos', active, 'de 224 no Piauí', 'map', 'brand'),
    kpi('Áreas', rows.length, 'cadastradas', 'layers'),
    kpi('Área total', fmt(ha, 1), 'hectares', 'grid'),
    kpi('Demanda total', fmt(demand, 1), 'm³/dia', 'drop'),
    kpi('Custo total', 'R$ ' + fmt(cost, 2), 'por dia', 'calc'),
  ].join('');

  const byCity = {};
  rows.forEach((r) => {
    const id = Number(r.area.city);
    byCity[id] = (byCity[id] || 0) + r.p.volume;
  });
  const top = Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = Math.max(...top.map((t) => t[1]), 1);
  $('#adminTopCities').innerHTML = top.length ? top.map(([id, v]) => `
    <div class="hbar"><div class="top"><span>${esc(cityOf(id).nome)}</span><span class="v">${fmt(v, 1)} m³/dia</span></div><div class="track"><i style="width:${(v / max) * 100}%"></i></div></div>`).join('')
    : '<div class="empty" style="padding:20px"><p>Sem áreas cadastradas.</p></div>';

  const recent = state.admin.log.slice(0, 6);
  $('#adminRecent').innerHTML = recent.length ? recent.map((l) => `<div class="log-item"><span class="dot"></span><div class="msg">${esc(l.msg)}</div><span class="ts">${timeShort(l.ts)}</span></div>`).join('') : '<p class="small muted">Nenhuma atividade registrada.</p>';

  $('#adminCoverage').innerHTML = `
    <div class="sum-row"><span class="k">Municípios disponíveis</span><span class="v">224</span></div>
    <div class="sum-row"><span class="k">Municípios ativos</span><span class="v">${active}</span></div>
    <div class="sum-row"><span class="k">Municípios desativados</span><span class="v">${state.admin.inactive.length}</span></div>
    <div class="sum-row"><span class="k">Municípios com áreas</span><span class="v">${new Set(state.areas.map((a) => a.city)).size}</span></div>
    <div class="sum-row"><span class="k">Fonte climática</span><span class="v">NASA POWER</span></div>
    <p class="src">Cobertura de 100% dos municípios do Piauí com climatologia 2001–2025.</p>`;
}

function renderAdminCities() {
  const q = norm(adminState.cityQ);
  const list = CITIES.filter((c) => !q || norm(c.nome).includes(q));
  const pages = Math.max(1, Math.ceil(list.length / ADMIN_PER_PAGE));
  adminState.cityPage = Math.min(adminState.cityPage, pages);
  const slice = list.slice((adminState.cityPage - 1) * ADMIN_PER_PAGE, adminState.cityPage * ADMIN_PER_PAGE);
  const off = new Set(state.admin.inactive.map(Number));
  $('#adminCitiesBody').innerHTML = slice.map((c) => `<tr>
    <td class="num muted">${c.id}</td>
    <td><div class="cell-main">${esc(c.nome)}</div><div class="cell-sub">${fmt0(c.chuvaAnual)} mm/ano · ${fmt0(c.etoAnual)} mm ETo</div></td>
    <td class="t-right num">${fmt0(c.pop)}</td>
    <td class="t-right num">${fmt0(c.chuvaAnual)}</td>
    <td class="t-right num">${fmt0(c.etoAnual)}</td>
    <td><label class="switch"><input type="checkbox" data-city-toggle="${c.id}" ${off.has(c.id) ? '' : 'checked'}><i></i></label></td>
    <td class="t-right"><button class="btn btn-secondary btn-sm" data-action="useCity" data-id="${c.id}">Abrir</button></td>
  </tr>`).join('');
  $('#adminCitiesPager').innerHTML = `<span>${(adminState.cityPage - 1) * ADMIN_PER_PAGE + 1}–${Math.min(list.length, adminState.cityPage * ADMIN_PER_PAGE)} de ${list.length}</span>
    <span class="pager-btns"><button data-page="adminCities" data-dir="-1" ${adminState.cityPage <= 1 ? 'disabled' : ''}>‹</button><button class="active">${adminState.cityPage}</button><button data-page="adminCities" data-dir="1" ${adminState.cityPage >= pages ? 'disabled' : ''}>›</button></span>`;
}

function renderAdminAreas() {
  const q = norm(adminState.areaQ);
  const list = state.areas.filter((a) => !q || norm(a.name + ' ' + cityOf(a.city).nome + ' ' + (CROP_BY_ID.get(a.crop)?.nome || '')).includes(q));
  const pages = Math.max(1, Math.ceil(list.length / 9));
  adminState.areaPage = Math.min(adminState.areaPage, pages);
  const slice = list.slice((adminState.areaPage - 1) * 9, adminState.areaPage * 9);
  $('#adminAreasBody').innerHTML = slice.length ? slice.map((a) => {
    const p = areaDemand(a, false);
    return `<tr>
      <td><div class="cell-main">${esc(a.name)}</div><div class="cell-sub">${a.id}</div></td>
      <td>${esc(cityOf(a.city).nome)}</td>
      <td>${esc(CROP_BY_ID.get(a.crop)?.nome || a.crop)}</td>
      <td class="t-right num">${fmt(a.area, 2)} ha</td>
      <td>${esc(SYSTEMS[a.system]?.nome || a.system)}</td>
      <td class="t-right num">${fmt(p.volume, 1)} m³</td>
      <td class="t-right"><button class="icon-btn" title="Remover" data-action="adminDelArea" data-id="${a.id}"><svg><use href="#i-trash"/></svg></button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7"><div class="empty"><p>Nenhuma área encontrada.</p></div></td></tr>';
  $('#adminAreasPager').innerHTML = `<span>${list.length ? (adminState.areaPage - 1) * 9 + 1 : 0}–${Math.min(list.length, adminState.areaPage * 9)} de ${list.length}</span>
    <span class="pager-btns"><button data-page="adminAreas" data-dir="-1" ${adminState.areaPage <= 1 ? 'disabled' : ''}>‹</button><button class="active">${adminState.areaPage}</button><button data-page="adminAreas" data-dir="1" ${adminState.areaPage >= pages ? 'disabled' : ''}>›</button></span>`;
}

function renderAdminSettings() {
  $('#setTariff').value = state.settings.tariff;
  $('#setKwh').value = state.settings.kwh;
  $('#setSource').value = state.settings.source;
  $('#setWater').value = state.settings.water;
}

function renderAdminAudit() {
  $('#auditList').innerHTML = state.admin.log.length ? state.admin.log.map((l) => `<div class="log-item"><span class="dot"></span><div class="msg">${esc(l.msg)}</div><span class="ts">${timeShort(l.ts)}</span></div>`).join('') : '<div class="empty" style="padding:24px"><p>Nenhum evento registrado.</p></div>';
}

/* ============================================================
   Modals
   ============================================================ */
let confirmCallback = null;
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  if (id === 'confirmModal') confirmCallback = null;
}
function confirmAction(title, text, cb) {
  $('#confirmTitle').textContent = title;
  $('#confirmText').textContent = text;
  confirmCallback = cb;
  openModal('confirmModal');
}

function openCityModal() {
  const input = $('#citySearch');
  input.value = '';
  renderCityList();
  openModal('cityModal');
  setTimeout(() => input.focus(), 80);
}
function renderCityList() {
  const q = norm($('#citySearch').value);
  const admin = isAdmin();
  const off = new Set(state.admin.inactive.map(Number));
  const list = CITIES.filter((c) => (admin || !off.has(c.id)) && (!q || norm(c.nome).includes(q)));
  $('#cityCount').textContent = list.length + ' município' + (list.length === 1 ? '' : 's');
  $('#cityList').innerHTML = list.length ? list.map((c) => `
    <button class="city-row ${Number(c.id) === Number(state.activeCity) ? 'sel' : ''}" data-city="${c.id}">
      <div class="info"><div class="nm">${esc(c.nome)} ${off.has(c.id) ? '<span class="badge gray">inativo</span>' : ''}</div><div class="meta">${fmt0(c.pop)} hab · ${fmt0(c.chuvaAnual)} mm chuva · ${fmt0(c.etoAnual)} mm ETo</div></div>
      <div class="vals"><b>${c.mesesSecos} meses secos</b>déficit ${fmt0(c.deficit)} mm</div>
    </button>`).join('') : '<div class="empty" style="padding:24px"><p>Nenhum município encontrado.</p></div>';
}

function openAreaModal() {
  const sel = $('#aCity');
  const active = activeCities();
  sel.innerHTML = active.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  sel.value = String(state.activeCity);
  $('#aCrop').innerHTML = CROPS.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  $('#aSystem').innerHTML = Object.entries(SYSTEMS).map(([id, s]) => `<option value="${id}">${esc(s.nome)}</option>`).join('');
  $('#aName').value = '';
  $('#aArea').value = '0.5';
  $('#aFlow').value = '6';
  $('#aSource').value = state.settings.source;
  $('#aPlanting').value = todayISO();
  $('#aCrop').value = 'alface';
  $('#aSystem').value = 'gotejamento';
  openModal('areaModal');
  setTimeout(() => $('#aName').focus(), 80);
}

function createArea(data) {
  const area = {
    id: state.nextId++,
    name: String(data.name || '').trim() || 'Área sem nome',
    city: CITY_BY_ID.has(Number(data.city)) ? Number(data.city) : Number(state.activeCity),
    crop: data.crop,
    phase: 'prod',
    area: clamp(data.area, 0.01, 5000),
    system: data.system,
    soil: data.soil,
    planting: data.planting || todayISO(),
    source: clamp(data.source, 0.5, 10000),
    flow: clamp(data.flow, 0.1, 500),
    createdAt: new Date().toISOString(),
  };
  state.areas.push(area);
  state.admin.demo = false;
  save();
  log('area_add', `Área "${area.name}" cadastrada em ${cityOf(area.city).nome}`);
  return area;
}

/* ============================================================
   CSV
   ============================================================ */
function download(name, text) {
  const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}
const csvCell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
function exportAreas() {
  const rows = [['area', 'municipio', 'cultura', 'hectares', 'sistema', 'solo', 'volume_m3_dia', 'custo_rs_dia', 'custo_rs_mes']];
  state.areas.forEach((a) => {
    const p = areaDemand(a, false);
    rows.push([a.name, cityOf(a.city).nome, CROP_BY_ID.get(a.crop)?.nome || a.crop, fmt(a.area, 2).replace('.', ','), SYSTEMS[a.system]?.nome || a.system, SOILS[a.soil]?.nome || a.soil, fmt(p.volume, 1).replace('.', ','), fmt(p.cost, 2).replace('.', ','), fmt(p.cost * 30, 2).replace('.', ',')]);
  });
  download('agroagua_areas_piaui.csv', rows.map((r) => r.map(csvCell).join(';')).join('\r\n'));
  toast('CSV das áreas gerado.');
}
function exportHistory() {
  const rows = [['data', 'area', 'municipio', 'volume_m3', 'custo_rs']];
  state.history.forEach((h) => rows.push([h.date, h.name, cityOf(h.city).nome, fmt(h.m3, 1).replace('.', ','), fmt(h.cost || 0, 2).replace('.', ',')]));
  download('agroagua_historico_piaui.csv', rows.map((r) => r.map(csvCell).join(';')).join('\r\n'));
  toast('Histórico exportado.');
}
function exportClimate() {
  const c = activeCity();
  const rows = [['mes', 'chuva_mm', 'eto_mm_dia', 'eto_mm_mes', 'temperatura_media_c']];
  MONTHS.forEach((m, i) => rows.push([m, fmt(c.chuva[i], 1).replace('.', ','), fmt(c.eto[i], 2).replace('.', ','), fmt(c.eto[i] * DAYS[i], 0), fmt(c.t2m[i], 1).replace('.', ',')]));
  download('clima_' + norm(c.nome).replace(/\s+/g, '_') + '.csv', rows.map((r) => r.map(csvCell).join(';')).join('\r\n'));
  toast('Série climática exportada.');
}

/* ============================================================
   Irrigation records
   ============================================================ */
function recordIrrigation(area, date, volume, cost) {
  state.history.push({
    id: Date.now() + Math.random(),
    areaId: area.id,
    name: area.name,
    city: area.city,
    date: date || todayISO(),
    m3: volume,
    cost: cost || 0,
  });
  if (state.history.length > 500) state.history = state.history.slice(-500);
  save();
  log('irrig', `Irrigação registrada em "${area.name}" (${fmt(volume, 1)} m³)`);
}

/* ============================================================
   Events
   ============================================================ */
function bindEvents() {
  // router
  document.addEventListener('click', (e) => {
    const adminTabBtn = e.target.closest('[data-admin-tab]');
    if (adminTabBtn && !adminTabBtn.closest('#adminNav')) { setAdminTab(adminTabBtn.dataset.adminTab); return; }
    const routeBtn = e.target.closest('[data-route]');
    if (routeBtn) { navigate(routeBtn.dataset.route); return; }
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) { closeModal(closeBtn.dataset.close); return; }
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      const scope = pageBtn.dataset.page;
      const dir = Number(pageBtn.dataset.dir);
      if (scope === 'areas') { areasFilter.page += dir; renderAreasTable(); }
      if (scope === 'cities') { citiesExplorer.page += dir; renderCitiesTable(); }
      if (scope === 'adminCities') { adminState.cityPage += dir; renderAdminCities(); }
      if (scope === 'adminAreas') { adminState.areaPage += dir; renderAdminAreas(); }
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) handleAction(action.dataset.action, action);
  });

  // sidebar / menu
  $('#menuBtn').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#sidebarBackdrop').classList.add('show'); });
  $('#sidebarBackdrop').addEventListener('click', closeSidebar);

  // city modal
  $('#cityBtn').addEventListener('click', openCityModal);
  $('#citySearch').addEventListener('input', renderCityList);
  $('#cityList').addEventListener('click', (e) => {
    const row = e.target.closest('[data-city]');
    if (row) selectCity(Number(row.dataset.city));
  });

  // user / login
  $('#userBtn').addEventListener('click', () => navigate('admin'));
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = doLogin($('#loginUser').value, $('#loginPass').value);
    if (!ok) {
      $('#loginError').classList.add('show');
      $('#loginPass').value = '';
      return;
    }
    $('#loginError').classList.remove('show');
    $('#loginPass').value = '';
    renderShell();
    renderAdmin();
    toast('Bem-vindo, admin.');
  });
  $('#adminLogout').addEventListener('click', () => {
    doLogout();
    renderShell();
    navigate('overview');
    toast('Sessão encerrada.');
  });

  // area modal
  $('#areasNew').addEventListener('click', openAreaModal);
  $('#areaForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const area = createArea({
      name: $('#aName').value, city: $('#aCity').value, crop: $('#aCrop').value,
      area: $('#aArea').value, system: $('#aSystem').value, soil: $('#aSoil').value,
      planting: $('#aPlanting').value, source: $('#aSource').value, flow: $('#aFlow').value,
    });
    closeModal('areaModal');
    renderShell();
    renderAreas();
    navigate('areas');
    toast('Área "' + area.name + '" adicionada.');
  });

  // confirm
  $('#confirmOk').addEventListener('click', () => {
    const cb = confirmCallback;
    closeModal('confirmModal');
    if (cb) cb();
  });

  // areas
  $('#areasSearch').addEventListener('input', (e) => { areasFilter.q = e.target.value; areasFilter.page = 1; renderAreasTable(); });
  $('#areasCityFilter').addEventListener('change', (e) => { areasFilter.city = e.target.value; areasFilter.page = 1; renderAreasTable(); });
  $('#areasSysFilter').addEventListener('change', (e) => { areasFilter.system = e.target.value; areasFilter.page = 1; renderAreasTable(); });
  $('#areasExport').addEventListener('click', exportAreas);

  // agenda
  $('#agendaDays').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (!b) return;
    agendaOffset = Number(b.dataset.day);
    renderAgenda();
  });
  $('#agendaRefresh').addEventListener('click', () => {
    ensureWeather(state.activeCity, true).then(() => { renderShell(); renderAgenda(); toast('Clima atualizado.'); });
  });

  // climate
  $('#climateChange').addEventListener('click', openCityModal);
  $('#climateExport').addEventListener('click', exportClimate);
  $('#citiesSearch').addEventListener('input', (e) => { citiesExplorer.q = e.target.value; citiesExplorer.page = 1; renderCitiesTable(); });

  // reports
  $('#reportExport').addEventListener('click', exportAreas);
  $('#reportHistoryExport').addEventListener('click', exportHistory);
  $('#reportPrint').addEventListener('click', () => window.print());

  // wizard static fields
  const map = { wName: 'name', wArea: 'area', wFlow: 'flow', wSource: 'source', wPlanting: 'planting', wPhase: 'phase', wSoil: 'soil', wEto: 'eto', wRain: 'rain', wTariff: 'tariff' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      if (key === 'eto') wizard.draft.etoTouched = true;
      if (key === 'rain') wizard.draft.rainTouched = true;
      wizard.draft[key] = el.type === 'number' ? Number(el.value) : el.value;
      $('#wKc').value = fmt(kcFor(CROP_BY_ID.get(wizard.draft.crop), wizard.draft.phase), 2);
      renderWizardSummary();
      if (wizard.step === 4) renderWizardResult();
    });
    el.addEventListener('change', () => {
      if (key === 'eto') wizard.draft.etoTouched = true;
      if (key === 'rain') wizard.draft.rainTouched = true;
      wizard.draft[key] = el.type === 'number' ? Number(el.value) : el.value;
      renderWizard();
    });
  });
  $('#wCropSearch').addEventListener('input', (e) => { wizard.cropSearch = e.target.value; renderCropGrid(); });
  $('#wCropGrid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-crop]');
    if (!card) return;
    wizard.draft.crop = card.dataset.crop;
    renderCropGrid();
    $('#wKc').value = fmt(kcFor(CROP_BY_ID.get(wizard.draft.crop), wizard.draft.phase), 2);
    renderWizardSummary();
  });
  $('#wSysGrid').addEventListener('click', (e) => {
    const card = e.target.closest('[data-system]');
    if (!card) return;
    wizard.draft.system = card.dataset.system;
    renderSystemGrid();
    renderWizardSummary();
  });
  $('#wChangeCity').addEventListener('click', openCityModal);
  $('#wizBack').addEventListener('click', () => { if (wizard.step > 1) { wizard.step--; renderWizard(); } });
  $('#wizNext').addEventListener('click', () => {
    if (!validateStep(wizard.step)) return;
    if (wizard.step < 4) { wizard.step++; renderWizard(); }
  });
  $$('#wizSteps .step').forEach((el) => el.addEventListener('click', () => {
    const n = Number(el.dataset.step);
    if (n < wizard.step) { wizard.step = n; renderWizard(); }
  }));
  $('#wSave').addEventListener('click', () => {
    const d = wizard.draft;
    const area = createArea({ ...d, name: d.name || 'Área ' + cityOf(d.city).nome });
    renderShell();
    renderAreas();
    navigate('areas');
    toast('Área "' + area.name + '" salva.');
  });
  $('#wRegister').addEventListener('click', () => {
    const d = wizard.draft;
    const p = compute({ ...d, kwh: state.settings.kwh, water: state.settings.water });
    recordIrrigation({ id: 0, name: d.name || 'Cálculo avulso', city: d.city }, todayISO(), p.volume, p.cost);
    toast('Irrigação registrada: ' + fmt(p.volume, 1) + ' m³.');
    renderHistory();
  });
  $('#wReset').addEventListener('click', () => { wizard = { step: 1, draft: newDraft(), cropSearch: '' }; renderWizard(); });

  // admin nav
  $('#adminNav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-admin-tab]');
    if (!b) return;
    setAdminTab(b.dataset.adminTab);
  });
  $('#adminCitiesSearch').addEventListener('input', (e) => { adminState.cityQ = e.target.value; adminState.cityPage = 1; renderAdminCities(); });
  $('#adminAreasSearch').addEventListener('input', (e) => { adminState.areaQ = e.target.value; adminState.areaPage = 1; renderAdminAreas(); });
  $('#adminCitiesBody').addEventListener('change', (e) => {
    const t = e.target.closest('[data-city-toggle]');
    if (!t) return;
    toggleCity(Number(t.dataset.cityToggle), t.checked);
  });
  $('#setSave').addEventListener('click', () => {
    state.settings.tariff = clamp($('#setTariff').value, 0, 20);
    state.settings.kwh = clamp($('#setKwh').value, 0, 5);
    state.settings.source = clamp($('#setSource').value, 0.5, 10000);
    state.settings.water = clamp($('#setWater').value, 0, 50);
    save();
    log('settings', 'Parâmetros de cálculo atualizados');
    toast('Configurações salvas.');
    if (activeRoute === 'overview' || activeRoute === 'areas' || activeRoute === 'reports') renderRoute(activeRoute);
  });
  $('#adminSeed').addEventListener('click', () => confirmAction('Recarregar dados de exemplo', 'Isso substitui as áreas e o histórico atuais pelos dados de demonstração.', () => {
    seedDemo();
    wizard = null;
    renderShell();
    renderAdmin();
    toast('Dados de exemplo recarregados.');
  }));
  $('#adminClear').addEventListener('click', () => confirmAction('Limpar dados locais', 'Todas as áreas e todo o histórico deste navegador serão removidos.', () => {
    state.areas = [];
    state.history = [];
    state.admin.demo = false;
    state.nextId = 1;
    save();
    log('clear', 'Dados operacionais limpos');
    wizard = null;
    renderShell();
    renderAdmin();
    toast('Dados locais removidos.');
  }));
  $('#auditClear').addEventListener('click', () => confirmAction('Limpar trilha de auditoria', 'O histórico de eventos administrativos será apagado.', () => {
    state.admin.log = [];
    save();
    renderAdminAudit();
    toast('Trilha limpa.');
  }));

  // modal backdrop / esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['cityModal', 'areaModal', 'confirmModal'].forEach((id) => { if (document.getElementById(id)?.classList.contains('open')) closeModal(id); });
    }
  });
  $$('.modal-backdrop').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close)));

  // hash router
  window.addEventListener('hashchange', () => {
    const r = location.hash.replace('#', '') || 'overview';
    if (ROUTES[r] && r !== activeRoute) navigate(r, true);
  });
}

function validateStep(step) {
  if (step === 1) {
    if (!(Number($('#wArea').value) > 0)) { toast('Informe uma área maior que zero.', 'error'); return false; }
    if (!(Number($('#wFlow').value) > 0)) { toast('Informe a vazão da bomba.', 'error'); return false; }
  }
  if (step === 2 && !wizard.draft.crop) { toast('Escolha uma cultura.', 'error'); return false; }
  if (step === 3) {
    if (!(Number($('#wEto').value) > 0)) { toast('Informe a ETo do dia.', 'error'); return false; }
    if (!(Number($('#wTariff').value) >= 0)) { toast('Confira a tarifa de energia.', 'error'); return false; }
  }
  return true;
}

function handleAction(action, el) {
  const id = Number(el.dataset.id);
  if (action === 'newArea') { openAreaModal(); return; }
  if (action === 'useCity') {
    selectCity(id);
    if (activeRoute === 'admin') navigate('overview');
  }
  if (action === 'demoKeep') {
    state.admin.demo = false;
    save();
    renderDemoNotice();
    toast('Dados de exemplo mantidos.');
  }
  if (action === 'demoClear') {
    confirmAction('Limpar dados de exemplo', 'As áreas e o histórico de exemplo serão removidos. Você pode cadastrar suas próprias áreas depois.', () => {
      state.areas = [];
      state.history = [];
      state.admin.demo = false;
      state.nextId = 1;
      wizard = null;
      save();
      log('clear', 'Dados de exemplo removidos');
      renderShell();
      renderRoute(activeRoute);
      toast('Dados de exemplo removidos.');
    });
  }
  if (action === 'delArea' || action === 'adminDelArea') {
    const area = state.areas.find((a) => Number(a.id) === id);
    if (!area) return;
    confirmAction('Remover área', 'A área "' + area.name + '" e seus registros de irrigação serão removidos.', () => {
      state.areas = state.areas.filter((a) => Number(a.id) !== id);
      state.history = state.history.filter((h) => Number(h.areaId) !== id);
      save();
      log('area_del', 'Área "' + area.name + '" removida');
      renderShell();
      if (activeRoute === 'admin') renderAdmin(); else renderRoute(activeRoute);
      toast('Área removida.');
    });
  }
  if (action === 'irrigate') {
    const area = state.areas.find((a) => Number(a.id) === id);
    if (!area) return;
    const p = areaDemand(area);
    recordIrrigation(area, todayISO(), p.volume, p.cost);
    renderRoute(activeRoute);
    toast('Irrigação registrada: ' + fmt(p.volume, 1) + ' m³.');
  }
  if (action === 'irrigateDay') {
    const area = state.areas.find((a) => Number(a.id) === id);
    if (!area) return;
    const date = el.dataset.date || todayISO();
    const day = forecastFor(area.city).find((d) => d.date === date) || forecastFor(area.city)[0];
    const p = areaForDay(area, day);
    recordIrrigation(area, date, p.volume, p.cost);
    renderRoute(activeRoute);
    toast('Irrigação registrada: ' + fmt(p.volume, 1) + ' m³.');
  }
}

function selectCity(id) {
  const city = cityOf(id);
  if (!city) return;
  const off = state.admin.inactive.map(Number);
  if (off.includes(Number(id)) && !isAdmin()) { toast('Município indisponível.', 'error'); return; }
  state.activeCity = Number(id);
  save();
  closeModal('cityModal');
  if (wizard) {
    wizard.draft.city = Number(id);
    const w = todayWeather(id);
    if (!wizard.draft.etoTouched) wizard.draft.eto = Number(w.eto.toFixed(2));
    if (!wizard.draft.rainTouched) wizard.draft.rain = Number(w.rain.toFixed(1));
  }
  agendaOffset = 0;
  renderShell();
  renderRoute(activeRoute);
  ensureWeather(id).then(() => { renderShell(); renderRoute(activeRoute); });
  toast(city.nome + ' selecionado.');
}

function toggleCity(id, active) {
  if (active) state.admin.inactive = state.admin.inactive.filter((x) => Number(x) !== Number(id));
  else if (!state.admin.inactive.map(Number).includes(Number(id))) state.admin.inactive.push(Number(id));
  if (!active && activeCities().length === 0) {
    state.admin.inactive = state.admin.inactive.filter((x) => Number(x) !== Number(id));
    toast('Mantenha ao menos um município ativo.', 'error');
    renderAdminCities();
    return;
  }
  if (!active && Number(state.activeCity) === Number(id)) {
    const fallback = activeCities().find((c) => c.id === DEFAULT_CITY) || activeCities()[0];
    state.activeCity = fallback ? fallback.id : DEFAULT_CITY;
  }
  save();
  log('city', `Município ${cityOf(id).nome} ${active ? 'ativado' : 'desativado'}`);
  renderShell();
  renderAdminCities();
  toast(cityOf(id).nome + (active ? ' ativado.' : ' desativado.'));
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebarBackdrop').classList.remove('show');
}

/* ============================================================
   Init
   ============================================================ */
function init() {
  if (!CITIES.length) {
    document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif">Base de municípios não carregada. Verifique <code>dados/municipios_pi.js</code>.</div>';
    return;
  }
  if (!state.seeded) seedDemo();
  bindEvents();
  renderShell();
  const route = (location.hash || '#overview').replace('#', '');
  navigate(ROUTES[route] ? route : 'overview', true);
  ensureWeather(state.activeCity).then(() => {
    renderShell();
    if (['overview', 'calculator', 'areas', 'agenda', 'reports'].includes(activeRoute)) renderRoute(activeRoute);
  });
  const otherCities = [...new Set(state.areas.map((a) => Number(a.city)))].filter((id) => id !== Number(state.activeCity)).slice(0, 4);
  otherCities.forEach((id) => ensureWeather(id).then(() => {
    if (['overview', 'areas', 'agenda', 'reports'].includes(activeRoute)) renderRoute(activeRoute);
  }));
}

document.addEventListener('DOMContentLoaded', init);
