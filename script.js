const API = 'https://medibot-api-u6uj.onrender.com';  // Change to deployed URL in Phase 5

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

  // Echo user message
  userMessage(`Age: ${age} | Gender: ${gender} | Symptoms: ${selectedSymptoms.join(', ')}`);

  // Typing indicator
  const typingId = showTyping();

  try {
    const res  = await fetch(`${API}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ symptoms: selectedSymptoms, age, gender })
    });
    const data = await res.json();
    removeTyping(typingId);
    showResult(data);
  } catch {
    removeTyping(typingId);
    botMessage("❌ Could not reach the backend. Is <code>app.py</code> running on port 5000?");
  }
}

// ── Show result card ──────────────────────────────────────
function showResult(data) {
  const top3Html = data.top3.map((item, i) => `
    <div class="top3-item">
      <span class="top3-name">${i + 1}. ${item.disease}</span>
      <span class="top3-badge">${item.confidence}%</span>
    </div>
  `).join('');

  const card = `
    <div class="result-card">
      <div class="result-top">
        <div class="result-disease">🩺 ${data.prediction}</div>
        <div class="result-conf">Confidence: ${data.confidence}%</div>
      </div>
      <div class="conf-bar-wrap">
        <div class="conf-bar" style="width:${data.confidence}%"></div>
      </div>
      <div class="top3-list">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Top 3 possibilities</div>
        ${top3Html}
      </div>
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
    <div class="bubble">${html}</div>`;
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