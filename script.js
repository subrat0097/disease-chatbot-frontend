const API = 'https://medibot-api-u6uj.onrender.com';

let allSymptoms    = [];
let selectedSymptoms = [];

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  renderInputArea();
  botMessage("👋 Hi! I'm <strong>MediBot</strong>. I'll help predict a possible disease based on your symptoms.");
  await loadSymptoms();
  botMessage("Please fill in your details below, then select the symptoms you're experiencing.");
});

async function loadSymptoms() {
  try {
    const res  = await fetch(`${API}/symptoms`);
    const data = await res.json();
    allSymptoms = data.symptoms;
    renderChips(allSymptoms);
  } catch {
    botMessage("⚠️ Could not connect to the backend. Make sure <code>app.py</code> is running.");
  }
}

// ── Render input panel ────────────────────────────────────
function renderInputArea() {
  document.getElementById('inputArea').innerHTML = `
    <div class="drag-handle" id="dragHandle">
      <div class="drag-bar"></div>
    </div>
    <div class="row-inputs">
      <div class="field-group">
        <label>Age</label>
        <input type="number" id="ageInput" min="1" max="110" placeholder="e.g. 28" value="25"/>
      </div>
      <div class="field-group">
        <label>Gender</label>
        <select id="genderInput">
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>

    <input class="symptom-search" id="symptomSearch" placeholder="🔍  Search symptoms…" oninput="filterChips(this.value)"/>

    <div class="chips-container" id="chipsContainer"></div>

    <div class="selected-tags" id="selectedTags">
      <span style="font-size:12px;color:var(--muted)" id="tagsPlaceholder">No symptoms selected yet</span>
    </div>

    <button class="btn-predict" id="predictBtn" onclick="predict()">Predict Disease</button>
  `;

  // Init drag after DOM is ready
  initDragHandle();
}

function initDragHandle() {
  const handle    = document.getElementById('dragHandle');
  const inputArea = document.getElementById('inputArea');
  if (!handle || !inputArea) return;

  let isDragging = false;
  let startY     = 0;
  let startHeight = 0;

  handle.addEventListener('mousedown', (e) => {
    isDragging  = true;
    startY      = e.clientY;
    startHeight = inputArea.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const delta     = startY - e.clientY;
    const newHeight = Math.min(Math.max(startHeight + delta, 120), window.innerHeight * 0.75);
    inputArea.style.height = newHeight + 'px';
    inputArea.style.flex   = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  });

  // Touch support
  handle.addEventListener('touchstart', (e) => {
    isDragging  = true;
    startY      = e.touches[0].clientY;
    startHeight = inputArea.offsetHeight;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const delta     = startY - e.touches[0].clientY;
    const newHeight = Math.min(Math.max(startHeight + delta, 120), window.innerHeight * 0.75);
    inputArea.style.height = newHeight + 'px';
    inputArea.style.flex   = 'none';
  }, { passive: false });

  document.addEventListener('touchend', () => { isDragging = false; });
}

// ── Chips ─────────────────────────────────────────────────
function renderChips(list) {
  const container = document.getElementById('chipsContainer');
  if (!container) return;
  container.innerHTML = list.map(s =>
    `<div class="chip ${selectedSymptoms.includes(s) ? 'selected' : ''}"
          onclick="toggleSymptom('${s}')">${s}</div>`
  ).join('');
}

function filterChips(query) {
  const filtered = query.trim() === ''
    ? allSymptoms
    : allSymptoms.filter(s => s.includes(query.toLowerCase().trim()));
  renderChips(filtered);
}

function toggleSymptom(sym) {
  if (selectedSymptoms.includes(sym)) {
    selectedSymptoms = selectedSymptoms.filter(s => s !== sym);
  } else {
    selectedSymptoms.push(sym);
  }
  filterChips(document.getElementById('symptomSearch')?.value || '');
  renderTags();
}

function renderTags() {
  const container = document.getElementById('selectedTags');
  if (!container) return;
  if (selectedSymptoms.length === 0) {
    container.innerHTML = `<span style="font-size:12px;color:var(--muted)" id="tagsPlaceholder">No symptoms selected yet</span>`;
    return;
  }
  container.innerHTML = selectedSymptoms.map(s =>
    `<div class="tag">${s}<span class="remove" onclick="toggleSymptom('${s}')">×</span></div>`
  ).join('');
}

// ── Predict ───────────────────────────────────────────────
async function predict() {
  const age    = parseInt(document.getElementById('ageInput').value);
  const gender = document.getElementById('genderInput').value;

  if (!age || age < 1) { botMessage("⚠️ Please enter a valid age."); return; }
  if (selectedSymptoms.length === 0) { botMessage("⚠️ Please select at least one symptom."); return; }

  userMessage(`Age: ${age} | Gender: ${gender} | Symptoms: ${selectedSymptoms.join(', ')}`);

  botMessage("🕒 One more thing — <strong>how long have you been experiencing these symptoms?</strong>");
  showDurationPicker(age, gender);
}

// ── Duration Picker ───────────────────────────────────────
function showDurationPicker(age, gender) {
  const durations = [
    "Not sure",
    "Less than a day",
    "1 - 3 days",
    "4 - 7 days",
    "1 - 2 weeks",
    "2 - 4 weeks",
    "1 - 3 months",
    "More than 3 months"
  ];

  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'durationPicker';
  div.innerHTML = `
    <div class="avatar">+</div>
    <div class="bubble">
      <div class="duration-grid">
        ${durations.map(d => `
          <button class="duration-btn" onclick="selectDuration('${d}', ${age}, '${gender}', this)">
            ${d}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('chatWindow').appendChild(div);
  scrollBottom();
}

async function selectDuration(duration, age, gender, btnEl) {
  document.querySelectorAll('.duration-btn').forEach(b => {
    b.disabled = true;
    b.style.opacity = '0.5';
  });
  btnEl.style.opacity = '1';
  btnEl.style.borderColor = 'var(--accent)';
  btnEl.style.color = 'var(--accent)';

  userMessage(`Duration: ${duration}`);

  const typingId = showTyping();

  try {
    const res  = await fetch(`${API}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ symptoms: selectedSymptoms, age, gender, duration })
    });
    const data = await res.json();
    removeTyping(typingId);
    showResult(data, duration);
  } catch {
    removeTyping(typingId);
    botMessage("❌ Could not reach the backend. Is <code>app.py</code> running?");
  }
}

// ── Show result card ──────────────────────────────────────
function showResult(data, duration = null) {
  const labelColors = {
    "Very Common": "#38d9a9",
    "Common":      "#4f8ef7",
    "Possible":    "#f7a84f",
    "Unlikely":    "#e05c5c"
  };

  const top3Html = data.top3.map((item, i) => {
      const matchedHtml = item.matched_symptoms && item.matched_symptoms.length > 0
        ? item.matched_symptoms.map(s =>
            `<span class="matched-tag">${s.replace(/_/g, ' ')}</span>`
          ).join('')
        : '<span style="color:var(--muted);font-size:11px">No direct symptom match found</span>';

      return `
        <div class="top3-item">
         <div class="top3-left">
            <span class="top3-name">${i + 1}. ${item.disease}</span>
          </div>
        </div>
        <div class="top3-desc">${item.description}</div>
        <div class="justifier">
          <div class="justifier-toggle" onclick="toggleJustifier(this)">
            🔍 Why this prediction?
          </div>
          <div class="justifier-body" style="display:none">
            <div class="justifier-summary">
              <strong>${item.matched_symptoms ? item.matched_symptoms.length : 0}</strong> 
              of your symptoms match this disease:
            </div>
            <div class="justifier-tags">${matchedHtml}</div>
          </div>
        </div>
      `;
    }).join('');
  const card = `
    <div class="result-card">
      <div class="result-top">
        <div class="result-disease">🩺 ${data.prediction}</div>
        <div class="result-conf"></div>
      </div>
      <div class="result-desc-main">${data.description}</div>
      <div class="top3-list">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Top 3 possibilities</div>
        ${top3Html}
      </div>
      ${duration ? `<div class="result-duration">🕒 Symptoms since: <strong>${duration}</strong></div>` : ''}
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:4px">
      ⚠️ This is not a medical diagnosis. Please consult a healthcare professional.
    </div>
    <button class="btn-reset" onclick="resetSymptoms()">Start over</button>
  `;

  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `<div class="avatar">+</div><div class="bubble">${card}</div>`;
  document.getElementById('chatWindow').appendChild(div);
  scrollBottom();
  // Ask for location after result
  setTimeout(() => askForLocation(data.prediction), 800);
}

// ── Location & Hospital Finder ────────────────────────────
function askForLocation(disease) {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'locationAsk';
  div.innerHTML = `
    <div class="avatar">+</div>
    <div class="bubble">
      <div style="margin-bottom:10px">📍 Would you like me to find <strong>nearby hospitals</strong> that can help with <strong>${disease}</strong>?</div>
      <div style="display:flex;gap:8px;">
        <button class="duration-btn" onclick="getLocation('${disease}', this)" style="border-color:var(--accent);color:var(--accent);">
          📍 Yes, find hospitals
        </button>
        <button class="duration-btn" onclick="skipLocation(this)">
          No thanks
        </button>
      </div>
    </div>
  `;
  document.getElementById('chatWindow').appendChild(div);
  scrollBottom();
}

function skipLocation(btnEl) {
  btnEl.closest('.bubble').innerHTML = '<span style="color:var(--muted);font-size:13px">Hospital search skipped.</span>';
}

async function getLocation(disease, btnEl) {
  btnEl.closest('.bubble').innerHTML = '<span style="color:var(--muted);font-size:13px">📍 Getting your location...</span>';

  if (!navigator.geolocation) {
    botMessage("⚠️ Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      await findHospitals(lat, lon, disease);
    },
    (err) => {
      botMessage("⚠️ Could not get your location. Please allow location access and try again.");
    }
  );
}

async function findHospitals(lat, lon, disease) {
  const typingId = showTyping();

  try {
    // Search nearby hospitals using Overpass API
    const radius = 5000; // 5km radius
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lon});
        way["amenity"="hospital"](around:${radius},${lat},${lon});
        node["amenity"="clinic"](around:${radius},${lat},${lon});
      );
      out body 5;
    `;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });

    const data = await res.json();
    removeTyping(typingId);

    if (!data.elements || data.elements.length === 0) {
      botMessage("😕 No hospitals found within 5km. Try allowing more precise location access.");
      return;
    }

    // Build hospital cards
    const hospitals = data.elements.slice(0, 4).map(el => {
      const name    = el.tags?.name || "Unnamed Hospital";
      const hLat    = el.lat || el.center?.lat;
      const hLon    = el.lon || el.center?.lon;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${hLat},${hLon}`;
      const dist    = getDistanceKm(lat, lon, hLat, hLon);
      return { name, dist, mapsUrl };
    }).sort((a, b) => a.dist - b.dist);

    const hospitalsHtml = hospitals.map(h => `
      <div class="hospital-card">
        <div class="hospital-info">
          <div class="hospital-name">🏥 ${h.name}</div>
          <div class="hospital-dist">📍 ${h.dist} km away</div>
        </div>
        <a href="${h.mapsUrl}" target="_blank" class="directions-btn">Get Directions</a>
      </div>
    `).join('');

    const div = document.createElement('div');
    div.className = 'msg bot';
    div.innerHTML = `
      <div class="avatar">+</div>
      <div class="bubble">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">
          🏥 Nearby hospitals for <span style="color:var(--accent2)">${disease}</span>
        </div>
        <div class="hospital-list">${hospitalsHtml}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px">
          Showing hospitals within 5km of your location.
        </div>
      </div>
    `;
    document.getElementById('chatWindow').appendChild(div);
    scrollBottom();

  } catch (err) {
    removeTyping(typingId);
    botMessage("⚠️ Could not fetch nearby hospitals. Please try again.");
  }
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return "?";
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

function resetSymptoms() {
  selectedSymptoms = [];
  renderTags();
  renderChips(allSymptoms);
  document.getElementById('symptomSearch').value = '';
  botMessage("Symptoms cleared! Select new symptoms to run another prediction.");
}

// ── Helpers ───────────────────────────────────────────────
function botMessage(html) {
  appendMessage('bot', html);
}
function userMessage(text) {
  appendMessage('user', text);
}

function appendMessage(type, html) {
  const div = document.createElement('div');
  div.className = `msg ${type}`;
  div.innerHTML = `
    <div class="avatar">${type === 'bot' ? '+' : 'U'}</div>
    <div class="bubble">${html}</div>
  `;
  document.getElementById('chatWindow').appendChild(div);
  scrollBottom();
}

function showTyping() {
  const id  = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'msg bot'; div.id = id;
  div.innerHTML = `<div class="avatar">+</div><div class="bubble typing"><span></span><span></span><span></span></div>`;
  document.getElementById('chatWindow').appendChild(div);
  scrollBottom();
  return id;
}
function removeTyping(id) {
  document.getElementById(id)?.remove();
}
function scrollBottom() {
  const w = document.getElementById('chatWindow');
  w.scrollTop = w.scrollHeight;
}

// ── Drag to resize input area ─────────────────────────────
(function() {
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  const handle  = document.getElementById('dragHandle');
  const inputArea = document.getElementById('inputArea');
  const chatWindow = document.getElementById('chatWindow');

  if (!handle || !inputArea) return;

  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
    startHeight = inputArea.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const delta = startY - e.clientY; // drag up = bigger
    const newHeight = Math.min(Math.max(startHeight + delta, 120), window.innerHeight * 0.75);
    inputArea.style.height = newHeight + 'px';
    inputArea.style.flex = 'none';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = '';
    }
  });

  // Touch support for mobile
  handle.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    startHeight = inputArea.offsetHeight;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const delta = startY - e.touches[0].clientY;
    const newHeight = Math.min(Math.max(startHeight + delta, 120), window.innerHeight * 0.75);
    inputArea.style.height = newHeight + 'px';
    inputArea.style.flex = 'none';
  }, { passive: false });

  document.addEventListener('touchend', () => { isDragging = false; });
})();

function toggleJustifier(el) {
  const body = el.nextElementSibling;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  el.textContent = isOpen ? '🔍 Why this prediction?' : '🔼 Hide explanation';
}