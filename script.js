let score = 0;
let highScore = localStorage.getItem('ballGameHighScore') || 0;
let defaultTime = 30;
let timeLeft = 30;
let timerInterval;
let autoMoveTimeout;
let isPlaying = true;
let isPaused = false;

// Variables del sistema de Racha / Combo Multiplicador
let currentStreak = 0;
let multiplier = 1;

// Variables principales de tamaño, velocidad y personalización visual de la bola
const INITIAL_SIZE = 50;
const MIN_SIZE = 20;
let currentSpeed = 1200;
let currentColor = '#ff0055';
let customBonusSize = 0; // Guarda el tamaño extra temporal si cae el power-up de tamaño

let currentDifficulty = 'medium';

// Variables para el control de movimiento con ratón virtual (PC) y detección táctil
let sensitivity = 1.0;
let virtualX = 210;
let virtualY = 210;
let isTouchDevice = false;

// Referencias directas a los elementos del documento HTML (DOM)
const ball = document.getElementById('ball');
const customCursor = document.getElementById('custom-cursor');
const scoreDisplay = document.getElementById('score');
const streakDisplay = document.getElementById('streak-display');
const multiplierVal = document.getElementById('multiplier-val');
const highScoreDisplay = document.getElementById('high-score');
const timerDisplay = document.getElementById('timer');
const menuTimeDisplay = document.getElementById('menu-time-display');
const container = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const pauseMenu = document.getElementById('pause-menu');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const sensValueDisplay = document.getElementById('sens-value');

// Paleta de colores cíclicos para la bola principal y las trampas
const colors = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];
highScoreDisplay.textContent = highScore;

let activeTraps = [];
let activePowerUps = [];


// ==========================================
// DETECCIÓN AUTOMÁTICA DE DISPOSITIVO (TÁCTIL VS PC)
// ==========================================
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    isTouchDevice = true;
    customCursor.style.display = 'none';
    const sensGroup = document.getElementById('sensitivity-group');
    if (sensGroup) sensGroup.style.display = 'none'; // Oculta la configuración de sensibilidad en celulares
  }
}, { once: true });


// ==========================================
// CONFIGURACIÓN DE EVENTOS Y CONTROLES
// ==========================================

// Tecla Escape para pausar / reanudar el juego rápidamente
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    togglePause();
  }
});

// Control de bloqueo de puntero para jugar con comodidad en computadoras
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

// Cálculo del movimiento del cursor virtual dentro del área de juego
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

// Sistema de clics virtuales para computadoras (comprueba colisiones con la posición del cursor)
document.addEventListener('mousedown', () => {
  if (!isPlaying || isPaused || isTouchDevice || document.pointerLockElement !== container) return;

  const containerRect = container.getBoundingClientRect();

  const ballRect = ball.getBoundingClientRect();
  const ballLeft = ballRect.left - containerRect.left;
  const ballTop = ballRect.top - containerRect.top;
  const ballSize = ball.clientWidth;

  // Comprobar si se hizo clic en la pelota principal
  if (virtualX >= ballLeft && virtualX <= ballLeft + ballSize && virtualY >= ballTop && virtualY <= ballTop + ballSize) {
    catchBall();
    return;
  }

  // Comprobar si se hizo clic en alguna pelota dorada activa
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

  // Comprobar si se hizo clic en una trampa por error
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

// Soporte para toques directos en pantallas táctiles de celulares o tablets
ball.addEventListener('pointerdown', (e) => {
  if (!isPlaying || isPaused) return;
  e.preventDefault();
  catchBall();
});


// ==========================================
// LÓGICA PRINCIPAL DE JUEGO Y MECÁNICAS
// ==========================================

// Actualiza el indicador visual de la racha en pantalla
function updateStreakUI() {
  if (multiplier > 1) {
    multiplierVal.textContent = `x${multiplier}`;
    streakDisplay.classList.remove('streak-hidden');
    streakDisplay.classList.add('streak-active');
  } else {
    multiplierVal.textContent = `x1`;
    streakDisplay.classList.remove('streak-active');
    streakDisplay.classList.add('streak-hidden');
  }
}

function catchBall() {
  playSound('catch');

  // Incrementar la racha y calcular el multiplicador (Cada 3 aciertos sube +1 al multiplicador, máx x4)
  currentStreak++;
  multiplier = Math.min(4, 1 + Math.floor(currentStreak / 3));
  updateStreakUI();

  // Sumar puntos multiplicados según la racha
  score += 1 * multiplier;
  scoreDisplay.textContent = score;

  // Transición automática: si estás en modo fácil y llegas a 40 puntos, cambia a normal
  if (currentDifficulty === 'easy' && score >= 40) {
    currentDifficulty = 'medium';
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-medium').classList.add('active');
  }

  updateDifficulty();
  moveBall();
}

// Opciones aleatorias de la pelota dorada configuradas con sus porcentajes exactos
function catchPowerUp(pow) {
  playSound('powerup');
  const suerte = Math.random() * 100; // Genera un valor numérico entre 0 y 100

  if (suerte < 40) {
    // Opción 1: Sumar 3 puntos sin aumentar dificultad (40% de probabilidad)
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 43) {
    // Opción 2: Sumar 10 puntos sin aumentar dificultad (3% de probabilidad)
    score += 10 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 63) {
    // Opción 3: La bola cambia a un color aleatorio seguro diferente a las trampas (20% de probabilidad)
    let coloresLibres = colors.filter(c => c !== currentColor);
    currentColor = coloresLibres[Math.floor(Math.random() * coloresLibres.length)];
    ball.style.backgroundColor = currentColor;
    ball.style.boxShadow = `0 0 15px ${currentColor}`;
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 73) {
    // Opción 4: La bola se hace grande y muestra un puntito blanco en el centro (10% de probabilidad)
    customBonusSize = 18;
    
    if (!ball.querySelector('.main-ball-dot')) {
      const dot = document.createElement('div');
      dot.className = 'main-ball-dot';
      ball.appendChild(dot);
    }

    updateDifficulty();
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  } else {
    // Margen restante (27%): Otorga 3 puntos estándar de respaldo
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  }

  pow.remove();
  activePowerUps = activePowerUps.filter(p => p !== pow);
}

// Penalización al tocar una trampa (resta 3 puntos y reinicia la racha a cero)
function hitTrap(trap) {
  playSound('bomb');
  
  // Reiniciar la racha a cero
  currentStreak = 0;
  multiplier = 1;
  updateStreakUI();

  score = Math.max(0, score - 3);
  scoreDisplay.textContent = score;
  trap.remove();
  activeTraps = activeTraps.filter(t => t !== trap);
  updateDifficulty();
}


// ==========================================
// MOVIMIENTO, POSICIONAMIENTO Y APARICIÓN DE OBJETOS
// ==========================================

// Función auxiliar para instanciar pelotas doradas en pantalla evitando solapamientos
function spawnPowerUp(maxX, maxY, usedPositions) {
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

    for (let pos of usedPositions) {
      if (Math.abs(powX - pos.x) < 70 && Math.abs(powY - pos.y) < 70) {
        muyCerca = true;
        break;
      }
    }
    intentos++;
  } while (muyCerca && intentos < 50);

  usedPositions.push({ x: powX, y: powY });
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

  // Cantidad de trampas dinámicas según el nivel seleccionado
  let numTrampas = 0;
  if (currentDifficulty === 'medium' && score >= 5) {
    numTrampas = 1 + Math.floor((score - 5) / 3);
  } else if (currentDifficulty === 'hard' && score >= 5) {
    numTrampas = 2 + (Math.floor((score - 5) / 2) * 2);
  }

  let posicionesUsadas = [{ x: randomX, y: randomY }];

  // Generar trampas en posiciones aleatorias seguras
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

  // REGLA: En modo fácil NO aparece la pelota dorada
  if (currentDifficulty !== 'easy') {
    // 10% de probabilidad de aparición para la primera pelota dorada
    if (Math.random() < 0.10) {
      spawnPowerUp(maxX, maxY, posicionesUsadas);
    }

    // REGLA: En modo difícil se agrega una segunda pelota dorada adicional
    if (currentDifficulty === 'hard') {
      if (Math.random() < 0.10) {
        spawnPowerUp(maxX, maxY, posicionesUsadas);
      }
    }
  }

  // Temporizador de salto automático: Si la pelota salta sola porque no la atrapaste, rompe la racha
  autoMoveTimeout = setTimeout(() => {
    if (currentStreak > 0) {
      currentStreak = 0;
      multiplier = 1;
      updateStreakUI();
    }
    moveBall();
  }, currentSpeed);
}

// Actualiza el tamaño y la velocidad de la bola según los puntos acumulados y la dificultad
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
    
    // Remueve el puntito central si el efecto de tamaño ya expiró
    const dot = ball.querySelector('.main-ball-dot');
    if (dot) dot.remove();
  }
  
  ball.style.backgroundColor = currentColor;
  ball.style.boxShadow = `0 0 15px ${currentColor}`;
}

// Limpia todas las trampas y power-ups activos del DOM
function clearEntities() {
  activeTraps.forEach(trap => trap.remove());
  activeTraps = [];
  activePowerUps.forEach(pow => pow.remove());
  activePowerUps = [];
}


// ==========================================
// AUDIO, CRONÓMETRO Y ESTADOS DEL JUEGO
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

// Sintetizador de efectos de sonido procedurales mediante la Web Audio API
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

  // Actualizar y guardar el récord máximo en el almacenamiento local del navegador
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
  currentStreak = 0;
  multiplier = 1;
  updateStreakUI();

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

// Inicializar y arrancar el juego automáticamente al cargar el script
moveBall();
startTimer();
