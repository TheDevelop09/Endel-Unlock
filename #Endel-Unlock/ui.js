(() => {
  'use strict';
  if (window.__endelUnlock) return;
  window.__endelUnlock = true;

  const KEY = 'endel-unlock-ids';
  const CANDIDATES = [
    'focus', 'sleep', 'relax', 'study', 'recovery', 'deeper', 'deeperFocus',
    'deeper-focus', 'grimes', 'wisdom', 'hibernation', 'winddown',
    'rainyOutside', 'dynamicFocus', 'colorNoise', 'natureElements',
    'spatialOrbit', '8dOdyssey', 'odyssey', 'move', 'deepWork', 'read',
    'create', 'chores', 'meditate', 'selfCare', 'powerNap', 'attentionBoost',
    'binauralBeats', 'asmr', 'anxietyRelief', 'tinnitusRelief', 'brainMassage',
    'arousal', 'babySleep', 'wakeUp', 'quickTask', 'focusTimer'
  ];

  let audio = null;
  let queue = [];
  let pos = 0;
  let current = null;

  const label = (id) =>
    id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());

  const root = document.createElement('div');
  root.id = 'endel-unlock';
  root.innerHTML = `
    <div class="eu-head">
      <span class="eu-title">Endel Unlock</span>
      <button class="eu-btn" data-act="min">—</button>
      <button class="eu-btn" data-act="close">×</button>
    </div>
    <div class="eu-body">
      <div class="eu-now">Aucune lecture</div>
      <div class="eu-list"></div>
      <div class="eu-foot">
        <button class="eu-btn eu-wide" data-act="probe">Resoudre les soundscapes</button>
        <button class="eu-btn eu-wide" data-act="stop">Stop</button>
        <input class="eu-vol" type="range" min="0" max="100" value="70">
      </div>
    </div>`;
  document.documentElement.appendChild(root);

  const list = root.querySelector('.eu-list');
  const now = root.querySelector('.eu-now');
  const vol = root.querySelector('.eu-vol');

  audio = new Audio();
  audio.preload = 'auto';
  audio.volume = 0.7;
  audio.onended = () => { if (pos < queue.length) playNext(); };
  vol.oninput = () => { audio.volume = vol.value / 100; };

  function playNext() {
    if (pos >= queue.length) return;
    audio.src = queue[pos++];
    audio.play().catch((e) => console.warn('[Endel Unlock]', e.message));
  }

  function stop() {
    queue = [];
    pos = 0;
    audio.pause();
    audio.removeAttribute('src');
    current = null;
    now.textContent = 'Aucune lecture';
  }

  async function load(id) {
    stop();
    current = id;
    now.textContent = 'Chargement : ' + label(id);
    try {
      const hour = new Date().getHours();
      const res = await fetch(`/api/pacific?mode=${id}&hour=${hour}&hlsjs=1`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      queue = txt.split('\n').filter((l) => l.startsWith('http'));
      if (!queue.length) throw new Error('playlist vide');
      now.textContent = 'Lecture : ' + label(id) + ' (' + queue.length + ' min)';
      playNext();
    } catch (e) {
      now.textContent = label(id) + ' — echec : ' + e.message;
    }
  }

  function render(ids) {
    list.textContent = '';
    if (!ids.length) {
      list.innerHTML = '<div class="eu-empty">Aucun son resolu. Clique sur le bouton ci-dessous.</div>';
      return;
    }
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'eu-item';
      b.textContent = label(id);
      b.onclick = () => load(id);
      list.appendChild(b);
    }
  }

  async function probe() {
    const hour = new Date().getHours();
    const ok = [];
    now.textContent = 'Test en cours…';
    for (const id of CANDIDATES) {
      try {
        const res = await fetch(`/api/pacific?mode=${id}&hour=${hour}&hlsjs=1`);
        if (!res.ok) continue;
        const txt = await res.text();
        if (txt.startsWith('#EXTM3U')) ok.push(id);
      } catch {}
      render(ok);
    }
    localStorage.setItem(KEY, JSON.stringify(ok));
    now.textContent = ok.length + ' soundscapes disponibles';
    render(ok);
  }

  root.addEventListener('click', (e) => {
    const act = e.target.dataset && e.target.dataset.act;
    if (act === 'probe') probe();
    if (act === 'stop') stop();
    if (act === 'close') root.remove();
    if (act === 'min') root.classList.toggle('eu-min');
  });

  const cached = localStorage.getItem(KEY);
  if (cached) {
    try { render(JSON.parse(cached)); } catch {}
  } else {
    render([]);
  }
})();