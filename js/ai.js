'use strict';

const AI_PROFILES = [
  { name: 'Robo-Rex', avatar: '🦖' },
  { name: 'Captain Zap', avatar: '🤖' },
  { name: 'Ninja Nala', avatar: '🥷' },
  { name: 'Doctor Dice', avatar: '🧪' },
];

function aiChooseCard(hand, color, value, ctx) {
  const playable = hand.filter((c) => isPlayable(c, color, value));
  if (playable.length === 0) return null;

  const colorCounts = {};
  for (const c of hand) {
    if (c.color !== 'wild') colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
  }

  const threat = ctx.nextHandCount <= 2;
  let best = null;
  let bestScore = -Infinity;

  for (const c of playable) {
    let s = 0;
    if (c.color === 'wild') {
      s = c.value === 'wild4' ? (threat ? 60 : 5) : threat ? 40 : 8;
      if (playable.length === 1) s += 50;
    } else if (c.value === 'draw2') {
      s = threat ? 70 : 35;
    } else if (c.value === 'skip' || c.value === 'reverse') {
      s = threat ? 65 : 30;
    } else {
      s = 10 + Number(c.value) * 0.8 + (colorCounts[c.color] || 0) * 3;
    }
    s += Math.random() * 4;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function aiChooseColor(hand) {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c.color !== 'wild') counts[c.color]++;
  }
  let best = COLORS[Math.floor(Math.random() * 4)];
  let bestN = -1;
  for (const col of COLORS) {
    if (counts[col] > bestN) {
      bestN = counts[col];
      best = col;
    }
  }
  return best;
}
