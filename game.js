// ==========================================================
// Quest Quiz Game - vanilla JS, HTML5 canvas
// Le domande, risposte e punteggi sono configurabili in questions.json
// ==========================================================

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ---------------- Password gate ----------------
// Blocca l'accesso al gioco finché non viene inserita la password corretta.
// La password non è un sistema di sicurezza reale (il codice è pubblico lato
// client), serve solo a limitare l'accesso casuale al link del gioco.
const SITE_PASSWORD = 'asset-game-2026';
const AUTH_STORAGE_KEY = 'asset-game-authenticated';
const passwordModal = document.getElementById('password-modal');
const passwordForm = document.getElementById('password-form');
const passwordInput = document.getElementById('password-input');
const passwordError = document.getElementById('password-error');
const gameContainer = document.getElementById('game-container');

function unlockGame() {
  sessionStorage.setItem(AUTH_STORAGE_KEY, '1');
  passwordModal.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  startGame();
}

passwordForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (passwordInput.value === SITE_PASSWORD) {
    passwordError.classList.add('hidden');
    unlockGame();
  } else {
    passwordError.classList.remove('hidden');
    passwordInput.value = '';
    passwordInput.focus();
  }
});

const TILE = 40;

// Mappa: 0 = pavimento libero, 1 = parete (corridoio ufficio), 2 = scrivania
// (ostacolo decorativo), 3 = armadio da ufficio (ostacolo decorativo)
// (righe x colonne) - 20 colonne x 12.5 righe circa, adattata a 800x500
// Ogni livello ha una propria pianta d'ufficio (open space, sala riunioni,
// piano dirigenziale) per differenziare l'ambientazione man mano che si avanza.
const mapLayouts = [
  // Livello 1: open space
  [
    "11111111111111111111",
    "10000000000000000001",
    "10033000000000220001",
    "10000001111000000001",
    "10000001000000300001",
    "10022001000330000001",
    "10000000000000000001",
    "10000110000011100001",
    "10003000000144410001",
    "10000000110100010001",
    "10033000000010122001",
    "10000000000000000001",
    "11111111111111111111"
  ],
  // Livello 2: sala riunioni con uffici separati
  [
    "11111111111111111111",
    "10000011000110000001",
    "10022011000110022001",
    "10000000000000000001",
    "11101111011110111011",
    "10000000000000000001",
    "10033000000000330001",
    "10000000000000000001",
    "11011110111010101101",
    "10000000000100010001",
    "10022000000144412001",
    "10000000000011100001",
    "11111111111111111111"
  ],
  // Livello 3: piano dirigenziale con uffici privati
  [
    "11111111111111111111",
    "10000000000000000001",
    "10330011111100330001",
    "10000010000010000001",
    "10022010220010022001",
    "10000010000010001111",
    "10000011000110014441",
    "10000010000010000001",
    "10033010330010031111",
    "10000010000010000001",
    "10000011111100000001",
    "10000000000000000001",
    "11111111111111111111"
  ]
];

// Palette colori per livello: open space chiaro, sala riunioni sui toni blu,
// piano dirigenziale scuro/elegante con dettagli oro.
const officeThemes = [
  {
    floorA: '#d9d4c8', floorB: '#cfc9bb',
    wallFill: '#b8bdc2', wallTop: '#e9ebee', wallStroke: '#8a9096',
    deskBase: '#8a5a35', deskTop: '#a9713f', deskLeg: '#5c3b21',
    monitorFrame: '#2b2b2b', monitorScreen: '#4dabf7',
    cabinetFill: '#6b7280', cabinetStroke: '#454b54', drawerFill: '#9aa1ab', drawerHandle: '#454b54'
  },
  {
    floorA: '#c9d6e3', floorB: '#b8c8d8',
    wallFill: '#5f7d9e', wallTop: '#d7e3ee', wallStroke: '#3d566f',
    deskBase: '#3b4a5c', deskTop: '#54687f', deskLeg: '#26313d',
    monitorFrame: '#1c1f24', monitorScreen: '#74c0fc',
    cabinetFill: '#3b4552', cabinetStroke: '#25292f', drawerFill: '#5a6472', drawerHandle: '#25292f'
  },
  {
    floorA: '#5c4630', floorB: '#4f3c28',
    wallFill: '#3a2b1d', wallTop: '#6b4a30', wallStroke: '#caa15a',
    deskBase: '#4a2f1a', deskTop: '#6b4426', deskLeg: '#2c1c0f',
    monitorFrame: '#1a1a1a', monitorScreen: '#caa15a',
    cabinetFill: '#2c231a', cabinetStroke: '#caa15a', drawerFill: '#453626', drawerHandle: '#caa15a'
  }
];

let currentMapLayout = mapLayouts[0];
let currentTheme = officeThemes[0];

function isBlocked(col, row) {
  if (row < 0 || row >= currentMapLayout.length) return true;
  const rowStr = currentMapLayout[row];
  if (col < 0 || col >= rowStr.length) return true;
  const c = rowStr[col];
  return c === '1' || c === '2' || c === '3' || c === '4';
}

function drawMap() {
  const theme = currentTheme;
  for (let row = 0; row < currentMapLayout.length; row++) {
    for (let col = 0; col < currentMapLayout[row].length; col++) {
      const tile = currentMapLayout[row][col];
      const x = col * TILE;
      const y = row * TILE;

      // pavimento dell'ufficio (piastrelle chiare) sotto ogni elemento
      ctx.fillStyle = (row + col) % 2 === 0 ? theme.floorA : theme.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.strokeRect(x, y, TILE, TILE);

      if (tile === '1') {
        // parete/corridoio ufficio
        ctx.fillStyle = theme.wallFill;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = theme.wallTop;
        ctx.fillRect(x, y, TILE, TILE / 4);
        ctx.strokeStyle = theme.wallStroke;
        ctx.strokeRect(x, y, TILE, TILE);
      } else if (tile === '2') {
        // scrivania da ufficio
        ctx.fillStyle = theme.deskBase;
        ctx.fillRect(x + 3, y + TILE / 2 - 4, TILE - 6, TILE / 2 - 4);
        ctx.fillStyle = theme.deskTop;
        ctx.fillRect(x + 3, y + TILE / 2 - 8, TILE - 6, 6);
        // gambe scrivania
        ctx.fillStyle = theme.deskLeg;
        ctx.fillRect(x + 5, y + TILE - 6, 4, 6);
        ctx.fillRect(x + TILE - 9, y + TILE - 6, 4, 6);
        // monitor
        ctx.fillStyle = theme.monitorFrame;
        ctx.fillRect(x + TILE / 2 - 7, y + TILE / 2 - 20, 14, 10);
        ctx.fillStyle = theme.monitorScreen;
        ctx.fillRect(x + TILE / 2 - 5, y + TILE / 2 - 18, 10, 6);
      } else if (tile === '3') {
        // armadio da ufficio (cassettiera/schedario)
        ctx.fillStyle = theme.cabinetFill;
        ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 6);
        ctx.strokeStyle = theme.cabinetStroke;
        ctx.strokeRect(x + 4, y + 2, TILE - 8, TILE - 6);
        // cassetti
        for (let i = 0; i < 3; i++) {
          const drawerY = y + 6 + i * ((TILE - 12) / 3);
          ctx.fillStyle = theme.drawerFill;
          ctx.fillRect(x + 7, drawerY, TILE - 14, (TILE - 12) / 3 - 3);
          ctx.fillStyle = theme.drawerHandle;
          ctx.fillRect(x + TILE / 2 - 5, drawerY + ((TILE - 12) / 3 - 3) / 2 - 1, 10, 2);
        }
      } else if (tile === '4') {
        // bacheca informativa con documenti di approfondimento appuntati
        ctx.fillStyle = theme.cabinetStroke;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 8);
        ctx.fillStyle = theme.deskBase;
        ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 14);
        // fogli appuntati
        const sheetColors = ['#f1f3f5', '#e9ecef'];
        for (let i = 0; i < 2; i++) {
          const sx = x + 7 + i * (TILE / 2 - 6);
          const sy = y + 8;
          ctx.fillStyle = sheetColors[i % sheetColors.length];
          ctx.fillRect(sx, sy, TILE / 2 - 10, TILE / 2 - 6);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.strokeRect(sx, sy, TILE / 2 - 10, TILE / 2 - 6);
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          for (let l = 0; l < 3; l++) {
            ctx.fillRect(sx + 2, sy + 3 + l * 4, TILE / 2 - 14, 1.5);
          }
        }
        ctx.fillStyle = theme.monitorScreen;
        ctx.fillRect(x + TILE / 2 - 6, y + TILE - 14, 12, 6);
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

// ---------------- Controlli touch/mouse (mobile) ----------------
// Tap sul pavimento: il personaggio cammina verso il punto toccato.
// Tap su un personaggio o su una bacheca: il player cammina verso di esso e,
// solo quando lo raggiunge davvero, si apre automaticamente il dialogo/la lettura.
let moveTarget = null;
let pendingInteractTarget = null; // { type: 'npc' | 'board', entity }
const TAP_TARGET_PADDING = 12;

function findInteractableAtPoint(x, y) {
  for (const n of npcs) {
    if (
      x >= n.x - TAP_TARGET_PADDING &&
      x <= n.x + n.size + TAP_TARGET_PADDING &&
      y >= n.y - TAP_TARGET_PADDING &&
      y <= n.y + n.size + TAP_TARGET_PADDING
    ) {
      return { type: 'npc', entity: n };
    }
  }
  for (const b of infoBoards) {
    if (
      x >= b.x - TAP_TARGET_PADDING &&
      x <= b.x + b.size + TAP_TARGET_PADDING &&
      y >= b.y - TAP_TARGET_PADDING &&
      y <= b.y + b.size + TAP_TARGET_PADDING
    ) {
      return { type: 'board', entity: b };
    }
  }
  return null;
}

function handleCanvasPointer(evt) {
  if (quizActive || docActive) return;
  evt.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const point = evt.touches ? evt.touches[0] : evt;
  const x = (point.clientX - rect.left) * scaleX;
  const y = (point.clientY - rect.top) * scaleY;

  const tapped = findInteractableAtPoint(x, y);
  if (tapped) {
    pendingInteractTarget = tapped;
    moveTarget = {
      x: tapped.entity.x + tapped.entity.size / 2 - player.size / 2,
      y: tapped.entity.y + tapped.entity.size / 2 - player.size / 2
    };
  } else {
    pendingInteractTarget = null;
    moveTarget = { x: x - player.size / 2, y: y - player.size / 2 };
  }
}

canvas.addEventListener('pointerdown', handleCanvasPointer);

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
  if (quizActive || docActive) { player.moving = false; return; } // niente movimento durante dialoghi/lettura
  let dx = 0, dy = 0;
  if (keys['arrowup'] || keys['w']) { dy -= player.speed; player.dir = 'up'; }
  if (keys['arrowdown'] || keys['s']) { dy += player.speed; player.dir = 'down'; }
  if (keys['arrowleft'] || keys['a']) { dx -= player.speed; player.dir = 'left'; }
  if (keys['arrowright'] || keys['d']) { dx += player.speed; player.dir = 'right'; }

  const usingKeyboard = dx !== 0 || dy !== 0;
  if (usingKeyboard) {
    // l'input da tastiera annulla un eventuale spostamento avviato con il tap
    moveTarget = null;
    pendingInteractTarget = null;
  } else if (moveTarget) {
    // movimento verso il punto/personaggio/bacheca toccato su schermo (touch/mouse)
    const targetDx = moveTarget.x - player.x;
    const targetDy = moveTarget.y - player.y;
    const dist = Math.hypot(targetDx, targetDy);
    if (dist <= player.speed) {
      player.x = moveTarget.x;
      player.y = moveTarget.y;
      moveTarget = null;
      dx = 0;
      dy = 0;
    } else {
      dx = (targetDx / dist) * player.speed;
      dy = (targetDy / dist) * player.speed;
      player.dir = Math.abs(targetDx) > Math.abs(targetDy) ? (targetDx > 0 ? 'right' : 'left') : (targetDy > 0 ? 'down' : 'up');
    }
  }

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) player.walkFrame += 0.2;

  if (dx !== 0 && canMoveTo(player.x + dx, player.y, player.size)) {
    player.x += dx;
  }
  if (dy !== 0 && canMoveTo(player.x, player.y + dy, player.size)) {
    player.y += dy;
  }

  // se il personaggio/bacheca toccato è stato raggiunto, si apre automaticamente
  // il dialogo/la lettura (compare solo all'arrivo, non al momento del tap)
  if (pendingInteractTarget && distanceBetween(player, pendingInteractTarget.entity) <= INTERACT_RANGE) {
    const target = pendingInteractTarget;
    pendingInteractTarget = null;
    moveTarget = null;
    if (target.type === 'npc') {
      nearestNpc = target.entity;
      tryInteract();
    } else {
      openDocBoard(target.entity);
    }
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
let nearestBoard = null;
let infoBoards = [];
let docActive = false;

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

function findNearestBoardInRange() {
  let closest = null;
  let closestDist = Infinity;
  for (const b of infoBoards) {
    const d = distanceBetween(player, b);
    if (d <= INTERACT_RANGE && d < closestDist) {
      closest = b;
      closestDist = d;
    }
  }
  return closest;
}

function drawPrompt() {
  if (quizActive || docActive) return;
  if (nearestNpc) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    const msg = nearestNpc.questionQueue.length > 0 ? 'Premi E per parlare' : 'Completato ✓';
    ctx.fillText(msg, nearestNpc.x + nearestNpc.size / 2, nearestNpc.y - 20);
  } else if (nearestBoard) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Premi E per leggere', nearestBoard.x + nearestBoard.size / 2, nearestBoard.y - 10);
  }
}

// ---------------- Quiz logic ----------------
let quizData = null;
let currentLevelIndex = 0;
let currentNpc = null;
let currentQuestion = null;
let answeredCurrent = false;
let answerTimeoutId = null;
let score = 0;
let quizActive = false;

const modal = document.getElementById('quiz-modal');
const npcNameEl = document.getElementById('npc-name');
const questionTextEl = document.getElementById('question-text');
const answersEl = document.getElementById('answers');
const feedbackEl = document.getElementById('feedback');
const scoreDisplay = document.getElementById('score-display');
const topicDisplay = document.getElementById('topic-display');
const levelDisplay = document.getElementById('level-display');
const endModal = document.getElementById('end-modal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const levelModal = document.getElementById('level-modal');
const levelCompleteTextEl = document.getElementById('level-complete-text');
const nextLevelBtn = document.getElementById('next-level-btn');
const quizCloseBtn = document.getElementById('quiz-close-btn');
const docModal = document.getElementById('doc-modal');
const docTitleEl = document.getElementById('doc-title');
const docBodyEl = document.getElementById('doc-body');
const docCloseBtn = document.getElementById('doc-close-btn');
docCloseBtn.addEventListener('click', closeDocModal);


// Costruisce l'elenco degli NPC (e delle relative domande) a partire dai
// dati configurati per un determinato livello in questions.json.
function buildNpcsForLevel(levelCfg) {
  return levelCfg.npcs.map((cfg) => {
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
}

// Costruisce l'elenco delle bacheche informative (documentazione di
// approfondimento) a partire dai dati configurati per il livello corrente.
function buildInfoBoardsForLevel(levelCfg) {
  const boards = levelCfg.infoBoards || [];
  return boards.map((cfg) => ({
    id: cfg.id,
    title: cfg.title,
    body: cfg.body,
    col: cfg.position.col,
    row: cfg.position.row,
    size: TILE - 8,
    x: cfg.position.col * TILE,
    y: cfg.position.row * TILE
  }));
}

function updateHud() {
  const levelCfg = quizData.levels[currentLevelIndex];
  levelDisplay.textContent = `Livello ${currentLevelIndex + 1}/${quizData.levels.length} · ${levelCfg.name.replace(/^Livello \d+ - /, '')}`;
  topicDisplay.textContent = `Personaggi: ${npcs.map((n) => n.name).join(' · ')}`;
}

function loadLevel(levelIndex) {
  currentLevelIndex = levelIndex;
  currentMapLayout = mapLayouts[levelIndex];
  currentTheme = officeThemes[levelIndex];
  npcs = buildNpcsForLevel(quizData.levels[currentLevelIndex]);
  infoBoards = buildInfoBoardsForLevel(quizData.levels[currentLevelIndex]);
  player.col = 1;
  player.row = 1;
  player.x = TILE * 1;
  player.y = TILE * 1;
  moveTarget = null;
  pendingInteractTarget = null;
  updateHud();
}

async function loadQuizData() {
  const res = await fetch('questions.json');
  quizData = await res.json();
  loadLevel(getStartLevelFromQueryParam());
}

// Permette di saltare direttamente a un livello tramite query param, es.
// ?level=2 apre il Livello 2 (numerazione a partire da 1, come mostrato in HUD).
function getStartLevelFromQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('level');
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 0;
  const maxIndex = quizData.levels.length - 1;
  return Math.min(Math.max(n - 1, 0), maxIndex);
}

function allNpcsCompleted() {
  return npcs.every((n) => n.answeredIds.size === n.questions.length);
}

function isLastLevel() {
  return currentLevelIndex === quizData.levels.length - 1;
}

function tryInteract() {
  if (quizActive || docActive) return;
  const board = findNearestBoardInRange();
  const target = findNearestNpcInRange();
  if (!target) {
    if (board) openDocBoard(board);
    return;
  }

  if (target.questionQueue.length === 0) {
    if (allNpcsCompleted()) onLevelFinished();
    else if (board) openDocBoard(board);
    return;
  }
  openQuestion(target);
}

function openDocBoard(board) {
  if (quizActive || docActive) return;
  docActive = true;
  docModal.classList.remove('hidden');
  docTitleEl.textContent = board.title;
  docBodyEl.textContent = board.body;
}

function closeDocModal() {
  docActive = false;
  docModal.classList.add('hidden');
}

function openQuestion(npcTarget) {
  currentNpc = npcTarget;
  currentQuestion = npcTarget.questionQueue.shift();
  answeredCurrent = false;
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
  answeredCurrent = true;

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

  const npcTarget = currentNpc;
  answerTimeoutId = setTimeout(() => {
    answerTimeoutId = null;
    // Se il personaggio ha ancora domande, resta in dialogo con lui invece
    // di chiudere la finestra: si passa direttamente alla domanda successiva.
    if (npcTarget.questionQueue.length > 0) {
      openQuestion(npcTarget);
    } else {
      finishNpcDialog();
    }
  }, 1400);
}

// Chiude definitivamente il dialogo quando il personaggio corrente ha
// esaurito tutte le sue domande, e valuta se il livello è concluso.
function finishNpcDialog() {
  modal.classList.add('hidden');
  quizActive = false;
  currentQuestion = null;
  currentNpc = null;
  answeredCurrent = false;
  if (allNpcsCompleted()) {
    setTimeout(onLevelFinished, 300);
  }
}

// Chiusura manuale della dialog tramite l'icona "×". Se la domanda attuale
// non è ancora stata risposta, viene rimessa in coda per essere riproposta.
function closeQuizModal() {
  if (answerTimeoutId) {
    clearTimeout(answerTimeoutId);
    answerTimeoutId = null;
  }
  if (currentNpc && currentQuestion && !answeredCurrent) {
    currentNpc.questionQueue.unshift(currentQuestion);
  }
  modal.classList.add('hidden');
  quizActive = false;
  currentQuestion = null;
  currentNpc = null;
  answeredCurrent = false;
}

quizCloseBtn.addEventListener('click', closeQuizModal);

function updateScoreDisplay() {
  scoreDisplay.textContent = `Punteggio: ${score}`;
}

// Chiamata quando tutti gli NPC del livello corrente hanno esaurito le
// domande: passa al livello successivo oppure mostra il riepilogo finale.
function onLevelFinished() {
  if (isLastLevel()) {
    showEndModal();
  } else {
    showLevelCompleteModal();
  }
}

function showLevelCompleteModal() {
  const levelCfg = quizData.levels[currentLevelIndex];
  const nextCfg = quizData.levels[currentLevelIndex + 1];
  levelCompleteTextEl.textContent =
    `Hai completato "${levelCfg.name}"! Punteggio attuale: ${score}. ` +
    `Prossima tappa: "${nextCfg.name}", con domande più difficili.`;
  levelModal.classList.remove('hidden');
}

function showEndModal() {
  const maxScore = quizData.levels.reduce(
    (levelSum, lvl) =>
      levelSum +
      lvl.npcs.reduce(
        (sum, n) => sum + n.questions.reduce((s, q) => s + (q.points || 0), 0),
        0
      ),
    0
  );
  finalScoreEl.textContent = `Hai totalizzato ${score} su ${maxScore} punti possibili.`;
  endModal.classList.remove('hidden');
}

nextLevelBtn.addEventListener('click', () => {
  levelModal.classList.add('hidden');
  loadLevel(currentLevelIndex + 1);
});

restartBtn.addEventListener('click', () => {
  score = 0;
  updateScoreDisplay();
  endModal.classList.add('hidden');
  loadLevel(0);
});

// ---------------- Game loop ----------------
function gameLoop() {
  updatePlayer();
  const dialogOpen = quizActive || docActive;
  if (!dialogOpen) {
    nearestNpc = findNearestNpcInRange();
    nearestBoard = nearestNpc ? null : findNearestBoardInRange();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  npcs.forEach((n) => drawEntity(n, n.name));
  drawEntity(player, 'Tu');
  drawPrompt();

  requestAnimationFrame(gameLoop);
}

function startGame() {
  loadQuizData().then(() => {
    updateScoreDisplay();
    gameLoop();
  });
}

if (sessionStorage.getItem(AUTH_STORAGE_KEY) === '1') {
  unlockGame();
} else {
  passwordInput.focus();
}
