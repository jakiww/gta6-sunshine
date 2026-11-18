# Sunshine City

![Bounty](https://make.fun/badge/gta6-01.svg)
![Rank](https://make.fun/badge/gta6-01/jakiww/gta6-sunshine/rank.svg)
![Reward](https://make.fun/badge/gta6-01/jakiww/gta6-sunshine/reward.svg)

**Sunshine City** is an open-world crime game built for the
[Make GTA 6 bounty on make.fun](https://make.fun/bounty/gta6-01) — a sun-soaked
procedural beach city where you play Marco Reyes, a small-time hustler trying
to make a name for himself with the help of Lena Cruz.

Play it here after cloning: serve the `game/` folder with any static server
(`node serve.ts`, then open http://localhost:8080) — no build step, no network,
everything runs offline in a desktop browser.

Referral code: `ybsp0vay`

## The story

Marco Reyes just rolled into Sunshine City with $150 and a borrowed jacket.
Lena Cruz, the fixer who runs the garage on the west road, has three jobs for
him — and the city's cops are not in a forgiving mood.

1. **First Wheels** — Steal any parked car and bring it to Lena's garage. **$500**
2. **Package Run** — Pick up a package at the pier and deliver it to the north
   garage in 90 seconds. **$800**
3. **Lose the Heat** — The whole force is after you. Drop your wanted level to
   zero. **$1,200**

## How to play

| Key | Action |
| --- | --- |
| WASD / arrows | Walk (or drive, when in a car) |
| Mouse | Orbit camera (click the game to lock the pointer) |
| Shift | Run |
| E | Steal a parked car / exit a car |
| F | Fire the pistol (on foot) |
| H | Help panel |
| M | Mute sound |

Stealing a car, shooting, or speeding past the police raises your **wanted
level (0–5 stars)**. The higher it goes, the more police cars chase you —
they ram and block your car, and if they hold you on foot, you're **Busted**
and pay a $200 fine. Lay low and the heat slowly cools off.

## Features

- **Procedural city** — road grid, towers, a beach with animated sea, a pier,
  palm trees, street lamps, a plaza fountain and Lena's garage, all generated
  in code with three.js (r160, vendored locally).
- **Driving** — steal any of the parked cars; arcade handling with collision.
- **Traffic** — AI cars cruise the road loops and slow down for the car ahead.
- **Police AI** — spawn count follows your wanted level, with flashing light
  bars, sirens, ramming and busts.
- **Combat** — a pistol with a visible tracer and a short cooldown.
- **HUD + minimap** — cash, wanted stars, health, speed, mission objective,
  messages, and a live 2D minimap with player arrow, cars, police and the
  mission marker.
- **Sound** — every effect is synthesized live with WebAudio (engine hum,
  siren, gunshots, cash register). No audio files.
- **Save** — cash, missions and position auto-save to localStorage.

## Tech

- Engine: **three.js r160**, vendored as `game/vendor/three.min.js`
  (no CDN, no network requests at all).
- Code: plain ES modules under `game/src/`, one system per file
  (`city`, `player`, `vehicles`, `police`, `missions`, `combat`, `hud`,
  `minimap`, `audio`, `save`, `input`, `config`, `util`).
- Screenshots: `?shot=cover|walk|chase|mission` jumps straight into a real
  game state for reproducible captures.

## License

MIT — see [LICENSE](LICENSE).
