let score = 0;
let highScore = localStorage.getItem('ballGameHighScore') || 0;
let defaultTime = 30;
let timeLeft = 30;
let timerInterval;
let autoMoveTimeout;
let isPlaying = true;
let isPaused = false;

const INITIAL_SIZE = 50;
const MIN_SIZE = 20;
let currentSpeed = 1200;
let currentColor = '#ff0055';

let currentDifficulty = 'medium';

let sensitivity = 1.0;
let virtualX = 210;
let virtualY = 210;
let isTouchDevice = false;

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

const colors = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];

highScoreDisplay.textContent = highScore;

let activeTraps = [];

// DETECCIÓN INTELIGENTE DE DISPOSITIVOS TÁCTILES
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    isTouchDevice = true;
    customCursor.style.display = 'none';
    const sensGroup = document.getElementById('sensitivity-group');
    if (sensGroup) sensGroup.style.display = 'none';
  }
}, { once: true });

// AUDIO (Web Audio API)
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
  let newTime = defaultTime + seconds;
  if (newTime > 100) {
    newTime = 100;
  } else if (newTime < 10) {
    newTime = 10;
  }

  defaultTime = newTime;
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

// PAUSA CON TECLA ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    togglePause();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== container && isPlaying && !isPaused && !isTouchDevice) {
    togglePause();
  }
});

container.addEventListener('click', (e) => {
  if (isPlaying && !isPaused && !isTouchDevice && document.pointerLockElement !== container) {
    container.requestPointerLock();
  }
});

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

// DETECCIÓN DE CLIC VIRTUAL PARA PC
document.addEventListener('mousedown', (e) => {
  if (!isPlaying || isPaused || isTouchDevice || document.pointerLockElement !== container) return;

  const ballRect = ball.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const ballLeft = ballRect.left - containerRect.left;
  const ballTop = ballRect.top - containerRect.top;
  const ballSize = ball.clientWidth;

  if (
    virtualX >= ballLeft &&
    virtualX <= ballLeft + ballSize &&
    virtualY >= ballTop &&
    virtualY <= ballTop + ballSize
  ) {
    catchBall();
    return;
  }

  activeTraps.forEach((trap) => {
    const trapRect = trap.getBoundingClientRect();
    const trapLeft = trapRect.left - containerRect.left;
    const trapTop = trapRect.top - containerRect.top;
    const trapSize = trap.clientWidth;

    if (
      virtualX >= trapLeft &&
      virtualX <= trapLeft + trapSize &&
      virtualY >= trapTop &&
      virtualY <= trapTop + trapSize
    ) {
      hitTrap(trap);
    }
  });
});

// INTERACCIÓN TÁCTIL DIRECTA
ball.addEventListener('pointerdown', (e) => {
  if (!isPlaying || isPaused) return;
  e.preventDefault();
  catchBall();
});

function catchBall() {
  playSound('catch');
  score++;
  scoreDisplay.textContent = score;
  updateDifficulty();
  moveBall();
}

function hitTrap(trap) {
  playSound('bomb');
  score = Math.max(0, score - 3);
  scoreDisplay.textContent = score;
  trap.remove();
  updateDifficulty();
}

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
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

function clearTraps() {
  activeTraps.forEach(trap => trap.remove());
  activeTraps = [];
}

function moveBall() {
  if (!isPlaying || isPaused) return;
  clearTimeout(autoMoveTimeout);
  clearTraps();

  const maxX = container.clientWidth - ball.clientWidth;
  const maxY = container.clientHeight - ball.clientHeight - 80;

  const randomX = Math.floor(Math.random() * maxX);
  const randomY = Math.floor(Math.random() * (maxY - 40)) + 60;

  ball.style.left = `${randomX}px`;
  ball.style.top = `${randomY}px`;

  let numberOfTraps = 0;

  if (currentDifficulty === 'easy') {
    numberOfTraps = 0;
  } else if (currentDifficulty === 'medium') {
    if (score >= 5) {
      numberOfTraps = 1 + Math.floor((score - 5) / 3);
    }
  } else if (currentDifficulty === 'hard') {
    if (score >= 5) {
      numberOfTraps = 2 + (Math.floor((score - 5) / 2) * 2);
    }
  }

  let usedPositions = [{ x: randomX, y: randomY }];

  for (let i = 0; i < numberOfTraps; i++) {
    const trap = document.createElement('div');
    trap.className = 'trap-ball';
    
    trap.style.width = ball.style.width;
    trap.style.height = ball.style.height;
    trap.style.backgroundColor = currentColor;
    trap.style.boxShadow = `0 0 15px ${currentColor}`;
    trap.style.position = 'absolute';
    trap.style.borderRadius = '50%';
    trap.style.zIndex = '5';

    let trapX, trapY, overlap;
    let attempts = 0;
    
    do {
      overlap = false;
      trapX = Math.floor(Math.random() * maxX);
      trapY = Math.floor(Math.random() * (maxY - 40)) + 60;

      for (let pos of usedPositions) {
        if (Math.abs(trapX - pos.x) < 70 && Math.abs(trapY - pos.y) < 70) {
          overlap = true;
          break;
        }
      }
      attempts++;
    } while (overlap && attempts < 50);

    usedPositions.push({ x: trapX, y: trapY });

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

  autoMoveTimeout = setTimeout(() => {
    moveBall();
  }, currentSpeed);
}

function updateDifficulty() {
  const newSize = Math.max(MIN_SIZE, INITIAL_SIZE - score);
  ball.style.width = `${newSize}px`;
  ball.style.height = `${newSize}px`;

  if (currentDifficulty === 'easy') {
    currentSpeed = 1600;
  } else if (currentDifficulty === 'medium') {
    currentSpeed = Math.max(500, 1200 - (score * 20));
  } else if (currentDifficulty === 'hard') {
    currentSpeed = Math.max(250, 800 - (score * 30));
  }

  const colorIndex = Math.floor(Math.max(0, score) / 5) % colors.length;
  currentColor = colors[colorIndex];
  
  ball.style.backgroundColor = currentColor;
  ball.style.boxShadow = `0 0 15px ${currentColor}`;
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
  clearTraps();
  
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

moveBall();
startTimer();
