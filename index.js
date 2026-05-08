let romLibrary = new Map();
let isMuted = false;
let currentVolume = 1;

const sysMap = { 
  nes: 'fceumm', sfc: 'snes9x', md: 'genesis_plus_gx', gen: 'genesis_plus_gx', 
  gba: 'mgba', gb: 'gambatte', gbc: 'gambatte', sms: 'genesis_plus_gx', gg: 'genesis_plus_gx',
  pbp: 'pcsx_rearmed', chd: 'pcsx_rearmed', iso: 'pcsx_rearmed', cue: 'pcsx_rearmed', bin: 'pcsx_rearmed'
};

document.addEventListener('DOMContentLoaded', () => {
  if (chrome.history) chrome.history.deleteUrl({ url: window.location.href });

  const iframe = document.getElementById('game-frame');
  const ui = {
    setup: document.getElementById('setup-view'), lib: document.getElementById('library-view'),
    placeholder: document.getElementById('placeholder'), folderInput: document.getElementById('folder-input'),
    romSelect: document.getElementById('rom-select'), ctrlText: document.getElementById('controls-text'),
    nowPlaying: document.getElementById('now-playing'), quitBtn: document.getElementById('quit-btn')
  };

  document.getElementById('load-folder-btn').addEventListener('click', () => ui.folderInput.click());
  ui.folderInput.addEventListener('change', (e) => {
    romLibrary.clear(); ui.romSelect.innerHTML = '';
    const validExts = Object.keys(sysMap);
    Array.from(e.target.files).forEach(file => {
      if (validExts.includes(file.name.split('.').pop().toLowerCase())) {
        romLibrary.set(file.name, file);
        ui.romSelect.appendChild(new Option(file.name, file.name));
      }
    });
    if (romLibrary.size > 0) {
      ui.setup.style.display = 'none'; ui.lib.style.display = 'block';
      ui.nowPlaying.textContent = 'LIBRARY READY';
    }
  });

  document.getElementById('play-btn').addEventListener('click', async () => {
    const file = romLibrary.get(ui.romSelect.value);
    if (!file) return;

    ui.placeholder.style.display = 'none';
    iframe.style.display = 'block';
    iframe.focus(); 
    ui.quitBtn.style.display = 'block';
    ui.nowPlaying.textContent = file.name;
    
    // THE FIX: Inject a permanent keyboard cheat sheet into the UI bar
    ui.ctrlText.innerHTML = "<b>KEYS:</b> Arrows=Move | <b>X</b>=A | <b>Z</b>=B | <b>S</b>=X | <b>A</b>=Y | <b>Q</b>=L | <b>W</b>=R | <b>Enter</b>=Start | <b>Shift</b>=Select &nbsp;&nbsp;<i>(Hover top-left to remap)</i>";

    const fileBuffer = await file.arrayBuffer();
    iframe.contentWindow.postMessage({ action: 'load', buffer: fileBuffer, name: file.name, volume: isMuted ? 0 : currentVolume }, '*');
  });

  ui.quitBtn.addEventListener('click', () => {
    iframe.contentWindow.postMessage({ action: 'kill' }, '*');
    setTimeout(() => { iframe.src = 'https://dataman252.github.io/doom-corner-engine/sandbox.html?v=7'; }, 50);
    iframe.style.display = 'none';
    ui.placeholder.style.display = 'flex';
    ui.quitBtn.style.display = 'none';
    ui.nowPlaying.textContent = 'LIBRARY READY';
    ui.ctrlText.textContent = 'Select a game and press Start.';
  });

  const sendVol = (vol) => iframe.contentWindow.postMessage({ action: 'volume', volume: vol }, '*');
  document.getElementById('vol-slider').addEventListener('input', (e) => {
    currentVolume = parseFloat(e.target.value); isMuted = currentVolume === 0;
    document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🔊';
    sendVol(currentVolume);
  });
  document.getElementById('mute-btn').addEventListener('click', (e) => {
    isMuted = !isMuted; e.target.textContent = isMuted ? '🔇' : '🔊';
    document.getElementById('vol-slider').value = isMuted ? 0 : currentVolume;
    sendVol(isMuted ? 0 : currentVolume);
  });
  
  document.addEventListener('visibilitychange', () => sendVol(document.hidden ? 0 : (isMuted ? 0 : currentVolume)));
});
