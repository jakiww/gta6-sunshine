# Sunshine City

[![Play on make.fun](https://make.fun/badge/gta6-01/play.svg)](https://make.fun/c/gta6-01)
[![Compete on make.fun](https://make.fun/badge/gta6-01/compete.svg)](https://make.fun/c/gta6-01)
[![Built with make.fun](https://make.fun/badge/gta6-01/built.svg)](https://make.fun/?ref=ybsp0vay)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun](https://make.fun/?ref=ybsp0vay) GTA 6 bounty (competition `gta6-01`).

## The game

**Sunshine City** is a sun-soaked procedural coastal city. You play **Marco
Reyes**, fresh out of prison and back home, working with **Lena Cruz** to make
a name for himself — one stolen car at a time.

- **Explore on foot and by car** — walk the sidewalks or steal any parked car
  (press `E`) and drive the street grid, the beach road, and the pier.
- **Living city** — AI traffic cruising the streets, pedestrians strolling the
  sidewalks, palm trees, a beach and the open sea to the south.
- **Wanted system (0–5 stars)** — steal cars, hit pedestrians, or shoot, and
  the police respond. Cruisers chase, ram, and flash their light bars. Get
  caught on foot and you're **Busted**; get wrecked and you're **Wasted**.
- **Three story missions** — *First Wheels* (steal a car, $500), *Package Run*
  (a 90-second delivery to the pier, $800), and *Lose the Heat* (escape a
  three-star wanted level, $1,200).
- **Combat** — pistol with hitscan shooting, tracer, muzzle flash, and
  panicking crowds.
- **HUD + minimap** — cash, wanted stars, health, speed, mission tracker,
  objective banner, and a live 2D minimap with traffic, police, and the
  mission beacon.
- **Polish** — synthesized WebAudio sound (engine, sirens, gunshots, chimes),
  start / pause / game-over screens, and localStorage saves.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Mouse | Orbit camera |
| Shift | Run |
| Space | Brake |
| E | Steal / enter a car |
| F | Exit car |
| Left click | Shoot pistol |
| P | Pause |
| M | Mute |

## Play it

```sh
node serve.ts
```

Then open <http://localhost:8080> in desktop Chrome. No build step, no network
requests — every asset is vendored under `game/`.

## Tech

- Three.js r160, vendored as `game/vendor/three.module.min.js`
- Plain ES modules, no bundler, no build step
- Source split by system under `game/src/` — one clear job per file:
  `config`, `random`, `city`, `vehicles`, `traffic`, `pedestrians`, `police`,
  `player`, `missions`, `combat`, `hud`, `minimap`, `audio`, `save`, `input`,
  `main`

## Originality

Everything in Sunshine City is original: the city, the characters (Marco
Reyes, Lena Cruz), the story, the vehicles, and the art are made for this game.
Nothing is copied from Rockstar Games' Grand Theft Auto series or any other
commercial game.

## License

MIT — see [LICENSE](LICENSE).
