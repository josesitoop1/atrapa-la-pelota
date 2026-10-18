// ==========================================
// JUEGO WEB: "ATRAPA LA PELOTA"
// Lógica de juego con tienda dividida en Pelotas, Fondos y Fondos de Imagen.
// ==========================================

let score = 0;
let highScore = localStorage.getItem('ballGameHighScore') || 0;
let totalCoins = parseInt(localStorage.getItem('ballGameCoins')) || 0;

let defaultTime = 80;
let timeLeft = 80;
let timerInterval;
let autoMoveTimeout;
let isPlaying = true;
let isPaused = false;

// Variables de Skins y Temas
let currentSkin = localStorage.getItem('ballGameActiveSkin') || 'classic';
let unlockedSkins = JSON.parse(localStorage.getItem('ballGameUnlockedSkins')) || ['classic'];

let currentTheme = localStorage.getItem('ballGameActiveTheme') || 'cyberpunk';
let unlockedThemes = JSON.parse(localStorage.getItem('ballGameUnlockedThemes')) || ['cyberpunk'];

// Variables de Racha
let currentStreak = 0;
let multiplier = 1;
let streakTimeout;

// Tamaño y velocidad
const INITIAL_SIZE = 50;
const MIN_SIZE = 20;
let currentSpeed = 1200;
let currentColor = '#ff0055';
let customBonusSize = 0;

let currentDifficulty = 'medium';

// PC / Táctil
let sensitivity = 1.0;
let virtualX = 210;
let virtualY = 210;
let isTouchDevice = false;

// Elementos DOM
const ball = document.getElementById('ball');
const customCursor = document.getElementById('custom-cursor');
const scoreDisplay = document.getElementById('score');
const coinsDisplay = document.getElementById('coins');
const shopCoinsDisplay = document.getElementById('shop-coins');
const streakDisplay = document.getElementById('streak-display');
const multiplierVal = document.getElementById('multiplier-val');
const streakPopup = document.getElementById('streak-popup');
const highScoreDisplay = document.getElementById('high-score');
const timerDisplay = document.getElementById('timer');
const container = document.getElementById('game-container');
const gameOverScreen = document.getElementById('game-over');
const pauseMenu = document.getElementById('pause-menu');
const shopMenu = document.getElementById('shop-menu');
const finalScoreDisplay = document.getElementById('final-score');
const earnedCoinsDisplay = document.getElementById('earned-coins');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const sensValueDisplay = document.getElementById('sens-value');

const colors = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];
highScoreDisplay.textContent = highScore;
coinsDisplay.textContent = totalCoins;

let activeTraps = [];
let activePowerUps = [];


// ==========================================
// MODO PRUEBAS
// ==========================================
function addTestCoins() {
  totalCoins += 100;
  localStorage.setItem('ballGameCoins', totalCoins);
  coinsDisplay.textContent = totalCoins;
  shopCoinsDisplay.textContent = totalCoins;
  updateShopButtons();
  playSound('powerup');
}

function resetFullProgress() {
  if (confirm("¿Estás seguro de borrar todo el progreso, monedas y compras?")) {
    localStorage.clear();

    highScore = 0;
    totalCoins = 0;
    currentSkin = 'classic';
    unlockedSkins = ['classic'];
    currentTheme = 'cyberpunk';
    unlockedThemes = ['cyberpunk'];

    highScoreDisplay.textContent = '0';
    coinsDisplay.textContent = '0';
    shopCoinsDisplay.textContent = '0';
    document.body.className = 'theme-cyberpunk';

    restartGame();
  }
}


// ==========================================
// CONTROLES Y TÁCTIL
// ==========================================
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    isTouchDevice = true;
    customCursor.style.display = 'none';
    const sensGroup = document.getElementById('sensitivity-group');
    if (sensGroup) sensGroup.style.display = 'none';
  }
}, { once: true });

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

container.addEventListener('click', () => {
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

document.addEventListener('mousedown', () => {
  if (!isPlaying || isPaused || isTouchDevice || document.pointerLockElement !== container) return;

  const ballRect = ball.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const ballLeft = ballRect.left - containerRect.left;
  const ballTop = ballRect.top - containerRect.top;
  const ballSize = ball.clientWidth;

  if (virtualX >= ballLeft && virtualX <= ballLeft + ballSize && virtualY >= ballTop && virtualY <= ballTop + ballSize) {
    catchBall();
    return;
  }

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

ball.addEventListener('pointerdown', (e) => {
  if (!isPlaying || isPaused) return;
  e.preventDefault();
  catchBall();
});


// ==========================================
// TIENDA: PESTAÑAS Y COMPRAS
// ==========================================

function toggleShop() {
  shopMenu.classList.toggle('hidden');
  shopCoinsDisplay.textContent = totalCoins;
  updateShopButtons();
}

function switchShopTab(tab) {
  document.getElementById('tab-skins-btn').classList.toggle('active', tab === 'skins');
  document.getElementById('tab-themes-btn').classList.toggle('active', tab === 'themes');
  document.getElementById('tab-images-btn').classList.toggle('active', tab === 'images');

  document.getElementById('shop-skins-section').classList.toggle('hidden', tab !== 'skins');
  document.getElementById('shop-themes-section').classList.toggle('hidden', tab !== 'themes');
  document.getElementById('shop-images-section').classList.toggle('hidden', tab !== 'images');
}

function updateShopButtons() {
  // 1. SKINS DE PELOTAS
  const btnClassic = document.getElementById('buy-classic');
  if (currentSkin === 'classic') {
    btnClassic.textContent = 'Equipada';
    btnClassic.disabled = true;
  } else {
    btnClassic.textContent = 'Equipar';
    btnClassic.disabled = false;
    btnClassic.onclick = () => equipSkin('classic');
  }

  const btnFire = document.getElementById('buy-fire');
  if (currentSkin === 'fire') {
    btnFire.textContent = 'Equipada';
    btnFire.disabled = true;
  } else if (unlockedSkins.includes('fire')) {
    btnFire.textContent = 'Equipar';
    btnFire.disabled = false;
    btnFire.onclick = () => equipSkin('fire');
  } else {
    btnFire.textContent = 'Comprar (50 🪙)';
    btnFire.disabled = totalCoins < 50;
    btnFire.onclick = () => buySkin('fire', 50);
  }

  const btnGalaxy = document.getElementById('buy-galaxy');
  if (currentSkin === 'galaxy') {
    btnGalaxy.textContent = 'Equipada';
    btnGalaxy.disabled = true;
  } else if (unlockedSkins.includes('galaxy')) {
    btnGalaxy.textContent = 'Equipar';
    btnGalaxy.disabled = false;
    btnGalaxy.onclick = () => equipSkin('galaxy');
  } else {
    btnGalaxy.textContent = 'Comprar (150 🪙)';
    btnGalaxy.disabled = totalCoins < 150;
    btnGalaxy.onclick = () => buySkin('galaxy', 150);
  }

  // 2. FONDOS ORIGINALES (Con opción de Desequipar)
  const btnThemeCyber = document.getElementById('buy-theme-cyberpunk');
  if (currentTheme === 'cyberpunk') {
    btnThemeCyber.textContent = 'Predeterminado';
    btnThemeCyber.disabled = true;
  } else {
    btnThemeCyber.textContent = 'Equipar';
    btnThemeCyber.disabled = false;
    btnThemeCyber.onclick = () => equipTheme('cyberpunk');
  }

  const btnThemeSpace = document.getElementById('buy-theme-space');
  if (currentTheme === 'space') {
    btnThemeSpace.textContent = 'Desequipar';
    btnThemeSpace.disabled = false;
    btnThemeSpace.onclick = () => equipTheme('cyberpunk');
  } else if (unlockedThemes.includes('space')) {
    btnThemeSpace.textContent = 'Equipar';
    btnThemeSpace.disabled = false;
    btnThemeSpace.onclick = () => equipTheme('space');
  } else {
    btnThemeSpace.textContent = 'Comprar (100 🪙)';
    btnThemeSpace.disabled = totalCoins < 100;
    btnThemeSpace.onclick = () => buyTheme('space', 100);
  }

  const btnThemeSunset = document.getElementById('buy-theme-sunset');
  if (currentTheme === 'sunset') {
    btnThemeSunset.textContent = 'Desequipar';
    btnThemeSunset.disabled = false;
    btnThemeSunset.onclick = () => equipTheme('cyberpunk');
  } else if (unlockedThemes.includes('sunset')) {
    btnThemeSunset.textContent = 'Equipar';
    btnThemeSunset.disabled = false;
    btnThemeSunset.onclick = () => equipTheme('sunset');
  } else {
    btnThemeSunset.textContent = 'Comprar (200 🪙)';
    btnThemeSunset.disabled = totalCoins < 200;
    btnThemeSunset.onclick = () => buyTheme('sunset', 200);
  }

  // 3. FONDOS DE IMAGEN (Con opción de Desequipar y precios actualizados, ordenados de menor a mayor)
  const btnThemeCapy = document.getElementById('buy-theme-capybara');
  if (currentTheme === 'capybara') {
    btnThemeCapy.textContent = 'Desequipar';
    btnThemeCapy.disabled = false;
    btnThemeCapy.onclick = () => equipTheme('cyberpunk');
  } else if (unlockedThemes.includes('capybara')) {
    btnThemeCapy.textContent = 'Equipar';
    btnThemeCapy.disabled = false;
    btnThemeCapy.onclick = () => equipTheme('capybara');
  } else {
    btnThemeCapy.textContent = 'Comprar (300 🪙)';
    btnThemeCapy.disabled = totalCoins < 300;
    btnThemeCapy.onclick = () => buyTheme('capybara', 300);
  }

  const btnThemeSpider = document.getElementById('buy-theme-spiderman');
  if (currentTheme === 'spiderman') {
    btnThemeSpider.textContent = 'Desequipar';
    btnThemeSpider.disabled = false;
    btnThemeSpider.onclick = () => equipTheme('cyberpunk');
  } else if (unlockedThemes.includes('spiderman')) {
    btnThemeSpider.textContent = 'Equipar';
    btnThemeSpider.disabled = false;
    btnThemeSpider.onclick = () => equipTheme('spiderman');
  } else {
    btnThemeSpider.textContent = 'Comprar (400 🪙)';
    btnThemeSpider.disabled = totalCoins < 400;
    btnThemeSpider.onclick = () => buyTheme('spiderman', 400);
  }

  const btnThemeSnoopy = document.getElementById('buy-theme-snoopy');
  if (currentTheme === 'snoopy') {
    btnThemeSnoopy.textContent = 'Desequipar';
    btnThemeSnoopy.disabled = false;
    btnThemeSnoopy.onclick = () => equipTheme('cyberpunk');
  } else if (unlockedThemes.includes('snoopy')) {
    btnThemeSnoopy.textContent = 'Equipar';
    btnThemeSnoopy.disabled = false;
    btnThemeSnoopy.onclick = () => equipTheme('snoopy');
  } else {
    btnThemeSnoopy.textContent = 'Comprar (500 🪙)';
    btnThemeSnoopy.disabled = totalCoins < 500;
    btnThemeSnoopy.onclick = () => buyTheme('snoopy', 500);
  }
}

function buySkin(skinName, price) {
  if (totalCoins >= price) {
    totalCoins -= price;
    coinsDisplay.textContent = totalCoins;
    shopCoinsDisplay.textContent = totalCoins;
    localStorage.setItem('ballGameCoins', totalCoins);

    unlockedSkins.push(skinName);
    localStorage.setItem('ballGameUnlockedSkins', JSON.stringify(unlockedSkins));

    equipSkin(skinName);
    playSound('powerup');
  }
}

function equipSkin(skinName) {
  currentSkin = skinName;
  localStorage.setItem('ballGameActiveSkin', skinName);
  updateShopButtons();
  applySkinVisuals();
}

function buyTheme(themeName, price) {
  if (totalCoins >= price) {
    totalCoins -= price;
    coinsDisplay.textContent = totalCoins;
    shopCoinsDisplay.textContent = totalCoins;
    localStorage.setItem('ballGameCoins', totalCoins);

    unlockedThemes.push(themeName);
    localStorage.setItem('ballGameUnlockedThemes', JSON.stringify(unlockedThemes));

    equipTheme(themeName);
    playSound('powerup');
  }
}

function equipTheme(themeName) {
  currentTheme = themeName;
  localStorage.setItem('ballGameActiveTheme', themeName);
  document.body.className = `theme-${themeName}`;
  updateShopButtons();
}

function applySkinVisuals() {
  if (currentSkin === 'fire') {
    ball.style.background = 'linear-gradient(135deg, #f97316, #ef4444)';
    ball.style.boxShadow = '0 0 20px #f97316';
  } else if (currentSkin === 'galaxy') {
    ball.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
    ball.style.boxShadow = '0 0 20px #8b5cf6';
  } else {
    ball.style.background = '';
    const colorIndex = Math.floor(Math.max(0, score) / 5) % colors.length;
    currentColor = colors[colorIndex];
    ball.style.backgroundColor = currentColor;
    ball.style.boxShadow = `0 0 15px ${currentColor}`;
  }
}


// ==========================================
// MECÁNICAS DE JUEGO Y RACHAS
// ==========================================

function showStreakPopup(text) {
  clearTimeout(streakTimeout);
  streakPopup.textContent = text;
  streakPopup.classList.remove('hidden');
  streakPopup.classList.add('show');

  streakTimeout = setTimeout(() => {
    streakPopup.classList.remove('show');
  }, 600);
}

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

  currentStreak++;
  let oldMultiplier = multiplier;
  multiplier = Math.min(4, 1 + Math.floor(currentStreak / 3));

  if (multiplier > oldMultiplier) {
    showStreakPopup(`¡RACHA x${multiplier}! 🔥`);
  }

  updateStreakUI();

  score += 1 * multiplier;
  scoreDisplay.textContent = score;

  if (currentDifficulty === 'easy' && score >= 40) {
    currentDifficulty = 'medium';
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-medium').classList.add('active');
  }

  updateDifficulty();
  moveBall();
}

function catchPowerUp(pow) {
  playSound('powerup');
  const suerte = Math.random() * 100;

  if (suerte < 40) {
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 43) {
    score += 10 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 63) {
    let coloresLibres = colors.filter(c => c !== currentColor);
    currentColor = coloresLibres[Math.floor(Math.random() * coloresLibres.length)];
    if (currentSkin === 'classic') {
      ball.style.backgroundColor = currentColor;
      ball.style.boxShadow = `0 0 15px ${currentColor}`;
    }
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  } else if (suerte < 73) {
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
    score += 3 * multiplier;
    scoreDisplay.textContent = score;
  }

  pow.remove();
  activePowerUps = activePowerUps.filter(p => p !== pow);
}

function hitTrap(trap) {
  playSound('bomb');
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
// MOVIMIENTO Y APARICIÓN DE OBJETOS
// ==========================================

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

  usedPositions.push({ x: powX
