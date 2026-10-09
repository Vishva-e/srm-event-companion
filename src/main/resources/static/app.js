/**
 * SRM Event Companion — Java Spring Boot demo client.
 * Calls same-origin /api endpoints. No passwords, real student records or
 * university authentication are used in this educational prototype.
 */
'use strict';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const loginScreen = $('#login-screen');
const appShell = $('#app-shell');
const loginForm = $('#login-form');
const loginError = $('#login-error');
const views = { home: $('#view-home'), seat: $('#view-seat'), food: $('#view-food') };

let currentUser = null;
let currentPass = null;
let activeFilter = 'all';

async function api(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.message || `Server returned ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = String(value);
}

function welcomeName(fullName) {
  return fullName.split(/\s+/).filter(Boolean)[0]?.slice(0, 24) || 'Student';
}

function applyProfile({ student, event }) {
  currentUser = student;
  currentPass = event;
  const first = welcomeName(student.name);
  const seat = event.seat;
  const counter = event.foodCounter;
  const seatLabel = `Row ${seat.row} · Seat ${String(seat.number).padStart(2, '0')}`;

  setText('#welcome-name', first);
  setText('#sidebar-name', student.name);
  setText('#sidebar-initial', first.charAt(0).toUpperCase());
  setText('#topbar-initial', first.charAt(0).toUpperCase());
  $('#topbar-initial').title = `${student.name} (demo)`;

  setText('.nav-indicator', seat.code);
  setText('.sidebar-event-bottom b', seat.code);
  setText('.sidebar-event > strong', event.name);
  setText('.sidebar-event > span:nth-of-type(2)', `${event.venue}\nBlock ${event.block} · Gate ${event.entryGate}`);
  setText('.ticket-title h2', event.name);
  setText('.ticket-title p', `${event.venue} · Block ${event.block}`);
  setText('.ticket-stats div:nth-child(1) strong', seat.code);
  setText('.ticket-stats div:nth-child(2) strong', event.entryGate);
  setText('.ticket-stats div:nth-child(3) strong', counter.number);
  setText('.event-info-line:nth-of-type(2) strong', event.date);
  setText('.event-info-line:nth-of-type(3) strong', `${event.venue}, Block ${event.block}`);
  setText('.event-info-line:nth-of-type(4) strong', `Gate ${event.entryGate} · Level ${event.level}`);
  setText('.quick-card[data-go="seat"] .quick-copy small', `${seatLabel} · Block ${event.block}`);
  setText('.quick-card[data-go="food"] .quick-copy small', `Counter ${counter.number} · ${counter.floor}`);

  setText('#view-seat .page-heading .section-kicker', `BLOCK ${event.block} • LEVEL ${event.level}`);
  setText('.theatre-hint', `Front view · Entry Gate ${event.entryGate}`);
  setText('.theatre-head h2', `Block ${event.block} Seating`);
  setText('.level-badge', `LEVEL ${event.level}`);
  setText('.seat-badge', seat.code);
  setText('.your-seat-number h2', seatLabel);
  setText('.assigned-details div:nth-child(1) strong', event.block);
  setText('.assigned-details div:nth-child(2) strong', event.entryGate);
  setText('.assigned-details div:nth-child(3) strong', event.level);
  setText('.directions-card li:nth-child(1) b', `Enter through Gate ${event.entryGate}`);
  setText('.directions-card li:nth-child(1) span', `Proceed to Block ${event.block}, Level ${event.level}.`);
  setText('.directions-card li:nth-child(2) b', `Find Row ${seat.row}`);
  setText('.directions-card li:nth-child(3) b', `Look for Seat ${String(seat.number).padStart(2, '0')}`);
  setText('#seat-notice', `Your assigned seat is ${seatLabel}. Other seats are shown for reference only.`);

  setText('.counter-display > b', counter.number);
  setText('.counter-display h2', `Food Counter ${counter.number}`);
  setText('.counter-display p', `${counter.floor} • ${counter.zone}`);
  setText('.counter-nearby-text', `Near ${event.venue} · Gate ${counter.nearGate}`);
  setText('.counter-mark b', counter.number);
  setText('.counter-mark span:last-child', counter.zone.toUpperCase());
}

function showApp(profile, navigate = 'home') {
  applyProfile(profile);
  loginScreen.hidden = true;
  appShell.hidden = false;
  renderRoute(navigate);
}

function showLogin() {
  currentUser = null;
  currentPass = null;
  appShell.hidden = true;
  loginScreen.hidden = false;
  loginForm.reset();
  loginError.textContent = '';
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#student-id').focus({ preventScroll: true });
}

function renderRoute(route) {
  if (!currentUser) return;
  const page = Object.hasOwn(views, route) ? route : 'home';
  Object.entries(views).forEach(([key, view]) => { view.hidden = key !== page; });
  $$('[data-go]').forEach(button => {
    const active = button.dataset.go === page;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const titles = { home: 'Dashboard', seat: 'My seat', food: 'Food counters' };
  setText('#breadcrumb-current', titles[page]);
  document.title = `${titles[page]} · SRM Event Companion`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function goTo(page) {
  if (!currentUser) return;
  const route = Object.hasOwn(views, page) ? page : 'home';
  if (location.hash !== `#${route}`) history.pushState({ route }, '', `#${route}`);
  renderRoute(route);
  const heading = $(`#${route === 'home' ? 'home' : route}-heading`);
  heading?.focus({ preventScroll: true });
}

function renderSeats(map) {
  const container = $('#seat-rows');
  container.replaceChildren();
  const assigned = currentPass.seat.code;
  for (const row of map.rows) {
    const rowNode = document.createElement('div');
    rowNode.className = 'seat-row';
    rowNode.setAttribute('aria-label', `Row ${row}`);
    const label = document.createElement('span');
    label.className = `row-label${row === currentPass.seat.row ? ' is-yours' : ''}`;
    label.textContent = row;
    rowNode.appendChild(label);

    for (const seat of map.seats.filter(seat => seat.row === row)) {
      if (seat.number === 6) {
        const aisle = document.createElement('span');
        aisle.className = 'aisle';
        aisle.setAttribute('aria-hidden', 'true');
        rowNode.appendChild(aisle);
      }
      const mine = seat.status === 'YOURS';
      const taken = seat.status === 'OCCUPIED';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `seat ${mine ? 'seat-assigned' : taken ? 'seat-occupied' : 'seat-free'}`;
      button.textContent = String(seat.number).padStart(2, '0');
      button.dataset.seat = seat.code;
      button.title = `Row ${row}, Seat ${String(seat.number).padStart(2, '0')} — ${mine ? 'your assigned seat' : taken ? 'occupied' : 'available (not assigned)'}`;
      button.setAttribute('aria-label', button.title);
      if (mine) button.setAttribute('aria-current', 'location');
      if (taken) button.disabled = true;
      if (!taken) button.addEventListener('click', () => {
        $('#seat-notice').textContent = mine
          ? `You found it! Your seat is ${seat.code}. Enter via Gate ${currentPass.entryGate}.`
          : `Seat ${seat.code} is reference-only. Your assigned seat remains ${assigned}.`;
      });
      rowNode.appendChild(button);
    }
    container.appendChild(rowNode);
  }
}

const illustration = { veg: '✺', nonveg: '✹', snack: '◒', drink: '◉' };
function make(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function renderMenu(payload) {
  const container = $('#menu-grid');
  container.replaceChildren();
  for (const item of payload.items) {
    const card = make('article', 'menu-card');
    card.dataset.category = item.category;
    card.dataset.search = `${item.name} ${item.description} ${item.dietLabel}`.toLocaleLowerCase();
    const artwork = make('div', `menu-art menu-art-${item.artStyle}`);
    const artIcon = make('span', 'menu-illustration', illustration[item.artStyle] ?? '✦');
    artIcon.setAttribute('aria-hidden', 'true');
    artwork.append(artIcon, make('span', '', item.badge));
    const content = make('div', 'menu-content');
    const top = make('div', 'menu-topline');
    top.append(make('span', 'menu-type', item.dietLabel), make('span', 'menu-price', `₹${item.priceInr}`));
    content.append(top, make('h3', '', item.name), make('p', '', item.description));
    card.append(artwork, content);
    container.appendChild(card);
  }
  filterMenu();
}

async function loadAppData() {
  const [seats, menu] = await Promise.all([api('seats'), api('menu')]);
  renderSeats(seats);
  renderMenu(menu);
}

const submitButton = $('.login-submit');
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('#student-id').value.trim();
  const name = $('#username').value.trim();
  if (id.length < 3 || name.length < 2) {
    loginError.textContent = 'Please enter a demo student ID and username.';
    (id.length < 3 ? $('#student-id') : $('#username')).focus();
    return;
  }
  loginError.textContent = '';
  submitButton.disabled = true;
  try {
    const profile = await api('session', { method: 'POST', body: JSON.stringify({ studentId: id, username: name }) });
    showApp(profile);
    await loadAppData();
    history.replaceState({ route: 'home' }, '', '#home');
  } catch (error) {
    await api('session', { method: 'DELETE' }).catch(() => null);
    showLogin();
    loginError.textContent = error.message || 'Unable to connect to the Java server.';
  } finally {
    submitButton.disabled = false;
  }
});

$('#demo-fill').addEventListener('click', () => {
  $('#student-id').value = 'SRM2026001';
  $('#username').value = 'Vishva';
  loginError.textContent = '';
  $('#username').focus();
});

$$('[data-go]').forEach(button => button.addEventListener('click', () => goTo(button.dataset.go)));
$$('[data-signout]').forEach(button => button.addEventListener('click', async () => {
  await api('session', { method: 'DELETE' }).catch(() => null);
  showLogin();
}));
window.addEventListener('popstate', () => {
  if (currentUser) renderRoute(location.hash.replace(/^#/, ''));
});

$('#locate-seat').addEventListener('click', () => {
  if (!currentPass) return;
  const code = currentPass.seat.code;
  const selected = $(`[data-seat="${code}"]`);
  if (!selected) return;
  selected.classList.remove('seat-pulse');
  void selected.offsetWidth;
  selected.classList.add('seat-pulse');
  selected.focus({ preventScroll: true });
  selected.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  $('#seat-notice').textContent = `You found it! The gold seat is yours: ${code}.`;
});

function filterMenu() {
  const term = $('#menu-search').value.trim().toLocaleLowerCase();
  let visible = 0;
  $$('.menu-card').forEach(card => {
    const matchCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
    const matchText = !term || `${card.dataset.search} ${card.textContent}`.toLocaleLowerCase().includes(term);
    card.hidden = !(matchCategory && matchText);
    if (!card.hidden) visible++;
  });
  $('#menu-empty').hidden = visible !== 0;
}
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  $$('[data-filter]').forEach(b => {
    const selected = b === button;
    b.classList.toggle('selected', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  filterMenu();
}));
$('#menu-search').addEventListener('input', filterMenu);

const preview = $('#hero-preview-seats');
for (let i = 0; i < 27; i++) {
  preview.appendChild(make('span', `mini-seat${i === 22 ? ' mini-seat-highlighted' : ''}`));
}

// Restore an authenticated server session on refresh. No client-side impersonation.
(async function bootstrap() {
  try {
    const profile = await api('session');
    showApp(profile, location.hash.replace(/^#/, '') || 'home');
    await loadAppData();
  } catch (error) {
    if (currentUser) showLogin();
    if (error.status && error.status !== 401) loginError.textContent = error.message;
  }
})();
