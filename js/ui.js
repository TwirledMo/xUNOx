'use strict';

const UI = {
  callbacks: {},
  el: {},

  init(callbacks) {
    this.callbacks = callbacks;
    const ids = [
      'topbar', 'roundInfo', 'direction', 'musicBtn', 'soundBtn', 'homeBtn',
      'opponents', 'drawPile', 'deckCount', 'discardPile', 'colorChip',
      'playerPlate', 'hand', 'unoBtn', 'toasts', 'overlay', 'turnBanner',
    ];
    for (const id of ids) this.el[id] = document.getElementById(id);

    this.el.drawPile.addEventListener('click', () => callbacks.onDeckClick());
    this.el.unoBtn.addEventListener('click', () => callbacks.onUno());
    this.el.musicBtn.classList.toggle('off', !Music.enabled);
    this.el.musicBtn.addEventListener('click', () => {
      const on = Music.toggle();
      this.el.musicBtn.classList.toggle('off', !on);
      if (on) SFX.play('click');
    });
    this.el.soundBtn.addEventListener('click', () => {
      SFX.muted = !SFX.muted;
      this.el.soundBtn.textContent = SFX.muted ? '🔇' : '🔊';
      if (!SFX.muted) SFX.play('click');
    });
    this.el.homeBtn.addEventListener('click', () => callbacks.onHome());
  },

  cardEl(card, extraClass = '') {
    const el = document.createElement('div');
    el.className = `card ${card.color} v-${card.value} ${extraClass}`.trim();
    el.dataset.id = card.id;
    const glyph = cardGlyph(card);
    el.innerHTML =
      `<div class="inner">` +
      `<span class="corner tl">${glyph}</span>` +
      `<span class="center">${glyph}</span>` +
      `<span class="corner br">${glyph}</span>` +
      `</div>`;
    el.title = cardName(card);
    return el;
  },

  backEl(small = false) {
    const el = document.createElement('div');
    el.className = 'card back' + (small ? ' small' : '');
    el.innerHTML = `<div class="inner"><span class="logo">xUNOx</span></div>`;
    return el;
  },

  renderAll(dealStagger = false) {
    this.renderTop();
    this.renderOpponents();
    this.renderPiles();
    this.renderHands(dealStagger);
  },

  renderOpponentsEmpty() {
    this.el.opponents.innerHTML = '';
  },

  renderPilesEmpty() {
    this.el.discardPile.innerHTML = '';
    this.el.deckCount.textContent = '108';
    this.el.colorChip.classList.add('hidden');
  },

  renderHandsEmpty() {
    this.el.hand.innerHTML = '';
    this.el.playerPlate.className = 'plate you';
    this.el.playerPlate.innerHTML = '';
  },

  renderTop() {
    if (Game.phase === 'idle' || Game.phase === 'setup') return;
    this.el.roundInfo.textContent = `Round ${Game.round} · First to ${Game.targetScore}`;
    this.el.direction.textContent = Game.direction === 1 ? '↻' : '↺';
    this.el.direction.classList.toggle('flip', Game.direction === -1);
  },

  renderOpponents() {
    const wrap = this.el.opponents;
    wrap.innerHTML = '';
    const ais = Game.players.filter((p) => !p.isHuman);
    for (const p of ais) {
      const idx = Game.players.indexOf(p);
      const plate = document.createElement('div');
      plate.className = 'plate opp' + (idx === Game.turn && Game.phase === 'playing' ? ' active' : '');
      plate.dataset.idx = idx;
      let fan = '';
      const shown = Math.min(p.hand.length, 7);
      for (let i = 0; i < shown; i++) fan += `<div class="card back small"><div class="inner"><span class="logo">x</span></div></div>`;
      plate.innerHTML =
        `<div class="avatar">${p.avatar}</div>` +
        `<div class="pinfo"><div class="pname">${p.name}</div>` +
        `<div class="pscore">${p.score} pts</div></div>` +
        `<div class="minifan">${fan}</div>` +
        `<div class="count">${p.hand.length}</div>`;
      wrap.appendChild(plate);
    }
  },

  renderPiles() {
    const discard = this.el.discardPile;
    discard.innerHTML = '';
    const top = Game.discard[Game.discard.length - 1];
    if (top) {
      const el = this.cardEl(top);
      const rot = (top.id % 9 - 4) * 4;
      el.style.transform = `rotate(${rot}deg)`;
      discard.appendChild(el);
    }
    this.el.deckCount.textContent = Game.deck.length;
    const chip = this.el.colorChip;
    if (Game.currentColor) {
      chip.style.background = COLOR_HEX[Game.currentColor];
      chip.textContent = Game.currentColor.toUpperCase();
      chip.classList.remove('hidden');
    } else {
      chip.classList.add('hidden');
    }
  },

  renderHands(dealStagger = false) {
    const human = Game.players[0];
    const hand = this.el.hand;
    hand.innerHTML = '';
    const n = human.hand.length;
    const isHumanTurn = Game.phase === 'playing' && Game.turn === 0 && !Game.busy;
    human.hand.forEach((card, i) => {
      const el = this.cardEl(card);
      const mid = (n - 1) / 2;
      const rot = (i - mid) * 4;
      const lift = Math.abs(i - mid) * 5;
      el.style.setProperty('--r', `${rot}deg`);
      el.style.setProperty('--y', `${lift}px`);
      el.style.zIndex = i;
      if (dealStagger) {
        el.classList.add('deal');
        el.style.animationDelay = `${i * 70}ms`;
      }
      if (isHumanTurn) {
        if (isPlayable(card, Game.currentColor, Game.currentValue)) el.classList.add('playable');
        else el.classList.add('dim');
        el.addEventListener('click', () => this.callbacks.onCardClick(card.id));
      }
      hand.appendChild(el);
    });
    hand.style.setProperty('--overlap', n > 10 ? '-34px' : n > 7 ? '-22px' : '-14px');

    const plate = this.el.playerPlate;
    plate.className = 'plate you' + (Game.turn === 0 && Game.phase === 'playing' ? ' active' : '');
    plate.innerHTML =
      `<div class="avatar">${human.avatar}</div>` +
      `<div class="pinfo"><div class="pname">${human.name}</div>` +
      `<div class="pscore">${human.score} pts</div></div>` +
      `<div class="count">${human.hand.length}</div>`;
  },

  setActivePlayer(idx) {
    document.querySelectorAll('.plate').forEach((el) => {
      const plateIdx = el.classList.contains('you') ? 0 : Number(el.dataset.idx);
      el.classList.toggle('active', plateIdx === idx);
    });
  },

  setHumanTurn(on) {
    this.el.drawPile.classList.toggle('enabled', on);
    this.el.turnBanner.classList.toggle('show', on);
    document.getElementById('hand').classList.toggle('myturn', on);
  },

  async animatePlay(playerIdx, card) {
    const fromRect =
      playerIdx === 0
        ? this.rectOfHandCard(card.id)
        : this.rectOfPlate(playerIdx);
    const toRect = this.el.discardPile.getBoundingClientRect();
    if (fromRect) {
      const ghost = playerIdx === 0 ? this.cardEl(card) : this.backEl();
      ghost.classList.add('flying');
      ghost.style.left = fromRect.left + 'px';
      ghost.style.top = fromRect.top + 'px';
      ghost.style.width = fromRect.width + 'px';
      ghost.style.height = fromRect.height + 'px';
      document.body.appendChild(ghost);
      const dx = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
      const dy = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);
      const scale = toRect.width / fromRect.width;
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(${(Math.random() * 20 - 10).toFixed(1)}deg) scale(${scale.toFixed(2)})`;
      });
      await sleep(340);
      ghost.remove();
    }
  },

  rectOfHandCard(cardId) {
    const el = this.el.hand.querySelector(`[data-id="${cardId}"]`);
    if (!el) return null;
    return el.getBoundingClientRect();
  },

  rectOfPlate(playerIdx) {
    const el = document.querySelector(`.plate[data-idx="${playerIdx}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left + r.width / 2 - 30, top: r.top + 10, width: 60, height: 90 };
  },

  async animateDraw(playerIdx, isHuman) {
    const from = this.el.drawPile.getBoundingClientRect();
    let to;
    if (isHuman) {
      const handRect = this.el.hand.getBoundingClientRect();
      to = { left: handRect.left + handRect.width / 2 - 30, top: handRect.top, width: 60, height: 90 };
    } else {
      const plate = document.querySelector(`.plate[data-idx="${playerIdx}"]`);
      if (plate) {
        const r = plate.getBoundingClientRect();
        to = { left: r.left + r.width / 2 - 30, top: r.top + 10, width: 60, height: 90 };
      } else {
        to = { left: from.left, top: from.top, width: 60, height: 90 };
      }
    }
    const ghost = this.backEl();
    ghost.classList.add('flying');
    ghost.style.left = from.left + 'px';
    ghost.style.top = from.top + 'px';
    ghost.style.width = '60px';
    ghost.style.height = '90px';
    document.body.appendChild(ghost);
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    await sleep(320);
    ghost.remove();
  },

  announcePlay(playerIdx, card, chosenColor) {
    const p = Game.players[playerIdx];
    const colorNote = card.color === 'wild' && chosenColor ? ` → ${chosenColor.toUpperCase()}` : '';
    this.toast(`${p.avatar} ${p.name} plays ${cardName(card)}${colorNote}`, playerIdx === 0 ? 'good' : '');
  },

  toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`.trim();
    t.textContent = msg;
    this.el.toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 2400);
  },

  speech(playerIdx, text) {
    const plate =
      playerIdx === 0
        ? this.el.playerPlate
        : document.querySelector(`.plate[data-idx="${playerIdx}"]`);
    if (!plate) return;
    const old = plate.querySelector('.speech');
    if (old) old.remove();
    const bubble = document.createElement('div');
    bubble.className = 'speech';
    bubble.textContent = text;
    plate.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1600);
  },

  showOverlay(html) {
    this.el.overlay.innerHTML = html;
    this.el.overlay.classList.remove('hidden');
  },

  hideOverlay() {
    this.el.overlay.classList.add('hidden');
    this.el.overlay.innerHTML = '';
  },

  showUnoButton() {
    this.el.unoBtn.classList.remove('hidden');
    this.el.unoBtn.classList.add('pulse');
  },

  hideUnoButton() {
    this.el.unoBtn.classList.add('hidden');
    this.el.unoBtn.classList.remove('pulse');
  },

  offerCatch(playerIdx, callback) {
    const p = Game.players[playerIdx];
    this.showOverlay(
      `<div class="panel catch-panel">` +
        `<div class="big-emoji">👀</div>` +
        `<h2>${p.avatar} ${p.name} is down to one card…</h2>` +
        `<p>and forgot to call UNO! Catch them!</p>` +
        `<div class="timerbar"><div class="timerfill"></div></div>` +
        `<button id="catchBtn" class="btn danger big">CAUGHT! +2 for them</button>` +
      `</div>`
    );
    const fill = this.el.overlay.querySelector('.timerfill');
    requestAnimationFrame(() => fill.classList.add('run'));
    const btn = this.el.overlay.querySelector('#catchBtn');
    const done = (caught) => {
      clearTimeout(timer);
      this.hideOverlay();
      callback(caught);
    };
    const timer = setTimeout(() => done(false), 2200);
    btn.addEventListener('click', () => done(true));
  },

  askColor() {
    return new Promise((resolve) => {
      this.showOverlay(
        `<div class="panel">` +
          `<h2>Choose a color</h2>` +
          `<div class="color-grid">` +
          COLORS.map(
            (c) =>
              `<button class="color-btn ${c}" data-color="${c}"><span></span>${c.toUpperCase()}</button>`
          ).join('') +
          `</div></div>`
      );
      this.el.overlay.querySelectorAll('.color-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          SFX.play('click');
          this.hideOverlay();
          resolve(btn.dataset.color);
        });
      });
    });
  },

  askDrawChoice(card) {
    return new Promise((resolve) => {
      const el = this.cardEl(card);
      this.showOverlay(
        `<div class="panel">` +
          `<h2>You drew…</h2>` +
          `<div class="drawn-card"></div>` +
          `<p>You can play it right away or keep it.</p>` +
          `<div class="btnrow">` +
          `<button id="playDrawn" class="btn good">Play it</button>` +
          `<button id="keepDrawn" class="btn">Keep it</button>` +
          `</div></div>`
      );
      this.el.overlay.querySelector('.drawn-card').appendChild(el);
      this.el.overlay.querySelector('#playDrawn').addEventListener('click', () => {
        SFX.play('click');
        this.hideOverlay();
        resolve(true);
      });
      this.el.overlay.querySelector('#keepDrawn').addEventListener('click', () => {
        SFX.play('click');
        this.hideOverlay();
        resolve(false);
      });
    });
  },

  showRoundEnd(breakdown, winner, gained) {
    const rows = breakdown
      .map(
        (b) =>
          `<tr class="${b.won ? 'winner-row' : ''}">` +
          `<td>${b.player.avatar} ${b.player.name}${b.won ? ' 🏆' : ''}</td>` +
          `<td>${b.won ? '—' : b.pts}</td>` +
          `<td>${b.player.score}</td>` +
          `</tr>`
      )
      .join('');
    this.showOverlay(
      `<div class="panel">` +
        `<div class="big-emoji">${winner.avatar}</div>` +
        `<h2>${winner.name} wins round ${Game.round}!</h2>` +
        `<p class="points-line">+${gained} points</p>` +
        `<table class="score-table"><thead><tr><th>Player</th><th>Hand</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>` +
        `<div class="btnrow">` +
        `<button id="nextRound" class="btn good big">Next Round →</button>` +
        `<button id="quitGame" class="btn">New Game</button>` +
        `</div></div>`
    );
    this.el.overlay.querySelector('#nextRound').addEventListener('click', () => {
      SFX.play('click');
      this.hideOverlay();
      Game.startRound();
    });
    this.el.overlay.querySelector('#quitGame').addEventListener('click', () => {
      SFX.play('click');
      this.hideOverlay();
      this.callbacks.onHome();
    });
  },

  showGameEnd(winner, breakdown, humanWon) {
    const rows = breakdown
      .slice()
      .sort((a, b) => b.player.score - a.player.score)
      .map(
        (b, i) =>
          `<tr class="${b.won ? 'winner-row' : ''}">` +
          `<td>${['🥇', '🥈', '🥉', '4th'][i]} ${b.player.avatar} ${b.player.name}</td>` +
          `<td>${b.player.roundsWon}</td>` +
          `<td>${b.player.score}</td>` +
          `</tr>`
      )
      .join('');
    const s = Stats.data;
    this.showOverlay(
      `<div class="panel gameend">` +
        `<div class="big-emoji">${humanWon ? '🏆' : winner.avatar}</div>` +
        `<h2>${humanWon ? 'You win the whole game!' : `${winner.name} wins the whole game!`}</h2>` +
        `<table class="score-table"><thead><tr><th>Player</th><th>Rounds</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>` +
        `<div class="stats-grid">` +
        `<div class="stat"><span class="stat-num">${s.games}</span><span class="stat-label">Games played</span></div>` +
        `<div class="stat"><span class="stat-num">${s.wins}</span><span class="stat-label">Games won</span></div>` +
        `<div class="stat"><span class="stat-num">${s.roundWins}</span><span class="stat-label">Rounds won</span></div>` +
        `<div class="stat"><span class="stat-num">${s.cardsPlayed}</span><span class="stat-label">Cards played</span></div>` +
        `<div class="stat"><span class="stat-num">${s.bestRound}</span><span class="stat-label">Best round</span></div>` +
        `<div class="stat"><span class="stat-num">${s.totalPoints}</span><span class="stat-label">Total points</span></div>` +
        `</div>` +
        `<div class="btnrow">` +
        `<button id="playAgain" class="btn good big">Play Again</button>` +
        `<button id="goHome" class="btn">Home</button>` +
        `</div></div>`
    );
    this.confetti();
    this.el.overlay.querySelector('#playAgain').addEventListener('click', () => {
      SFX.play('click');
      this.hideOverlay();
      this.callbacks.onNewGameSameSettings();
    });
    this.el.overlay.querySelector('#goHome').addEventListener('click', () => {
      SFX.play('click');
      this.hideOverlay();
      this.callbacks.onHome();
    });
  },

  confetti() {
    const colors = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043'];
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 2 + 's';
      piece.style.animationDuration = 2.5 + Math.random() * 2 + 's';
      const size = 6 + Math.random() * 8;
      piece.style.width = size + 'px';
      piece.style.height = size * 0.6 + 'px';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5500);
    }
  },
};
