let romLibrary = new Map();
let isMuted = false;
let currentVolume = 1;
let currentBinds = {}; 

const sysMap = { 
  nes: 'fceumm', sfc: 'snes9x', md: 'genesis_plus_gx', gen: 'genesis_plus_gx', 
  gba: 'mgba', gb: 'gambatte', gbc: 'gambatte', sms: 'genesis_plus_gx', gg: 'genesis_plus_gx',
  pbp: 'pcsx_rearmed', chd: 'pcsx_rearmed', iso: 'pcsx_rearmed', cue: 'pcsx_rearmed', bin: 'pcsx_rearmed'
};

const coreControls = {
  'fceumm': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'A', code: 'KeyX' }, { label: 'B', code: 'KeyZ' }, { label: 'START', code: 'Enter' }, { label: 'SELECT', code: 'ShiftRight' } ],
  'genesis_plus_gx': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'A', code: 'KeyA' }, { label: 'B', code: 'KeyZ' }, { label: 'C', code: 'KeyX' }, { label: 'X', code: 'KeyQ' }, { label: 'Y', code: 'KeyS' }, { label: 'Z', code: 'KeyW' }, { label: 'START', code: 'Enter' }, { label: 'MODE', code: 'ShiftRight' } ],
  'snes9x': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'A', code: 'KeyX' }, { label: 'B', code: 'KeyZ' }, { label: 'X', code: 'KeyS' }, { label: 'Y', code: 'KeyA' }, { label: 'L', code: 'KeyQ' }, { label: 'R', code: 'KeyW' }, { label: 'START', code: 'Enter' }, { label: 'SELECT', code: 'ShiftRight' } ],
  'mgba': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'A', code: 'KeyX' }, { label: 'B', code: 'KeyZ' }, { label: 'L', code: 'KeyQ' }, { label: 'R', code: 'KeyW' }, { label: 'START', code: 'Enter' }, { label: 'SELECT', code: 'ShiftRight' } ],
  'gambatte': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'A', code: 'KeyX' }, { label: 'B', code: 'KeyZ' }, { label: 'START', code: 'Enter' }, { label: 'SELECT', code: 'ShiftRight' } ],
  'pcsx_rearmed': [ { label: 'UP', code: 'ArrowUp' }, { label: 'DOWN', code: 'ArrowDown' }, { label: 'LEFT', code: 'ArrowLeft' }, { label: 'RIGHT', code: 'ArrowRight' }, { label: 'O', code: 'KeyX' }, { label: 'X', code: 'KeyZ' }, { label: 'Δ', code: 'KeyS' }, { label: '□', code: 'KeyA' }, { label: 'L1', code: 'KeyQ' }, { label: 'R1', code: 'KeyW' }, { label: 'L2', code: 'KeyE' }, { label: 'R2', code: 'KeyR' }, { label: 'START', code: 'Enter' }, { label: 'SELECT', code: 'ShiftRight' } ]
};

const baseHotkeys = [
  { label: '⚙️ Menu', code: 'F1' },
  { label: '⏩ Fast-Forward', code: 'Space' },
  { label: '⏸️ Pause', code: 'KeyP' },
  { label: '💾 Save State', code: 'F2' },
  { label: '📂 Load State', code: 'F4' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (chrome.history) chrome.history.deleteUrl({ url: window.location.href });

  const iframe = document.getElementById('game-frame');
  const ui = {
    setup: document.getElementById('setup-view'), lib: document.getElementById('library-view'),
    placeholder: document.getElementById('placeholder'), folderInput: document.getElementById('folder-input'),
    romSelect: document.getElementById('rom-select'), remapModal: document.getElementById('remap-modal'),
    remapList: document.getElementById('remap-list'), ctrlText: document.getElementById('controls-text'),
    nowPlaying: document.getElementById('now-playing'), quitBtn: document.getElementById('quit-btn')
  };

  function cleanKeyName(code) { 
    return code.replace('Key', '').replace('Arrow', '')
               .replace('ShiftRight', 'R-Shift').replace('ShiftLeft', 'L-Shift')
               .replace('ControlLeft', 'L-Ctrl').replace('ControlRight', 'R-Ctrl'); 
  }

  function generateStrictBinds(gameName, bindsDb) {
    const ext = gameName.split('.').pop().toLowerCase();
    const systemCore = sysMap[ext] || 'fceumm';
    const keysToMap = (coreControls[systemCore] || coreControls['snes9x']).concat(baseHotkeys);
    
    let strictBinds = {};
    let displayParts = [];

    keysToMap.forEach(k => {
      let boundKey = Object.keys(bindsDb).find(userKey => bindsDb[userKey] === k.code);
      if (!boundKey) {
        const defaultStolen = Object.keys(bindsDb).some(userKey => userKey === k.code);
        if (!defaultStolen) boundKey = k.code; 
      }
      if (boundKey) {
        strictBinds[boundKey] = k.code;
        if (!k.label.includes('⚙️') && !k.label.includes('⏩') && !k.label.includes('⏸️') && !k.label.includes('💾') && !k.label.includes('📂')) {
           displayParts.push(`${k.label.split(' ')[0]}: ${cleanKeyName(boundKey)}`); 
        }
      }
    });
    return { strictBinds, displayParts };
  }

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

    const storageData = await chrome.storage.sync.get('binds_' + file.name);
    const gameBinds = storageData['binds_' + file.name] || {};

    const { strictBinds, displayParts } = generateStrictBinds(file.name, gameBinds);

    ui.placeholder.style.display = 'none';
    iframe.style.display = 'block';
    iframe.focus(); 
    ui.quitBtn.style.display = 'block';
    ui.nowPlaying.textContent = file.name;
    ui.ctrlText.textContent = displayParts.join(' | ');

    // FIX: Convert file to raw buffer to cross the internet to GitHub
    const fileBuffer = await file.arrayBuffer();

    // FIX: Send buffer instead of file
    iframe.contentWindow.postMessage({ action: 'load', buffer: fileBuffer, name: file.name, bindings: strictBinds, volume: isMuted ? 0 : currentVolume }, '*');
  });

  ui.quitBtn.addEventListener('click', () => {
    iframe.contentWindow.postMessage({ action: 'kill' }, '*');
    setTimeout(() => { iframe.src = 'https://dataman252.github.io/doom-corner-engine/sandbox.html'; }, 50);
    iframe.style.display = 'none';
    ui.placeholder.style.display = 'flex';
    ui.quitBtn.style.display = 'none';
    ui.nowPlaying.textContent = 'LIBRARY READY';
    ui.ctrlText.textContent = 'Select a game and press Start.';
  });

  document.getElementById('remap-btn').addEventListener('click', async () => {
    const gameName = ui.romSelect.value;
    if (!gameName) return;
    
    const ext = gameName.split('.').pop().toLowerCase();
    const systemCore = sysMap[ext] || 'fceumm';
    const keysToMap = (coreControls[systemCore] || coreControls['snes9x']).concat(baseHotkeys);

    const data = await chrome.storage.sync.get('binds_' + gameName);
    currentBinds = data['binds_' + gameName] || {}; 

    ui.remapList.innerHTML = '';
    keysToMap.forEach(k => {
      let boundKey = Object.keys(currentBinds).find(userKey => currentBinds[userKey] === k.code);
      if (!boundKey) {
        const defaultStolen = Object.keys(currentBinds).some(userKey => userKey === k.code);
        boundKey = defaultStolen ? 'UNBOUND' : k.code;
      }
      
      const row = document.createElement('div'); row.className = 'remap-row';
      row.innerHTML = `<span style="font-size:12px;">${k.label}</span> <button class="bind-btn" data-emu="${k.code}">${cleanKeyName(boundKey)}</button>`;
      ui.remapList.appendChild(row);
    });
    ui.remapModal.style.display = 'flex';
  });

  let activeBindBtn = null;
  document.getElementById('remap-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('bind-btn')) {
      if (activeBindBtn && activeBindBtn.dataset.current) activeBindBtn.textContent = cleanKeyName(activeBindBtn.dataset.current); 
      activeBindBtn = e.target;
      if (activeBindBtn.textContent !== 'Press Key...') activeBindBtn.dataset.current = activeBindBtn.textContent;
      activeBindBtn.textContent = 'Press Key...';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (activeBindBtn) {
      e.preventDefault();
      Object.keys(currentBinds).forEach(key => { if (currentBinds[key] === activeBindBtn.dataset.emu) delete currentBinds[key]; });
      currentBinds[e.code] = activeBindBtn.dataset.emu;
      activeBindBtn.textContent = cleanKeyName(e.code);
      activeBindBtn.dataset.current = e.code;
      activeBindBtn = null;
    }
  });

  document.getElementById('save-binds-btn').addEventListener('click', () => {
    const gameName = ui.romSelect.value;
    
    // FIX: Changed from local to sync
    chrome.storage.sync.set({ ['binds_' + gameName]: currentBinds });
    ui.remapModal.style.display = 'none';
    activeBindBtn = null;

    if (ui.nowPlaying.textContent === gameName) {
      const { strictBinds, displayParts } = generateStrictBinds(gameName, currentBinds);
      ui.ctrlText.textContent = displayParts.join(' | ');
      iframe.contentWindow.postMessage({ action: 'updateBinds', bindings: strictBinds }, '*');
      iframe.focus();
    }
  });
  
  document.getElementById('cancel-binds-btn').addEventListener('click', () => { ui.remapModal.style.display = 'none'; activeBindBtn = null; });

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