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
let isPlaying = false;
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
const menuCoinsDisplay = document.getElementById('menu-coins');
const streakDisplay = document.getElementById('streak-display');
const multiplierVal = document.getElementById('multiplier-val');
const streakPopup = document.getElementById('streak-popup');
const highScoreDisplay = document.getElementById('high-score');
const timerDisplay = document.getElementById('timer');
const container = document.getElementById('game-container');
const mainMenu = document.getElementById('main-menu');
const infoMenu = document.getElementById('info-menu');
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
menuCoinsDisplay.textContent = totalCoins;

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
  menuCoinsDisplay.textContent = totalCoins;
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
    menuCoinsDisplay.textContent = '0';
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
    if (isPlaying) togglePause();
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
// MENÚ PRINCIPAL, INFORMACIÓN Y TIENDA
// ==========================================

function startGameFromMenu() {
  mainMenu.classList.add('hidden');
  restartGame();
}

function toggleShop() {
  shopMenu.classList.toggle('hidden');
  shopCoinsDisplay.textContent = totalCoins;
  menuCoinsDisplay.textContent = totalCoins;
  updateShopButtons();
}

function toggleInfo() {
  infoMenu.classList.toggle('hidden');
}

function returnToMainMenu() {
  clearInterval(timerInterval);
  clearTimeout(autoMoveTimeout);
  isPlaying = false;
  isPaused = false;
  if (!isTouchDevice) document.exitPointerLock();

  pauseMenu.classList.add('hidden');
  shopMenu.classList.add('hidden');
  infoMenu.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  ball.style.display = 'none';
  customCursor.style.display = 'none';

  menuCoinsDisplay.textContent = totalCoins;
  mainMenu.classList.remove('hidden');
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
  const btnClassic = document.getElementById('buy-classic');
  if (btnClassic) {
    if (currentSkin === 'classic') {
      btnClassic.textContent = 'Equipada';
      btnClassic.disabled = true;
    } else {
      btnClassic.textContent = 'Equipar';
      btnClassic.disabled = false;
      btnClassic.onclick = () => equipSkin('classic');
    }
  }

  const btnFire = document.getElementById('buy-fire');
  if (btnFire) {
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
  }

  const btnGalaxy = document.getElementById('buy-galaxy');
  if (btnGalaxy) {
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
  }

  const btnThemeCyber = document.getElementById('buy-theme-cyberpunk');
  if (btnThemeCyber) {
    if (currentTheme === 'cyberpunk') {
      btnThemeCyber.textContent = 'Predeterminado';
      btnThemeCyber.disabled = true;
    } else {
      btnThemeCyber.textContent = 'Equipar';
      btnThemeCyber.disabled = false;
      btnThemeCyber.onclick = () => equipTheme('cyberpunk');
    }
  }

  const btnThemeSpace = document.getElementById('buy-theme-space');
  if (btnThemeSpace) {
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
  }

  const btnThemeSunset = document.getElementById('buy-theme-sunset');
  if (btnThemeSunset) {
    if (currentTheme === 'sunset') {
      btnThemeSunset.textContent = 'Desequipar';
      btnThemeSunset.disabled = false;
      btnThemeSunset.onclick = () => equipTheme('cyberpunk');
    } else if (unlocked
