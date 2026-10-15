/**
 * SRM Event Companion — frontend-only demo.
 * All records are illustrative fixtures; no server or university account is used.
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
const demoStudents = [
  { id: 'SRM2026001', name: 'Vishva', netId: 'vishva.demo', seat: 'E07', entryGate: '02', counter: '03' },
  { id: 'SRM2026002', name: 'Sanjana', netId: 'sanjana.demo', seat: 'C04', entryGate: '01', counter: '01' },
  { id: 'SRM2026003', name: 'Arun', netId: 'arun.demo', seat: 'F02', entryGate: '03', counter: '02' }
];
const occupiedSeats = new Set(['A02', 'A08', 'B06', 'B07', 'C01', 'C03', 'D05', 'D08', 'E01', 'F04', 'F09', 'G02', 'G06']);
const demoMenu = [
  { id: 'veg-meals', name: 'Veg meals', description: 'South Indian rice with sambar, rasam and vegetables', category: 'veg', dietLabel: 'VEGETARIAN · SOUTH INDIAN', badge: 'VEG', artStyle: 'veg', priceInr: 120 },
  { id: 'chicken-rice', name: 'Chicken rice', description: 'South Indian-style chicken rice', category: 'nonveg', dietLabel: 'NON-VEGETARIAN · SOUTH INDIAN', badge: 'NON-VEG', artStyle: 'nonveg', priceInr: 150 },
  { id: 'masala-dosa', name: 'Masala dosa', description: 'Dosa with potato filling', category: 'veg', dietLabel: 'VEGETARIAN · SOUTH INDIAN', badge: 'VEG', artStyle: 'veg', priceInr: 90 },
  { id: 'egg-dosa', name: 'Egg dosa', description: 'Egg dosa, South Indian style', category: 'nonveg', dietLabel: 'NON-VEGETARIAN · SOUTH INDIAN', badge: 'NON-VEG', artStyle: 'nonveg', priceInr: 80 }
];
const attendeeRecords = new Map();
let currentAttendees = { accompanyingMembers: 0, members: [] };

function demoProfile(student) {
  const counter = student.counter;
  const [row, number] = [student.seat.slice(0, -2), Number(student.seat.slice(-2))];
  return {
    student: { id: student.id, name: student.name, netId: student.netId },
    event: {
      name: 'SRM University Graduation Day',
      date: '08 October 2026',
      venue: 'Main Auditorium',
      block: 'A',
      level: '01',
      entryGate: student.entryGate,
      seat: { row, number, code: student.seat },
      foodCounter: {
        number: counter,
        floor: counter === '02' ? 'First Floor' : 'Ground Floor',
        zone: counter === '01' ? 'Zone A' : counter === '02' ? 'Zone C' : 'Zone B',
        nearGate: student.entryGate
      },
      registrationCounter: {
        number: counter,
        floor: counter === '02' ? 'First Floor' : 'Ground Floor',
        zone: counter === '01' ? 'Zone A' : counter === '02' ? 'Zone C' : 'Zone B'
      }
    }
  };
}

function loadAppData(profile) {
  const assigned = profile.event.seat.code;
  const seats = [];
  for (const row of [...'ABCDEFG']) {
    for (let number = 1; number <= 9; number++) {
      const code = row + String(number).padStart(2, '0');
      seats.push({
        row,
        number,
        code,
        status: code === assigned ? 'YOURS' : occupiedSeats.has(code) || demoStudents.some(student => student.seat === code) ? 'OCCUPIED' : 'AVAILABLE'
      });
    }
  }
  return {
    seats: { venue: 'Main Auditorium', seatsPerRow: 9, rows: [...'ABCDEFG'], seats },
    menu: { counter: profile.event.foodCounter, items: demoMenu }
  };
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
  setText('.ticket-stats div:nth-child(2) strong', counter.number);
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
  currentAttendees = attendeeRecords.get(currentUser.id) || { accompanyingMembers: 0, members: [] };
  $('#attendee-count').value = currentAttendees.accompanyingMembers;
  renderCompanionFields(currentAttendees.accompanyingMembers, currentAttendees.members);
  setText('#attendee-summary', `Accompanying members: ${currentAttendees.accompanyingMembers} · Total: ${currentAttendees.accompanyingMembers + 1}`);
  loginScreen.hidden = true;
  appShell.hidden = false;
  renderRoute(navigate, true);
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

function setSessionBusy(busy, message = '') {
  sessionBusy = busy;
  [...loginForm.elements, $('#demo-fill'), ...$$('[data-signout]')]
    .forEach(control => { control.disabled = busy; });
  loginForm.setAttribute('aria-busy', String(busy));
  setText('#login-status', message);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sessionBusy) return;
  const id = $('#student-id').value.trim();
  if (id.length < 3) {
    loginError.textContent = 'Please enter a demo register number or Net ID.';
    $('#student-id').focus();
    return;
  }
  loginError.textContent = '';
  setSessionBusy(true, 'Loading your event pass…');
  try {
    await new Promise(resolve => window.setTimeout(resolve, 250));
    const student = demoStudents.find(candidate => candidate.id.toLowerCase() === id.toLowerCase()
      || candidate.netId.toLowerCase() === id.toLowerCase());
    if (!student) throw new Error('Demo account not found. Try SRM2026001, SRM2026002, SRM2026003, or a matching demo Net ID.');
    const profile = demoProfile(student);
    const data = loadAppData(profile);
    history.replaceState({ route: 'home' }, '', '#home');
    showApp(profile, data);
    showStudentModal();
  } catch (error) {
    showLogin({ focus: false, resetForm: false });
    loginError.textContent = error.message;
  } finally {
    setSessionBusy(false);
    if (!currentUser) $('#student-id').focus({ preventScroll: true });
  }
});

$('#demo-fill').addEventListener('click', () => {
  $('#student-id').value = 'SRM2026001';
  loginError.textContent = '';
  $('#student-id').focus();
});

$$('[data-go]').forEach(button => button.addEventListener('click', () => goTo(button.dataset.go)));
$$('[data-signout]').forEach(button => button.addEventListener('click', () => {
  if (sessionBusy) return;
  showLogin({ focus: false });
  $('#student-id').focus({ preventScroll: true });
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
  const selectedRect = selected.getBoundingClientRect();
  const panRect = pan.getBoundingClientRect();
  const targetLeft = pan.scrollLeft + selectedRect.left - panRect.left - pan.clientWidth / 2 + selectedRect.width / 2;
  const targetTop = pan.scrollTop + selectedRect.top - panRect.top - pan.clientHeight / 2 + selectedRect.height / 2;
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

function pdfText(value) {
  return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
}

$('#download-sample-pass').addEventListener('click', async () => {
  if (!currentUser || !currentPass) return;
  const button = $('#download-sample-pass');
  button.disabled = true;
  setText('#sample-pass-status', 'Preparing your PDF pass…');
  try {
  const logoResponse = await fetch(new URL('assets/srm-online-logo.png', document.baseURI), { cache: 'force-cache' });
  if (!logoResponse.ok) throw new Error(`SRM logo could not be loaded (HTTP ${logoResponse.status}).`);
  const logoBitmap = await createImageBitmap(await logoResponse.blob());
  const canvas = document.createElement('canvas');
  canvas.width = logoBitmap.width;
  canvas.height = logoBitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not prepare the SRM logo for the PDF.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(logoBitmap, 0, 0);
  logoBitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const rgb = new Uint8Array(canvas.width * canvas.height * 3);
  for (let source = 0, target = 0; source < pixels.length; source += 4) {
    rgb[target++] = pixels[source];
    rgb[target++] = pixels[source + 1];
    rgb[target++] = pixels[source + 2];
  }
  const compression = new CompressionStream('deflate');
  const compressedLogo = new Uint8Array(await new Response(
    new Blob([rgb]).stream().pipeThrough(compression)
  ).arrayBuffer());
  const counter = currentPass.registrationCounter || currentPass.foodCounter;
  const commands = [];
  const text = (x, y, size, value, font = 'F1', color = '0.10 0.20 0.36') => {
    commands.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`);
  };
  const rect = (x, y, width, height, color) => {
    commands.push(`q ${color} rg ${x} ${y} ${width} ${height} re f Q`);
  };

  rect(0, 650, 595, 192, '0.04 0.17 0.38');
  rect(0, 640, 595, 10, '0.93 0.73 0.37');
  rect(38, 762, 280, 58, '1 1 1');
  commands.push('q 260 0 0 48.83 48 766 cm /Im1 Do Q');
  text(338, 794, 10, 'GRADUATION DAY', 'F2', '0.93 0.84 0.60');
  text(338, 766, 17, currentPass.name.toUpperCase(), 'F2', '1 1 1');
  text(338, 744, 10, 'SAMPLE EVENT PASS', 'F1', '0.84 0.90 0.97');
  text(48, 582, 22, currentUser.name, 'F2');
  text(48, 558, 12, `Register number: ${currentUser.id}`, 'F1', '0.35 0.45 0.58');
  rect(48, 408, 235, 112, '0.94 0.96 0.99');
  rect(312, 408, 235, 112, '0.94 0.96 0.99');
  text(68, 488, 10, 'YOUR SEAT', 'F2', '0.34 0.44 0.58');
  text(68, 443, 30, currentPass.seat.code, 'F2', '0.04 0.26 0.55');
  text(332, 488, 10, 'REGISTRATION COUNTER', 'F2', '0.34 0.44 0.58');
  text(332, 443, 30, counter.number, 'F2', '0.64 0.43 0.10');
  text(48, 370, 13, `${currentPass.venue} | Block ${currentPass.block}`);
  text(48, 346, 12, `Date: ${currentPass.date}`);
  rect(48, 220, 499, 76, '1 0.97 0.89');
  text(66, 266, 12, 'DEMO ONLY', 'F2', '0.48 0.32 0.08');
  text(66, 244, 10, 'Not an official university document and not valid for event entry.', 'F1', '0.48 0.32 0.08');
  text(48, 170, 10, 'Unofficial student project | Sample event details are illustrative', 'F1', '0.42 0.50 0.61');

  const stream = commands.join('\n');
  const ascii = value => new TextEncoder().encode(value);
  const imageStream = new Uint8Array(compressedLogo);
  const streamObject = (dictionary, content) => [
    ascii(`${dictionary}\nstream\n`), content, ascii('\nendstream')
  ];
  const objects = [
    [ascii('<< /Type /Catalog /Pages 2 0 R >>')],
    [ascii('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')],
    [ascii('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 7 0 R >> >> /Contents 6 0 R >>')],
    [ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')],
    [ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')],
    streamObject(`<< /Length ${ascii(stream).length} >>`, ascii(stream)),
    streamObject(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${imageStream.length} >>`, imageStream)
  ];
  const chunks = [ascii('%PDF-1.4\n')];
  const offsets = [0];
  let byteOffset = chunks[0].length;
  objects.forEach((parts, index) => {
    offsets.push(byteOffset);
    const objectParts = [ascii(`${index + 1} 0 obj\n`), ...parts, ascii('\nendobj\n')];
    chunks.push(...objectParts);
    byteOffset += objectParts.reduce((total, part) => total + part.length, 0);
  });
  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { xref += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(ascii(xref));
  const pdfBytes = new Uint8Array(chunks.reduce((total, part) => total + part.length, 0));
  let position = 0;
  chunks.forEach(part => {
    pdfBytes.set(part, position);
    position += part.length;
  });

  const file = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = `graduation-day-sample-pass-${currentUser.id}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setText('#sample-pass-status', 'Sample PDF downloaded. This demo pass is not valid for event entry.');
  } catch (error) {
    setText('#sample-pass-status', `Could not create the PDF pass: ${error.message}`);
  } finally {
    button.disabled = false;
  }
});

// Graduation Day attendee popup and map search actions.
function currentCompanionDetails() {
  return $$('.companion-card').map(card => ({
    name: card.querySelector('[data-companion-name]').value,
    relationship: card.querySelector('[data-companion-relationship]').value,
    mobileNumber: card.querySelector('[data-companion-mobile]').value
  }));
}

function renderCompanionFields(count, savedMembers = currentCompanionDetails()) {
  const container = $('#companion-fields');
  container.replaceChildren();
  for (let i = 0; i < count; i++) {
    const details = savedMembers[i] || {};
    const card = document.createElement('fieldset');
    card.className = 'companion-card';
    const legend = document.createElement('legend');
    legend.textContent = `Accompanying member ${i + 1}`;
    card.append(legend);
    [
      { label: 'Full name', key: 'name', value: details.name || '', required: true, type: 'text', maxLength: 60 },
      { label: 'Relationship to you', key: 'relationship', value: details.relationship || '', required: true, type: 'text', maxLength: 40 },
      { label: 'Mobile number (optional)', key: 'mobile', value: details.mobileNumber || '', required: false, type: 'tel', maxLength: 20 }
    ].forEach(field => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = field.type;
      input.value = field.value;
      input.required = field.required;
      input.maxLength = field.maxLength;
      input.autocomplete = field.key === 'mobile' ? 'tel' : field.key === 'name' ? 'name' : 'off';
      if (field.key === 'mobile') input.pattern = '[+]?[0-9][0-9 ()-]{5,17}[0-9]';
      input.dataset[`companion${field.key[0].toUpperCase()}${field.key.slice(1)}`] = '';
      label.textContent = field.label;
      label.append(input);
      card.append(label);
    });
    container.append(card);
  }
}

function showStudentModal() {
  if (!currentUser) return;
  $('#student-modal').hidden = false;
  renderCompanionFields(Number($('#attendee-count').value));
  $('#attendee-count').focus({preventScroll:true});
}
function hideStudentModal() {
  $('#student-modal').hidden = true;
  $('#attendee-error').textContent = '';
}
$('#open-student-profile').addEventListener('click',showStudentModal);
$('#close-student-profile').addEventListener('click',hideStudentModal);
$('#student-modal').addEventListener('click',e => {if(e.target === $('#student-modal')) hideStudentModal();});
$('#attendee-count').addEventListener('input', () => {
  const count = Number($('#attendee-count').value);
  if (Number.isInteger(count) && count >= 0 && count <= 10) renderCompanionFields(count);
});
document.addEventListener('keydown',e => {if(e.key==='Escape' && !$('#student-modal').hidden)hideStudentModal();});
$('#attendee-form').addEventListener('submit', e => {
  e.preventDefault();
  const count=Number($('#attendee-count').value);
  if(!Number.isInteger(count) || count<0 || count>10) {
    setText('#attendee-error','Enter a whole number between 0 and 10.');
    return;
  }
  const members=currentCompanionDetails();
  if(members.some(member => !member.name.trim() || !member.relationship.trim())) {
    setText('#attendee-error','Enter each accompanying member’s name and relationship.');
    return;
  }
  currentAttendees = { accompanyingMembers: count, members };
  attendeeRecords.set(currentUser.id, currentAttendees);
  setText('#attendee-summary', `Accompanying members: ${count} · Total: ${count + 1}`);
  hideStudentModal();
});
function setGraduationLinks() {
  for (const a of $$('.grad-map-link')) {
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

setSessionBusy(false);
showLogin({ focus: false, preserveRoute: true });
