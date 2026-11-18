// Sunshine City — boot, game loop, screens, camera, wanted decay, busted.
// ?shot=cover|onfoot|chase|mission stages a deterministic scene instead of the
// menu; the loop then drives it forward with a scripted input and sets
// window.__shotReady after a couple of seconds for the screenshot.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { createInput, ACTION_PAUSE, ACTION_INTERACT, ACTION_MUTE } from './input.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { stageShot, isShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = isShot(shotName);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;

const canvas = document.getElementById('c');
const statusEl = document.getElementById('status');
const hudEl = document.getElementById('hud');
const menuEl = document.getElementById('menu');
const pauseEl = document.getElementById('pause');
const endEl = document.getElementById('end');
const endTitleEl = document.getElementById('endTitle');
const endTextEl = document.getElementById('endText');
const endBtnEl = document.getElementById('endBtn');

// --- Three.js setup: sun, sky, warm afternoon light over a coastal city.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87bfe8);
scene.fog = new THREE.Fog(0x9fc8e8, 180, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.9));
const sun = new THREE.DirectionalLight(0xffe8b0, 1.6);
sun.position.set(120, 180, 60);
scene.add(sun);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- World systems.
const city = buildCity(scene, seed);
const save = loadSave();
const audio = createAudio();
const input = createInput(canvas);
const player = createPlayer(scene, city.spawn);
const vehicles = createVehicles(scene, city.streets, seed);
const peds = createPedestrians(scene, city.streets, seed);
const police = createPolice(scene);
const combat = createCombat(scene);
const hud = createHud();

// --- Shared game state. Systems above read it; methods are filled in below.
const G = {
  seed, time: 0, cash: save.cash, save,
  wanted: 0, lastCrime: -999, heatLock: false,
  screen: 'menu', shotMode,
  city, player, vehicles, peds, police, audio, hud,
  camYaw: Math.PI, camPitch: 0.3, camDist: 8,
  shotInput: null, shotCam: null,
  loc: { garage: city.garage, safehouse: city.safehouse, pickup: city.pickup, deliver: city.deliver },
  decayTimer: 0,
  endContinue: null,
};
G.missions = createMissions(scene, G);

function announce(msg) { statusEl.textContent = msg; }

G.playerPos = () => {
  const car = vehicles.driven.car;
  return car ? car.pos : player.state.pos;
};
G.inCar = () => vehicles.driven.car !== null;
G.setWanted = (n) => {
  G.wanted = Math.max(0, Math.min(5, n));
  G.lastCrime = G.time;
  if (G.wanted === 0) {
    for (const cop of police.cops) { cop.mesh.visible = false; scene.remove(cop.mesh); }
    police.cops.length = 0;
  }
};
G.toast = (text, seconds) => hud.showToast(text, seconds || 2.5, G.time);
G.writeSave = () => writeSave(G.save);
G.updateObjective = () => hud.update(G);
G.teleportPlayer = (x, z) => {
  if (vehicles.driven.car) vehicles.exitCar();
  player.state.mesh.visible = true;
  player.state.pos.set(x, 0, z);
  player.state.health = 100;
};
G.hintText = () => {
  if (G.inCar()) return 'WASD drive · E exit · Shift is built into the pedal';
  const near = vehicles.nearestStealable(player.state.pos, 4);
  if (near) return 'Press E to steal this car';
  if (G.missions.state.index === 1 && G.missions.state.stage === 'pickup') return 'Get to the beacon — press E at the package';
  return 'WASD move · Shift run · Click shoot · E steal car';
};
G.showEnd = (title, text, btnLabel, onContinue) => {
  G.screen = 'end';
  endTitleEl.textContent = title;
  endTextEl.textContent = text;
  endBtnEl.textContent = btnLabel;
  endEl.style.display = 'flex';
  hudEl.style.display = 'none';
  G.endContinue = onContinue || null;
  announce(`${title}. ${text}`);
};
G.startPlay = () => {
  menuEl.style.display = 'none';
  endEl.style.display = 'none';
  pauseEl.style.display = 'none';
  hudEl.style.display = 'block';
  G.screen = 'play';
  audio.unlock();
  if (G.missions.state.stage === 'idle' && G.missions.state.index < 3) {
    G.missions.start(G.missions.state.index);
  }
  announce('Playing Sunshine City.');
};

function busted(reason) {
  audio.busted();
  audio.setEngine(0);
  audio.siren(false);
  const fine = Math.min(G.cash, 100);
  G.cash -= fine;
  G.save.cash = G.cash;
  G.writeSave();
  G.setWanted(0);
  G.showEnd('BUSTED', `${reason} The SCPD impounded your ride and fined you $${fine}. Cash: $${G.cash}.`, 'BACK TO THE STREETS', () => {
    G.teleportPlayer(city.spawn.x, city.spawn.z);
    G.camYaw = Math.PI;
    G.startPlay();
  });
}

// --- UI wiring.
document.getElementById('startBtn').addEventListener('click', () => G.startPlay());
document.getElementById('resumeBtn').addEventListener('click', () => {
  pauseEl.style.display = 'none';
  hudEl.style.display = 'block';
  G.screen = 'play';
});
endBtnEl.addEventListener('click', () => {
  endEl.style.display = 'none';
  const next = G.endContinue;
  G.endContinue = null;
  if (next) next();
  else {
    // Mission complete: start the next job, or free-roam if the story is done.
    if (G.missions.state.index < 3) G.missions.start(G.missions.state.index);
    G.startPlay();
  }
});

// --- Camera: third-person orbit; while driving it eases back behind the car.
let lastLookAt = -99;
function updateCamera(dt) {
  let target;
  let dist = G.camDist;
  let pitch = G.camPitch;
  if (G.shotCam) {
    if (G.shotCam.follow && vehicles.driven.car) {
      G.camYaw = vehicles.driven.car.heading + Math.PI;
    } else if (G.shotCam.yaw !== undefined) {
      G.camYaw = G.shotCam.yaw;
    }
    pitch = G.shotCam.pitch ?? pitch;
    dist = G.shotCam.dist ?? dist;
  }
  if (G.inCar()) {
    const car = vehicles.driven.car;
    target = car.pos;
    dist = G.shotCam ? dist : 12;
    if (!G.shotCam && G.time - lastLookAt > 2.5) {
      // Ease the camera behind the car when the player is not looking around.
      let want = car.heading + Math.PI;
      let dh = want - G.camYaw;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      G.camYaw += dh * Math.min(1, dt * 1.2);
    }
  } else {
    target = player.state.pos;
    dist = G.shotCam ? dist : 7.5;
  }
  const h = Math.max(2.2, Math.sin(pitch) * dist + 1.2);
  const back = Math.cos(pitch) * dist;
  camera.position.set(
    target.x + Math.sin(G.camYaw) * back,
    h,
    target.z + Math.cos(G.camYaw) * back,
  );
  camera.lookAt(target.x, 1.6, target.z);
}

function stepPlay(dt) {
  G.time += dt;
  const look = input.takeLook();
  if (look.yaw !== 0 || look.pitch !== 0) {
    G.camYaw -= look.yaw;
    G.camPitch = Math.max(0.06, Math.min(1.1, G.camPitch + look.pitch));
    lastLookAt = G.time;
  }
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    G.toast(muted ? 'Sound muted (M)' : 'Sound on (M)', 1.2);
  }
  if (actions & ACTION_PAUSE) {
    G.screen = 'pause';
    pauseEl.style.display = 'flex';
    hudEl.style.display = 'none';
    audio.setEngine(0);
    audio.siren(false);
    return;
  }
  if (actions & ACTION_INTERACT) {
    if (!G.missions.interact()) {
      if (G.inCar()) {
        const car = vehicles.exitCar();
        player.state.mesh.visible = true;
        player.state.pos.set(car.pos.x + 2.5, 0, car.pos.z + 1);
        player.state.yaw = car.heading;
        G.camYaw = car.heading + Math.PI;
      } else {
        const car = vehicles.nearestStealable(player.state.pos, 4);
        if (car) {
          vehicles.steal(car);
          player.state.mesh.visible = false;
          police.addWanted(G, 1);
          audio.chime();
          G.toast('Car stolen! Wanted +1 — the cops saw that.', 2);
          G.camYaw = car.heading + Math.PI;
        }
      }
    }
  }
  if (input.takeClick() && !G.inCar()) combat.shoot(G, camera);

  const bounds = 300;
  if (G.inCar()) {
    vehicles.updateDriven(dt, G.shotInput ? { axis: () => G.shotInput, running: () => false } : input,
      city.colliders, bounds, peds.peds,
      () => { police.addWanted(G, 1); G.toast('You hit a pedestrian! Wanted +1', 1.5); },
      () => { audio.crash(); });
  } else {
    player.update(dt, G.shotInput ? { axis: () => G.shotInput, running: () => false } : input,
      G.camYaw, city.colliders, bounds, G.time);
  }
  vehicles.updateTraffic(dt);
  peds.update(dt);
  const targetPos = G.playerPos();
  police.update(dt, G.wanted, targetPos, G.inCar(), city.colliders, G.time);

  // Busted: a cop car touches Marco on foot. Ramming while driving hurts instead.
  const near = police.nearestCop(targetPos);
  if (near.cop) {
    if (!G.inCar() && near.dist < 2.6) {
      busted('A cop car ran you down.');
      return;
    }
    if (G.inCar() && near.dist < 3.4) {
      player.state.health -= 5 * dt;
      player.state.lastDamage = G.time;
      vehicles.driven.speed *= (1 - 0.6 * dt);
    }
  }

  // Wanted decays when no crime for a while and no cop is close.
  if (!G.heatLock && G.wanted > 0 && G.time - G.lastCrime > 10) {
    if (!near.cop || near.dist > 45) {
      G.decayTimer += dt;
      if (G.decayTimer > 6) {
        G.decayTimer = 0;
        G.setWanted(G.wanted - 1);
        if (G.wanted > 0) G.toast('Heat cooling off…', 1.5);
      }
    } else G.decayTimer = 0;
  }

  // Health: slow regen after 5 calm seconds.
  if (G.time - player.state.lastDamage > 5 && player.state.health < 100) {
    player.state.health = Math.min(100, player.state.health + 6 * dt);
  }
  if (player.state.health <= 0) {
    busted('You took too many hits.');
    return;
  }

  G.missions.update(dt);
  combat.update(dt);
  audio.setEngine(G.inCar() ? Math.abs(vehicles.driven.speed) / 42 : 0);
  audio.siren(G.wanted > 0 && G.screen === 'play');
  updateCamera(dt);
  hud.update(G);
}

// --- Main loop.
let last = performance.now();
let shotFrames = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (G.screen === 'play') {
    stepPlay(dt);
  } else if (G.screen === 'menu') {
    // Slow orbit over the city behind the title screen.
    G.time += dt;
    const a = G.time * 0.05;
    camera.position.set(Math.sin(a) * 180, 70, Math.cos(a) * 180);
    camera.lookAt(0, 0, 20);
    vehicles.updateTraffic(dt);
    peds.update(dt);
  }
  renderer.render(scene, camera);
  if (shotMode) {
    shotFrames += 1;
    if (shotFrames === 55) window.__shotReady = true;
  }
}

if (shotMode) {
  stageShot(shotName, G);
} else {
  announce('Sunshine City. Press Start Engine to play.');
}
requestAnimationFrame(frame);
