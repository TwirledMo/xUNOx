'use strict';

const COLORS = ['red', 'yellow', 'green', 'blue'];
const COLOR_HEX = {
  red: '#ef5350',
  yellow: '#ffca28',
  green: '#66bb6a',
  blue: '#42a5f5',
  wild: '#263238',
};
const ACTION_VALUES = ['skip', 'reverse', 'draw2'];

function makeCard(color, value, id) {
  return { id, color, value };
}

function buildDeck() {
  const deck = [];
  let id = 0;
  for (const color of COLORS) {
    deck.push(makeCard(color, '0', id++));
    for (let n = 1; n <= 9; n++) {
      deck.push(makeCard(color, String(n), id++));
      deck.push(makeCard(color, String(n), id++));
    }
    for (const v of ACTION_VALUES) {
      deck.push(makeCard(color, v, id++));
      deck.push(makeCard(color, v, id++));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard('wild', 'wild', id++));
    deck.push(makeCard('wild', 'wild4', id++));
  }
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cardPoints(card) {
  if (card.color === 'wild') return 50;
  if (ACTION_VALUES.includes(card.value)) return 20;
  return Number(card.value);
}

function handPoints(hand) {
  return hand.reduce((sum, c) => sum + cardPoints(c), 0);
}

function isPlayable(card, color, value) {
  return card.color === 'wild' || card.color === color || card.value === value;
}

function cardName(card) {
  const colorNames = { red: 'Red', yellow: 'Yellow', green: 'Green', blue: 'Blue', wild: '' };
  const valueNames = {
    skip: 'Skip',
    reverse: 'Reverse',
    draw2: 'Draw Two',
    wild: 'Wild',
    wild4: 'Wild Draw Four',
  };
  const v = valueNames[card.value] || card.value;
  return card.color === 'wild' ? v : `${colorNames[card.color]} ${v}`;
}

function cardGlyph(card) {
  switch (card.value) {
    case 'skip': return '⊘';
    case 'reverse': return '⇄';
    case 'draw2': return '+2';
    case 'wild': return '★';
    case 'wild4': return '+4';
    default: return card.value;
  }
}
