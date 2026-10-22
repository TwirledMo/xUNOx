'use strict';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const Game = {
  players: [],
  deck: [],
  discard: [],
  turn: 0,
  direction: 1,
  currentColor: null,
  currentValue: null,
  round: 0,
  targetScore: 500,
  startingPlayer: 0,
  phase: 'idle',
  busy: true,
  unoTimer: null,

  newGame(config) {
    this.players = [
      {
        name: config.playerName || 'You',
        avatar: '😎',
        isHuman: true,
        hand: [],
        score: 0,
        roundsWon: 0,
      },
    ];
    const profiles = shuffle(AI_PROFILES.slice()).slice(0, config.aiCount);
    for (const p of profiles) {
      this.players.push({
        name: p.name,
        avatar: p.avatar,
        isHuman: false,
        hand: [],
        score: 0,
        roundsWon: 0,
      });
    }
    this.targetScore = config.targetScore || 500;
    this.round = 0;
    this.startingPlayer = 0;
    this.startRound();
  },

  async startRound() {
    clearTimeout(this.unoTimer);
    this.round++;
    this.phase = 'dealing';
    this.busy = true;
    this.deck = buildDeck();
    this.discard = [];
    this.direction = 1;
    this.currentColor = null;
    this.currentValue = null;
    for (const p of this.players) p.hand = [];

    UI.renderAll();
    UI.toast(`Round ${this.round} — deal them out!`);
    await sleep(300);

    for (let i = 0; i < 7; i++) {
      for (const p of this.players) p.hand.push(this.deck.pop());
    }

    let first = this.deck.pop();
    while (first.color === 'wild' || ACTION_VALUES.includes(first.value)) {
      this.deck.unshift(first);
      first = this.deck.pop();
    }
    this.discard.push(first);
    this.currentColor = first.color;
    this.currentValue = first.value;

    this.turn = this.startingPlayer;
    this.phase = 'playing';
    SFX.play('shuffle');
    UI.renderAll(true);
    UI.toast(`Top card: ${cardName(first)}`);
    await sleep(600);
    await this.beginTurn();
  },

  nextIndex(step = 1) {
    const n = this.players.length;
    return (((this.turn + this.direction * step) % n) + n) % n;
  },

  async beginTurn() {
    if (this.phase !== 'playing') return;
    const p = this.players[this.turn];
    UI.setActivePlayer(this.turn);
    if (p.isHuman) {
      this.busy = false;
      UI.setHumanTurn(true);
      SFX.play('turn');
    } else {
      UI.setHumanTurn(false);
    }
    UI.renderHands();
    if (!p.isHuman) {
      await sleep(850 + Math.random() * 700);
      if (this.phase !== 'playing') return;
      await this.aiTurn();
    }
  },

  async aiTurn() {
    const p = this.players[this.turn];
    const nextIdx = this.nextIndex(1);
    const card = aiChooseCard(p.hand, this.currentColor, this.currentValue, {
      nextHandCount: this.players[nextIdx].hand.length,
    });
    if (card) {
      const chosen = card.color === 'wild' ? aiChooseColor(p.hand.filter((c) => c.id !== card.id)) : null;
      await this.playCard(card, chosen);
    } else {
      await this.drawCard();
    }
  },

  async humanPlay(cardId) {
    if (this.busy || this.phase !== 'playing') return;
    const p = this.players[this.turn];
    if (!p.isHuman) return;
    const card = p.hand.find((c) => c.id === cardId);
    if (!card) return;
    if (!isPlayable(card, this.currentColor, this.currentValue)) {
      SFX.play('error');
      UI.toast(`${cardName(card)} doesn't match — match the color or the symbol`, 'bad');
      return;
    }
    this.busy = true;
    UI.setHumanTurn(false);
    const chosen = card.color === 'wild' ? await UI.askColor() : null;
    if (card.color === 'wild' && !chosen) {
      this.busy = false;
      UI.setHumanTurn(true);
      return;
    }
    await this.playCard(card, chosen);
  },

  async humanDraw() {
    if (this.busy || this.phase !== 'playing') return;
    const p = this.players[this.turn];
    if (!p.isHuman) return;
    this.busy = true;
    UI.setHumanTurn(false);
    await this.drawCard();
  },

  async drawCard() {
    const p = this.players[this.turn];
    const card = this.takeFromDeck();
    if (!card) {
      UI.toast('No cards left to draw — turn passes');
      await this.passTurn();
      return;
    }
    p.hand.push(card);
    SFX.play('draw');
    await UI.animateDraw(this.turn, p.isHuman);
    UI.renderAll();
    if (isPlayable(card, this.currentColor, this.currentValue)) {
      if (p.isHuman) {
        const playIt = await UI.askDrawChoice(card);
        if (playIt) {
          const chosen = card.color === 'wild' ? await UI.askColor() : null;
          if (card.color === 'wild' && !chosen) {
            await this.passTurn();
            return;
          }
          await this.playCard(card, chosen);
          return;
        }
      } else {
        await sleep(400);
        const chosen = card.color === 'wild' ? aiChooseColor(p.hand) : null;
        await this.playCard(card, chosen);
        return;
      }
    } else if (!p.isHuman) {
      UI.speech(this.turn, 'No luck…');
    }
    await this.passTurn();
  },

  async passTurn() {
    if (this.phase !== 'playing') return;
    this.turn = this.nextIndex(1);
    await this.beginTurn();
  },

  async playCard(card, chosenColor) {
    if (this.phase !== 'playing') return;
    const p = this.players[this.turn];
    const idx = p.hand.findIndex((c) => c.id === card.id);
    if (idx === -1) return;
    p.hand.splice(idx, 1);
    this.discard.push(card);
    this.currentColor = card.color === 'wild' ? chosenColor : card.color;
    this.currentValue = card.color === 'wild' ? null : card.value;
    Stats.data.cardsPlayed++;
    Stats.save();
    SFX.play('flick');
    await UI.animatePlay(this.turn, card);
    UI.renderAll();
    UI.announcePlay(this.turn, card, this.currentColor);

    if (p.hand.length === 1) this.handleUnoMoment(this.turn);

    if (p.hand.length === 0) {
      if (card.value === 'draw2') await this.drawN(this.nextIndex(1), 2);
      if (card.value === 'wild4') await this.drawN(this.nextIndex(1), 4);
      this.endRound(this.turn);
      return;
    }

    let step = 1;
    if (card.value === 'skip') {
      const skipped = this.players[this.nextIndex(1)];
      UI.speech(this.nextIndex(1), 'Hey! Skipped!');
      step = 2;
    } else if (card.value === 'reverse') {
      this.direction *= -1;
      if (this.players.length === 2) step = 2;
    } else if (card.value === 'draw2') {
      await this.drawN(this.nextIndex(1), 2);
      UI.speech(this.nextIndex(1), '+2?!');
      step = 2;
    } else if (card.value === 'wild4') {
      await this.drawN(this.nextIndex(1), 4);
      UI.speech(this.nextIndex(1), '+4?!');
      step = 2;
    }

    this.turn = this.nextIndex(step);
    await this.beginTurn();
  },

  async drawN(playerIdx, n) {
    for (let i = 0; i < n; i++) {
      const c = this.takeFromDeck();
      if (!c) break;
      this.players[playerIdx].hand.push(c);
      SFX.play('draw');
      await UI.animateDraw(playerIdx, this.players[playerIdx].isHuman);
      UI.renderAll();
      await sleep(140);
    }
  },

  takeFromDeck() {
    if (this.deck.length === 0) this.reshuffle();
    if (this.deck.length === 0) return null;
    return this.deck.pop();
  },

  reshuffle() {
    if (this.discard.length <= 1) return;
    const top = this.discard.pop();
    this.deck = shuffle(this.discard);
    this.discard = [top];
    SFX.play('shuffle');
    UI.toast('Discard pile reshuffled into the draw pile');
  },

  handleUnoMoment(playerIdx) {
    const p = this.players[playerIdx];
    if (p.isHuman) {
      UI.showUnoButton();
      clearTimeout(this.unoTimer);
      this.unoTimer = setTimeout(() => {
        if (this.phase !== 'playing') return;
        UI.hideUnoButton();
        const catcher = this.players[this.nextIndex(1)];
        SFX.play('catch');
        UI.toast(`${catcher.avatar} ${catcher.name} caught you not calling UNO! +2 cards`, 'bad');
        this.drawN(playerIdx, 2);
      }, 2600);
    } else if (Math.random() < 0.8) {
      UI.speech(playerIdx, 'UNO!');
      SFX.play('uno');
    } else {
      UI.offerCatch(playerIdx, (caught) => {
        if (caught) {
          SFX.play('penalty');
          UI.toast(`You caught ${p.name} sleeping on UNO! +2 cards`, 'good');
          this.drawN(playerIdx, 2);
        } else {
          UI.speech(playerIdx, 'UNO!');
          SFX.play('uno');
        }
      });
    }
  },

  humanUno() {
    if (this.phase !== 'playing') return;
    clearTimeout(this.unoTimer);
    UI.hideUnoButton();
    UI.speech(0, 'UNO!');
    SFX.play('uno');
  },

  endRound(winnerIdx) {
    this.phase = 'roundEnd';
    clearTimeout(this.unoTimer);
    UI.hideUnoButton();
    UI.setHumanTurn(false);

    const winner = this.players[winnerIdx];
    let gained = 0;
    const breakdown = this.players.map((p, i) => {
      if (i === winnerIdx) return { player: p, pts: 0, won: true };
      const pts = handPoints(p.hand);
      gained += pts;
      return { player: p, pts, won: false };
    });
    winner.score += gained;
    winner.roundsWon++;
    this.startingPlayer = winnerIdx;

    const humanWon = winnerIdx === 0;
    Stats.data.rounds++;
    if (humanWon) {
      Stats.data.roundWins++;
      Stats.data.totalPoints += gained;
      Stats.data.bestRound = Math.max(Stats.data.bestRound, gained);
    }
    Stats.save();

    const gameOver = winner.score >= this.targetScore;
    if (gameOver) {
      this.phase = 'gameEnd';
      Stats.data.games++;
      if (humanWon) Stats.data.wins++;
      Stats.save();
      SFX.play('win');
      UI.showGameEnd(winner, breakdown, humanWon);
    } else {
      SFX.play(humanWon ? 'win' : 'lose');
      UI.showRoundEnd(breakdown, winner, gained);
    }
  },
};
