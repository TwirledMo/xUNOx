# xUNOx — Deluxe Web Edition

The classic UNO card game, rebuilt as a modern browser game. Play against 1–3 AI
opponents with full rules, animations, sound effects, scoring, and lifetime stats.

> **Credits:** xUNOx started life as a Python UNO game written by
> [sweddell](https://github.com/sweddell) (run through IDLE, destined for PyCharm).
> The original source is preserved in [`original/`](original/) — the card naming
> (`B0`, `R2D2`, `WC`, `D4`…) and the deck design in this version are inspired by it.
> This web edition was built as an upgrade so the game runs on any Mac or Windows
> laptop with zero installs.

---

## How to run it

**No installation needed — it's a plain web page.**

- **Mac:** double-click `index.html` (opens in Safari/Chrome), or right-click → Open With → your browser.
- **Windows:** double-click `index.html` (opens in Edge/Chrome).

That's it. It works fully offline — no server, no dependencies, nothing to install.

Optional (nicer for development): serve it locally with Python, which you already
have on both platforms:

```bash
cd xUNOx
python3 -m http.server 8000    # Mac/Linux
python -m http.server 8000     # Windows
```

then open http://localhost:8000

---

## How to play

- **Match** the top discard card by **color** or **number/symbol**, or play a **Wild**.
- Click a glowing card to play it. Can't play? Click the **draw pile** — you draw one
  card, and if it's playable you may play it immediately or keep it.
- **Action cards:**
  - **Skip** — next player loses their turn
  - **Reverse** — flips play direction (acts as a Skip in a 2-player game)
  - **Draw Two** — next player draws 2 and loses their turn
  - **Wild** — play anytime, choose the next color
  - **Wild Draw Four** — choose the color, next player draws 4 and is skipped
- **UNO!** — when you're down to one card, slam the **UNO!** button within a couple of
  seconds or an opponent will catch you and you'll draw 2 as a penalty.
  (Watch the AI too — sometimes they forget, and you can catch *them*.)
- When someone empties their hand the round ends and they score points from everyone
  else's remaining hands (numbers = face value, action cards = 20, wilds = 50).
- First to the target score (200 quick / 500 classic) wins the game.

## Features

- 1–3 AI opponents with real strategy (they hunt low-card players with action cards,
  hoard wilds, and pick colors they're rich in)
- Full official UNO rules + draw-pile reshuffling
- UNO calls, catches, and penalties — both directions
- Card deal/play/draw animations, speech bubbles, confetti win screen
- Procedural sound effects (Web Audio — no audio files needed), mutable
- Round scoring with hand breakdowns, game win screen
- Lifetime stats saved in your browser (games, wins, rounds, cards played)
- Works offline, runs on Mac and Windows, no dependencies

## Project structure

```
xUNOx/
├── index.html          ← double-click this to play
├── css/style.css       ← table, cards, animations
├── js/
│   ├── cards.js        ← deck building + card helpers
│   ├── audio.js        ← Web Audio sound effects
│   ├── ai.js           ← AI opponent brains
│   ├── game.js         ← rules, turns, UNO logic, scoring
│   ├── ui.js           ← rendering, animations, modals
│   └── main.js         ← setup screen, settings, stats
└── original/           ← the original Python project, preserved
```

## House rules used here

- Wild Draw Four can be played anytime (official "challenge" rule not implemented).
- You may hold a playable card after drawing (official tournament rule allows playing
  only the drawn card — here you get the choice).
- Round winner leads the next round.

## Ideas for the next update

Want to keep hacking on it? Some fun next steps:

- Online multiplayer (WebRTC or a tiny Node server)
- A "7-0" rule toggle, stacking Draw Twos, or jump-in plays
- Tournament mode with 4 human players on one keyboard
- Custom avatars and table themes
