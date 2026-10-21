'use strict';

const Stats = {
  key: 'xunox-stats-v1',
  data: { games: 0, wins: 0, rounds: 0, roundWins: 0, cardsPlayed: 0, bestRound: 0, totalPoints: 0 },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return { ...this.data, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...this.data };
  },
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {}
  },
  reset() {
    this.data = { games: 0, wins: 0, rounds: 0, roundWins: 0, cardsPlayed: 0, bestRound: 0, totalPoints: 0 };
    this.save();
  },
};

const Settings = {
  key: 'xunox-settings-v1',
  data: { playerName: 'You', aiCount: 2, targetScore: 500 },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return { ...this.data, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...this.data };
  },
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {}
  },
};

let lastConfig = null;

function showSetup() {
  Game.phase = 'setup';
  const s = Settings.data;
  const st = Stats.data;
  UI.el.roundInfo.textContent = 'Ready to play';
  UI.el.direction.textContent = '↻';
  UI.renderOpponentsEmpty();
  UI.renderPilesEmpty();
  UI.renderHandsEmpty();
  UI.setHumanTurn(false);
  UI.hideUnoButton();

  UI.showOverlay(
    `<div class="panel setup-panel">` +
      `<div class="setup-logo">xUNOx</div>` +
      `<p class="tagline">The classic card game of chaos — deluxe web edition</p>` +
      `<label class="field">Your name` +
      `<input id="nameInput" type="text" maxlength="14" value="${s.playerName.replace(/"/g, '&quot;')}" placeholder="You">` +
      `</label>` +
      `<label class="field">Opponents` +
      `<div class="segmented" id="aiSeg">` +
      [1, 2, 3].map((n) => `<button data-n="${n}" class="${n === s.aiCount ? 'sel' : ''}">${n} AI</button>`).join('') +
      `</div></label>` +
      `<label class="field">Play to` +
      `<div class="segmented" id="scoreSeg">` +
      [200, 500].map((n) => `<button data-n="${n}" class="${n === s.targetScore ? 'sel' : ''}">${n} pts</button>`).join('') +
      `</div></label>` +
      `<button id="startBtn" class="btn good big">▶ Start Game</button>` +
      `<div class="stats-grid mini">` +
      `<div class="stat"><span class="stat-num">${st.games}</span><span class="stat-label">Games</span></div>` +
      `<div class="stat"><span class="stat-num">${st.wins}</span><span class="stat-label">Wins</span></div>` +
      `<div class="stat"><span class="stat-num">${st.roundWins}</span><span class="stat-label">Rounds won</span></div>` +
      `<div class="stat"><span class="stat-num">${st.cardsPlayed}</span><span class="stat-label">Cards played</span></div>` +
      `</div>` +
      `<button id="resetStats" class="linklike">reset stats</button>` +
      `<p class="credits">Inspired by the original <b>xUNOx</b> Python UNO game<br>created by sweddell · rebuilt as a web game 2026</p>` +
    `</div>`
  );

  const nameInput = UI.el.overlay.querySelector('#nameInput');
  nameInput.addEventListener('input', () => {
    Settings.data.playerName = nameInput.value.trim() || 'You';
    Settings.save();
  });

  UI.el.overlay.querySelectorAll('#aiSeg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      Settings.data.aiCount = Number(btn.dataset.n);
      Settings.save();
      UI.el.overlay.querySelectorAll('#aiSeg button').forEach((b) => b.classList.toggle('sel', b === btn));
    });
  });

  UI.el.overlay.querySelectorAll('#scoreSeg button').forEach((btn) => {
    btn.addEventListener('click', () => {
      SFX.play('click');
      Settings.data.targetScore = Number(btn.dataset.n);
      Settings.save();
      UI.el.overlay.querySelectorAll('#scoreSeg button').forEach((b) => b.classList.toggle('sel', b === btn));
    });
  });

  UI.el.overlay.querySelector('#resetStats').addEventListener('click', () => {
    Stats.reset();
    showSetup();
  });

  UI.el.overlay.querySelector('#startBtn').addEventListener('click', () => {
    SFX.ensure();
    SFX.play('click');
    lastConfig = {
      playerName: Settings.data.playerName,
      aiCount: Settings.data.aiCount,
      targetScore: Settings.data.targetScore,
    };
    UI.hideOverlay();
    Game.newGame(lastConfig);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  Stats.data = Stats.load();
  Settings.data = Settings.load();

  UI.init({
    onCardClick: (cardId) => Game.humanPlay(cardId),
    onDeckClick: () => Game.humanDraw(),
    onUno: () => Game.humanUno(),
    onHome: () => {
      Game.phase = 'setup';
      showSetup();
    },
    onNewGameSameSettings: () => {
      if (lastConfig) Game.newGame(lastConfig);
      else showSetup();
    },
  });

  showSetup();
});
