// ==========================================
// PROYECTO FINAL: JUEGO WEB "ATRAPA LA PELOTA"
// Alumno: 5to Semestre de Prepa
// Nota: ¡Profe, sí le puse empeño y quedó chido en compu y celu!
// ==========================================

let score = 0;
let highScore = localStorage.getItem('ballGameHighScore') || 0;
let defaultTime = 30;
let timeLeft = 30;
let timerInterval;
let autoMoveTimeout;
let isPlaying = true;
let isPaused = false;

// Variables para controlar la dificultad y la bolita
const INITIAL_SIZE = 50;
const MIN_SIZE = 20;
let currentSpeed = 1200;
let currentColor = '#ff0055';
let customBonusSize = 0; // Por si cae el power up de tamaño

let currentDifficulty = 'medium';

// Variables para el mouse virtual en la compu y soporte táctil
let sensitivity = 1.0;
let virtualX = 210;
let virtualY = 210;
let isTouchDevice = false;

// Elementos que jalamos del HTML con DOM
const ball = document.getElementById('ball');
const customCursor = document.getElementById('custom-cursor');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const timerDisplay = document.getElementById('timer');
const menuTimeDisplay = document.getElementById('menu-time-display');
const container = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const pauseMenu = document.getElementById('pause-menu');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const sensValueDisplay = document.getElementById('sens-value');

// Lista de colores que va tomando la bola conforme subes puntos
const colors = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];
highScoreDisplay.textContent = highScore;

let activeTraps = [];
let activePowerUps = [];


// ==========================================
// DETECTAR SI ES CELULAR O LAPTOP
// ==========================================
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    isTouchDevice = true;
    customCursor.style.display = 'none';
    const sensGroup = document.getElementById('sensitivity-group');
    if (sensGroup) sensGroup.style.display = 'none'; // En celu no necesitamos sensibilidad de mouse
  }
}, { once: true });


// ==========================================
// CONTROLES Y EVENTOS (MOUSE Y TOUCH)
// ==========================================

// Pausar con la tecla ESC en la compu
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    togglePause();
  }
});

// Pointer lock para la compu
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== container && isPlaying && !isPaused && !isTouchDevice) {
    togglePause();
  }
});

container.addEventListener('click', () => {
  if (isPlaying && !isPaused && !isTouchDevice && document.pointerLockElement !== container) {
    container.requestPointerLock();
  }
});

// Mover el cursorcito dentro del juego con el mouse de la lap
document.addEventListener('mousemove', (e) => {
  if (isPaused || !isPlaying || isTouchDevice) return;

  if (document.pointerLockElement === container) {
    customCursor.style.display = 'block';
    virtualX += e.movementX * sensitivity;
    virtualY += e.movementY * sensitivity;

    virtualX = Math.max(8, Math.min(container.clientWidth - 8, virtualX));
    virtualY = Math.max(8, Math.min(container.clientHeight - 8, virtualY));

    customCursor.style.left = `${virtualX}px`;
    customCursor.style.top = `${virtualY}px`;
  }
});

// Clics en la compu usando el cursor virtual
document.addEventListener('mousedown', () => {
  if (!isPlaying || isPaused || isTouchDevice || document.pointerLockElement !== container) return;

  const containerRect = container.getBoundingClientRect();

  // Revisar si le atinó a la bola principal
  const ballRect = ball.getBoundingClientRect();
  const ballLeft = ballRect.left - containerRect.left;
  const ballTop = ballRect.top - containerRect.top;
  const ballSize = ball.clientWidth;

  if (virtualX >= ballLeft && virtualX <= ballLeft + ballSize && virtualY >= ballTop && virtualY <= ballTop + ballSize) {
    catchBall();
    return;
  }

  // Revisar si le atinó a la bola dorada sorpresa (Power-Up)
  activePowerUps.forEach((pow) => {
    const powRect = pow.getBoundingClientRect();
    const powLeft = powRect.left - containerRect.left;
    const powTop = powRect.top - containerRect.top;
    const powSize = pow.clientWidth;

    if (virtualX >= powLeft && virtualX <= powLeft + powSize && virtualY >= powTop && virtualY <= powTop + powSize) {
      catchPowerUp(pow);
      return;
    }
  });

  // Revisar si le atinó a una trampa/bomba por error
  activeTraps.forEach((trap) => {
    const trapRect = trap.getBoundingClientRect();
    const trapLeft = trapRect.left - containerRect.left;
    const trapTop = trapRect.top - containerRect.top;
    const trapSize = trap.clientWidth;

    if (virtualX >= trapLeft && virtualX <= trapLeft + trapSize && virtualY >= trapTop && virtualY <= trapTop + trapSize) {
      hitTrap(trap);
    }
  });
});

// Tocar directamente con el dedo en el celular
ball.addEventListener('pointerdown', (e) => {
  if (!isPlaying || isPaused) return;
  e.preventDefault();
  catchBall();
});


// ==========================================
// FUNCIONES PRINCIPALES DEL JUEGO
// ==========================================

function catchBall() {
  playSound('catch');
  score++;
  scoreDisplay.textContent = score;
  updateDifficulty();
  moveBall();
}

// Lo que pasa cuando atrapas la bola dorada sorpresa (20% de probabilidad)
function catchPowerUp(pow) {
  playSound('powerup');
  const suerte = Math.random() * 100;

  if (suerte < 3) {
    // Súper premio del 3%: +10 puntos directos sin que suba la dificultad
    score += 10;
    scoreDisplay.textContent = score;
  } else if (suerte < 35) {
    // Premio de color seguro
    let coloresLibres = colors.filter(c => c !== currentColor);
    currentColor = coloresLibres[Math.floor(Math.random() * coloresLibres.length)];
    ball.style.backgroundColor = currentColor;
    ball.style.boxShadow = `0 0 15px ${currentColor}`;
    score += 3;
    scoreDisplay.textContent = score;
  } else if (suerte < 70) {
    // Bola más grande temporalmente para facilitar el juego
    customBonusSize = 16;
    updateDifficulty();
    score += 3;
    scoreDisplay.textContent = score;
  } else {
    // Puntos extra + tiempo extra
    score += 3;
    timeLeft = Math.min(100, timeLeft + 5);
    timerDisplay.textContent = timeLeft;
    scoreDisplay.textContent = score;
  }

  pow.remove();
  activePowerUps = activePowerUps.filter(p => p !== pow);
}

// Si tocas una trampa te quita 3 puntos
function hitTrap(trap) {
  playSound('bomb');
  score = Math.max(0, score - 3);
  scoreDisplay.textContent = score;
  trap.remove();
  activeTraps = activeTraps.filter(t => t !== trap);
  updateDifficulty();
}


// ==========================================
// MOVER LA BOLA Y GENERAR TRAMPAS / SORPRESAS
// ==========================================

function moveBall() {
  if (!isPlaying || isPaused) return;
  clearTimeout(autoMoveTimeout);
  clearEntities();

  const maxX = container.clientWidth - ball.clientWidth;
  const maxY = container.clientHeight - ball.clientHeight - 80;

  const randomX = Math.floor(Math.random() * maxX);
  const randomY = Math.floor(Math.random() * (maxY - 40)) + 60;

  ball.style.left = `${randomX}px`;
  ball.style.top = `${randomY}px`;

  // Calcular trampas según el nivel elegido en el menú
  let numTrampas = 0;
  if (currentDifficulty === 'medium' && score >= 5) {
    numTrampas = 1 + Math.floor((score - 5) / 3);
  } else if (currentDifficulty === 'hard' && score >= 5) {
    numTrampas = 2 + (Math.floor((score - 5) / 2) * 2);
  }

  let posicionesUsadas = [{ x: randomX, y: randomY }];

  // Poner trampas en el mapa sin que se monten encima de la bola
  for (let i = 0; i < numTrampas; i++) {
    const trap = document.createElement('div');
    trap.className = 'trap-ball';
    
    trap.style.width = ball.style.width;
    trap.style.height = ball.style.height;
    trap.style.backgroundColor = currentColor;
    trap.style.boxShadow = `0 0 15px ${currentColor}`;
    trap.style.position = 'absolute';
    trap.style.borderRadius = '50%';
    trap.style.zIndex = '5';

    let trapX, trapY, muyCerca, intentos = 0;
    do {
      muyCerca = false;
      trapX = Math.floor(Math.random() * maxX);
      trapY = Math.floor(Math.random() * (maxY - 40)) + 60;

      for (let pos of posicionesUsadas) {
        if (Math.abs(trapX - pos.x) < 70 && Math.abs(trapY - pos.y) < 70) {
          muyCerca = true;
          break;
        }
      }
      intentos++;
    } while (muyCerca && intentos < 50);

    posicionesUsadas.push({ x: trapX, y: trapY });
    trap.style.left = `${trapX}px`;
    trap.style.top = `${trapY}px`;

    trap.addEventListener('pointerdown', (e) => {
      if (!isPlaying || isPaused) return;
      e.preventDefault();
      hitTrap(trap);
    });

    container.appendChild(trap);
    activeTraps.push(trap);
  }

  // Generar la bola dorada sorpresa (20% de probabilidad)
  if (Math.random() < 0.20) {
    const pow = document.createElement('div');
    pow.className = 'powerup-ball';
    
    pow.style.width = `${Math.max(18, ball.clientWidth - 4)}px`;
    pow.style.height = `${Math.max(18, ball.clientHeight - 4)}px`;
    pow.style.position = 'absolute';
    pow.style.borderRadius = '50%';
    pow.style.zIndex = '6';

    let powX, powY, muyCerca, intentos = 0;
    do {
      muyCerca = false;
      powX = Math.floor(Math.random() * maxX);
      powY = Math.floor(Math.random() * (maxY - 40)) + 60;

      for (let pos of posicionesUsadas) {
        if (Math.abs(powX - pos.x) < 70 && Math.abs(powY - pos.y) < 70) {
          muyCerca = true;
          break;
        }
      }
      intentos++;
    } while (muyCerca && intentos < 50);

    pow.style.left = `${powX}px`;
    pow.style.top = `${powY}px`;

    pow.addEventListener('pointerdown', (e) => {
      if (!isPlaying || isPaused) return;
      e.preventDefault();
      catchPowerUp(pow);
    });

    container.appendChild(pow);
    activePowerUps.push(pow);
  }

  // Tiempo antes de que la pelota se mueva sola a otro lado
  autoMoveTimeout = setTimeout(() => {
    moveBall();
  }, currentSpeed);
}

// Subir dificultad (hacer la bola más chiquita y rápida)
function updateDifficulty() {
  const baseSize = Math.max(MIN_SIZE, INITIAL_SIZE - score);
  const finalSize = baseSize + customBonusSize;
  ball.style.width = `${finalSize}px`;
  ball.style.height = `${finalSize}px`;

  if (currentDifficulty === 'easy') {
    currentSpeed = 1600;
  } else if (currentDifficulty === 'medium') {
    currentSpeed = Math.max(500, 1200 - (score * 20));
  } else if (currentDifficulty === 'hard') {
    currentSpeed = Math.max(250, 800 - (score * 30));
  }

  if (customBonusSize === 0) {
    const colorIndex = Math.floor(Math.max(0, score) / 5) % colors.length;
    currentColor = colors[colorIndex];
  }
  
  ball.style.backgroundColor = currentColor;
  ball.style.boxShadow = `0 0 15px ${currentColor}`;
}

// Limpiar elementos sobrantes de la pantalla
function clearEntities() {
  activeTraps.forEach(trap => trap.remove());
  activeTraps = [];
  activePowerUps.forEach(pow => pow.remove());
  activePowerUps = [];
}


// ==========================================
// AUDIO, CRONÓMETRO Y ESTADOS (PAUSA / GAMEOVER)
// ==========================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let masterGain = audioCtx.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(audioCtx.destination);

function changeVolume(val) {
  masterGain.gain.value = parseFloat(val);
}

function changeSensitivity(val) {
  sensitivity = Math.min(2.0, parseFloat(val));
  sensValueDisplay.textContent = `${sensitivity.toFixed(1)}x`;
}

function changeDifficulty(level) {
  currentDifficulty = level;
  document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${level}`).classList.add('active');
  restartGame();
}

function adjustTime(seconds) {
  let nuevoTiempo = defaultTime + seconds;
  if (nuevoTiempo > 100) nuevoTiempo = 100;
  if (nuevoTiempo < 10) nuevoTiempo = 10;

  defaultTime = nuevoTiempo;
  timeLeft = defaultTime;
  timerDisplay.textContent = timeLeft;
  menuTimeDisplay.textContent = `${timeLeft}s`;
  playSound('catch');
}

function resetHighScore() {
  highScore = 0;
  localStorage.removeItem('ballGameHighScore');
  highScoreDisplay.textContent = '0';
  finalHighScoreDisplay.textContent = '0';
}

// Generador de sonidos chulos con Web Audio API (sin archivos externos)
function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);

  if (type === 'catch') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'powerup') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174.66, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'bomb') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } else if (type === 'gameover') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }
}

function togglePause() {
  if (!isPlaying) return;
  isPaused = !isPaused;

  if (isPaused) {
    if (!isTouchDevice) document.exitPointerLock();
    clearInterval(timerInterval);
    clearTimeout(autoMoveTimeout);
    pauseMenu.classList.remove('hidden');
    customCursor.style.display = 'none';
  } else {
    pauseMenu.classList.add('hidden');
    if (!isTouchDevice) customCursor.style.display = 'block';
    startTimer();
    moveBall();
  }
}

function startTimer() {
  if (isPaused) return;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    timerDisplay.textContent = timeLeft;

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  isPlaying = false;
  if (!isTouchDevice) document.exitPointerLock();
  clearInterval(timerInterval);
  clearTimeout(autoMoveTimeout);
  clearEntities();
  
  playSound('gameover');

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('ballGameHighScore', highScore);
    highScoreDisplay.textContent = highScore;
  }

  ball.style.display = 'none';
  customCursor.style.display = 'none';
  finalScoreDisplay.textContent = score;
  finalHighScoreDisplay.textContent = highScore;
  gameOverScreen.classList.remove('hidden');
}

function restartGame() {
  clearInterval(timerInterval);
  clearTimeout(autoMoveTimeout);

  score = 0;
  timeLeft = defaultTime;
  customBonusSize = 0;
  isPlaying = true;
  isPaused = false;
  
  updateDifficulty();

  scoreDisplay.textContent = score;
  timerDisplay.textContent = timeLeft;
  highScoreDisplay.textContent = highScore;
  
  ball.style.width = `${INITIAL_SIZE}px`;
  ball.style.height = `${INITIAL_SIZE}px`;
  ball.style.backgroundColor = currentColor;
  ball.style.boxShadow = `0 0 15px ${currentColor}`;
  ball.style.display = 'block';
  if (!isTouchDevice) customCursor.style.display = 'block';

  pauseMenu.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  
  moveBall();
  startTimer();
}

// Arrancar el juego al cargar la página
moveBall();
startTimer();
