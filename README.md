# Meridian Courier — Skyline Run

![make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg)
![rank](https://make.fun/badge/best-flight-game-20261126-0057/Joppy26/best-flight-game-20261126-0057/rank.svg)
![reward](https://make.fun/badge/best-flight-game-20261126-0057/Joppy26/best-flight-game-20261126-0057/reward.svg)

Entry for the [best flight game bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

## The game

You are the courier pilot of the Meridian valley, flying a yellow mail plane down a river valley at sunset. Chase view over fields, a river, a road, farmhouses and a ridge, with the runway and the sky rings ahead of you.

**Three missions, three kinds of flying:**

1. **Ring Run** — thread all 8 glowing sky rings before your fuel runs dry.
2. **Valley Landing** — fly down the valley, line up with runway 09, and touch down slow and level. Too fast, too steep, or off the centreline and the sortie ends.
3. **Canyon Slalom** — thread 8 red gates low over the river, under 400 ft, or they do not count.

**Decisions that matter:** full throttle burns fuel twice as fast as cruise, hard banks bleed speed, a missed ring costs damage, and every ring you fly clean tops the tank up a little. Fuel, damage, a time limit, and a landing that judges your vertical speed, alignment, and centreline.

## Controls

- **Left / Right** (or **A / D**) — bank and turn
- **Up / Down** — climb / dive
- **W / S** — throttle up / down
- **Mouse** — steer toward the pointer
- **Space** — airbrake
- **1 / 2 / 3** — pick a mission, **Enter** — take off, **P** — pause, **R** — restart, **M** — sound on/off

## HUD

Compass tape and digital heading across the top, airspeed tape (left) and altitude tape (right), an artificial horizon ball, throttle / fuel / damage bars, vertical speed, distance flown, mission objective, and a countdown timer. The next ring gets a guidance marker with its distance.

## Play it

Static files, no build step, no network request. Serve `game/` with any static server and open `game/index.html` in desktop Chrome. Sound is synthesised with WebAudio; there are no audio files.

Screenshot staging: `game/index.html?shot=cover`, `?shot=rings`, `?shot=landing`, or `?shot=canyon` jumps straight to a staged moment of the game.

## Files

- `game/index.html` — page and menus
- `game/main.js` — game loop, input, state machine, screenshot staging
- `game/physics.js` — flight model: bank, turn, climb, drag, fuel burn
- `game/terrain.js` — valley world: sky, ridge, fields, river, road, runway 09
- `game/aircraft.js` — the courier plane and the rings / gates
- `game/missions.js` — mission definitions, ring checks, scoring
- `game/hud.js` — compass, tapes, attitude ball, bars, objectives
- `game/audio.js` — synthesised engine hum, chimes, warnings
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
