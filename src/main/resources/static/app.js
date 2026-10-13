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
const views = { home: $('#view-home'), seat: $('#view-seat'), food: $('#view-food'), campus: $('#view-campus') };

let currentUser = null;
let currentPass = null;
let activeFilter = 'all';
let sessionBusy = false;
let graduationLocationWatch = null;
let graduationPosition = null;

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/${path}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const error = new Error(body?.message || `Server returned ${response.status}. Please try again.`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The server took too long to respond. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to connect to the server. Check your connection and try again.');
    if (error instanceof SyntaxError) throw new Error('The server returned an unreadable response. Please try again.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
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
  const counter = event.registrationCounter || event.foodCounter;
  const seatLabel = `Row ${seat.row} · Seat ${String(seat.number).padStart(2, '0')}`;

  setText('#welcome-name', first);
  setText('#sidebar-name', student.name);
  setText('#sidebar-initial', first.charAt(0).toUpperCase());
  setText('#topbar-initial', first.charAt(0).toUpperCase());
  $('#topbar-initial').title = `${student.name} (demo)`;

  setText('.nav-indicator', seat.code);
  setText('.sidebar-event-bottom b', seat.code);
  setText('.sidebar-event > strong', event.name);
  setText('#sidebar-event-location', `${event.venue}\nBlock ${event.block}`);
  setText('.ticket-title h2', event.name);
  setText('.ticket-title p', `${event.venue} · Block ${event.block}`);
  setText('.ticket-stats div:nth-child(1) strong', seat.code);
  setText('.ticket-stats div:nth-child(2) strong', event.block);
  setText('.ticket-stats div:nth-child(3) strong', counter.number);
  setText('#event-date-heading', event.date.toUpperCase());
  setText('#event-date', event.date);
  setText('#event-venue', `${event.venue}, Block ${event.block}`);
  setText('#event-entry', `Level ${event.level} · Row ${seat.row}`);
  setText('.quick-card[data-go="seat"] .quick-copy small', `${seatLabel} · Block ${event.block}`);
  setText('.quick-card[data-go="food"] .quick-copy small', `Counter ${counter.number} · ${counter.floor}`);

  setText('#view-seat .page-heading .section-kicker', `BLOCK ${event.block} • LEVEL ${event.level}`);
  setText('.theatre-hint', 'Front of auditorium · Stage-facing rows');
  setText('.theatre-head h2', 'Auditorium seating');
  setText('.theatre-kicker', event.venue.toUpperCase());
  setText('.level-badge', `LEVEL ${event.level}`);
  setText('.seat-badge', seat.code);
  setText('.your-seat-number h2', seatLabel);
  setText('.assigned-details div:nth-child(1) strong', event.block);
  setText('.assigned-details div:nth-child(2) strong', seat.row);
  setText('.assigned-details div:nth-child(3) strong', event.level);
  setText('.directions-card li:nth-child(1) b', 'Find the auditorium');
  setText('.directions-card li:nth-child(1) span', `Open the location reference to find ${event.venue}; verify your event entrance.`);
  setText('.directions-card li:nth-child(2) b', `Find Row ${seat.row}`);
  setText('.directions-card li:nth-child(3) b', `Look for Seat ${String(seat.number).padStart(2, '0')}`);
  setText('#seat-notice', `Your assigned demo seat is ${seatLabel}. All other unverified seats are visual placeholders.`);

  setText('.counter-display > b', counter.number);
  setText('.counter-display h2', `Registration Counter ${counter.number}`);
  setText('.counter-display p', `${counter.floor} • ${counter.zone}`);
  setText('.counter-nearby-text', 'Demo counter assignment · desk location to be confirmed');
  setText('.counter-mark b', counter.number);
  setText('.counter-mark span:last-child', counter.zone.toUpperCase());
  setText('#student-modal-name', student.name);
  setText('#profile-id', student.id);
  setText('#profile-netid', student.netId || 'Not set');
  setText('#profile-seat', seat.code);
  setText('#profile-counter', counter.number);
}

function resetAccountState() {
  activeFilter = 'all';
  $('#menu-search').value = '';
  $$('[data-filter]').forEach(button => {
    const selected = button.dataset.filter === 'all';
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#seat-rows').replaceChildren();
  $('#menu-grid').replaceChildren();
  $('#menu-empty').hidden = true;
  setText('#menu-results', '');
  setText('#app-error', '');
}

function showApp(profile, { seats, menu }, navigate = 'home') {
  resetAccountState();
  applyProfile(profile);
  renderSeats(seats);
  renderMenu(menu);
  loginScreen.hidden = true;
  appShell.hidden = false;
  renderRoute(navigate, true);
  api('documents').then(d => {
    if (d.type) $('#document-type').value = d.type;
    setText('#document-status', d.status === 'DEMO_SAVED' ? 'Your sample document preference is saved for this session.' : 'No document request saved yet.');
  }).catch(() => setText('#document-status', 'Document demo request unavailable.'));
  api('attendees').then(info => {
    $('#attendee-count').value = info.accompanyingMembers;
    setText('#attendee-summary', `Accompanying members: ${info.accompanyingMembers} · Total: ${info.totalAttendees}`);
  }).catch(() => setText('#attendee-summary', 'Guest count unavailable'));
}

function showLogin({ focus = true, preserveRoute = false, resetForm = true } = {}) {
  currentUser = null;
  currentPass = null;
  hideStudentModal();
  stopGraduationLocation();
  resetAccountState();
  appShell.hidden = true;
  loginScreen.hidden = false;
  if (resetForm) loginForm.reset();
  loginError.textContent = '';
  $('#retry-session').hidden = true;
  document.title = 'SRM Event Companion · Event Access';
  if (!preserveRoute) history.replaceState(null, '', `${location.pathname}${location.search}`);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focus) $('#student-id').focus({ preventScroll: true });
}

function renderRoute(route, focus = false) {
  if (!currentUser) return;
  const page = Object.hasOwn(views, route) ? route : 'home';
  Object.entries(views).forEach(([key, view]) => { view.hidden = key !== page; });
  $$('[data-go]').forEach(button => {
    const active = button.dataset.go === page;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const titles = { home: 'Dashboard', seat: 'My seat', food: 'Registration & food', campus: 'Campus guide' };
  setText('#breadcrumb-current', titles[page]);
  document.title = `${titles[page]} · SRM Event Companion`;
  if (location.hash !== `#${page}`) history.replaceState({ route: page }, '', `#${page}`);
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (focus) $(`#${page}-heading`).focus({ preventScroll: true });
}

function goTo(page) {
  if (!currentUser) return;
  const route = Object.hasOwn(views, page) ? page : 'home';
  if (location.hash !== `#${route}`) history.pushState({ route }, '', `#${route}`);
  renderRoute(route, true);
}

// Architectural rendering only: the photograph/reference is not a verified
// seat inventory. The A-G / 01-09 fixtures are the only backed demo records.
// Unknown schematic positions must not look like bookable/open seats.
const SEATING_ROWS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => letter + letter)];
const SEAT_COLUMNS = 57;
const seatScale = {value: 14, min: 11, max: 22};
function updateSeatZoom() {
  $('#seating-plan-map').style.setProperty('--seat-width', seatScale.value + 'px');
  setText('#seat-zoom-label', Math.round(seatScale.value / 14 * 100) + '%');
  $('#seat-zoom-out').disabled = seatScale.value <= seatScale.min;
  $('#seat-zoom-in').disabled = seatScale.value >= seatScale.max;
}
function renderSeats(map) {
  const container = $('#seat-rows');
  container.replaceChildren();
  container.setAttribute('aria-label', 'Illustrative seats from rows A to ZZ, 57 columns. Demo fixtures limited to rows A-G, seats 01-09.');
  const known = new Map(map.seats.map(seat => [seat.code, seat]));
  const assigned = currentPass.seat.code;
  const fragments = document.createDocumentFragment();
  for (const row of SEATING_ROWS) {
    const line = document.createElement('div');
    line.className = 'seating-plan-row';
    line.setAttribute('role', 'group');
    line.setAttribute('aria-label', 'Illustrative row ' + row);
    const label = document.createElement('span');
    label.className = 'seating-plan-row-label' + (row === currentPass.seat.row ? ' highlighted-row-label' : '');
    label.textContent = row;
    line.appendChild(label);
    for (let n = 1; n <= SEAT_COLUMNS; n++) {
      // Row-edge irregularity echoes the reference screenshot; not authoritative.
      const trim = (row.charCodeAt(row.length - 1) * 13 + row.length * 11) % 7;
      if (n > SEAT_COLUMNS - trim && row !== currentPass.seat.row) continue;
      const code = row + String(n).padStart(2, '0');
      const knownSeat = known.get(code);
      const mine = knownSeat?.status === 'YOURS' && code === assigned;
      const taken = knownSeat?.status === 'OCCUPIED';
      const zone = n <= 16 ? 'west' : n <= 42 ? 'center' : 'east';
      const el = document.createElement(mine || knownSeat ? 'button' : 'span');
      if (el.tagName === 'BUTTON') el.type = 'button';
      el.className = 'auditorium-seat zone-' + zone + (mine ? ' my-auditorium-seat' : taken ? ' sample-taken-seat' : '');
      el.textContent = String(n).padStart(2, '0');
      if (mine) {
        el.dataset.seat = code;
        el.title = 'Your assigned demo seat: ' + code;
        el.setAttribute('aria-label', 'Your assigned demo seat, row ' + row + ', seat ' + n);
        el.setAttribute('aria-current', 'location');
        el.addEventListener('click', () => setText('#seat-notice', 'This is your gold-highlighted assigned demo seat: ' + code + '.'));
      } else if (knownSeat) {
        el.disabled = true;
        el.title = code + ': ' + (taken ? 'occupied in the sample database' : 'unassigned demo seat');
        el.setAttribute('aria-label', el.title);
      } else {
        el.setAttribute('aria-hidden', 'true');
        el.title = 'Illustrative zone marker (not a registered seat)';
      }
      line.appendChild(el);
    }
    fragments.appendChild(line);
  }
  container.appendChild(fragments);
  seatScale.value = 14;
  updateSeatZoom();
}
$('#seat-zoom-out').addEventListener('click', () => {seatScale.value = Math.max(seatScale.min, seatScale.value - 1); updateSeatZoom();});
$('#seat-zoom-in').addEventListener('click', () => {seatScale.value = Math.min(seatScale.max, seatScale.value + 1); updateSeatZoom();});
$('#seat-zoom-reset').addEventListener('click', () => {seatScale.value = 14; updateSeatZoom(); $('#seat-pan').scrollTo({top:0,left:0,behavior:'smooth'});});

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
    card.dataset.category = item.category === 'nonveg' || item.artStyle === 'nonveg' ? 'nonveg' : 'veg';
    card.dataset.search = `${item.name} ${item.description} ${item.dietLabel}`.toLocaleLowerCase();
    const artwork = make('div', `menu-art menu-art-${item.artStyle}`);
    const artIcon = make('span', 'menu-illustration', illustration[item.artStyle] ?? '✦');
    artIcon.setAttribute('aria-hidden', 'true');
    artwork.append(artIcon, make('span', '', item.badge));
    const content = make('div', 'menu-content');
    const top = make('div', 'menu-topline');
    top.append(make('span', 'menu-type', item.dietLabel));
    content.append(top, make('h3', '', item.name), make('p', '', item.description));
    card.append(artwork, content);
    container.appendChild(card);
  }
  filterMenu();
}

async function loadAppData() {
  const [seats, menu] = await Promise.all([api('seats'), api('menu')]);
  return { seats, menu };
}

function setSessionBusy(busy, message = '') {
  sessionBusy = busy;
  [...loginForm.elements, $('#demo-fill'), $('#retry-session'), ...$$('[data-signout]')]
    .forEach(control => { control.disabled = busy; });
  loginForm.setAttribute('aria-busy', String(busy));
  setText('#login-status', message);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sessionBusy) return;
  const id = $('#student-id').value.trim();
  const name = $('#username').value.trim();
  if (id.length < 3 || name.length < 2) {
    loginError.textContent = 'Please enter a demo student ID and username.';
    (id.length < 3 ? $('#student-id') : $('#username')).focus();
    return;
  }
  loginError.textContent = '';
  $('#retry-session').hidden = true;
  setSessionBusy(true, 'Loading your event pass…');
  let signedIn = false;
  try {
    const profile = await api('session', { method: 'POST', body: JSON.stringify({ studentId: id, username: name }) });
    signedIn = true;
    const data = await loadAppData();
    history.replaceState({ route: 'home' }, '', '#home');
    showApp(profile, data);
    showStudentModal();
  } catch (error) {
    showLogin({ focus: false, resetForm: false });
    loginError.textContent = signedIn && error.status !== 401
      ? `Your account is signed in, but event details could not load. ${error.message}`
      : error.message;
    $('#retry-session').hidden = !signedIn || error.status === 401;
  } finally {
    setSessionBusy(false);
    if (!currentUser) {
      ($('#retry-session').hidden ? $('#username') : $('#retry-session')).focus({ preventScroll: true });
    }
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
  if (sessionBusy) return;
  setSessionBusy(true);
  setText('#app-error', '');
  try {
    await api('session', { method: 'DELETE' });
    showLogin({ focus: false });
  } catch (error) {
    setText('#app-error', `Sign out could not be confirmed. ${error.message} Please try signing out again.`);
    $('#app-error').focus();
  } finally {
    setSessionBusy(false);
    if (!currentUser) $('#student-id').focus({ preventScroll: true });
  }
}));
const syncRoute = () => renderRoute(location.hash.replace(/^#/, ''), true);
window.addEventListener('popstate', syncRoute);
window.addEventListener('hashchange', syncRoute);

$('#locate-seat').addEventListener('click', () => {
  if (!currentPass) return;
  const code = currentPass.seat.code;
  const selected = $(`[data-seat="${code}"]`);
  if (!selected) return;
  selected.classList.remove('seat-pulse');
  void selected.offsetWidth;
  selected.classList.add('seat-pulse');
  selected.focus({ preventScroll: true });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pan = $('#seat-pan');
  const targetLeft = selected.offsetLeft - pan.clientWidth / 2;
  const targetTop = selected.offsetTop - pan.clientHeight / 2;
  pan.scrollTo({ left: Math.max(0, targetLeft), top: Math.max(0, targetTop), behavior: reducedMotion ? 'instant' : 'smooth' });
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
  setText('#menu-results', `${visible} menu ${visible === 1 ? 'item' : 'items'} shown.`);
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

// Document request is saved only in the session. No official processing is performed.
$('#document-form').addEventListener('submit', async e => {
  e.preventDefault();
  const button=$('#document-form button');
  button.disabled=true;
  try {
    const data=await api('documents', {method:'POST',
      body:JSON.stringify({type:$('#document-type').value})});
    setText('#document-status',data.status === 'DEMO_SAVED'
      ? 'Saved for this demo session — NOT submitted to SRM University.'
      : 'Could not save the document preference.');
  } catch(error) {setText('#document-status',error.message);}
  finally {button.disabled=false;}
});

// Graduation Day attendee popup and map search actions.
function showStudentModal() {
  if (!currentUser) return;
  $('#student-modal').hidden = false;
  $('#attendee-count').focus({preventScroll:true});
}
function hideStudentModal() {
  $('#student-modal').hidden = true;
  $('#attendee-error').textContent = '';
}
$('#open-student-profile').addEventListener('click',showStudentModal);
$('#close-student-profile').addEventListener('click',hideStudentModal);
$('#student-modal').addEventListener('click',e => {if(e.target === $('#student-modal')) hideStudentModal();});
document.addEventListener('keydown',e => {if(e.key==='Escape' && !$('#student-modal').hidden)hideStudentModal();});
$('#attendee-form').addEventListener('submit',async e => {
  e.preventDefault();
  const count=Number($('#attendee-count').value);
  if(!Number.isInteger(count) || count<0 || count>10) {
    setText('#attendee-error','Enter a whole number between 0 and 10.');
    return;
  }
  const button=$('#attendee-form button');
  button.disabled=true;
  try {
    const answer=await api('attendees',{method:'PUT',body:JSON.stringify({accompanyingMembers:count})});
    setText('#attendee-summary','Accompanying members: '+answer.accompanyingMembers+' · Total: '+answer.totalAttendees);
    hideStudentModal();
  } catch(error) {setText('#attendee-error',error.message);}
  finally {button.disabled=false;}
});
function setGraduationLinks() {
  for (const a of $('.grad-map-link')) {
    const url=new URL(graduationPosition?'https://www.google.com/maps/dir/':'https://www.google.com/maps/search/');
    url.searchParams.set('api','1');
    if(graduationPosition) {
      url.searchParams.set('origin',graduationPosition.latitude+','+graduationPosition.longitude);
      url.searchParams.set('destination',a.dataset.place);
      url.searchParams.set('travelmode','walking');
    } else url.searchParams.set('query',a.dataset.place);
    a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
  }
}
function stopGraduationLocation() {
  if(graduationLocationWatch!==null && navigator.geolocation)navigator.geolocation.clearWatch(graduationLocationWatch);
  graduationLocationWatch=null;
  graduationPosition=null;
  $('#disable-location').disabled=true;
  setText('#location-status','Location is off. Map searches still work.');
  setGraduationLinks();
}
setGraduationLinks();
$('#enable-location').addEventListener('click',()=>{
  if(!navigator.geolocation || !window.isSecureContext) {
    setText('#location-status','Live location requires HTTPS (or localhost) and browser support.');
    return;
  }
  stopGraduationLocation();
  setText('#location-status','Waiting for location permission…');
  graduationLocationWatch=navigator.geolocation.watchPosition(
    p=>{
      graduationPosition={latitude:p.coords.latitude,longitude:p.coords.longitude};
      setGraduationLinks();
      $('#disable-location').disabled=false;
      setText('#location-status','Live location active (±'+Math.round(p.coords.accuracy)+' m). Open directions to use your starting point.');
    },err=>{
      if(err.code===1)stopGraduationLocation();
      setText('#location-status','Location unavailable or declined. Campus searches still work.');
    },{enableHighAccuracy:true,timeout:16000,maximumAge:10000});
});
$('#disable-location').addEventListener('click',stopGraduationLocation);
window.addEventListener('pagehide',stopGraduationLocation);

// Serialize session changes so a slow restore cannot overwrite a new sign-in.
async function restoreSession() {
  if (sessionBusy) return;
  setSessionBusy(true, 'Checking your demo session…');
  loginError.textContent = '';
  $('#retry-session').hidden = true;
  try {
    const profile = await api('session');
    const data = await loadAppData();
    showApp(profile, data, location.hash.replace(/^#/, '') || 'home');
  } catch (error) {
    showLogin({ focus: false, preserveRoute: true, resetForm: false });
    if (error.status !== 401) {
      loginError.textContent = error.message;
      $('#retry-session').hidden = false;
    }
  } finally {
    setSessionBusy(false);
  }
}
$('#retry-session').addEventListener('click', restoreSession);
restoreSession();
