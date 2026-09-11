// ==========================================================
// Quest Quiz Game - vanilla JS, HTML5 canvas
// Le domande, risposte e punteggi sono configurabili in questions.json
// ==========================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const TILE = 40;
const COLS = canvas.width / TILE;
const ROWS = canvas.height / TILE;

// Mappa: 0 = pavimento libero, 1 = parete (corridoio ufficio), 2 = scrivania
// (ostacolo decorativo), 3 = armadio da ufficio (ostacolo decorativo)
// (righe x colonne) - 20 colonne x 12.5 righe circa, adattata a 800x500
const mapLayout = [
  "11111111111111111111",
  "10000000000000000001",
  "10033000000000220001",
  "10000001111000000001",
  "10000001000000300001",
  "10022001000330000001",
  "10000000000000000001",
  "10000110000011000001",
  "10003000000000200001",
  "10000000110000000001",
  "10033000000000022001",
  "10000000000000000001",
  "11111111111111111111"
];

function isBlocked(col, row) {
  if (row < 0 || row >= mapLayout.length) return true;
  const rowStr = mapLayout[row];
  if (col < 0 || col >= rowStr.length) return true;
  const c = rowStr[col];
  return c === '1' || c === '2' || c === '3';
}

function drawMap() {
  for (let row = 0; row < mapLayout.length; row++) {
    for (let col = 0; col < mapLayout[row].length; col++) {
      const tile = mapLayout[row][col];
      const x = col * TILE;
      const y = row * TILE;

      // pavimento dell'ufficio (piastrelle chiare) sotto ogni elemento
      ctx.fillStyle = (row + col) % 2 === 0 ? '#d9d4c8' : '#cfc9bb';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.strokeRect(x, y, TILE, TILE);

      if (tile === '1') {
        // parete/corridoio ufficio
        ctx.fillStyle = '#b8bdc2';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#e9ebee';
        ctx.fillRect(x, y, TILE, TILE / 4);
        ctx.strokeStyle = '#8a9096';
        ctx.strokeRect(x, y, TILE, TILE);
      } else if (tile === '2') {
        // scrivania da ufficio
        ctx.fillStyle = '#8a5a35';
        ctx.fillRect(x + 3, y + TILE / 2 - 4, TILE - 6, TILE / 2 - 4);
        ctx.fillStyle = '#a9713f';
        ctx.fillRect(x + 3, y + TILE / 2 - 8, TILE - 6, 6);
        // gambe scrivania
        ctx.fillStyle = '#5c3b21';
        ctx.fillRect(x + 5, y + TILE - 6, 4, 6);
        ctx.fillRect(x + TILE - 9, y + TILE - 6, 4, 6);
        // monitor
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(x + TILE / 2 - 7, y + TILE / 2 - 20, 14, 10);
        ctx.fillStyle = '#4dabf7';
        ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 18, 10, 6);
      } else if (tile === '3') {
        // armadio da ufficio (cassettiera/schedario)
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 6);
        ctx.strokeStyle = '#454b54';
        ctx.strokeRect(x + 4, y + 2, TILE - 8, TILE - 6);
        // cassetti
        for (let i = 0; i < 3; i++) {
          const drawerY = y + 6 + i * ((TILE - 12) / 3);
          ctx.fillStyle = '#9aa1ab';
          ctx.fillRect(x + 7, drawerY, TILE - 14, (TILE - 12) / 3 - 3);
          ctx.fillStyle = '#454b54';
          ctx.fillRect(x + TILE / 2 - 5, drawerY + ((TILE - 12) / 3 - 3) / 2 - 1, 10, 2);
        }
      }
    }
  }
}

// ---------------- Player ----------------
const player = {
  col: 1,
  row: 1,
  x: TILE * 1,
  y: TILE * 1,
  size: TILE - 8,
  speed: 3.2,
  outfit: '#4dabf7',
  skin: '#ffcf9e',
  hair: '#3b2a1a',
  dir: 'down',
  moving: false,
  walkFrame: 0
};

// ---------------- NPCs ----------------
// Popolato da loadQuizData() a partire da questions.json: un NPC per ogni
// personaggio configurato, ciascuno con la propria posizione, stile e domande.
let npcs = [];

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'e') tryInteract();
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function canMoveTo(x, y, size) {
  // controlla i 4 angoli del bounding box del player rispetto alla griglia
  const corners = [
    [x, y],
    [x + size, y],
    [x, y + size],
    [x + size, y + size]
  ];
  for (const [cx, cy] of corners) {
    const col = Math.floor(cx / TILE);
    const row = Math.floor(cy / TILE);
    if (isBlocked(col, row)) return false;
  }
  return true;
}

function updatePlayer() {
  if (quizActive) { player.moving = false; return; } // niente movimento durante il quiz
  let dx = 0, dy = 0;
  if (keys['arrowup'] || keys['w']) { dy -= player.speed; player.dir = 'up'; }
  if (keys['arrowdown'] || keys['s']) { dy += player.speed; player.dir = 'down'; }
  if (keys['arrowleft'] || keys['a']) { dx -= player.speed; player.dir = 'left'; }
  if (keys['arrowright'] || keys['d']) { dx += player.speed; player.dir = 'right'; }

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) player.walkFrame += 0.2;

  if (dx !== 0 && canMoveTo(player.x + dx, player.y, player.size)) {
    player.x += dx;
  }
  if (dy !== 0 && canMoveTo(player.x, player.y + dy, player.size)) {
    player.y += dy;
  }
}

// Disegna un piccolo personaggio "pixel-art" (testa, corpo, braccia, gambe)
// al posto di un semplice quadrato, con animazione di camminata basilare.
function drawEntity(entity, label) {
  const x = entity.x;
  const y = entity.y;
  const s = entity.size;
  const bob = entity.moving ? Math.sin(entity.walkFrame * 6) * 2 : 0;
  const legSwing = entity.moving ? Math.sin(entity.walkFrame * 6) * 4 : 0;

  ctx.save();
  ctx.translate(x + s / 2, y + s / 2 + bob);

  // ombra
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, s / 2 + 2, s / 2.6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // gambe (con leggero movimento a forbice)
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(-s / 5 - legSwing / 4, s / 6, s / 5, s / 2.6);
  ctx.fillRect(legSwing / 4, s / 6, s / 5, s / 2.6);

  // braccia
  ctx.fillStyle = entity.outfit;
  ctx.fillRect(-s / 2 + 1, -s / 8, s / 6, s / 2.2);
  ctx.fillRect(s / 2 - s / 6 - 1, -s / 8, s / 6, s / 2.2);

  // corpo (busto arrotondato)
  ctx.fillStyle = entity.outfit;
  roundRect(-s / 2.6, -s / 6, s / 1.3, s / 1.7, 4);
  ctx.fill();

  // testa
  ctx.fillStyle = entity.skin;
  ctx.beginPath();
  ctx.arc(0, -s / 2.4, s / 3.1, 0, Math.PI * 2);
  ctx.fill();

  // capelli
  ctx.fillStyle = entity.hair;
  ctx.beginPath();
  ctx.arc(0, -s / 2.4 - 2, s / 3.1, Math.PI, 0);
  ctx.fill();

  // occhi (si spostano leggermente in base alla direzione)
  const eyeOffsetX = entity.dir === 'left' ? -2 : entity.dir === 'right' ? 2 : 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-4 + eyeOffsetX, -s / 2.4, 2.4, 0, Math.PI * 2);
  ctx.arc(4 + eyeOffsetX, -s / 2.4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-4 + eyeOffsetX, -s / 2.4, 1.1, 0, Math.PI * 2);
  ctx.arc(4 + eyeOffsetX, -s / 2.4, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // accessori opzionali per distinguere i vari NPC a colpo d'occhio
  if (entity.accessory === 'glasses') {
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-4 + eyeOffsetX, -s / 2.4, 3.6, 0, Math.PI * 2);
    ctx.arc(4 + eyeOffsetX, -s / 2.4, 3.6, 0, Math.PI * 2);
    ctx.moveTo(-0.4, -s / 2.4);
    ctx.lineTo(0.4, -s / 2.4);
    ctx.stroke();
  } else if (entity.accessory === 'tie') {
    ctx.fillStyle = '#c92a2a';
    ctx.beginPath();
    ctx.moveTo(-3, -s / 6);
    ctx.lineTo(3, -s / 6);
    ctx.lineTo(2, s / 6);
    ctx.lineTo(0, s / 4.5);
    ctx.lineTo(-2, s / 6);
    ctx.closePath();
    ctx.fill();
  } else if (entity.accessory === 'cap') {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, -s / 2.4 - 3, s / 3.2, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-s / 3.2, -s / 2.4 - 3, s / 1.6, 3);
    ctx.fillRect(2, -s / 2.4 - 3, s / 3.5, 4);
  }

  ctx.restore();

  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + s / 2, y - 8);
  }
}

// Helper per disegnare rettangoli con angoli arrotondati (busto del personaggio)
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function distanceBetween(a, b) {
  const dx = (a.x + a.size / 2) - (b.x + b.size / 2);
  const dy = (a.y + a.size / 2) - (b.y + b.size / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

const INTERACT_RANGE = TILE * 1.3;
let nearestNpc = null;

function findNearestNpcInRange() {
  let closest = null;
  let closestDist = Infinity;
  for (const n of npcs) {
    const d = distanceBetween(player, n);
    if (d <= INTERACT_RANGE && d < closestDist) {
      closest = n;
      closestDist = d;
    }
  }
  return closest;
}

function drawPrompt() {
  if (!nearestNpc || quizActive) return;
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  const msg = nearestNpc.questionQueue.length > 0 ? 'Premi E per parlare' : 'Completato ✓';
  ctx.fillText(msg, nearestNpc.x + nearestNpc.size / 2, nearestNpc.y - 20);
}

// ---------------- Quiz logic ----------------
let quizData = null;
let currentNpc = null;
let currentQuestion = null;
let score = 0;
let quizActive = false;

const modal = document.getElementById('quiz-modal');
const npcNameEl = document.getElementById('npc-name');
const questionTextEl = document.getElementById('question-text');
const answersEl = document.getElementById('answers');
const feedbackEl = document.getElementById('feedback');
const scoreDisplay = document.getElementById('score-display');
const topicDisplay = document.getElementById('topic-display');
const endModal = document.getElementById('end-modal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

async function loadQuizData() {
  const res = await fetch('questions.json');
  quizData = await res.json();

  npcs = quizData.npcs.map((cfg) => {
    const style = cfg.style || {};
    const inst = {
      id: cfg.id,
      name: cfg.name,
      topic: cfg.topic,
      col: cfg.position.col,
      row: cfg.position.row,
      size: TILE - 8,
      outfit: style.outfit || '#495057',
      skin: style.skin || '#e8b48a',
      hair: style.hair || '#6c757d',
      accessory: style.accessory || null,
      dir: 'down',
      moving: false,
      walkFrame: 0,
      questions: cfg.questions,
      answeredIds: new Set()
    };
    inst.x = inst.col * TILE;
    inst.y = inst.row * TILE;
    inst.questionQueue = [...cfg.questions];
    return inst;
  });

  topicDisplay.textContent = `Personaggi: ${npcs.map((n) => n.name).join(' · ')}`;
}

function allNpcsCompleted() {
  return npcs.every((n) => n.answeredIds.size === n.questions.length);
}

function tryInteract() {
  if (quizActive) return;
  const target = findNearestNpcInRange();
  if (!target) return;

  if (target.questionQueue.length === 0) {
    if (allNpcsCompleted()) showEndModal();
    return;
  }
  openQuestion(target);
}

function openQuestion(npcTarget) {
  currentNpc = npcTarget;
  currentQuestion = npcTarget.questionQueue.shift();
  quizActive = true;
  modal.classList.remove('hidden');
  npcNameEl.textContent = `${npcTarget.name} (${npcTarget.topic}):`;
  questionTextEl.textContent = currentQuestion.text;
  feedbackEl.textContent = '';
  answersEl.innerHTML = '';

  currentQuestion.answers.forEach((answer) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = answer.text;
    btn.addEventListener('click', () => handleAnswer(btn, answer));
    answersEl.appendChild(btn);
  });
}

function handleAnswer(btn, answer) {
  const allBtns = answersEl.querySelectorAll('.answer-btn');
  allBtns.forEach((b) => (b.disabled = true));

  currentNpc.answeredIds.add(currentQuestion.id);

  if (answer.correct) {
    btn.classList.add('answer-correct');
    const pts = currentQuestion.points || 0;
    score += pts;
    feedbackEl.textContent = `Corretto! +${pts} punti`;
    feedbackEl.style.color = '#69db7c';
  } else {
    btn.classList.add('answer-wrong');
    feedbackEl.textContent = 'Sbagliato! 0 punti';
    feedbackEl.style.color = '#ff6b6b';
    allBtns.forEach((b, i) => {
      if (currentQuestion.answers[i].correct) {
        b.classList.add('answer-correct');
      }
    });
  }

  updateScoreDisplay();

  setTimeout(() => {
    modal.classList.add('hidden');
    quizActive = false;
    currentQuestion = null;
    currentNpc = null;
    if (allNpcsCompleted()) {
      setTimeout(showEndModal, 300);
    }
  }, 1400);
}

function updateScoreDisplay() {
  scoreDisplay.textContent = `Punteggio: ${score}`;
}

function showEndModal() {
  const maxScore = npcs.reduce(
    (sum, n) => sum + n.questions.reduce((s, q) => s + (q.points || 0), 0),
    0
  );
  finalScoreEl.textContent = `Hai totalizzato ${score} su ${maxScore} punti possibili.`;
  endModal.classList.remove('hidden');
}

restartBtn.addEventListener('click', () => {
  score = 0;
  updateScoreDisplay();
  npcs.forEach((n) => {
    n.questionQueue = [...n.questions];
    n.answeredIds = new Set();
  });
  endModal.classList.add('hidden');
});

// ---------------- Game loop ----------------
function gameLoop() {
  updatePlayer();
  nearestNpc = quizActive ? nearestNpc : findNearestNpcInRange();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  npcs.forEach((n) => drawEntity(n, n.name));
  drawEntity(player, 'Tu');
  drawPrompt();

  requestAnimationFrame(gameLoop);
}

loadQuizData().then(() => {
  updateScoreDisplay();
  gameLoop();
});
