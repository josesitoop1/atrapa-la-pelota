// ==========================================
// JUEGO WEB: "ATRAPA LA PELOTA"
// Lógica de juego con tienda dividida en Pelotas, Fondos, Fondos de Imagen y Casino.
// ==========================================

let puntos = 0;
let recordMax = localStorage.getItem('ballGameHighScore') || 0;
let monedasTotales = parseInt(localStorage.getItem('ballGameCoins')) || 0;
let fichasCasino = parseInt(localStorage.getItem('ballGameCasinoChips')) || 0; // Inicia con 0 Fichas

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
const marcadorMonedas = document.getElementById('coins');
const tiendaMonedas = document.getElementById('shop-coins');
const menuMonedas = document.getElementById('menu-coins');
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
const monedasGanadas = document.getElementById('earned-coins');
const recordFinal = document.getElementById('final-high-score');
const textoSensi = document.getElementById('sens-value');

// Casino DOM
const casinoMenu = document.getElementById('casino-menu');
const casinoTrigger = document.getElementById('casino-trigger');
const casinoMonedasVal = document.getElementById('casino-monedas-val');
const casinoFichasVal = document.getElementById('casino-fichas-val');
const exchangeModal = document.getElementById('exchange-modal');

const paletaColores = ['#ff0055', '#ff9900', '#00e676', '#00b0ff', '#d500f9'];
if (marcadorRecord) marcadorRecord.textContent = recordMax;
if (marcadorMonedas) marcadorMonedas.textContent = monedasTotales;
if (menuMonedas) menuMonedas.textContent = monedasTotales;

let trampasActivas = [];
let poderesActivos = [];

// Mostrar flecha de casino al cargar con animación inicial
setTimeout(() => {
  if (casinoTrigger) casinoTrigger.classList.add('show-trigger');
}, 500);


// ==========================================
// MODO PRUEBAS Y CASINO
// ==========================================
function darMonedasPro() {
  monedasTotales += 100;
  localStorage.setItem('ballGameCoins', monedasTotales);
  actualizarMonedasUI();
  sonarEfecto('powerup');
}

function borrarTodoElProgreso() {
  if (confirm("¿Estás seguro de borrar todo el progreso, monedas y compras?")) {
    localStorage.clear();

    recordMax = 0;
    monedasTotales = 0;
    fichasCasino = 0; // Reinicio a 0 fichas
    skinActual = 'classic';
    skinsDesbloqueadas = ['classic'];
    temaActual = 'cyberpunk';
    temasDesbloqueados = ['cyberpunk'];

    if (marcadorRecord) marcadorRecord.textContent = '0';
    actualizarMonedasUI();
    document.body.className = 'theme-cyberpunk';

    reiniciarJuego();
  }
}

// Funciones del Casino
function toggleCasinoMenu() {
  if (casinoMenu && casinoTrigger) {
    casinoMenu.classList.toggle('casino-open');
    casinoTrigger.classList.toggle('open-state');
    actualizarMonedasUI();
  }
}

function cambiarSeccionCasino(seccion) {
  const secMinijuegos = document.getElementById('casino-minijuegos-section');
  const secTienda = document.getElementById('casino-tienda-section');
  const tabs = document.querySelectorAll('.casino-tab');

  tabs.forEach(t => t.classList.remove('active'));

  if (seccion === 'minijuegos') {
    secMinijuegos.classList.remove('hidden');
    secTienda.classList.add('hidden');
    tabs[0].classList.add('active');
  } else {
    secMinijuegos.classList.add('hidden');
    secTienda.classList.remove('hidden');
    tabs[1].classList.add('active');
    checarBotonesTienda();
  }
}

function abrirModalCambio() {
  if (exchangeModal) {
    exchangeModal.classList.toggle('hidden');
  }
}

function calcularCostoCambio(val) {
  const fichas = parseInt(val) || 0;
  const textoCosto = document.getElementById('exchange-cost-text');
  if (textoCosto) {
    textoCosto.textContent = `Costo: ${fichas * 10} Monedas 🪙`;
  }
}

function realizarCambioMonedas() {
  const cantidadInput = parseInt(document.getElementById('exchange-input').value) || 0;
  const costoMonedas = cantidadInput * 10; // Tasa de cambio: 10 Monedas = 1 Ficha

  if (monedasTotales < costoMonedas) {
    alert("¡No tienes suficientes monedas! 10 Monedas valen 1 Ficha.");
    return;
  }

  monedasTotales -= costoMonedas;
  fichasCasino += cantidadInput;

  localStorage.setItem('ballGameCasinoChips', fichasCasino);
  actualizarMonedasUI();
  abrirModalCambio();
  sonarEfecto('powerup');
}

function jugarSlots() {
  const costoFichas = 20; // Límite mínimo de 20 fichas
  if (fichasCasino < costoFichas) {
    alert("¡Necesitas mínimo 20 fichas para jugar al Tragamonedas!");
    return;
  }

  fichasCasino -= costoFichas;
  actualizarMonedasUI();

  // Dificultad ajustada: Símbolos más variados para hacer más difícil ganar
  const simbolos = ['🍒', '🍋', '🔔', '💎', '7️⃣', '🍇', '🍉'];
  const s1 = simbolos[Math.floor(Math.random() * simbolos.length)];
  const s2 = simbolos[Math.floor(Math.random() * simbolos.length)];
  const s3 = simbolos[Math.floor(Math.random() * simbolos.length)];

  document.getElementById('slot-1').textContent = s1;
  document.getElementById('slot-2').textContent = s2;
  document.getElementById('slot-3').textContent = s3;

  const msg = document.getElementById('slot-msg');

  if (s1 === s2 && s2 === s3) {
    let premio = s1 === '7️⃣' ? 300 : 150;
    fichasCasino += premio;
    msg.textContent = `¡JACKPOT EXTRAORDINARIO! +${premio} 🎲`;
    sonarEfecto('powerup');
  } else if (s1 === s2 || s2 === s3 || s1 === s3) {
    let premio = 30;
    fichasCasino += premio;
    msg.textContent = `¡Par de aciertos! +${premio} 🎲`;
    sonarEfecto('catch');
  } else {
    msg.textContent = "Sin suerte esta vez. Perdiste 20 fichas.";
    sonarEfecto('bomb');
  }
  actualizarMonedasUI();
}

function jugarRuleta(eleccion) {
  const costoFichas = 20; // Límite mínimo de 20 fichas
  if (fichasCasino < costoFichas) {
    alert("¡Necesitas mínimo 20 fichas para jugar a la Ruleta!");
    return;
  }

  fichasCasino -= costoFichas;
  actualizarMonedasUI();

  // Probabilidades de Ruleta más complejas y retadoras
  const opciones = ['rojo', 'negro', 'rojo', 'negro', 'rojo', 'negro', 'negro', 'verde', 'blanco'];
  const resultado = opciones[Math.floor(Math.random() * opciones.length)];
  const disp = document.getElementById('ruleta-display');
  const msg = document.getElementById('ruleta-msg');

  disp.textContent = resultado === 'rojo' ? '🔴' : resultado === 'verde' ? '🟢' : resultado === 'negro' ? '⚫' : '⚪';

  if (eleccion === resultado) {
    let premio = 0;
    if (resultado === 'rojo') premio = 30;
    else if (resultado === 'verde') premio = 50;
    else if (resultado === 'negro') premio = 80;

    fichasCasino += premio;
    msg.textContent = `¡Cayó ${resultado.toUpperCase()}! Ganaste +${premio} 🎲`;
    sonarEfecto('powerup');
  } else {
    msg.textContent = `Cayó ${resultado.toUpperCase()}. Perdiste tu apuesta.`;
    sonarEfecto('bomb');
  }
  actualizarMonedasUI();
}

function comprarItemCasino(item, precio) {
  if (fichasCasino < precio) {
    alert("¡Necesitas más fichas! Consigue más en la Ruleta o cámbialas en el banco.");
    return;
  }

  fichasCasino -= precio;
  localStorage.setItem('ballGameCasinoChips', fichasCasino);

  const skinsVip = ['plasma', 'dragon', 'blackhole', 'valyrian', 'diamond'];
  const temasVip = ['ocean', 'storm', 'animatedgalaxy', 'cybercity', 'magma'];

  if (skinsVip.includes(item)) {
    skinsDesbloqueadas.push(item);
    localStorage.setItem('ballGameUnlockedSkins', JSON.stringify(skinsDesbloqueadas));
    ponerSkin(item);
  } else if (temasVip.includes(item)) {
    temasDesbloqueados.push(item);
    localStorage.setItem('ballGameUnlockedThemes', JSON.stringify(temasDesbloqueados));
    ponerTema(item);
  }

  actualizarMonedasUI();
  checarBotonesTienda();
  sonarEfecto('powerup');
  alert("¡Compra VIP realizada! Ahora puedes equipar/desequipar este ítem en tu menú.");
}

function actualizarMonedasUI() {
  localStorage.setItem('ballGameCoins', monedasTotales);
  localStorage.setItem('ballGameCasinoChips', fichasCasino);

  if (marcadorMonedas) marcadorMonedas.textContent = monedasTotales;
  if (menuMonedas) menuMonedas.textContent = monedasTotales;
  if (tiendaMonedas) tiendaMonedas.textContent = monedasTotales;
  if (casinoMonedasVal) casinoMonedasVal.textContent = monedasTotales;
  if (casinoFichasVal) casinoFichasVal.textContent = fichasCasino;
}


// ==========================================
// CONTROLES Y TÁCTIL
// ==========================================
window.addEventListener('pointerdown', (e) => {
  inicializarAudio();
  if (e.pointerType === 'touch') {
    esCel = true;
    if (cursorPro) cursorPro.style.display = 'none';
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

if (contenedor) {
  contenedor.addEventListener('click', (e) => {
    inicializarAudio();
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') {
      return;
    }
    if (juegoActivo && !estaPausado && !esCel) {
      if (document.pointerLockElement !== contenedor) {
        try {
          contenedor.requestPointerLock();
        } catch (err) {
          console.log("No se pudo bloquear el puntero:", err);
        }
      }
    }
  });
}

document.addEventListener('mousemove', (e) => {
  if (!contenedor) return;

  if (!esCel) {
    const centroX = window.innerWidth / 2;
    const centroY = window.innerHeight / 2;
    const mouseX = e.clientX - centroX;
    const mouseY = e.clientY - centroY;
    
    const rotX = (-mouseY / centroY) * 12;
    const rotY = (mouseX / centroX) * 12;
    
    contenedor.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
  }

  if (estaPausado || !juegoActivo || esCel || !cursorPro) return;

  cursorPro.style.display = 'block';

  if (document.pointerLockElement === contenedor) {
    posXVirtual += e.movementX * sensi;
    posYVirtual += e.movementY * sensi;
  } else {
    const rectCont = contenedor.getBoundingClientRect();
    posXVirtual = e.clientX - rectCont.left;
    posYVirtual = e.clientY - rectCont.top;
  }

  posXVirtual = Math.max(0, Math.min(contenedor.clientWidth, posXVirtual));
  posYVirtual = Math.max(0, Math.min(contenedor.clientHeight, posYVirtual));

  cursorPro.style.left = `${posXVirtual}px`;
  cursorPro.style.top = `${posYVirtual}px`;
});

document.addEventListener('mouseleave', () => {
  if (contenedor && !esCel) {
    contenedor.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
  }
});

document.addEventListener('mousedown', (e) => {
  if (!juegoActivo || estaPausado || esCel || !bola || !contenedor) return;
  if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT') return;

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

if (bola) {
  bola.addEventListener('touchend', (e) => {
    if (!juegoActivo || estaPausado) return;
    e.preventDefault();
    atraparPelota();
  });

  bola.addEventListener('pointerdown', (e) => {
    if (!juegoActivo || estaPausado || e.pointerType === 'touch') return;
    e.preventDefault();
    atraparPelota();
  });
}


// ==========================================
// MENÚ PRINCIPAL, INFORMACIÓN Y TIENDA
// ==========================================

function empezarJuego() {
  inicializarAudio();
  if (menuPrincipal) menuPrincipal.classList.add('hidden');
  reiniciarJuego();
}

function abrirTienda() {
  if (menuTienda) menuTienda.classList.toggle('hidden');
  if (tiendaMonedas) tiendaMonedas.textContent = monedasTotales;
  if (menuMonedas) menuMonedas.textContent = monedasTotales;
  checarBotonesTienda();
}

function verInfo() {
  if (menuInfo) menuInfo.classList.toggle('hidden');
}

function irAlMenuPrincipal() {
  clearInterval(relojIntervalo);
  clearTimeout(muevePelotaTimeout);
  juegoActivo = false;
  estaPausado = false;
  if (!esCel && document.exitPointerLock) {
    try { document.exitPointerLock(); } catch(e){}
  }

  if (menuPausa) menuPausa.classList.add('hidden');
  if (menuTienda) menuTienda.classList.add('hidden');
  if (menuInfo) menuInfo.classList.add('hidden');
  if (pantallaGameOver) pantallaGameOver.classList.add('hidden');
  if (bola) bola.style.display = 'none';
  if (cursorPro) cursorPro.style.display = 'none';

  if (menuMonedas) menuMonedas.textContent = monedasTotales;
  if (menuPrincipal) menuPrincipal.classList.remove('hidden');
}

function cambiarPestanaTienda(pestaña) {
  const btnSkin = document.getElementById('tab-skins-btn');
  const btnTheme = document.getElementById('tab-themes-btn');
  const btnImg = document.getElementById('tab-images-btn');

  if (btnSkin) btnSkin.classList.toggle('active', pestaña === 'skins');
  if (btnTheme) btnTheme.classList.toggle('active', pestaña === 'themes');
  if (btnImg) btnImg.classList.toggle('active', pestaña === 'images');

  const secSkins = document.getElementById('shop-skins-section');
  const secThemes = document.getElementById('shop-themes-section');
  const secImages = document.getElementById('shop-images-section');

  if (secSkins) secSkins.classList.toggle('hidden', pestaña !== 'skins');
  if (secThemes) secThemes.classList.toggle('hidden', pestaña !== 'themes');
  if (secImages) secImages.classList.toggle('hidden', pestaña !== 'images');
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
      btnFuego.disabled = monedasTotales < 50;
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
      btnGalaxia.disabled = monedasTotales < 150;
      btnGalaxia.onclick = () => comprarSkin('galaxy', 150);
    }
  }

  // Sincronización de Skins VIP de Casino
  const skinsVipArray = [
    { idBtn: 'buy-vip-plasma', idCasino: 'casino-buy-plasma', key: 'plasma' },
    { idBtn: 'buy-vip-dragon', idCasino: 'casino-buy-dragon', key: 'dragon' },
    { idBtn: 'buy-vip-blackhole', idCasino: 'casino-buy-blackhole', key: 'blackhole' },
    { idBtn: 'buy-vip-valyrian', idCasino: 'casino-buy-valyrian', key: 'valyrian' },
    { idBtn: 'buy-vip-diamond', idCasino: 'casino-buy-diamond', key: 'diamond' }
  ];

  skinsVipArray.forEach(item => {
    const btn = document.getElementById(item.idBtn);
    const btnCas = document.getElementById(item.idCasino);
    if (btn) {
      if (skinActual === item.key) {
        btn.textContent = 'Equipada';
        btn.disabled = true;
        if (btnCas) { btnCas.textContent = 'Equipada'; btnCas.disabled = true; }
      } else if (skinsDesbloqueadas.includes(item.key)) {
        btn.textContent = 'Equipar';
        btn.disabled = false;
        btn.onclick = () => ponerSkin(item.key);
        if (btnCas) { btnCas.textContent = 'Equipar'; btnCas.disabled = false; btnCas.onclick = () => ponerSkin(item.key); }
      } else {
        btn.textContent = 'Ir al Casino';
        btn.disabled = false;
        btn.onclick = () => toggleCasinoMenu();
        if (btnCas) { btnCas.textContent = 'Comprar'; btnCas.disabled = false; }
      }
    }
  });

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
      btnTemaSpace.disabled = monedasTotales < 100;
      btnTemaSpace.onclick = () => comprarTema('space', 100);
    }
  }

  // Sincronización de Temas Vivos VIP de Casino
  const temasVipArray = [
    { idBtn: 'buy-theme-ocean', idCasino: 'casino-buy-ocean', key: 'ocean' },
    { idBtn: 'buy-theme-storm', idCasino: 'casino-buy-storm', key: 'storm' },
    { idBtn: 'buy-theme-animatedgalaxy', idCasino: 'casino-buy-animatedgalaxy', key: 'animatedgalaxy' },
    { idBtn: 'buy-theme-cybercity', idCasino: 'casino-buy-cybercity', key: 'cybercity' },
    { idBtn: 'buy-theme-magma', idCasino: 'casino-buy-magma', key: 'magma' }
  ];

  temasVipArray.forEach(item => {
    const btn = document.getElementById(item.idBtn);
    const btnCas = document.getElementById(item.idCasino);
    if (btn) {
      if (temaActual === item.key) {
        btn.textContent = 'Desequipar';
        btn.disabled = false;
        btn.onclick = () => ponerTema('cyberpunk');
        if (btnCas) { btnCas.textContent = 'Desequipar'; btnCas.disabled = false; btnCas.onclick = () => ponerTema('cyberpunk'); }
      } else if (temasDesbloqueados.includes(item.key)) {
        btn.textContent = 'Equipar';
        btn.disabled = false;
        btn.onclick = () => ponerTema(item.key);
        if (btnCas) { btnCas.textContent = 'Equipar'; btnCas.disabled = false; btnCas.onclick = () => ponerTema(item.key); }
      } else {
        btn.textContent = 'Ir al Casino';
        btn.disabled = false;
        btn.onclick = () => toggleCasinoMenu();
        if (btnCas) { btnCas.textContent = 'Comprar'; btnCas.disabled = false; }
      }
    }
  });

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
      btnTemaCapy.disabled = monedasTotales < 300;
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
      btnTemaSpider.disabled = monedasTotales < 400;
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
      btnTemaSnoopy.disabled = monedasTotales < 500;
      btnTemaSnoopy.onclick = () => comprarTema('snoopy', 500);
    }
  }
}

function comprarSkin(nombreSkin, precio) {
  if (monedasTotales >= precio) {
    monedasTotales -= precio;
    actualizarMonedasUI();

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
  if (monedasTotales >= precio) {
    monedasTotales -= precio;
    actualizarMonedasUI();

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
  if (!bola) return;
  if (skinActual === 'fire') {
    bola.style.background = 'linear-gradient(135deg, #f97316, #ef4444)';
    bola.style.boxShadow = '0 0 20px #f97316';
  } else if (skinActual === 'galaxy') {
    bola.style.background = 'linear-gradient(135deg, #8b5cf6, #ec4899)';
    bola.style.boxShadow = '0 0 20px #8b5cf6';
  } else if (skinActual === 'plasma') {
    bola.style.background = 'radial-gradient(circle, #38bdf8 0%, #0284c7 100%)';
    bola.style.boxShadow = '0 0 25px #38bdf8';
  } else if (skinActual === 'dragon') {
    bola.style.background = 'linear-gradient(135deg, #22c55e, #15803d)';
    bola.style.boxShadow = '0 0 25px #22c55e';
  } else if (skinActual === 'blackhole') {
    bola.style.background = 'radial-gradient(circle, #000000 60%, #a855f7 100%)';
    bola.style.boxShadow = '0 0 25px #a855f7';
  } else if (skinActual === 'valyrian') {
    bola.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
    bola.style.boxShadow = '0 0 25px #ef4444';
  } else if (skinActual === 'diamond') {
    bola.style.background = 'linear-gradient(135deg, #e0e7ff, #818cf8)';
    bola.style.boxShadow = '0 0 25px #ffffff';
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
  if (popupRacha) {
    popupRacha.textContent = texto;
    popupRacha.classList.remove('hidden');
    popupRacha.classList.add('show');
  }

  tiempoRacha = setTimeout(() => {
    if (popupRacha) popupRacha.classList.remove('show');
  }, 600);
}

function actualizarRachaUI() {
  if (!displayRacha || !textoMulti) return;
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
  if (!contenedor) return;
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

  if (bola && contenedor) {
    const rectBola = bola.getBoundingClientRect();
    const rectCont = contenedor.getBoundingClientRect();
    const pX = (rectBola.left - rectCont.left) + (rectBola.width / 2);
    const pY = (rectBola.top - rectCont.top) + (rectBola.height / 2);
    sacarParticulas(pX, pY);
  }

  rachaActual++;
  let viejoMulti = multi;
  multi = Math.min(4, 1 + Math.floor(rachaActual / 3));

  if (multi > viejoMulti) {
    mostrarAvisoRacha(`¡RACHA x${multi}! 🔥`);
  }

  actualizarRachaUI();

  puntos += 1 * multi;
  if (marcadorPuntos) marcadorPuntos.textContent = puntos;

  if (dificultadActual === 'easy' && puntos >= 40) {
    dificultadActual = 'medium';
    document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
    const btnMed = document.getElementById('btn-medium');
    if (btnMed) btnMed.classList.add('active');
  }

  ajustarDificultad();
  moverPelota();
}

function atraparPoder(pow) {
  sonarEfecto('powerup');
  const suerte = Math.random() * 100;

  if (suerte < 40) {
    puntos += 3 * multi;
    if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  } else if (suerte < 43) {
    puntos += 10 * multi;
    if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  } else if (suerte < 63) {
    let libres = paletaColores.filter(c => c !== colorActual);
    colorActual = libres[Math.floor(Math.random() * libres.length)];
    if (skinActual === 'classic' && bola) {
      bola.style.backgroundColor = colorActual;
      bola.style.boxShadow = `0 0 15px ${colorActual}`;
    }
    puntos += 3 * multi;
    if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  } else if (suerte < 73) {
    extraTamaño = 18;
    if (bola && !bola.querySelector('.main-ball-dot')) {
      const puntoExtra = document.createElement('div');
      puntoExtra.className = 'main-ball-dot';
      bola.appendChild(puntoExtra);
    }
    ajustarDificultad();
    puntos += 3 * multi;
    if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  } else {
    puntos += 3 * multi;
    if (marcadorPuntos) marcadorPuntos.textContent = puntos;
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
  if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  trap.remove();
  trampasActivas = trampasActivas.filter(t => t !== trap);
  ajustarDificultad();
}


// ==========================================
// MOVIMIENTO Y APARICIÓN DE OBJETOS
// ==========================================

function spawnPowerUp(maxX, maxY, usados) {
  if (!contenedor || !bola) return;
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

  pow.addEventListener('touchend', (e) => {
    if (!juegoActivo || estaPausado) return;
    e.preventDefault();
    atraparPoder(pow);
  });

  pow.addEventListener('pointerdown', (e) => {
    if (!juegoActivo || estaPausado || e.pointerType === 'touch') return;
    e.preventDefault();
    atraparPoder(pow);
  });

  contenedor.appendChild(pow);
  poderesActivos.push(pow);
}

function moverPelota() {
  if (!juegoActivo || estaPausado || !contenedor || !bola) return;
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

    trap.addEventListener('touchend', (e) => {
      if (!juegoActivo || estaPausado) return;
      e.preventDefault();
      pegarTrampa(trap);
    });

    trap.addEventListener('pointerdown', (e) => {
      if (!juegoActivo || estaPausado || e.pointerType === 'touch') return;
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
  if (!bola) return;
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

let contextoAudio;
let gananciaMaster;

function inicializarAudio() {
  try {
    if (!contextoAudio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        contextoAudio = new AudioCtx();
        gananciaMaster = contextoAudio.createGain();
        gananciaMaster.gain.value = 0.3;
        gananciaMaster.connect(contextoAudio.destination);
      }
    }
    if (contextoAudio && contextoAudio.state === 'suspended') {
      contextoAudio.resume();
    }
  } catch (e) {
    console.log("Audio no soportado:", e);
  }
}

function cambiarVolumen(vol) {
  if (gananciaMaster) {
    gananciaMaster.gain.value = parseFloat(vol);
  }
}

function cambiarSensibilidad(val) {
  sensi = Math.min(2.0, parseFloat(val));
  if (textoSensi) textoSensi.textContent = `${sensi.toFixed(1)}x`;
}

function cambiarDificultad(nivel) {
  dificultadActual = nivel;
  document.querySelectorAll('.diff-btn').forEach(btn => btn.classList.remove('active'));
  const btnActivo = document.getElementById(`btn-${nivel}`);
  if (btnActivo) btnActivo.classList.add('active');
  reiniciarJuego();
}

function sonarEfecto(tipo) {
  inicializarAudio();
  if (!contextoAudio) return;

  try {
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
  } catch(e) {
    console.log("Audio omitido:", e);
  }
}

function pausarJuego() {
  if (!juegoActivo) return;
  estaPausado = !estaPausado;

  if (estaPausado) {
    if (!esCel && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch(e){}
    }
    clearInterval(relojIntervalo);
    clearTimeout(muevePelotaTimeout);
    if (menuPausa) menuPausa.classList.remove('hidden');
    if (cursorPro) cursorPro.style.display = 'none';
  } else {
    if (menuPausa) menuPausa.classList.add('hidden');
    if (menuTienda) menuTienda.classList.add('hidden');
    if (!esCel && cursorPro) cursorPro.style.display = 'block';
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
    if (marcadorTiempo) marcadorTiempo.textContent = tiempoRestante;

    if (tiempoRestante <= 0) {
      terminarJuego();
    }
  }, 1000);
}

function terminarJuego() {
  juegoActivo = false;
  if (!esCel && document.exitPointerLock) {
    try { document.exitPointerLock(); } catch(e){}
  }
  clearInterval(relojIntervalo);
  clearTimeout(muevePelotaTimeout);
  limpiarTodoEnPantalla();
  
  sonarEfecto('gameover');

  monedasTotales += puntos;
  localStorage.setItem('ballGameCoins', monedasTotales);
  actualizarMonedasUI();

  if (puntos > recordMax) {
    recordMax = puntos;
    localStorage.setItem('ballGameHighScore', recordMax);
    if (marcadorRecord) marcadorRecord.textContent = recordMax;
  }

  if (bola) bola.style.display = 'none';
  if (cursorPro) cursorPro.style.display = 'none';
  if (puntosFinales) puntosFinales.textContent = puntos;
  if (monedasGanadas) monedasGanadas.textContent = puntos;
  if (recordFinal) recordFinal.textContent = recordMax;
  if (pantallaGameOver) pantallaGameOver.classList.remove('hidden');
}

function reiniciarJuego() {
  inicializarAudio();
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
  
  if (contenedor) {
    posXVirtual = contenedor.clientWidth / 2;
    posYVirtual = contenedor.clientHeight / 2;
  }

  ajustarDificultad();

  if (marcadorPuntos) marcadorPuntos.textContent = puntos;
  actualizarMonedasUI();
  if (marcadorTiempo) marcadorTiempo.textContent = tiempoRestante;
  if (marcadorRecord) marcadorRecord.textContent = recordMax;
  
  if (bola) {
    bola.style.width = `${TAMAÑO_INICIAL}px`;
    bola.style.height = `${TAMAÑO_INICIAL}px`;
    bola.style.display = 'block';
  }
  if (!esCel && cursorPro) cursorPro.style.display = 'block';

  if (menuPrincipal) menuPrincipal.classList.add('hidden');
  if (menuInfo) menuInfo.classList.add('hidden');
  if (menuPausa) menuPausa.classList.add('hidden');
  if (menuTienda) menuTienda.classList.add('hidden');
  if (pantallaGameOver) menuTienda.classList.add('hidden');
  if (pantallaGameOver) pantallaGameOver.classList.add('hidden');
  
  moverPelota();
  iniciarReloj();
}

// Escuchar clics y toques globales para activar el audio en dispositivos móviles
document.addEventListener('touchstart', inicializarAudio, { once: true });
document.addEventListener('click', inicializarAudio, { once: true });

// Cargar tema inicial y sincronizar estado de tiendas
document.body.className = `theme-${temaActual}`;
if (bola) bola.style.display = 'none';
checarBotonesTienda();
