// ==========================================
// AUDIO, CRONÓMETRO Y ESTADOS
// ==========================================

let contextoAudio = null;
let gananciaMaster = null;

// Función para inicializar y desbloquear el audio con la interacción del usuario
function inicializarAudio() {
  if (!contextoAudio) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      contextoAudio = new AudioContextClass();
      gananciaMaster = contextoAudio.createGain();
      gananciaMaster.gain.value = 0.3;
      gananciaMaster.connect(contextoAudio.destination);
    }
  }

  if (contextoAudio && contextoAudio.state === 'suspended') {
    contextoAudio.resume();
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
  // Asegurar que el audio esté activo
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
  } catch (e) {
    console.log("Error al reproducir audio:", e);
  }
}
