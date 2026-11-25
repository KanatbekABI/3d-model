import type { StarterTemplate } from '../types/studio';

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'aurora-pulse-card',
    name: 'Interactive Glass Counter',
    category: 'UI Component',
    description: 'Glassmorphic gradient card with live counter controls and keyboard support.',
    code: {
      html: `<main class="stage">
  <section class="glass-card" aria-label="Interactive counter">
    <header class="card-header">
      <p class="eyebrow">Interactive Component</p>
      <h1>Aurora Focus Counter</h1>
    </header>

    <div class="readout" id="counterValue" aria-live="polite">0</div>

    <div class="controls">
      <button class="btn btn-secondary" id="decrementBtn" type="button">−1</button>
      <button class="btn btn-ghost" id="resetBtn" type="button">Reset</button>
      <button class="btn btn-primary" id="incrementBtn" type="button">+1</button>
    </div>

    <p class="hint">Tip: Use Up / Down arrow keys or click the controls above.</p>
  </section>
</main>`,
      css: `:root {
  color-scheme: dark;
  --bg: #080912;
  --card: rgba(19, 23, 40, 0.72);
  --border: rgba(255, 255, 255, 0.1);
  --text: #f8fafc;
  --muted: #94a3b8;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  color: var(--text);
  background:
    radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.28), transparent 45%),
    radial-gradient(circle at 80% 80%, rgba(37, 99, 235, 0.25), transparent 45%),
    var(--bg);
  padding: 24px;
}

.stage {
  width: 100%;
  max-width: 420px;
}

.glass-card {
  background: var(--card);
  backdrop-filter: blur(18px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: #a5b4fc;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.readout {
  font-variant-numeric: tabular-nums;
  font-size: 64px;
  font-weight: 700;
  margin: 28px 0;
  background: linear-gradient(135deg, #c4b5fd 0%, #60a5fa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: transform 140ms cubic-bezier(0.16, 1, 0.3, 1);
}

.readout.bump {
  transform: scale(1.08);
}

.controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, background 150ms ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  border-color: transparent;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
}

.btn-ghost {
  background: transparent;
  color: var(--muted);
}

.btn:hover {
  opacity: 0.92;
}

.hint {
  margin-top: 22px;
  font-size: 12px;
  color: var(--muted);
}`,
      js: `const valueEl = document.getElementById('counterValue');
const incrementBtn = document.getElementById('incrementBtn');
const decrementBtn = document.getElementById('decrementBtn');
const resetBtn = document.getElementById('resetBtn');

let count = 0;

function updateDisplay(nextValue) {
  count = nextValue;
  valueEl.textContent = String(count);
  valueEl.classList.remove('bump');
  void valueEl.offsetWidth;
  valueEl.classList.add('bump');
  console.log('Counter updated to:', count);
}

incrementBtn.addEventListener('click', () => updateDisplay(count + 1));
decrementBtn.addEventListener('click', () => updateDisplay(count - 1));
resetBtn.addEventListener('click', () => updateDisplay(0));

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowUp') updateDisplay(count + 1);
  if (event.key === 'ArrowDown') updateDisplay(count - 1);
});

console.info('Aurora Focus Counter initialized.');`,
    },
  },
  {
    id: 'pomodoro-timer',
    name: 'Focus Timer',
    category: 'Productivity',
    description: 'Clean countdown timer with start, pause, reset, and session mode switching.',
    code: {
      html: `<div class="timer-shell">
  <div class="mode-tabs" role="tablist">
    <button class="tab active" data-minutes="25" type="button">Focus 25m</button>
    <button class="tab" data-minutes="5" type="button">Short Break 5m</button>
    <button class="tab" data-minutes="15" type="button">Long Break 15m</button>
  </div>

  <div class="clock" id="clockDisplay">25:00</div>

  <div class="actions">
    <button id="toggleBtn" class="primary" type="button">Start</button>
    <button id="resetBtn" class="secondary" type="button">Reset</button>
  </div>
</div>`,
      css: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #090b14;
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
  padding: 20px;
}

.timer-shell {
  width: 100%;
  max-width: 400px;
  padding: 28px;
  border-radius: 20px;
  background: rgba(17, 21, 37, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.mode-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
}

.tab {
  flex: 1;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.tab.active {
  background: rgba(99, 102, 241, 0.25);
  color: #e0e7ff;
}

.clock {
  font-variant-numeric: tabular-nums;
  font-size: 68px;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 34px 0;
}

.actions {
  display: flex;
  gap: 10px;
}

button.primary,
button.secondary {
  flex: 1;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

button.primary {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  color: white;
}

button.secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}`,
      js: `const clockDisplay = document.getElementById('clockDisplay');
const toggleBtn = document.getElementById('toggleBtn');
const resetBtn = document.getElementById('resetBtn');
const tabs = document.querySelectorAll('.tab');

let defaultMinutes = 25;
let remainingSeconds = defaultMinutes * 60;
let intervalId = null;

function render() {
  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const secs = String(remainingSeconds % 60).padStart(2, '0');
  clockDisplay.textContent = \`\${mins}:\${secs}\`;
}

function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  toggleBtn.textContent = 'Start';
}

toggleBtn.addEventListener('click', () => {
  if (intervalId) {
    stopTimer();
    return;
  }
  toggleBtn.textContent = 'Pause';
  intervalId = setInterval(() => {
    if (remainingSeconds <= 0) {
      stopTimer();
      console.info('Timer session complete!');
      return;
    }
    remainingSeconds -= 1;
    render();
  }, 1000);
});

resetBtn.addEventListener('click', () => {
  stopTimer();
  remainingSeconds = defaultMinutes * 60;
  render();
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    defaultMinutes = Number(tab.dataset.minutes);
    stopTimer();
    remainingSeconds = defaultMinutes * 60;
    render();
  });
});

render();`,
    },
  },
  {
    id: 'particle-canvas',
    name: 'Interactive Particle Field',
    category: 'Canvas & Graphics',
    description: 'HTML5 Canvas particle constellation that reacts smoothly to cursor movement.',
    code: {
      html: `<canvas id="field"></canvas>
<div class="overlay">
  <h1>Particle Constellation</h1>
  <p>Move your cursor across the canvas to attract nearby nodes.</p>
</div>`,
      css: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  overflow: hidden;
  background: #06070d;
  color: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
}

canvas {
  display: block;
  width: 100vw;
  height: 100vh;
}

.overlay {
  position: fixed;
  bottom: 24px;
  left: 24px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(10, 12, 22, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.overlay h1 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.overlay p {
  font-size: 12px;
  color: #94a3b8;
}`,
      js: `const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

const pointer = { x: width / 2, y: height / 2, active: false };
const nodes = Array.from({ length: 55 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  vx: (Math.random() - 0.5) * 0.7,
  vy: (Math.random() - 0.5) * 0.7,
  r: 1.8 + Math.random() * 1.5,
}));

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

window.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
});

window.addEventListener('pointerleave', () => {
  pointer.active = false;
});

function tick() {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (pointer.active) {
      const dx = pointer.x - a.x;
      const dy = pointer.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 160 && dist > 1) {
        a.vx += (dx / dist) * 0.02;
        a.vy += (dy / dist) * 0.02;
      }
    }

    a.vx *= 0.99;
    a.vy *= 0.99;
    a.x += a.vx;
    a.y += a.vy;

    if (a.x < 0 || a.x > width) a.vx *= -1;
    if (a.y < 0 || a.y > height) a.vy *= -1;

    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fillStyle = '#a5b4fc';
    ctx.fill();

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 120) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = \`rgba(99, 102, 241, \${(1 - d / 120) * 0.35})\`;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(tick);
}

tick();`,
    },
  },
  {
    id: 'blank-canvas',
    name: 'Blank Starter',
    category: 'Minimal',
    description: 'Clean empty HTML, CSS, and JavaScript boilerplate ready for your ideas.',
    code: {
      html: `<div class="container">
  <h1>Hello, AI Code Studio</h1>
  <p>Edit HTML, CSS, and JavaScript to build your project.</p>
</div>`,
      css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0b0d17;
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
}

.container {
  text-align: center;
  padding: 32px;
}

p {
  color: #94a3b8;
  margin-top: 8px;
}`,
      js: `console.log('Ready to build!');`,
    },
  },
];
