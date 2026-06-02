// ─── ELEMENT REFS ────────────────────────────────────────────────────────────
const pwd          = document.getElementById('pwd');
const bar          = document.getElementById('bar');
const sim          = document.getElementById('sim');
const strengthText = document.getElementById('strengthText');
const analyzeBtn   = document.getElementById('analyzeBtn');
const eye          = document.getElementById('toggleEye');
const inputWrap    = document.getElementById('inputWrap');

let chartInstance, simInterval, attemptCount = 0;

// ─── PARTICLES ────────────────────────────────────────────────────────────────
(function spawnParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    p.style.cssText =
      `left:${Math.random()*100}%;` +
      `bottom:${Math.random()*40}%;` +
      `--d:${4 + Math.random()*8}s;` +
      `--delay:${Math.random()*6}s;` +
      `opacity:0`;
    container.appendChild(p);
  }
})();

// ─── LIVE BADGE UPDATE ────────────────────────────────────────────────────────
pwd.addEventListener('focus', () => inputWrap.classList.add('focused'));
pwd.addEventListener('blur',  () => inputWrap.classList.remove('focused'));

pwd.addEventListener('input', () => {
  const v = pwd.value;
  document.getElementById('mLower').classList.toggle('active', /[a-z]/.test(v));
  document.getElementById('mUpper').classList.toggle('active', /[A-Z]/.test(v));
  document.getElementById('mNum').classList.toggle('active',   /[0-9]/.test(v));
  document.getElementById('mSym').classList.toggle('active',   /[!@#$%^&*]/.test(v));
  const lenBadge = document.getElementById('mLen');
  lenBadge.textContent = 'LEN:' + v.length;
  lenBadge.classList.toggle('active', v.length >= 8);
});

// ─── EYE TOGGLE ───────────────────────────────────────────────────────────────
eye.onclick = () => {
  const show = pwd.type === 'password';
  pwd.type = show ? 'text' : 'password';
  eye.textContent = show ? '🙈' : '👁';
  showToast(show ? 'Password visible' : 'Password hidden', 'info');
};

// ─── ENTER KEY ────────────────────────────────────────────────────────────────
pwd.addEventListener('keydown', e => { if (e.key === 'Enter') analyzeBtn.click(); });

// ─── ANALYZE BUTTON ───────────────────────────────────────────────────────────
analyzeBtn.onclick = function () {
  const v = pwd.value.trim();
  if (!v)        { showToast('Enter a password first', 'error'); shakeInput(); return; }
  if (v.length < 4) { showToast('Password too short to analyze', 'warn'); shakeInput(); return; }
  runAnalysis(v);
};

function shakeInput() {
  inputWrap.style.animation = 'shake 0.4s ease';
  setTimeout(() => inputWrap.style.animation = '', 400);
}

// ─── RUN WITH LOADING STATE ───────────────────────────────────────────────────
function runAnalysis(v) {
  const span = analyzeBtn.querySelector('span');
  analyzeBtn.style.pointerEvents = 'none';
  let dots = 0;
  const ticker = setInterval(() => {
    dots = (dots + 1) % 4;
    span.textContent = 'ANALYZING' + '.'.repeat(dots);
  }, 220);

  setTimeout(() => {
    clearInterval(ticker);
    analyzeBtn.style.pointerEvents = '';
    span.textContent = '▶ RUN ANALYSIS';
    doAnalysis(v);
  }, 900);
}

// ─── CORE ANALYSIS ────────────────────────────────────────────────────────────
function doAnalysis(v) {
  // Score (0-4)
  let score = 0;
  if (v.length >= 8)         score++;
  if (v.length >= 12)        score++;
  if (/[A-Z]/.test(v))       score++;
  if (/[0-9]/.test(v))       score++;
  if (/[!@#$%^&*]/.test(v))  score++;
  score = Math.min(score, 4);

  const colors = ['#ef4444','#f97316','#eab308','#22c55e','#00f5ff'];
  const labels = ['CRITICAL','WEAK','FAIR','STRONG','ELITE'];
  const color  = colors[score];
  const label  = labels[score];

  bar.style.width      = (score + 1) * 20 + '%';
  bar.style.background = color;
  bar.style.boxShadow  = `0 0 12px ${color}88`;
  strengthText.textContent = label;
  strengthText.style.color  = color;

  // Entropy
  let charset = 0;
  if (/[a-z]/.test(v))       charset += 26;
  if (/[A-Z]/.test(v))       charset += 26;
  if (/[0-9]/.test(v))       charset += 10;
  if (/[!@#$%^&*]/.test(v))  charset += 32;

  const entropy = v.length * Math.log2(charset || 1);
  const time    = Math.pow(2, entropy) / 1e9;

  document.getElementById('eVal').textContent = entropy.toFixed(1);
  document.getElementById('tVal').textContent = formatTime(time);

  const ed = document.getElementById('entropyDisplay');
  ed.style.display = 'grid';
  document.getElementById('eCard1').classList.add('lit');
  document.getElementById('eCard2').classList.add('lit');

  // Sub-sections
  renderSuggestions(extractBase(v));
  document.getElementById('suggestSection').style.display = 'block';
  document.getElementById('chartWrap').style.display      = 'block';
  renderChart(time);
  startSimulation(v);

  // Toast feedback
  if      (score <= 1) showToast('CRITICAL: Password is dangerously weak', 'error');
  else if (score === 2) showToast('WARNING: Password needs improvement', 'warn');
  else if (score === 3) showToast('GOOD: Password is reasonably strong', 'success');
  else                  showToast('ELITE: Exceptional password strength', 'info');
}

// ─── TIME FORMATTER ───────────────────────────────────────────────────────────
function formatTime(s) {
  if (s < 1)           return '< 1 sec';
  if (s < 60)          return s.toFixed(1) + ' sec';
  if (s < 3600)        return (s / 60).toFixed(1) + ' min';
  if (s < 86400)       return (s / 3600).toFixed(1) + ' hrs';
  if (s < 31536000)    return (s / 86400).toFixed(0) + ' days';
  if (s < 3153600000)  return (s / 31536000).toFixed(1) + ' yrs';
  return '∞ EONS';
}

// ─── SUGGESTIONS ─────────────────────────────────────────────────────────────
const WORDS_A = ['Cyber','Quantum','Pixel','Matrix','Nexus','Cipher','Vector','Neural','Sigma','Helix'];
const WORDS_B = ['Shield','Vault','Forge','Pulse','Core','Apex','Storm','Lock','Node','Gate'];
const SYMS    = ['!','@','#','$','%','&'];

function extractBase(p) {
  let b = p.replace(/[^a-zA-Z]/g, '');
  if (b.length < 2) b = 'Key';
  return b.slice(0, 6).charAt(0).toUpperCase() + b.slice(1, 6).toLowerCase();
}

function generate(base) {
  const w1  = WORDS_A[Math.floor(Math.random() * WORDS_A.length)];
  const w2  = WORDS_B[Math.floor(Math.random() * WORDS_B.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const sym = SYMS[Math.floor(Math.random() * SYMS.length)];
  return `${base}${w1}${w2}${num}${sym}`;
}

function renderSuggestions(base) {
  const list = document.getElementById('suggestList');
  list.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const pw  = generate(base);
    const row = document.createElement('div');
    row.className = 'suggest-row';
    row.style.animationDelay = (i * 0.08) + 's';
    row.innerHTML = `
      <span class="suggest-pw" id="spw${i}">${pw}</span>
      <div class="suggest-strength"><div class="suggest-strength-fill"></div></div>
      <button class="btn-copy" onclick="copySuggestion(${i})">COPY</button>`;
    list.appendChild(row);
  }
}

function refreshSuggestions() {
  renderSuggestions(extractBase(pwd.value));
  showToast('New suggestions generated', 'info');
}

function copySuggestion(i) {
  const el  = document.getElementById('spw' + i);
  const btn = document.querySelectorAll('.btn-copy')[i];
  navigator.clipboard.writeText(el.textContent).then(() => {
    btn.textContent = 'COPIED';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('copied'); }, 2000);
    showToast('Password copied to clipboard', 'success');
  });
}

// ─── CHART ────────────────────────────────────────────────────────────────────
function renderChart(userTime) {
  const ctx = document.getElementById('chart').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const refs = [
    { label: '123456',       time: 0.000001 },
    { label: 'password1',    time: 0.2 },
    { label: 'Pas$w0rd',     time: 86400 },
    { label: 'YOUR PASSWORD',time: userTime },
    { label: 'Qx#9mK!vP2',  time: Math.pow(2, 80) / 1e9 },
  ];

  const data        = refs.map(r => Math.log10(Math.max(r.time, 0.0001) + 1));
  const bgColors    = refs.map((_, i) => i === 3 ? 'rgba(0,245,255,0.55)' : 'rgba(0,245,255,0.12)');
  const borderColors= refs.map((_, i) => i === 3 ? 'rgba(0,245,255,1)'    : 'rgba(0,245,255,0.35)');

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: refs.map(r => r.label),
      datasets: [{
        label: 'Crack Time (log scale)',
        data:  data,
        backgroundColor:  bgColors,
        borderColor:      borderColors,
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '~' + formatTime(refs[ctx.dataIndex].time)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#4a6080', font: { family: 'Share Tech Mono', size: 10 } },
          grid:  { color: 'rgba(255,255,255,0.03)' },
          border:{ color: '#1a2a4a' }
        },
        y: { display: false, grid: { display: false } }
      }
    }
  });
}

// ─── ATTACK SIMULATION ────────────────────────────────────────────────────────
const DICTS   = ['123456','password','admin','letmein','qwerty','abc123','iloveyou','login','welcome','dragon'];
const ATTACKS = [
  'Dictionary attack initialized...',
  'Loading wordlist (8.4M entries)...',
  'Switching to rule-based mutations...',
  'Activating hybrid mode...',
  'Deploying rainbow tables...',
  'Brute-force mode: ACTIVE'
];

function startSimulation(v) {
  if (simInterval) clearInterval(simInterval);
  sim.innerHTML = '';
  attemptCount  = 0;
  document.getElementById('attempts').textContent = '0';

  let phase = 0, idx = 0;
  appendSim('> ATTACK SEQUENCE INITIATED', 'prompt');
  appendSim(`> TARGET HASH LENGTH: ${v.length} CHARS`, 'info');

  simInterval = setInterval(() => {
    if (phase === 0) {
      if (idx < DICTS.length) {
        const match = DICTS[idx] === v;
        appendSim(`[${String(idx+1).padStart(3,'0')}] Trying "${DICTS[idx]}" — ${match ? 'MATCH!' : '✗'}`, match ? 'fail' : 'try');
        attemptCount += Math.floor(1000 + Math.random() * 50000);
        document.getElementById('attempts').textContent = attemptCount.toLocaleString();
        idx++;
        if (match) {
          clearInterval(simInterval);
          appendSim('⚠  PASSWORD FOUND IN DICTIONARY!', 'fail');
          showToast('CRITICAL: Password found in dictionary!', 'error');
        }
      } else {
        phase = 1; idx = 0;
      }
    } else if (phase === 1) {
      if (idx < ATTACKS.length) {
        appendSim('// ' + ATTACKS[idx], 'info');
        idx++;
      } else {
        phase = 2;
        appendSim('> Brute-force running in background...', 'prompt');
        appendSim('> Estimated time to crack: ' + formatTime(Math.pow(2, v.length * Math.log2(72)) / 1e9), 'success');
        clearInterval(simInterval);
      }
    }
    sim.scrollTop = sim.scrollHeight;
  }, 380);
}

function appendSim(text, cls) {
  const el = document.createElement('div');
  el.className = `sim-line sim-${cls}`;
  el.textContent = text;
  sim.appendChild(el);
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const icons = { success: '✔', warn: '⚠', error: '✖', info: 'ℹ' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = icons[type] + '  ' + msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => {
    t.style.transition = 'opacity 0.3s, transform 0.3s';
    t.style.opacity    = '0';
    t.style.transform  = 'translateX(20px)';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}
