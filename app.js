// Demo interactiva: app móvil + panel de administración, sin backend.
// El estado vive en localStorage para que la demo recuerde lo que hace cada visitante.

const STORE_KEY = 'carmelitas-demo-v1';
const DEMO_OTP = '123456';

// ---------- Estado ----------

function seedState() {
  const now = new Date();
  const inDays = (d, h) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    date.setUTCHours(h, 0, 0, 0);
    return date.toISOString();
  };
  return {
    users: [
      { id: 'demo', name: 'Ana Morales', email: 'demo@carmelitas.app', phone: '5512345678', password: 'demo123', country: 'MX', community: 'MX-0', status: 'fiel', provider: 'email', createdAt: now.toISOString() },
    ],
    session: null,
    events: [
      { id: 'e1', title: 'Retiro de oración: "Solo Dios basta"', date: inDays(4, 15), scope: 'all', place: 'En cada comunidad', capacity: 40, enrolled: 27 },
      { id: 'e2', title: 'Encuentro de la Orden Seglar', date: inDays(12, 16), scope: 'all', place: 'En línea', capacity: 120, enrolled: 88 },
      { id: 'e3', title: 'Charla: San Juan de la Cruz, poeta del amor', date: inDays(20, 23), scope: 'all', place: 'En línea', capacity: 200, enrolled: 64 },
    ],
    enrollments: {},
    approvals: SAMPLE_PENDING.map(p => ({ ...p })),
    donations: [],
    log: [],
    prefs: { night: false, notifCommunity: true, notifProvince: true, fontScale: 1 },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...seedState(), ...JSON.parse(raw) };
  } catch (e) { /* storage no disponible */ }
  return seedState();
}

let state = loadState();
const ui = { screen: 'welcome', tab: 'home', overlay: null, draft: {}, errors: {}, filter: 'Todas', reading: 0, player: null, donation: { amount: null, custom: '', purpose: 'Sostenimiento de la comunidad' }, adminScope: 'all' };

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage no disponible */ }
}

// ---------- Utilidades ----------

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const country = code => COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
const community = id => COMMUNITIES.find(c => c.id === id);
const currentUser = () => state.users.find(u => u.id === state.session) || null;
const firstName = name => String(name || '').trim().split(/\s+/)[0];

function niceRound(x) {
  if (x < 10) return Math.round(x);
  const m = Math.pow(10, Math.floor(Math.log10(x)) - 1);
  return Math.round(x / m) * m;
}

function money(amount, code) {
  const c = country(code);
  try {
    return new Intl.NumberFormat('es-' + c.code, { style: 'currency', currency: c.currency, maximumFractionDigits: 0 }).format(amount);
  } catch (e) {
    return `${c.currency} ${Math.round(amount)}`;
  }
}

function suggestedAmounts(code) {
  const c = country(code);
  return [5, 10, 25, 50].map(usd => niceRound(usd * c.rate));
}

function fmtDate(iso, tz, opts) {
  try { return new Intl.DateTimeFormat('es', { timeZone: tz, ...opts }).format(new Date(iso)); } catch (e) { return new Date(iso).toLocaleString('es'); }
}

function localParts(tz) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return { y: Number(get('year')), m: get('month'), d: get('day'), h: Number(get('hour')) % 24 };
}

function nextFeast(tz) {
  const { y, m, d } = localParts(tz);
  const today = `${m}-${d}`;
  let feast = FEASTS.find(f => f.md >= today);
  let year = y;
  if (!feast) { feast = FEASTS[0]; year = y + 1; }
  const target = Date.UTC(year, Number(feast.md.slice(0, 2)) - 1, Number(feast.md.slice(3)));
  const base = Date.UTC(y, Number(m) - 1, Number(d));
  const days = Math.round((target - base) / 864e5);
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const label = `${Number(feast.md.slice(3))} de ${months[Number(feast.md.slice(0, 2)) - 1]}`;
  return { ...feast, days, label };
}

function dayIndex(tz, len) {
  const { y, m, d } = localParts(tz);
  const n = Math.floor((Date.UTC(y, Number(m) - 1, Number(d)) - Date.UTC(y, 0, 0)) / 864e5);
  return n % len;
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function addLog(text) {
  state.log.unshift({ at: new Date().toISOString(), text });
  state.log = state.log.slice(0, 12);
}

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

let pushTimer;
function push(title, body) {
  const el = $('#push');
  el.innerHTML = `<img src="assets/icon.svg" alt=""><div><small>Carmelitas Descalzos · ahora</small><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`;
  el.hidden = false;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  prayer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h5v18H6a2 2 0 01-2-2z"/><path d="M20 5a2 2 0 00-2-2h-5v18h5a2 2 0 002-2z"/></svg>',
  communities: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
};
const TYPE_ICON = { 'Convento': '⛪', 'Parroquia': '✝', 'Monasterio': '🕊', 'Grupo OCDS': '👥' };

// ---------- Pantallas de acceso ----------

function statusBar() {
  const c = currentUser() ? country(currentUser().country) : country('MX');
  const time = fmtDate(new Date().toISOString(), c.tz, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `<div class="statusbar"><span>${time}</span><span>●●● 5G</span></div>`;
}

function viewWelcome() {
  const q = QUOTES[0];
  return `
    <div class="welcome">
      <img class="mark" src="assets/icon.svg" alt="">
      <h2>La familia carmelita, en tu bolsillo</h2>
      <p>Oración diaria, tu comunidad y los eventos de la Orden en 19 países de Latinoamérica.</p>
      <div class="quote-mini">“Solo Dios basta.” · ${esc(q.author)}</div>
      <button class="btn btn-gold" data-action="go" data-to="register">Crear cuenta</button>
      <button class="btn btn-outline" data-action="go" data-to="login">Ya tengo cuenta</button>
      <div class="divider">o continuá con</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-light" data-action="social" data-provider="Google">Google</button>
        <button class="btn btn-light" data-action="social" data-provider="Apple">Apple</button>
      </div>
    </div>`;
}

function countryOptions(selected) {
  return COUNTRIES.map(c => `<option value="${c.code}" ${c.code === selected ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
}

function err(key) {
  return ui.errors[key] ? `<div class="error">${esc(ui.errors[key])}</div>` : '';
}

function viewRegister() {
  const d = ui.draft;
  const c = country(d.country || 'MX');
  return `
    <div class="app-scroll">
      <button class="back" data-action="go" data-to="welcome">← Volver</button>
      <h2 class="screen-title">Crear cuenta</h2>
      <p class="screen-sub">Te toma menos de un minuto.</p>
      <form data-form="register" novalidate>
        <div class="field"><label for="r-name">Nombre y apellido</label><input class="input" id="r-name" name="name" value="${esc(d.name)}" autocomplete="name">${err('name')}</div>
        <div class="field"><label for="r-country">País</label><select class="input" id="r-country" name="country" data-action="draft-country">${countryOptions(c.code)}</select></div>
        <div class="field"><label for="r-phone">Teléfono</label><div class="phone-input"><span class="dial">${c.dial}</span><input class="input" id="r-phone" name="phone" inputmode="tel" value="${esc(d.phone)}" placeholder="Número sin código de país"></div>${err('phone')}</div>
        <div class="field"><label for="r-email">Email (opcional)</label><input class="input" id="r-email" name="email" type="email" value="${esc(d.email)}" autocomplete="email">${err('email')}</div>
        <div class="field"><label for="r-pass">Contraseña</label><input class="input" id="r-pass" name="password" type="password" value="${esc(d.password)}" autocomplete="new-password" placeholder="Mínimo 6 caracteres">${err('password')}</div>
        <label class="check"><input type="checkbox" name="consent" ${d.consent ? 'checked' : ''}><span>Acepto los términos y el aviso de privacidad, y doy mi consentimiento para el tratamiento de datos sobre mi pertenencia religiosa.</span></label>
        ${err('consent')}
        <button class="btn btn-primary" type="submit">Continuar</button>
      </form>
    </div>`;
}

function viewOtp() {
  const d = ui.draft;
  const c = country(d.country || 'MX');
  return `
    <div class="app-scroll">
      <button class="back" data-action="go" data-to="register">← Volver</button>
      <h2 class="screen-title">Verificá tu teléfono</h2>
      <p class="screen-sub">Te enviamos un código por SMS o WhatsApp al ${c.dial} ${esc(d.phone)}.</p>
      <div class="hint">Demo: el código es <b>${DEMO_OTP}</b>.</div>
      <form data-form="otp" novalidate>
        <div class="field"><input class="input otp" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="······" autofocus>${err('code')}</div>
        <button class="btn btn-primary" type="submit">Verificar</button>
      </form>
      <button class="btn btn-outline" data-action="resend">Reenviar código</button>
    </div>`;
}

function viewLogin() {
  return `
    <div class="app-scroll">
      <button class="back" data-action="go" data-to="welcome">← Volver</button>
      <h2 class="screen-title">Bienvenido de nuevo</h2>
      <p class="screen-sub">Entrá con tu email o tu teléfono.</p>
      <div class="hint">Cuenta de prueba: <b>demo@carmelitas.app</b> · contraseña <b>demo123</b></div>
      <form data-form="login" novalidate>
        <div class="field"><label for="l-id">Email o teléfono</label><input class="input" id="l-id" name="id" value="${esc(ui.draft.loginId)}" autocomplete="username"></div>
        <div class="field"><label for="l-pass">Contraseña</label><input class="input" id="l-pass" name="password" type="password" autocomplete="current-password">${err('login')}</div>
        <button class="btn btn-primary" type="submit">Entrar</button>
      </form>
      <button class="btn btn-outline" data-action="toast" data-text="Te enviaríamos un código para recuperar tu cuenta.">Olvidé mi contraseña</button>
      <div class="divider">o</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" data-action="social" data-provider="Google">Google</button>
        <button class="btn btn-outline" data-action="social" data-provider="Apple">Apple</button>
      </div>
    </div>`;
}

function viewCommunity() {
  const u = currentUser();
  const code = ui.draft.pickCountry || u.country;
  const list = COMMUNITIES.filter(c => c.country === code);
  const picked = ui.draft.pickCommunity || u.community;
  return `
    <div class="app-scroll">
      <h2 class="screen-title">Tu comunidad</h2>
      <p class="screen-sub">Elegí la comunidad carmelita más cercana. Vas a ver sus horarios, avisos y eventos.</p>
      <div class="field"><label for="c-country">País</label><select class="input" id="c-country" data-action="pick-country">${countryOptions(code)}</select></div>
      ${list.map(c => `
        <button class="list-item ${picked === c.id ? 'selected' : ''}" data-action="pick-community" data-id="${c.id}">
          <span class="ico">${TYPE_ICON[c.type]}</span>
          <span class="grow"><strong>${esc(c.name)}</strong><span>${esc(c.type)} · ${esc(c.city)} · ${c.distanceKm} km</span></span>
        </button>`).join('')}
      <label class="check"><input type="checkbox" id="c-member" ${ui.draft.member ? 'checked' : ''} data-action="toggle-member"><span>Pertenezco a la Orden Seglar (OCDS) o a un grupo de esta comunidad. El responsable va a confirmar mi pertenencia.</span></label>
      <button class="btn btn-primary" data-action="confirm-community" ${picked ? '' : 'disabled'}>Entrar a la app</button>
    </div>`;
}

// ---------- App principal ----------

function viewHome(u) {
  const c = country(u.country);
  const hour = localParts(c.tz).h;
  const greet = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const reading = READINGS[dayIndex(c.tz, READINGS.length)];
  const quote = QUOTES[dayIndex(c.tz, QUOTES.length)];
  const feast = nextFeast(c.tz);
  const ev = visibleEvents(u)[0];
  return `
    <p class="hello">${greet}, ${esc(firstName(u.name))}</p>
    <p class="hello-sub">${fmtDate(new Date().toISOString(), c.tz, { weekday: 'long', day: 'numeric', month: 'long' })} · ${esc(c.name)}</p>
    <div class="card card-hero">
      <div class="card-label">Evangelio orado del día</div>
      <h3>${esc(reading.ref)}</h3>
      <p>${esc(reading.text.split('. ')[0])}.</p>
      <div class="card-row"><button class="btn btn-gold btn-small" data-action="open-reading">Rezar ahora · 8 min</button><span class="meta" style="color:var(--cream-200)">Audio y texto</span></div>
    </div>
    <div class="card">
      <div class="card-label">${feast.days === 0 ? 'Hoy celebramos' : 'Próxima fiesta carmelita'}</div>
      <h3>${esc(feast.name)}</h3>
      <p>${feast.days === 0 ? 'Fiesta de la Orden' : `${feast.label} · faltan ${feast.days} días`}</p>
    </div>
    ${ev ? `
    <div class="card">
      <div class="card-label">Próximo evento</div>
      <h3>${esc(ev.title)}</h3>
      <p>${fmtDate(ev.date, c.tz, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} · ${esc(ev.place)}</p>
      <div class="card-row"><button class="btn btn-outline btn-small" data-action="tab" data-tab="events">Ver eventos</button></div>
    </div>` : ''}
    <div class="card card-quote"><p>“${esc(quote.text)}”</p><small>${esc(quote.author)}</small></div>
    <div class="card">
      <div class="card-label">Donativos</div>
      <h3>Sostené la misión de tu comunidad</h3>
      <p>${c.provider ? `Pago seguro con ${esc(c.provider)}, en ${esc(c.currency)}.` : 'Los donativos todavía no están disponibles en tu país.'}</p>
      <div class="card-row"><button class="btn btn-primary btn-small" data-action="open-donate" ${c.provider ? '' : 'disabled'}>Donar</button></div>
    </div>`;
}

function viewPrayer() {
  return `
    <h2 class="screen-title">Oración</h2>
    <p class="screen-sub">Audios y textos para cada momento del día. Se descargan para rezar sin conexión.</p>
    ${PRAYERS.map(p => `
      <div class="list-item">
        <span class="ico">${p.kind === 'Texto' ? '📖' : '🎧'}</span>
        <span class="grow"><strong>${esc(p.title)}</strong><span>${p.minutes} min · ${esc(p.kind)}</span></span>
        ${p.kind === 'Texto'
          ? `<button class="play" aria-label="Leer ${esc(p.title)}" data-action="open-reading">→</button>`
          : `<button class="play" aria-label="Escuchar ${esc(p.title)}" data-action="play" data-id="${p.id}">${ui.player && ui.player.id === p.id && ui.player.playing ? '❚❚' : '▶'}</button>`}
      </div>`).join('')}
    <div class="card card-quote" style="margin-top:14px"><p>“${esc(QUOTES[1].text)}”</p><small>${esc(QUOTES[1].author)}</small></div>`;
}

function viewCommunities(u) {
  const types = ['Todas', ...COMMUNITY_TYPES];
  const list = COMMUNITIES.filter(c => c.country === u.country && (ui.filter === 'Todas' || c.type === ui.filter));
  const c = country(u.country);
  return `
    <h2 class="screen-title">Comunidades</h2>
    <p class="screen-sub">${esc(c.name)} · ${COMMUNITIES.filter(x => x.country === u.country).length} comunidades de ejemplo</p>
    <div class="chips">${types.map(t => `<button class="chip ${ui.filter === t ? 'active' : ''}" data-action="filter" data-type="${t}">${t}</button>`).join('')}</div>
    ${list.length ? list.map(x => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <h3>${esc(x.name)}</h3>
          ${u.community === x.id ? '<span class="tag good">Mi comunidad</span>' : `<span class="tag">${esc(x.type)}</span>`}
        </div>
        <p>${esc(x.city)} · a ${x.distanceKm} km</p>
        <p class="meta">${esc(x.schedule)}</p>
        <div class="card-row">
          <button class="btn btn-outline btn-small" data-action="toast" data-text="Abriría la ruta en Google Maps.">Cómo llegar</button>
          ${u.community === x.id ? '' : `<button class="btn btn-primary btn-small" data-action="set-community" data-id="${x.id}">Elegir</button>`}
        </div>
      </div>`).join('') : '<p class="screen-sub">No hay comunidades de este tipo en tu país.</p>'}`;
}

function visibleEvents(u) {
  return state.events
    .filter(e => e.scope === 'all' || e.scope === u.country)
    .filter(e => new Date(e.date) > new Date(Date.now() - 864e5))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function viewEvents(u) {
  const c = country(u.country);
  const list = visibleEvents(u);
  const mine = state.enrollments[u.id] || [];
  return `
    <h2 class="screen-title">Eventos</h2>
    <p class="screen-sub">Horarios en la hora de ${esc(c.name)}.</p>
    ${list.map(e => {
      const enrolled = mine.includes(e.id);
      const left = e.capacity - e.enrolled;
      return `
      <div class="card">
        <div style="display:flex;gap:12px">
          <div class="date-badge"><b>${fmtDate(e.date, c.tz, { day: 'numeric' })}</b><small>${fmtDate(e.date, c.tz, { month: 'short' })}</small></div>
          <div style="flex:1;min-width:0">
            <h3>${esc(e.title)}</h3>
            <p>${fmtDate(e.date, c.tz, { weekday: 'long', hour: '2-digit', minute: '2-digit' })} · ${esc(e.place)}</p>
            <p class="meta">${e.scope === 'all' ? 'Toda la región' : `${esc(country(e.scope).name)}`} · ${left > 0 ? `quedan ${left} lugares` : 'cupo completo'}${e.isNew ? ' · <span class="tag warn">Nuevo</span>' : ''}</p>
          </div>
        </div>
        <div class="card-row">
          <span class="meta">${e.enrolled} inscriptos</span>
          ${enrolled
            ? `<button class="btn btn-outline btn-small" data-action="enroll" data-id="${e.id}">✓ Inscripto · cancelar</button>`
            : `<button class="btn btn-primary btn-small" data-action="enroll" data-id="${e.id}" ${left > 0 ? '' : 'disabled'}>Inscribirme</button>`}
        </div>
      </div>`;
    }).join('') || '<p class="screen-sub">No hay eventos próximos.</p>'}`;
}

function statusTag(u) {
  if (u.status === 'pendiente') return '<span class="tag warn">Miembro OCDS · pendiente de aprobación</span>';
  if (u.status === 'miembro') return '<span class="tag good">Miembro OCDS · aprobado</span>';
  return '<span class="tag">Fiel</span>';
}

function viewProfile(u) {
  const c = country(u.country);
  const com = community(u.community);
  const p = state.prefs;
  const sw = (key, label) => `<div class="setting"><span>${label}</span><label class="switch"><input type="checkbox" data-action="pref" data-key="${key}" ${p[key] ? 'checked' : ''}><span></span></label></div>`;
  return `
    <div class="avatar">${esc(initials(u.name))}</div>
    <h2 class="screen-title" style="font-size:26px">${esc(u.name)}</h2>
    <p class="screen-sub" style="margin-bottom:8px">${esc(c.name)} · ${esc(com ? `${com.name}, ${com.city}` : 'Sin comunidad')}</p>
    <div style="margin-bottom:18px">${statusTag(u)}</div>
    <div class="card">
      ${sw('notifCommunity', 'Avisos de mi comunidad')}
      ${sw('notifProvince', 'Avisos de la provincia')}
      ${sw('night', 'Modo lectura nocturna')}
    </div>
    <div class="card">
      <div class="setting"><span>Cambiar de comunidad</span><button class="btn btn-outline btn-small" data-action="change-community">Cambiar</button></div>
      <div class="setting"><span>Mis donativos</span><span class="meta">${state.donations.filter(d => d.user === u.id).length} realizados</span></div>
      <div class="setting"><span>Descargar mis datos</span><button class="btn btn-outline btn-small" data-action="export">Descargar</button></div>
      <div class="setting"><span class="danger">Borrar mi cuenta</span><button class="btn btn-outline btn-small danger" data-action="delete-account">Borrar</button></div>
    </div>
    <button class="btn btn-outline" data-action="logout">Cerrar sesión</button>
    <p class="meta" style="text-align:center">Versión demo 0.1 · Aviso de privacidad · Términos</p>`;
}

function tabsBar() {
  const tabs = [['home', 'Inicio'], ['prayer', 'Oración'], ['communities', 'Comunidades'], ['events', 'Eventos'], ['profile', 'Perfil']];
  return `<nav class="tabs" aria-label="Secciones de la app">${tabs.map(([k, label]) => `<button class="tab ${ui.tab === k ? 'active' : ''}" data-action="tab" data-tab="${k}" aria-current="${ui.tab === k ? 'page' : 'false'}">${ICONS[k]}${label}</button>`).join('')}</nav>`;
}

function playerBar() {
  if (!ui.player) return '';
  const p = PRAYERS.find(x => x.id === ui.player.id);
  return `<div class="player"><div class="grow"><strong>${esc(p.title)}</strong><div class="progress"><i style="width:${ui.player.progress}%"></i></div></div><button data-action="play" data-id="${p.id}" aria-label="Pausar o reanudar">${ui.player.playing ? '❚❚' : '▶'}</button></div>`;
}

// ---------- Overlays ----------

function viewReading(u) {
  const c = country(u.country);
  const r = READINGS[dayIndex(c.tz, READINGS.length)];
  return `
    <div class="app-scroll" style="--fs:${state.prefs.fontScale}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <button class="back" style="margin:0" data-action="close-overlay">← Volver</button>
        <div class="fs-controls"><button data-action="font" data-dir="-1" aria-label="Achicar texto">A−</button><button data-action="font" data-dir="1" aria-label="Agrandar texto">A+</button></div>
      </div>
      <div class="card-label">Evangelio orado · ${fmtDate(new Date().toISOString(), c.tz, { day: 'numeric', month: 'long' })}</div>
      <h2 class="screen-title">${esc(r.ref)}</h2>
      <p class="reading-text">${esc(r.text)}</p>
      <p class="reading-prayer">${esc(r.prayer)}</p>
      <p class="meta">Texto de ejemplo. En la app real, la lectura sale del calendario litúrgico y la meditación la escribe la Orden.</p>
      <button class="btn btn-primary" data-action="play" data-id="p1" style="margin-top:12px">▶ Escuchar la meditación</button>
    </div>`;
}

function viewDonate(u) {
  const c = country(u.country);
  const amounts = suggestedAmounts(u.country);
  const d = ui.donation;
  const value = d.custom ? Number(d.custom) : d.amount;
  return `
    <div class="app-scroll">
      <button class="back" data-action="close-overlay">← Volver</button>
      <h2 class="screen-title">Hacer un donativo</h2>
      <p class="screen-sub">Llega a la cuenta de tu provincia. Recibís el comprobante al instante.</p>
      <div class="amounts">${amounts.map(a => `<button class="amount ${!d.custom && d.amount === a ? 'active' : ''}" data-action="amount" data-value="${a}">${money(a, u.country)}</button>`).join('')}</div>
      <div class="field"><label for="d-custom">Otro monto (${esc(c.currency)})</label><input class="input" id="d-custom" inputmode="numeric" value="${esc(d.custom)}" data-action="custom-amount" placeholder="Ingresá un monto"></div>
      <div class="field"><label for="d-purpose">Destino</label><select class="input" id="d-purpose" data-action="purpose">${['Sostenimiento de la comunidad', 'Misiones', 'Formación de vocaciones', 'Obras sociales'].map(p => `<option ${d.purpose === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <button class="btn btn-gold" data-action="donate" ${value > 0 ? '' : 'disabled'}>${value > 0 ? `Donar ${money(value, u.country)}` : 'Elegí un monto'}</button>
      <div class="secure">🔒 Pago seguro con ${esc(c.provider)} · simulado en esta demo</div>
    </div>`;
}

function viewProcessing() {
  return `<div class="app-scroll" style="text-align:center"><div class="spinner"></div><p class="screen-sub">Procesando el pago…</p></div>`;
}

function viewReceipt(u) {
  const d = state.donations.find(x => x.id === ui.lastDonation);
  const c = country(u.country);
  return `
    <div class="app-scroll receipt">
      <div class="ok">✓</div>
      <h2 class="screen-title">¡Gracias, ${esc(firstName(u.name))}!</h2>
      <p class="screen-sub">Tu donativo fue recibido.</p>
      <dl>
        <div><dt>Monto</dt><dd>${money(d.amount, u.country)}</dd></div>
        <div><dt>Destino</dt><dd>${esc(d.purpose)}</dd></div>
        <div><dt>Medio</dt><dd>${esc(c.provider)}</dd></div>
        <div><dt>Comprobante</dt><dd>${esc(d.id)}</dd></div>
      </dl>
      <button class="btn btn-primary" data-action="close-overlay">Volver al inicio</button>
    </div>`;
}

// ---------- Render de la app ----------

function renderApp() {
  const screen = $('#screen');
  const u = currentUser();
  screen.classList.toggle('night', !!(u && state.prefs.night));
  let html = statusBar();

  if (!u) {
    const views = { welcome: viewWelcome, register: viewRegister, otp: viewOtp, login: viewLogin };
    html += (views[ui.screen] || viewWelcome)();
  } else if (!u.community || ui.screen === 'community') {
    html += viewCommunity();
  } else if (ui.overlay) {
    const overlays = { reading: viewReading, donate: viewDonate, processing: viewProcessing, receipt: viewReceipt };
    html += overlays[ui.overlay](u);
  } else {
    const views = { home: viewHome, prayer: viewPrayer, communities: viewCommunities, events: viewEvents, profile: viewProfile };
    html += `<div class="app-scroll with-tabs">${views[ui.tab](u)}</div>${playerBar()}${tabsBar()}`;
  }
  const scroller = screen.querySelector('.app-scroll');
  const keepScroll = scroller && screen.dataset.view === viewKey() ? scroller.scrollTop : 0;
  screen.innerHTML = html;
  screen.dataset.view = viewKey();
  const next = screen.querySelector('.app-scroll');
  if (next) next.scrollTop = keepScroll;
}

function viewKey() {
  return [state.session, ui.screen, ui.tab, ui.overlay].join('|');
}

// ---------- Acciones de la app ----------

function createSession(user) {
  state.session = user.id;
  ui.screen = user.community ? 'main' : 'community';
  ui.tab = 'home';
  ui.overlay = null;
  ui.draft = { pickCountry: user.country };
  save();
}

function submitRegister(form) {
  const f = Object.fromEntries(new FormData(form));
  f.consent = form.consent.checked;
  ui.draft = { ...ui.draft, ...f };
  const e = {};
  if (f.name.trim().length < 3) e.name = 'Escribí tu nombre completo.';
  if (f.phone.replace(/\D/g, '').length < 7) e.phone = 'Ingresá un teléfono válido.';
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'El email no parece válido.';
  if (f.password.length < 6) e.password = 'Usá al menos 6 caracteres.';
  if (!f.consent) e.consent = 'Necesitamos tu consentimiento para crear la cuenta.';
  const phone = f.phone.replace(/\D/g, '');
  if (!e.phone && state.users.some(u => u.phone === phone && u.country === f.country)) e.phone = 'Ese teléfono ya tiene cuenta. Iniciá sesión.';
  ui.errors = e;
  if (Object.keys(e).length) return renderApp();
  ui.screen = 'otp';
  renderApp();
  setTimeout(() => push('Código de verificación', `Tu código de Carmelitas Descalzos es ${DEMO_OTP}.`), 600);
}

function submitOtp(form) {
  const code = form.code.value.trim();
  if (code !== DEMO_OTP) {
    ui.errors = { code: 'El código no es correcto.' };
    return renderApp();
  }
  const d = ui.draft;
  const user = {
    id: 'u' + Date.now(), name: d.name.trim(), email: d.email.trim(), phone: d.phone.replace(/\D/g, ''),
    password: d.password, country: d.country || 'MX', community: null, status: 'fiel', provider: 'teléfono', createdAt: new Date().toISOString(),
  };
  state.users.push(user);
  addLog(`Nuevo registro: ${user.name} (${country(user.country).name})`);
  ui.errors = {};
  createSession(user);
  renderAll();
  toast('Cuenta creada. ¡Bienvenido!');
}

function submitLogin(form) {
  const id = form.id.value.trim().toLowerCase();
  const pass = form.password.value;
  ui.draft.loginId = form.id.value;
  const digits = id.replace(/\D/g, '');
  const user = state.users.find(u => (u.email && u.email.toLowerCase() === id) || (digits.length >= 7 && u.phone === digits));
  if (!user || user.password !== pass) {
    ui.errors = { login: 'Email, teléfono o contraseña incorrectos.' };
    return renderApp();
  }
  ui.errors = {};
  createSession(user);
  renderAll();
}

function socialLogin(provider) {
  let user = state.users.find(u => u.provider === provider);
  if (!user) {
    user = { id: 'u' + Date.now(), name: provider === 'Google' ? 'Carlos Méndez' : 'Sofía Herrera', email: `${provider.toLowerCase()}@ejemplo.com`, phone: '', password: null, country: 'CO', community: null, status: 'fiel', provider, createdAt: new Date().toISOString() };
    state.users.push(user);
    addLog(`Nuevo registro con ${provider}: ${user.name}`);
  }
  createSession(user);
  renderAll();
  toast(`Sesión iniciada con ${provider} (simulado).`);
}

function confirmCommunity() {
  const u = currentUser();
  const picked = ui.draft.pickCommunity || u.community;
  if (!picked) return;
  const com = community(picked);
  u.community = picked;
  u.country = com.country;
  if (ui.draft.member && u.status === 'fiel') {
    u.status = 'pendiente';
    state.approvals.unshift({ id: u.id, name: u.name, country: u.country, community: picked, group: 'Grupo OCDS', isNew: true });
    addLog(`Solicitud de pertenencia: ${u.name}`);
  }
  ui.screen = 'main';
  ui.tab = 'home';
  save();
  renderAll();
}

function enroll(id) {
  const u = currentUser();
  const ev = state.events.find(e => e.id === id);
  const mine = state.enrollments[u.id] || [];
  if (mine.includes(id)) {
    state.enrollments[u.id] = mine.filter(x => x !== id);
    ev.enrolled -= 1;
    toast('Inscripción cancelada.');
  } else {
    state.enrollments[u.id] = [...mine, id];
    ev.enrolled += 1;
    addLog(`${u.name} se inscribió en "${ev.title}"`);
    toast('¡Listo! Te vamos a recordar el evento un día antes.');
  }
  save();
  renderAll();
}

let playerTimer;
function togglePlay(id) {
  if (ui.player && ui.player.id === id) {
    ui.player.playing = !ui.player.playing;
  } else {
    ui.player = { id, playing: true, progress: 0 };
  }
  clearInterval(playerTimer);
  if (ui.player.playing) {
    playerTimer = setInterval(() => {
      ui.player.progress = Math.min(100, ui.player.progress + 2);
      const bar = document.querySelector('.player .progress i');
      if (bar) bar.style.width = ui.player.progress + '%';
      if (ui.player.progress >= 100) { ui.player.playing = false; clearInterval(playerTimer); renderApp(); }
    }, 1000);
  }
  if (ui.overlay === 'reading') { ui.overlay = null; ui.tab = 'prayer'; }
  renderApp();
}

function donate() {
  const u = currentUser();
  const d = ui.donation;
  const amount = d.custom ? Number(d.custom) : d.amount;
  if (!(amount > 0)) return;
  ui.overlay = 'processing';
  renderApp();
  setTimeout(() => {
    const id = 'CR-' + String(Date.now()).slice(-7);
    state.donations.push({ id, user: u.id, country: u.country, amount, usd: amount / country(u.country).rate, purpose: d.purpose, at: new Date().toISOString() });
    addLog(`Donativo de ${money(amount, u.country)} (${country(u.country).name})`);
    ui.lastDonation = id;
    ui.overlay = 'receipt';
    ui.donation = { amount: null, custom: '', purpose: 'Sostenimiento de la comunidad' };
    save();
    renderAll();
  }, 1400);
}

function exportData() {
  const u = currentUser();
  const data = {
    perfil: { nombre: u.name, email: u.email, telefono: u.phone, pais: country(u.country).name, comunidad: community(u.community)?.name, estado: u.status },
    inscripciones: (state.enrollments[u.id] || []).map(id => state.events.find(e => e.id === id)?.title),
    donativos: state.donations.filter(d => d.user === u.id),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mis-datos-carmelitas.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Descargamos un archivo con tus datos.');
}

// ---------- Panel de administración ----------

function adminUsersByCountry() {
  const counts = { ...SAMPLE_USERS_BY_COUNTRY };
  state.users.filter(u => u.id !== 'demo').forEach(u => { counts[u.country] = (counts[u.country] || 0) + 1; });
  return counts;
}

function renderAdmin() {
  const el = $('#side-admin');
  const scope = ui.adminScope;
  const counts = adminUsersByCountry();
  const inScope = code => scope === 'all' || scope === code;
  const totalUsers = Object.entries(counts).filter(([k]) => inScope(k)).reduce((s, [, v]) => s + v, 0);
  const localNew = state.users.filter(u => u.id !== 'demo' && inScope(u.country)).length;
  const baseNew = scope === 'all' ? 86 : Math.max(1, Math.round((SAMPLE_USERS_BY_COUNTRY[scope] || 0) * 0.07));
  const donationsUsd = (scope === 'all' ? 3420 : Math.round((SAMPLE_USERS_BY_COUNTRY[scope] || 0) * 2.7))
    + state.donations.filter(d => inScope(d.country)).reduce((s, d) => s + d.usd, 0);
  const enrolled = state.events.filter(e => scope === 'all' || e.scope === 'all' || e.scope === scope).reduce((s, e) => s + e.enrolled, 0);
  const rows = Object.entries(counts).filter(([k]) => inScope(k)).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const max = Math.max(...rows.map(r => r[1]), 1);
  const approvals = state.approvals.filter(a => inScope(a.country));

  el.innerHTML = `
    <div class="admin-head">
      <div>
        <p class="eyebrow">Panel web · Superadministrador</p>
        <h1>Panel de administración</h1>
        <p>Lo que publiques acá llega a la app del teléfono en el momento.</p>
      </div>
      <label class="scope">Alcance
        <select data-admin="scope">
          <option value="all" ${scope === 'all' ? 'selected' : ''}>Toda la región</option>
          ${COUNTRIES.map(c => `<option value="${c.code}" ${scope === c.code ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="kpis">
      <div class="kpi"><span>Usuarios registrados</span><b>${totalUsers.toLocaleString('es')}</b><small>datos de ejemplo</small></div>
      <div class="kpi"><span>Nuevos esta semana</span><b>${(baseNew + localNew).toLocaleString('es')}</b><small>${localNew ? `+${localNew} desde esta demo` : 'datos de ejemplo'}</small></div>
      <div class="kpi"><span>Donativos del mes</span><b>USD ${Math.round(donationsUsd).toLocaleString('es')}</b><small>equivalente en dólares</small></div>
      <div class="kpi"><span>Inscripciones a eventos</span><b>${enrolled.toLocaleString('es')}</b><small>eventos activos</small></div>
    </div>

    <div class="panel-grid">
      <div class="panel">
        <h2>Usuarios por país</h2>
        <p class="sub">${scope === 'all' ? 'Los 10 países con más usuarios' : 'País seleccionado'} · datos de ejemplo</p>
        <div class="bars" role="list">
          ${rows.map(([code, v]) => `
            <div class="bar-row" role="listitem" tabindex="0" aria-label="${esc(country(code).name)}: ${v} usuarios">
              <span class="name">${esc(country(code).name)}</span>
              <div class="bar-track"><div class="bar" style="width:${(v / max) * 100}%"></div></div>
              <span class="val">${v}</span>
              <span class="bar-tip">${esc(country(code).name)} · ${v} usuarios · ${Math.round((v / totalUsers) * 100)} % del total</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel">
        <h2>Solicitudes de pertenencia</h2>
        <p class="sub">Miembros OCDS y de grupos que esperan confirmación</p>
        ${approvals.length ? approvals.map(a => `
          <div class="approval ${a.isNew ? 'new' : ''}">
            <div class="grow">
              <strong>${esc(a.name)}${a.isNew ? ' <span class="tag warn">Desde la app</span>' : ''}</strong>
              <span>${esc(community(a.community)?.name || '')}, ${esc(community(a.community)?.city || '')} · ${esc(a.group)}</span>
            </div>
            <button class="btn btn-primary btn-small" data-admin="approve" data-id="${a.id}">Aprobar</button>
            <button class="btn btn-outline btn-small" data-admin="reject" data-id="${a.id}">Rechazar</button>
          </div>`).join('') : '<p class="empty">No hay solicitudes pendientes.</p>'}
      </div>

      <div class="panel">
        <h2>Publicar un evento</h2>
        <p class="sub">Aparece en la pestaña Eventos de la app</p>
        <form data-admin-form="event" class="form-grid">
          <div class="field full"><label for="a-title">Título</label><input class="input" id="a-title" name="title" required placeholder="Ej: Novena a la Virgen del Carmen"></div>
          <div class="field"><label for="a-date">Fecha</label><input class="input" id="a-date" name="date" type="date" required value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}"></div>
          <div class="field"><label for="a-time">Hora</label><input class="input" id="a-time" name="time" type="time" required value="19:00"></div>
          <div class="field"><label for="a-scope">Para</label><select class="input" id="a-scope" name="scope"><option value="all">Toda la región</option>${COUNTRIES.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="a-cap">Cupo</label><input class="input" id="a-cap" name="capacity" type="number" min="1" value="50"></div>
          <div class="field full"><label for="a-place">Lugar</label><input class="input" id="a-place" name="place" value="En línea"></div>
          <div class="full"><button class="btn btn-primary" type="submit">Publicar evento</button></div>
        </form>
      </div>

      <div class="panel">
        <h2>Enviar una notificación</h2>
        <p class="sub">Llega como notificación push a los usuarios del alcance elegido</p>
        <form data-admin-form="push" class="form-grid">
          <div class="field full"><label for="n-title">Título</label><input class="input" id="n-title" name="title" required value="Hoy, adoración nocturna"></div>
          <div class="field full"><label for="n-body">Mensaje</label><textarea class="input" id="n-body" name="body" required>Te esperamos a las 21:00 en tu comunidad. Trae tus intenciones.</textarea></div>
          <div class="field full"><label for="n-scope">Para</label><select class="input" id="n-scope" name="scope"><option value="all">Toda la región</option>${COUNTRIES.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join('')}</select></div>
          <div class="full"><button class="btn btn-gold" type="submit">Enviar notificación</button></div>
        </form>
      </div>

      <div class="panel span-2">
        <h2>Actividad reciente</h2>
        <p class="sub">Lo que pasa en la app, en tiempo real</p>
        ${state.log.length ? `<ul class="log">${state.log.map(l => `<li><time>${new Date(l.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</time><span>${esc(l.text)}</span></li>`).join('')}</ul>` : '<p class="empty">Todavía no hay actividad. Creá una cuenta en el teléfono para verla aparecer acá.</p>'}
      </div>
    </div>`;
}

function adminSubmit(form) {
  const f = Object.fromEntries(new FormData(form));
  const u = currentUser();
  if (form.dataset.adminForm === 'event') {
    if (!f.title.trim()) return;
    const tz = f.scope === 'all' ? 'America/Mexico_City' : country(f.scope).tz;
    const iso = zonedToIso(f.date, f.time, tz);
    state.events.push({ id: 'e' + Date.now(), title: f.title.trim(), date: iso, scope: f.scope, place: f.place.trim() || 'Por confirmar', capacity: Math.max(1, Number(f.capacity) || 50), enrolled: 0, isNew: true });
    addLog(`Evento publicado: "${f.title.trim()}"`);
    save();
    renderAll();
    if (u && (f.scope === 'all' || f.scope === u.country)) push('Nuevo evento', f.title.trim());
    else toast('Evento publicado para otro país: no lo ve este usuario.');
  }
  if (form.dataset.adminForm === 'push') {
    addLog(`Notificación enviada: "${f.title}"`);
    save();
    renderAll();
    if (!u || f.scope === 'all' || f.scope === u.country) push(f.title, f.body);
    else toast(`Notificación enviada a ${country(f.scope).name}: este usuario no la recibe.`);
  }
}

// Convierte fecha y hora locales de un país a ISO UTC.
function zonedToIso(date, time, tz) {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = new Date(guess.toLocaleString('en-US', { timeZone: tz }));
  const utc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess.getTime() + (utc - local)).toISOString();
}

function decideApproval(id, approve) {
  const a = state.approvals.find(x => x.id === id);
  state.approvals = state.approvals.filter(x => x.id !== id);
  const user = state.users.find(x => x.id === id);
  if (user) user.status = approve ? 'miembro' : 'fiel';
  addLog(`${approve ? 'Aprobada' : 'Rechazada'} la solicitud de ${a.name}`);
  save();
  renderAll();
  if (user && user.id === state.session) {
    push(approve ? 'Solicitud aprobada' : 'Solicitud revisada', approve ? 'Ya figurás como miembro de tu grupo.' : 'El responsable no pudo confirmar tu pertenencia.');
  }
}

// ---------- Vistas de la página ----------

function setView(view) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.body.classList.toggle('show-app', view === 'app');
  $('#side-pitch').hidden = view === 'admin';
  $('#side-admin').hidden = view !== 'admin';
  if (view === 'admin') renderAdmin();
  window.scrollTo({ top: 0 });
}

function renderCta() {
  const has = CONTACT.name || CONTACT.email || CONTACT.whatsapp;
  $('#cta').hidden = !has;
  if (!has) return;
  $('#cta-name').textContent = CONTACT.name || 'Desarrollo de la app completa para iOS, Android y web.';
  const actions = [];
  if (CONTACT.whatsapp) actions.push(`<a href="https://wa.me/${encodeURIComponent(CONTACT.whatsapp)}?text=${encodeURIComponent('Hola, vi la demo de la app y quiero conversar.')}" target="_blank" rel="noopener">WhatsApp</a>`);
  if (CONTACT.email) actions.push(`<a class="ghost" href="mailto:${encodeURIComponent(CONTACT.email)}?subject=${encodeURIComponent('Demo app Carmelitas Descalzos Latinoamérica')}">Email</a>`);
  actions.push('<a class="ghost" href="formulario.html">Completar el cuestionario</a>');
  $('#cta-actions').innerHTML = actions.join('');
}

function renderAll() {
  renderApp();
  if (!$('#side-admin').hidden) renderAdmin();
}

// ---------- Eventos del DOM ----------

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action], [data-admin], [data-view]');
  if (!btn) return;

  if (btn.dataset.view) return setView(btn.dataset.view);

  const admin = btn.dataset.admin;
  if (admin === 'approve' || admin === 'reject') return decideApproval(btn.dataset.id, admin === 'approve');

  const a = btn.dataset.action;
  if (!a || btn.tagName === 'SELECT' || (btn.tagName === 'INPUT' && btn.type !== 'checkbox')) return;
  const u = currentUser();
  switch (a) {
    case 'go': ui.screen = btn.dataset.to; ui.errors = {}; renderApp(); break;
    case 'social': socialLogin(btn.dataset.provider); break;
    case 'resend': push('Código de verificación', `Tu código de Carmelitas Descalzos es ${DEMO_OTP}.`); break;
    case 'toast': toast(btn.dataset.text); break;
    case 'tab': ui.tab = btn.dataset.tab; ui.overlay = null; renderApp(); break;
    case 'pick-community': ui.draft.pickCommunity = btn.dataset.id; renderApp(); break;
    case 'toggle-member': ui.draft.member = btn.checked; break;
    case 'confirm-community': confirmCommunity(); break;
    case 'change-community': ui.draft = { pickCountry: u.country, pickCommunity: u.community }; ui.screen = 'community'; renderApp(); break;
    case 'set-community': u.community = btn.dataset.id; save(); toast('Comunidad actualizada.'); renderAll(); break;
    case 'filter': ui.filter = btn.dataset.type; renderApp(); break;
    case 'enroll': enroll(btn.dataset.id); break;
    case 'play': togglePlay(btn.dataset.id); break;
    case 'open-reading': ui.overlay = 'reading'; renderApp(); break;
    case 'open-donate': ui.overlay = 'donate'; renderApp(); break;
    case 'close-overlay': ui.overlay = null; ui.tab = 'home'; renderApp(); break;
    case 'font': state.prefs.fontScale = Math.min(1.5, Math.max(0.85, state.prefs.fontScale + Number(btn.dataset.dir) * 0.15)); save(); renderApp(); break;
    case 'amount': ui.donation.amount = Number(btn.dataset.value); ui.donation.custom = ''; renderApp(); break;
    case 'donate': donate(); break;
    case 'pref': state.prefs[btn.dataset.key] = btn.checked; save(); renderApp(); break;
    case 'export': exportData(); break;
    case 'delete-account':
      if (confirm('¿Borrar tu cuenta y todos tus datos? Esta acción no se puede deshacer.')) {
        state.users = state.users.filter(x => x.id !== u.id);
        state.approvals = state.approvals.filter(x => x.id !== u.id);
        addLog(`Cuenta borrada por su titular: ${u.name}`);
        state.session = null; ui.screen = 'welcome'; save(); renderAll(); toast('Tu cuenta fue borrada.');
      }
      break;
    case 'logout': state.session = null; ui.screen = 'welcome'; ui.player = null; clearInterval(playerTimer); save(); renderAll(); break;
    case 'reset-demo':
      try { localStorage.removeItem(STORE_KEY); } catch (err) { /* nada */ }
      state = seedState(); ui.screen = 'welcome'; ui.overlay = null; ui.draft = {}; renderAll(); toast('Demo reiniciada.');
      break;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.admin === 'scope') { ui.adminScope = t.value; renderAdmin(); return; }
  switch (t.dataset.action) {
    case 'draft-country': {
      const form = t.form;
      ui.draft = { ...ui.draft, ...Object.fromEntries(new FormData(form)), consent: form.consent.checked };
      renderApp();
      break;
    }
    case 'pick-country': ui.draft.pickCountry = t.value; ui.draft.pickCommunity = null; renderApp(); break;
    case 'purpose': ui.donation.purpose = t.value; break;
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.action === 'custom-amount') {
    ui.donation.custom = t.value.replace(/\D/g, '');
    const u = currentUser();
    const value = ui.donation.custom ? Number(ui.donation.custom) : ui.donation.amount;
    const btn = document.querySelector('[data-action="donate"]');
    btn.disabled = !(value > 0);
    btn.textContent = value > 0 ? `Donar ${money(value, u.country)}` : 'Elegí un monto';
    document.querySelectorAll('.amount').forEach(b => b.classList.toggle('active', !ui.donation.custom && Number(b.dataset.value) === ui.donation.amount));
  }
});

document.addEventListener('submit', e => {
  const form = e.target;
  e.preventDefault();
  if (form.dataset.adminForm) return adminSubmit(form);
  if (form.dataset.form === 'register') submitRegister(form);
  if (form.dataset.form === 'otp') submitOtp(form);
  if (form.dataset.form === 'login') submitLogin(form);
});

// Otra pestaña con la demo abierta (por ejemplo, el panel en una y la app en otra).
window.addEventListener('storage', ev => {
  if (ev.key !== STORE_KEY) return;
  state = loadState();
  renderAll();
});

// ---------- Inicio ----------

if (currentUser()) ui.screen = currentUser().community ? 'main' : 'community';
renderCta();
renderApp();
