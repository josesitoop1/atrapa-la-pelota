// ==========================================
// JUEGO WEB: "ATRAPA LA PELOTA"
// Lógica de juego con tienda dividida en Pelotas, Fondos y Fondos de Imagen.
// ==========================================

let puntos = 0;
let recordMax = localStorage.getItem('ballGameHighScore') || 0;
let lanaTotal = parseInt(localStorage.getItem('ballGameCoins')) || 0;

let tiempoBase = 80;
let tiempoRestante = 80;
let relojIntervalo;
let muevePelotaTimeout;
let juegoActivo = false;
let estaPausado = false;

// Variables de Skins y Temas
let skinActual = localStorage.getItem('ballGameActiveSkin') || 'classic';
let skinsDesbloqueadas = JSON.parse(localStorage.getItem('ballGameUnlockedSkins')) || ['classic'];

let temaActual = localStorage.getItem('ballGameActiveTheme') || 'cyberpunk';
let temasDesbloqueados = JSON.parse(localStorage.getItem('ballGameUnlockedThemes')) || ['cyberpunk'];

// Variables de Racha
let rachaActual = 0;
let multi = 1;
let tiempoRacha;

// Tamaño y velocidad
const TAMAÑO_INICIAL = 50;
const TAMAÑO_MIN = 20;
let velocidadActual = 1200;
let colorActual = '#ff0055';
let extraTamaño = 0;

let dificultadActual = 'medium';

// PC / Táctil
let sensi = 1.0;
let posXVirtual = 210;
let posYVirtual = 210;
let esCel = false;

// Elementos DOM
const bola = document.getElementById('ball');
const cursorPro = document.getElementById('custom-cursor');
const marcadorPuntos = document.getElementById('score');
const marcadorLanas = document.getElementById('coins');
const tiendaLanas = document.getElementById('shop-coins');
const menuLanas = document.getElementById('menu-coins');
const displayRacha = document.getElementById('streak-display');
const textoMulti = document.getElementById('multiplier-val');
const popupRacha = document.getElementById('streak-popup');
const marcadorRecord = document.getElementById('high-score');
const marcadorTiempo = document.getElementById('timer');
const contenedor = document.getElementById('game-container');
const menuPrincipal = document.getElementById('main-menu');
const menuInfo = document.getElementById('info-menu');
const pantallaGameOver = document.getElementById('game-over');
const menuPausa = document.getElementById('pause-menu');
const menuTienda = document.getElementById('shop-menu');
const puntosFinales = document.getElementById('final-score');
const lanasGanadas = document.getElementById('earned-coins');
const recordFinal = document.getElementById('final-high-score');
const textoSensi = document.getElementById('sens-value');

const paletaColores = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];
marcadorRecord.textContent = recordMax;
marcadorLanas.textContent = lanaTotal;
menuLanas.textContent = lanaTotal;

let trampasActivas = [];
let poderesActivos = [];


// ==========================================
// MODO PRUEBAS
// ==========================================
function darMonedasPro() {
  lanaTotal += 100;
  localStorage.setItem('ballGameCoins', lanaTotal);
  marcadorLanas.textContent = lanaTotal;
  tiendaLanas.textContent = lanaTotal;
  menuLanas.textContent = lanaTotal;
  checarBotonesTienda();
  sonarEfecto('powerup');
}

function borrarTodoElProgreso() {
  if (confirm("¿Estás seguro de borrar todo el progreso, monedas y compras?")) {
    localStorage.clear();

    recordMax = 0;
    lanaTotal = 0;
    skinActual = 'classic';
    skinsDesbloqueadas = ['classic'];
    temaActual = 'cyberpunk';
    temasDesbloqueados = ['cyberpunk'];

    marcadorRecord.textContent = '0';
    marcadorLanas.textContent = '0';
    tiendaLanas.textContent = '0';
    menuLanas.textContent = '0';
    document.body.className = 'theme-cyberpunk';

    reiniciarJuego();
  }
}


// ==========================================
// CONTROLES Y TÁCTIL
// ==========================================
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    esCel = true;
    cursorPro.style.display = 'none';
    const grupoSensi = document.getElementById('sensitivity-group');
    if (grupoSensi) grupoSensi.style.display = 'none';
  }
}, { once: true });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    if (juegoActivo) pausarJuego();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== contenedor && juegoActivo && !estaPausado && !esCel) {
    pausarJuego();
  }
});

contenedor.addEventListener('click', () => {
  if (juegoActivo && !estaPausado && !esCel && document.pointerLockElement !== contenedor) {
    contenedor.requestPointerLock();
  }
});

document.addEventListener('mousemove', (e) => {
  if (estaPausado || !juegoActivo || esCel) return;

  if (document.pointerLockElement === contenedor) {
    cursorPro.style.display = 'block';
    posXVirtual += e.movementX * sensi;
    posYVirtual += e.movementY * sensi;

    posXVirtual = Math.max(8, Math.min(contenedor.clientWidth - 8, posXVirtual));
    posYVirtual = Math.max(8, Math.min(contenedor.clientHeight - 8, posYVirtual));

    cursorPro.style.left = `${posXVirtual}px`;
    cursorPro.style.top = `${posYVirtual}px`;
  }
});

document.addEventListener('mousedown', () => {
  if (!juegoActivo || estaPausado || esCel || document.pointerLockElement !== contenedor) return;

  const rectBola = bola.getBoundingClientRect();
  const rectCont = contenedor.getBoundingClientRect();
  const bolaIzquierda = rectBola.left - rectCont.left;
  const bolaArriba = rectBola.top - rectCont.top;
  const tamañoBola = bola.clientWidth;

  if (posXVirtual >= bolaIzquierda && posXVirtual <= bolaIzquierda + tamañoBola && posYVirtual >= bolaArriba && posYVirtual <= bolaArriba + tamañoBola) {
    atraparPelota();
    return;
  }

  poderesActivos.forEach((pow) => {
    const rectPow = pow.getBoundingClientRect();
    const powIzquierda = rectPow.left - rectCont.left;
    const powArriba = rectPow.top - rectCont.top;
    const tamañoPow = pow.clientWidth;

    if (posXVirtual >= powIzquierda && posXVirtual <= powIzquierda + tamañoPow && posYVirtual >= powArriba && posYVirtual <= powArriba + tamañoPow) {
      atraparPoder(pow);
      return;
    }
  });

  trampasActivas.forEach((trap) => {
    const rectTrap = trap.getBoundingClientRect();
    const trapIzquierda = rectTrap.left - rectCont.left;
    const trapArriba = rectTrap.top - rectCont.top;
    const tamañoTrap = trap.clientWidth;

    if (posXVirtual >= trapIzquierda && posXVirtual <= trapIzquierda + tamañoTrap && posYVirtual >= trapArriba && posYVirtual <= trapArriba + tamañoTrap) {
      pegarTrampa(trap);
    }
  });
});

bola.addEventListener('pointerdown', (e) => {
  if (!juegoActivo || estaPausado) return;
  e.preventDefault();
  atraparPelota();
});


// ==========================================
// MENÚ PRINCIPAL, INFORMACIÓN Y TIENDA
// ==========================================

function empezarJuego() {
  menuPrincipal.classList.add('hidden');
  reiniciarJuego();
}

function abrirTienda() {
  menuTienda.classList.toggle('hidden');
  tiendaLanas.textContent = lanaTotal;
  menuLanas.textContent = lanaTotal;
  checarBotonesTienda();
}

function verInfo() {
  menuInfo.classList.toggle('hidden');
}

function irAlMenuPrincipal() {
  clearInterval(relojIntervalo);
  clearTimeout(muevePelotaTimeout);
  juegoActivo = false;
  estaPausado = false;
  if (!esCel) document.exitPointerLock();

  menuPausa.classList.add('hidden');
  menuTienda.classList.add('hidden');
  menuInfo.classList.add('hidden');
  pantallaGameOver.classList.add('hidden');
  bola.style.display = 'none';
  cursorPro.style.display = 'none';

  menuLanas.textContent = lanaTotal;
  menuPrincipal.classList.remove('hidden');
}

function cambiarPestanaTienda(pestaña) {
  document.getElementById('tab-skins-btn').classList.toggle('active', pestaña === 'skins');
  document.getElementById('tab-themes-btn').classList.toggle('active', pestaña === 'themes');
  document.getElementById('tab-images-btn').classList.toggle('active', pestaña === 'images');

  document.getElementById('shop-skins-section').classList.toggle('hidden', pestaña !== 'skins');
  document.getElementById('shop-themes-section').classList.toggle('hidden', pestaña !== 'themes');
  document.getElementById('shop-images-section').classList.toggle('hidden', pestaña !== 'images');
}

function checarBotonesTienda() {
  const btnClasica = document.getElementById('buy-classic');
  if (btnClasica) {
    if (skinActual === 'classic') {
      btnClasica.textContent = 'Equipada';
      btnClasica.disabled = true;
    } else {
      btnClasica.textContent = 'Equipar';
      btnClasica.disabled = false;
      btnClasica.onclick = () => ponerSkin('classic');
    }
  }

  const btnFuego = document.getElementById('buy-fire');
  if (btnFuego) {
    if (skinActual === 'fire') {
      btnFuego.textContent = 'Equipada';
      btnFuego.disabled = true;
    } else if (skinsDesbloqueadas.includes('fire')) {
      btnFuego.textContent = 'Equipar';
      btnFuego.disabled = false;
      btnFuego.onclick = () => ponerSkin('fire');
    } else {
      btnFuego.textContent = 'Comprar (50 🪙)';
      btnFuego.disabled = lanaTotal < 50;
      btnFuego.onclick = () => comprarSkin('fire', 50);
    }
  }

  const btnGalaxia = document.getElementById('buy-galaxy');
  if (btnGalaxia) {
    if (skinActual === 'galaxy') {
      btnGalaxia.textContent = 'Equipada';
      btnGalaxia.disabled = true;
    } else if (skinsDesbloqueadas.includes('galaxy')) {
      btnGalaxia.textContent = 'Equipar';
      btnGalaxia.disabled = false;
      btnGalaxia.onclick = () => ponerSkin('galaxy');
    } else {
      btnGalaxia.textContent = 'Comprar (150 🪙)';
      btnGalaxia.disabled = lanaTotal < 150;
      btnGalaxia.onclick = () => comprarSkin('galaxy', 150);
    }
  }

  const btnTemaCyber = document.getElementById('buy-theme-cyberpunk');
  if (btnTemaCyber) {
    if (temaActual === 'cyberpunk') {
      btnTemaCyber.textContent = 'Predeterminado';
      btnTemaCyber.disabled = true;
    } else {
      btnTemaCyber.textContent = 'Equipar';
      btnTemaCyber.disabled = false;
      btnTemaCyber.onclick = () => ponerTema('cyberpunk');
    }
  }

  const btnTemaSpace = document.getElementById('buy-theme-space');
  if (btnTemaSpace) {
    if (temaActual === 'space') {
      btnTemaSpace.textContent = 'Desequipar';
      btnTemaSpace.disabled = false;
      btnTemaSpace.onclick = () => ponerTema('cyberpunk');
    } else if (temasDesbloqueados.includes('space')) {
      btnTemaSpace.textContent = 'Equipar';
      btnTemaSpace.disabled = false;
      btnTemaSpace.onclick = () => ponerTema('space');
    } else {
      btnTemaSpace.textContent = 'Comprar (100 🪙)';
      btnTemaSpace.disabled = lanaTotal < 100;
      btnTemaSpace.onclick = () => comprarTema('space', 100);
    }
  }

  const btnTemaSunset = document.getElementById('buy-theme-sunset');
  if (btnTemaSunset) {
    if (temaActual === 'sunset') {
      btnTemaSunset.textContent = 'Desequipar';
      btnTemaSunset.disabled = false;
      btnTemaSunset.onclick = () => ponerTema('cyberpunk');
    } else if (temasDesbloqueados.includes('sunset')) {
      btnTemaSunset.textContent = 'Equipar';
      btnTemaSunset.disabled = false;
      btnTemaSunset.onclick = () => ponerTema('sunset');
    } else {
      btnTemaSunset.textContent = 'Comprar (200 🪙)';
      btnTemaSunset.disabled = lanaTotal < 200;
      btnTemaSunset.onclick = () => comprarTema('sunset', 200);
    }
  }

  const btnTemaCapy = document.getElementById('buy-theme-capybara');
  if (btnTemaCapy) {
    if (temaActual === 'capybara') {
      btnTemaCapy.textContent = 'Desequipar';
      btnTemaCapy.disabled = false;
      btnTemaCapy.onclick = () => ponerTema('cyberpunk');
    } else if (temasDesbloqueados.includes('capybara')) {
      btnTemaCapy.textContent = 'Equipar';
      btnTemaCapy.disabled = false;
      btnTemaCapy.onclick = () => ponerTema('capybara');
    } else {
      btnTemaCapy.textContent = 'Comprar (300 🪙)';
      btnTemaCapy.disabled = lanaTotal < 300;
      btnTemaCapy.onclick = () => comprarTema('capybara', 300);
    }
  }

  const btnTemaSpider = document.getElementById('buy-theme-spiderman');
  if (btnTemaSpider) {
    if (temaActual === 'spiderman') {
      btnTemaSpider.textContent = 'Desequipar';
      btnTemaSpider.disabled = false;
      btnTemaSpider.onclick = () => ponerTema('cyberpunk');
    } else if (temasDesbloqueados.includes('spiderman')) {
      btnTemaSpider.textContent = 'Equipar';
      btnTemaSpider.disabled = false;
      btnTemaSpider.onclick = () => ponerTema('spiderman');
    } else {
      btnTemaSpider.textContent = 'Comprar (400 🪙)';
      btnTemaSpider.disabled = lanaTotal < 400;
      btnTemaSpider.onclick = () => comprarTema('spiderman', 400);
    }
  }

  const btnTemaSnoopy = document.getElementById('buy-theme-snoopy');
  if (btnTemaSnoopy) {
    if (temaActual === 'snoopy') {
      btnTemaSnoopy.textContent = 'Desequipar';
      btnTemaSnoopy.disabled = false;
      btnTemaSnoopy.onclick = () => ponerTema('cyberpunk');
    } else if (temasDesbloqueados.includes('snoopy')) {
      btnTemaSnoopy.textContent = 'Equipar';
      btnTemaSnoopy.disabled = false;
      btnTemaSnoopy.onclick = () => ponerTema('snoopy');
    } else {
      btnTemaSnoopy.textContent = 'Comprar (500 🪙)';
      btnTemaSnoopy.disabled = lanaTotal < 500;
      btnTemaSnoopy.onclick = () => comprarTema('snoopy', 500);
    }
  }
}

function comprarSkin(nombreSkin, precio) {
  if (lanaTotal >= precio) {
    lanaTotal -= precio;
    marcadorLanas.textContent = lanaTotal;
    tiendaLanas.textContent = lanaTotal;
    menuLanas.textContent = lanaTotal;
    localStorage.setItem('ballGameCoins', lanaTotal);

    skinsDesbloqueadas.push(nombreSkin);
    localStorage.setItem('ballGameUnlockedSkins', JSON.stringify(skinsDesbloqueadas));

    ponerSkin(nombreSkin);
    sonarEfecto('powerup');
  }
}

function ponerSkin(nombreSkin) {
  skinActual = nombreSkin;
  localStorage.setItem('ballGameActiveSkin', nombreSkin);
  checarBotonesTienda();
  actualizarEstilosSkin();
}

function comprarTema(nombreTema, precio) {
  if (lanaTotal >= precio) {
    lanaTotal -= precio;
    marcadorLanas.textContent = lanaTotal;
    tiendaLanas.textContent = lanaTotal;
    menuLanas.textContent = lanaTotal;
    localStorage.setItem('ballGameCoins', lanaTotal);

    temasDesbloqueados.push(nombreTema);
    localStorage.setItem('ballGameUnlockedThemes', JSON.stringify(temasDesbloqueados));

    ponerTema(nombreTema);
    sonarEfecto('powerup');
  }
}

function ponerTema(nombreTema) {
  temaActual = nombreTema;
  localStorage.setItem('ballGameActiveTheme', nombreTema);
  document.body.className = `theme-${nombreTema}`;
  checarBotonesTienda();
}

function actualizarEstilosSkin() {
  if (skinActual === 'fire') {
    bola.style.background = 'linear-gradient(135deg, #f97316, #ef4444)';
    bola.style.boxShadow = '0 0 20px #f97316';
  } else if (skinActual === 'galaxy') {
    bola.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
    bola.style.boxShadow = '0 0 20px #8b5cf6';
  } else {
    bola.style.background = '';
    const indiceColor = Math.floor(Math.max(0, puntos) / 5) % paletaColores.length;
    colorActual = paletaColores[indiceColor];
    bola.style.backgroundColor = colorActual;
    bola.style.boxShadow = `0 0 15px ${colorActual}`;
  }
}


// ==========================================
// MECÁNICAS DE JUEGO Y RACHAS
// ==========================================

function mostrarAvisoRacha(texto) {
  clearTimeout(tiempoRacha);
  popupRacha.textContent = texto;
  popupRacha.classList.remove('hidden');
  popupRacha.classList.add('show');

  tiempoRacha = setTimeout(() => {
    popupRacha.classList.remove('show');
  }, 600);
}

function actualizarRachaUI() {
  if (multi > 1) {
    textoMulti.textContent = `x${multi}`;
    displayRacha.classList.remove('streak-hidden');
    displayRacha.classList.add('streak-active');
  } else {
    textoMulti.textContent = `x1`;
    displayRacha.classList.remove('streak-active');
    displayRacha.classList.add('streak-hidden');
  }
}

function sacarParticulas(x, y) {
  const cantidad = 8;
  for (let i = 0; i < cantidad; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.backgroundColor = colorActual;

    const angulo = Math.random() * Math.PI * 2;
    const distancia = 30 + Math.random() * 40;
    const dx = Math.cos(angulo) * distancia;
    const dy = Math.sin(angulo) * distancia;

    p.style.setProperty('--dx', `${dx}px`);
    p.style.setProperty('--dy', `${dy}px`);

    contenedor.appendChild(p);
    setTimeout(() => p.remove(), 400);
  }
}

function atraparPelota() {
  sonarEfecto('catch');

  const rectBola = bola.getBoundingClientRect();
  const rectCont = contenedor.getBoundingClientRect();
  const pX = (rectBola.left - rectCont.left) + (rectBola.width / 2);
  const pY = (rectBola.top - rectCont.top) + (rectBola.height / 2);
  sacarParticulas(pX, pY);

  rachaActual++;
  let viejoMulti = multi;
  multi = Math.min(4, 1 + Math.floor(rachaActual / 3));

  if (multi > viejoMulti) {
    mostrarAvisoRacha(`¡RACHA x${multi}! 🔥`);
  }

  actualizarRachaUI();

  puntos += 1 * multi;
  marcadorPuntos.textContent = puntos;

  if (dificultadActual === 'easy' && puntos >= 40) {
    dificultadActual = 'medium';
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-medium').classList.add('active');
  }

  ajustarDificultad();
  moverPelota();
}

function atraparPoder(pow) {
  sonarEfecto('powerup');
  const suerte = Math.random() * 100;

  if (suerte < 40) {
    puntos += 3 * multi;
    marcadorPuntos.textContent = puntos;
  } else if (suerte < 43) {
    puntos += 10 * multi;
    marcadorPuntos.textContent = puntos;
  } else if (suerte < 63) {
    let libres = paletaColores.filter(c => c !== colorActual);
    colorActual = libres[Math.floor(Math.random() * libres.length)];
    if (skinActual === 'classic') {
      bola.style.backgroundColor = colorActual;
      bola.style.boxShadow = `0 0 15px ${colorActual}`;
    }
    puntos += 3 * multi;
    marcadorPuntos.textContent = puntos;
  } else if (suerte < 73) {
    extraTamaño = 18;
    if (!bola.querySelector('.main-ball-dot')) {
      const puntoExtra = document.createElement('div');
      puntoExtra.className = 'main-ball-dot';
      bola.appendChild(puntoExtra);
    }
    ajustarDificultad();
    puntos += 3 * multi;
    marcadorPuntos.textContent = puntos;
  } else {
    puntos += 3 * multi;
    marcadorPuntos.textContent = puntos;
  }

  pow.remove();
  poderesActivos = poderesActivos.filter(p => p !== pow);
}

function pegarTrampa(trap) {
  sonarEfecto('bomb');
  rachaActual = 0;
  multi = 1;
  actualizarRachaUI();

  puntos = Math.max(0, puntos - 3);
  marcadorPuntos.textContent = puntos;
  trap.remove();
  trampasActivas = trampasActivas.filter(t => t !== trap);
  ajustarDificultad();
}


// ==========================================
// MOVIMIENTO Y APARICIÓN DE OBJETOS
// ==========================================

function spawnPowerUp(maxX, maxY, usados) {
  const pow = document.createElement('div');
  pow.className = 'powerup-ball';
  
  pow.style.width = `${Math.max(18, bola.clientWidth - 4)}px`;
  pow.style.height = `${Math.max(18, bola.clientHeight - 4)}px`;
  pow.style.position = 'absolute';
  pow.style.borderRadius = '50%';
  pow.style.zIndex = '6';

  let pX, pY, choca, intentos = 0;
  do {
    choca = false;
    pX = Math.floor(Math.random() * maxX);
    pY = Math.floor(Math.random() * (maxY - 40)) + 60;

    for (let pos of usados) {
      if (Math.abs(pX - pos.x) < 70 && Math.abs(pY - pos.y) < 70) {
        choca = true;
        break;
      }
    }
    intentos++;
  } while (choca && intentos < 50);

  usados.push({ x: pX, y: pY });
  pow.style.left = `${pX}px`;
  pow.style.top = `${pY}px`;

  pow.addEventListener('pointerdown', (e) => {
    if (!juegoActivo || estaPausado) return;
    e.preventDefault();
    atraparPoder(pow);
  });

  contenedor.appendChild(pow);
  poderesActivos.push(pow);
}

function moverPelota() {
  if (!juegoActivo || estaPausado) return;
  clearTimeout(muevePelotaTimeout);
  limpiarTodoEnPantalla();

  const maxX = contenedor.clientWidth - bola.clientWidth;
  const maxY = contenedor.clientHeight - bola.clientHeight - 80;

  const azarX = Math.floor(Math.random() * maxX);
  const azarY = Math.floor(Math.random() * (maxY - 40)) + 60;

  bola.style.left = `${azarX}px`;
  bola.style.top = `${azarY}px`;

  let trampasTotales = 0;
  if (dificultadActual === 'medium' && puntos >= 5) {
    trampasTotales = 1 + Math.floor((puntos - 5) / 3);
  } else if (dificultadActual === 'hard' && puntos >= 5) {
    trampasTotales = 2 + (Math.floor((puntos - 5) / 2) * 2);
  }

  let posicionesOcupadas = [{ x: azarX, y: azarY }];

  for (let i = 0; i < trampasTotales; i++) {
    const trap = document.createElement('div');
    trap.className = 'trap-ball';
    
    trap.style.width = bola.style.width;
    trap.style.height = bola.style.height;
    trap.style.backgroundColor = colorActual;
    trap.style.boxShadow = `0 0 15px ${colorActual}`;
    trap.style.position = 'absolute';
    trap.style.borderRadius = '50%';
    trap.style.zIndex = '5';

    let tX, tY, choca, intentos = 0;
    do {
      choca = false;
      tX = Math.floor(Math.random() * maxX);
      tY = Math.floor(Math.random() * (maxY - 40)) + 60;

      for (let pos of posicionesOcupadas) {
        if (Math.abs(tX - pos.x) < 70 && Math.abs(tY - pos.y) < 70) {
          choca = true;
          break;
        }
      }
      intentos++;
    } while (choca && intentos < 50);

    posicionesOcupadas.push({ x: tX, y: tY });
    trap.style.left = `${tX}px`;
    trap.style.top = `${tY}px`;

    trap.addEventListener('pointerdown', (e) => {
      if (!juegoActivo || estaPausado) return;
      e.preventDefault();
      pegarTrampa(trap);
    });

    contenedor.appendChild(trap);
    trampasActivas.push(trap);
  }

  if (dificultadActual !== 'easy') {
    if (Math.random() < 0.10) {
      spawnPowerUp(maxX, maxY, posicionesOcupadas);
    }
    if (dificultadActual === 'hard') {
      if (Math.random() < 0.10) {
        spawnPowerUp(maxX, maxY, posicionesOcupadas);
      }
    }
  }

  muevePelotaTimeout = setTimeout(() => {
    if (rachaActual > 0) {
      rachaActual = 0;
      multi = 1;
      actualizarRachaUI();
    }
    moverPelota();
  }, velocidadActual);
}

function ajustarDificultad() {
  const baseTam = Math.max(TAMAÑO_MIN, TAMAÑO_INICIAL - puntos);
  const tamFinal = baseTam + extraTamaño;
  bola.style.width = `${tamFinal}px`;
  bola.style.height = `${tamFinal}px`;

  if (dificultadActual === 'easy') {
    velocidadActual = 1600;
  } else if (dificultadActual === 'medium') {
    velocidadActual = Math.max(500, 1200 - (puntos * 20));
  } else if (dificultadActual === 'hard') {
    velocidadActual = Math.max(250, 800 - (puntos * 30));
  }

  if (extraTamaño === 0) {
    const indiceColor = Math.floor(Math.max(0, puntos) / 5) % paletaColores.length;
    colorActual = paletaColores[indiceColor];
    
    const puntoExtra = bola.querySelector('.main-ball-dot');
    if (puntoExtra) puntoExtra.remove();
  }
  
  actualizarEstilosSkin();
}

function limpiarTodoEnPantalla() {
  trampasActivas.forEach(trap => trap.remove());
  trampasActivas = [];
  poderesActivos.forEach(pow => pow.remove());
  poderesActivos = [];
}


// ==========================================
// AUDIO, CRONÓMETRO Y ESTADOS
// ==========================================

const contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
let gananciaMaster = contextoAudio.createGain();
gananciaMaster.gain.value = 0.3;
gananciaMaster.connect(contextoAudio.destination);

function cambiarVolumen(vol) {
  gananciaMaster.gain.value = parseFloat(vol);
}

function cambiarSensibilidad(val) {
  sensi = Math.min(2.0, parseFloat(val));
  textoSensi.textContent = `${sensi.toFixed(1)}x`;
}

function cambiarDificultad(nivel) {
  dificultadActual = nivel;
  document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${nivel}`).classList.add('active');
  reiniciarJuego();
}

function sonarEfecto(tipo) {
  if (contextoAudio.state === 'suspended') contextoAudio.resume();
  
  const oscilador = contextoAudio.createOscillator();
  const ganancia = contextoAudio.createGain();
  oscilador.connect(ganancia);
  ganancia.connect(gananciaMaster);

  if (tipo === 'catch') {
    oscilador.type = 'sine';
    oscilador.frequency.setValueAtTime(440, contextoAudio.currentTime);
    oscilador.frequency.exponentialRampToValueAtTime(880, contextoAudio.currentTime + 0.1);
    ganancia.gain.setValueAtTime(0.5, contextoAudio.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.1);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.1);
  } else if (tipo === 'powerup') {
    oscilador.type = 'triangle';
    oscilador.frequency.setValueAtTime(587.33, contextoAudio.currentTime);
    oscilador.frequency.exponentialRampToValueAtTime(1174.66, contextoAudio.currentTime + 0.15);
    ganancia.gain.setValueAtTime(0.6, contextoAudio.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.15);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.15);
  } else if (tipo === 'bomb') {
    oscilador.type = 'sawtooth';
    oscilador.frequency.setValueAtTime(150, contextoAudio.currentTime);
    oscilador.frequency.linearRampToValueAtTime(40, contextoAudio.currentTime + 0.2);
    ganancia.gain.setValueAtTime(0.6, contextoAudio.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.2);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.2);
  } else if (tipo === 'gameover') {
    oscilador.type = 'triangle';
    oscilador.frequency.setValueAtTime(300, contextoAudio.currentTime);
    oscilador.frequency.linearRampToValueAtTime(100, contextoAudio.currentTime + 0.4);
    ganancia.gain.setValueAtTime(0.4, contextoAudio.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, contextoAudio.currentTime + 0.4);
    oscilador.start();
    oscilador.stop(contextoAudio.currentTime + 0.4);
  }
}

function pausarJuego() {
  if (!juegoActivo) return;
  estaPausado = !estaPausado;

  if (estaPausado) {
    if (!esCel) document.exitPointerLock();
    clearInterval(relojIntervalo);
    clearTimeout(muevePelotaTimeout);
    menuPausa.classList.remove('hidden');
    cursorPro.style.display = 'none';
  } else {
    menuPausa.classList.add('hidden');
    menuTienda.classList.add('hidden');
    if (!esCel) cursorPro.style.display = 'block';
    iniciarReloj();
    moverPelota();
  }
}

function iniciarReloj() {
  if (estaPausado) return;
  clearInterval(relojIntervalo);
  relojIntervalo = setInterval(() => {
    if (estaPausado) return;
    tiempoRestante--;
    marcadorTiempo.textContent = tiempoRestante;

    if (tiempoRestante <= 0) {
      terminarJuego();
    }
  }, 1000);
}

function terminarJuego() {
  juegoActivo = false;
  if (!esCel) document.exitPointerLock();
  clearInterval(relojIntervalo);
  clearTimeout(muevePelotaTimeout);
  limpiarTodoEnPantalla();
  
  sonarEfecto('gameover');

  lanaTotal += puntos;
  localStorage.setItem('ballGameCoins', lanaTotal);
  marcadorLanas.textContent = lanaTotal;
  menuLanas.textContent = lanaTotal;

  if (puntos > recordMax) {
    recordMax = puntos;
    localStorage.setItem('ballGameHighScore', recordMax);
    marcadorRecord.textContent = recordMax;
  }

  bola.style.display = 'none';
  cursorPro.style.display = 'none';
  puntosFinales.textContent = puntos;
  lanasGanadas.textContent = puntos;
  recordFinal.textContent = recordMax;
  pantallaGameOver.classList.remove('hidden');
}

function reiniciarJuego() {
  clearInterval(relojIntervalo);
  clearTimeout(muevePelotaTimeout);

  puntos = 0;
  rachaActual = 0;
  multi = 1;
  actualizarRachaUI();

  tiempoRestante = tiempoBase;
  extraTamaño = 0;
  juegoActivo = true;
  estaPausado = false;
  
  ajustarDificultad();

  marcadorPuntos.textContent = puntos;
  marcadorLanas.textContent = lanaTotal;
  menuLanas.textContent = lanaTotal;
  marcadorTiempo.textContent = tiempoRestante;
  marcadorRecord.textContent = recordMax;
  
  bola.style.width = `${TAMAÑO_INICIAL}px`;
  bola.style.height = `${TAMAÑO_INICIAL}px`;
  bola.style.display = 'block';
  if (!esCel) cursorPro.style.display = 'block';

  menuPrincipal.classList.add('hidden');
  menuInfo.classList.add('hidden');
  menuPausa.classList.add('hidden');
  menuTienda.classList.add('hidden');
  pantallaGameOver.classList.add('hidden');
  
  moverPelota();
  iniciarReloj();
}

// Cargar tema inicial
document.body.className = `theme-${temaActual}`;
bola.style.display = 'none';
