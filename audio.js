// js/audio.js
// Control de música de fondo para el menú principal
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('menuAudio');
  const toggle = document.getElementById('audioToggle');
  const volumeSlider = document.getElementById('audioVolume');

  if (!audio || !toggle || !volumeSlider) return;

  const STORAGE_KEY_ENABLED = 'menuMusicEnabled';
  const STORAGE_KEY_VOLUME = 'menuMusicVolume';

  // recuperar preferencias
  let enabled = localStorage.getItem(STORAGE_KEY_ENABLED);
  enabled = (enabled === null) ? true : (enabled === 'true');
  let vol = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) ?? volumeSlider.value);

  audio.volume = isNaN(vol) ? 0.6 : vol;
  volumeSlider.value = audio.volume;

  function updateToggleUI() {
    toggle.textContent = audio.paused ? '🔈' : '🔊';
    toggle.setAttribute('aria-pressed', String(!audio.paused));
  }

  async function tryPlay() {
    if (!enabled) return;
    try {
      // iniciar con volumen 0 y hacer fade-in
      audio.volume = 0;
      await audio.play();
      fadeTo(parseFloat(volumeSlider.value), 400);
    } catch (err) {
      // reproducción bloqueada hasta interacción del usuario
      console.warn('Audio autoplay bloqueado, esperaremos interacción del usuario.', err);
    }
    updateToggleUI();
  }

  // fade helper (ms)
  function fadeTo(targetVol, ms = 300) {
    const start = audio.volume;
    const diff = targetVol - start;
    const steps = Math.max(6, Math.round(ms / 30));
    let i = 0;
    const id = setInterval(() => {
      i++;
      audio.volume = Math.min(1, Math.max(0, start + diff * (i / steps)));
      if (i >= steps) clearInterval(id);
    }, ms / steps);
  }

  function stopWithFade(ms = 300) {
    const start = audio.volume;
    const steps = Math.max(6, Math.round(ms / 30));
    let i = 0;
    const id = setInterval(() => {
      i++;
      audio.volume = Math.max(0, start * (1 - i / steps));
      if (i >= steps) {
        clearInterval(id);
        audio.pause();
      }
    }, ms / steps);
  }

  // UI events
  toggle.addEventListener('click', async () => {
    if (audio.paused) {
      enabled = true;
      localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
      try {
        await audio.play();
        fadeTo(parseFloat(volumeSlider.value), 300);
      } catch (err) {
        console.warn('No se pudo reproducir audio (bloqueo):', err);
      }
    } else {
      enabled = false;
      localStorage.setItem(STORAGE_KEY_ENABLED, 'false');
      stopWithFade(200);
    }
    updateToggleUI();
  });

  volumeSlider.addEventListener('input', () => {
    const v = parseFloat(volumeSlider.value);
    audio.volume = v;
    localStorage.setItem(STORAGE_KEY_VOLUME, String(v));
  });

  // Si autoplay bloqueado, arrancar en la primera interacción del usuario
  function startOnFirstGesture() {
    if (!enabled) return;
    tryPlay();
    window.removeEventListener('click', startOnFirstGesture);
    window.removeEventListener('keydown', startOnFirstGesture);
    window.removeEventListener('touchstart', startOnFirstGesture);
  }
  window.addEventListener('click', startOnFirstGesture, { once: true });
  window.addEventListener('keydown', startOnFirstGesture, { once: true });
  window.addEventListener('touchstart', startOnFirstGesture, { once: true });

  // Intento inicial (puede ser bloqueado por política del navegador)
  tryPlay();

  // mantener icono actualizado
  audio.addEventListener('play', updateToggleUI);
  audio.addEventListener('pause', updateToggleUI);
});