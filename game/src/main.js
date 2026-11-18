// Sunshine City — entry point: builds the renderer, the world and every
// system, then runs the loop: input, player, traffic, police, missions,
// combat, camera, HUD and minimap. Also handles start / pause / game over,
// demo URL modes for screenshots, and saving progress.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { buildCity } from './city.js';
import { spawnParkedCars } from './vehicles.js';
import { TrafficSystem } from './traffic.js';
import { PedestrianSystem } from './pedestrians.js';
import { PoliceSystem } from './police.js';
import { Player } from './player.js';
import { MissionSystem } from './missions.js';
import { CombatSystem } from './combat.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { loadSave, storeSave } from './save.js';
import { clamp } from './random.js';

const params = new URLSearchParams(window.location.search);
const demoMode = params.get('demo') || '';
const autoStart = params.get('autostart') === '1' || demoMode !== '';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 12, -18);

const city = buildCity(scene);
const parkedCars = spawnParkedCars(scene);
const traffic = new TrafficSystem(scene);
const peds = new PedestrianSystem(scene);
const police = new PoliceSystem(scene, city.colliders);
const saved = loadSave();

const player = new Player(scene, city.spawn);
player.cash = saved.cash || 0;

const missions = new MissionSystem(scene, city);
missions.index = clamp(saved.missionsCompleted || 0, 0, 3);
if (missions.index > 0) missions.showMessage(`Selamat datang kembali, Marco. ${missions.index} misi sudah selesai.`, 6);

const combat = new CombatSystem(scene, camera);
const hud = new Hud();
const minimap = new Minimap(document.getElementById('minimap'));
const sounds = new SoundBank();
const input = new Input(canvas);

let running = false;
let paused = false;
let gameOver = false;
let gameOverReason = '';
let cameraYaw = 0;
let cameraPitch = 0.42;
let lastTime = performance.now();
let saveTimer = 0;
let ramSoundCooldown = 0;

function applyDemoMode() {
  if (demoMode === 'chase') {
    // Player already driving, three-star heat, cruisers closing in.
    const car = parkedCars[0];
    if (car) {
      parkedCars.splice(0, 1);
      player.enterCar(car);
      car.x = -30;
      car.z = 30;
      car.heading = Math.PI / 2;
      car.speed = 22;
      car.syncMesh();
    }
    player.setWanted(3);
    for (let i = 0; i < 3; i++) police.spawnCruiser(player.position.x, player.position.z);
  } else if (demoMode === 'mission') {
    missions.index = 1;
    missions.state = 'idle';
    missions.idleTimer = 0.2;
    const car = parkedCars[1] || parkedCars[0];
    if (car) {
      const index = parkedCars.indexOf(car);
      if (index >= 0) parkedCars.splice(index, 1);
      player.enterCar(car);
      car.x = -70;
      car.z = -50;
      car.heading = Math.PI / 2;
      car.speed = 14;
      car.syncMesh();
    }
  } else if (demoMode === 'onfoot') {
    player.x = 10;
    player.z = 20;
    player.heading = Math.PI * 0.75;
    player.mesh.position.set(player.x, 0, player.z);
  } else if (demoMode === 'beach') {
    player.x = -40;
    player.z = 225;
    player.heading = Math.PI;
    player.mesh.position.set(player.x, 0, player.z);
  }
}

function startGame() {
  sounds.ensure();
  sounds.click();
  running = true;
  paused = false;
  gameOver = false;
  hud.hideStart();
  hud.hideGameOver();
  input.lockPointer();
  applyDemoMode();
}

function endGame(title, text) {
  if (gameOver) return;
  gameOver = true;
  running = false;
  gameOverReason = title;
  sounds.stopSiren();
  sounds.setEngine(0, false);
  input.unlockPointer();
  storeSave({
    cash: player.cash,
    missionsCompleted: missions.index,
    carsStolen: player.carsStolen,
    bestScore: Math.max(saved.bestScore || 0, player.cash),
  });
  hud.showGameOver(title, text);
}

function restartGame() {
  window.location.reload();
}

document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('resume-button').addEventListener('click', () => {
  paused = false;
  hud.showPause(false);
  input.lockPointer();
});
document.getElementById('restart-button').addEventListener('click', restartGame);
document.getElementById('retry-button').addEventListener('click', restartGame);
document.getElementById('menu-button').addEventListener('click', restartGame);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera(dt) {
  const delta = input.consumeMouseDelta();
  if (input.pointerLocked) {
    cameraYaw -= delta.dx * 0.0032;
    cameraPitch = clamp(cameraPitch + delta.dy * 0.0022, 0.12, 1.1);
  }

  const pos = player.position;
  const heading = player.vehicle ? player.vehicle.heading : player.heading;
  // Camera follows behind the player / car, smoothing toward its target.
  const targetYaw = player.vehicle ? heading + Math.PI : cameraYaw;
  const distance = player.vehicle ? CONFIG.cameraDistance + 3 : CONFIG.cameraDistance;
  const height = player.vehicle ? CONFIG.cameraHeight + 1 : CONFIG.cameraHeight;
  const camX = pos.x + Math.sin(targetYaw) * distance;
  const camZ = pos.z + Math.cos(targetYaw) * distance;
  const camY = height + Math.sin(cameraPitch) * 4;
  camera.position.x += (camX - camera.position.x) * Math.min(1, dt * CONFIG.cameraLerp);
  camera.position.y += (camY - camera.position.y) * Math.min(1, dt * CONFIG.cameraLerp);
  camera.position.z += (camZ - camera.position.z) * Math.min(1, dt * CONFIG.cameraLerp);
  camera.lookAt(pos.x, 1.6, pos.z);
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!running || paused || gameOver) {
    renderer.render(scene, camera);
    return;
  }

  if (input.consumePause()) {
    paused = true;
    hud.showPause(true);
    input.unlockPointer();
    return;
  }
  if (input.consumeMute()) {
    const muted = sounds.toggleMute();
    missions.showMessage(muted ? 'Suara dimatikan (M untuk menyalakan).' : 'Suara dinyalakan.', 3);
  }

  ramSoundCooldown = Math.max(0, ramSoundCooldown - dt);

  player.update(dt, input, city.colliders, parkedCars, cameraYaw, {
    onSteal: () => {
      sounds.chime();
      missions.showMessage('Mobil didapat! Polisi mungkin melihatmu. Bawa ke garasi biru.', 5);
    },
    onStealFail: () => {
      missions.showMessage('Tidak ada mobil parkir di dekatmu. Cari yang lebih dekat.', 3);
    },
    onCrash: (impactSpeed) => {
      sounds.crash();
      if (impactSpeed > 18) {
        player.takeDamage(6);
        missions.showMessage('Tabrakan keras! Kesehatan berkurang.', 3);
      }
    },
  });

  traffic.update(dt, player.vehicle);
  peds.update(dt);

  // Car-vs-pedestrian hits while driving.
  if (player.vehicle && Math.abs(player.vehicle.speed) > 4) {
    const hit = peds.hitAt(player.vehicle.x, player.vehicle.z, 2.4);
    if (hit) {
      player.addWanted(2);
      sounds.crash();
      missions.showMessage('Kamu menabrak pejalan kaki! Wanted naik.', 4);
    }
  }

  police.update(
    dt,
    player.wanted,
    player.position.x,
    player.position.z,
    player.vehicle ? 1 : 0,
    () => {
      // Caught on foot.
      endGame('BUSTED!', 'Polisi menangkap Marco di jalan. Sunshine City masih menunggumu — coba lagi.');
    },
    (cruiser) => {
      // Rammed while driving: damage with a cooldown so one cruiser cannot melt health.
      if (player.ramCooldown <= 0) {
        player.ramCooldown = 1.2;
        const wasted = player.takeDamage(CONFIG.policeRamDamage);
        sounds.crash();
        if (ramSoundCooldown <= 0) {
          ramSoundCooldown = 1;
        }
        if (wasted) {
          endGame('WASTED!', 'Mobil Marco hancur ditabrak polisi. Bangkit dan coba lagi.');
        }
      }
    },
  );

  missions.update(dt, player, (reward) => {
    sounds.chime();
    if (missions.allDone) {
      missions.showMessage('SEMUA MISI SELESAI! Kamu legenda Sunshine City, Marco.', 8);
    }
  });

  // Shooting: click fires; holding the mouse keeps firing at the cooldown rate.
  if (input.mouseDown || input.consumeShoot()) {
    if (combat.tryShoot(player, police, peds, (hitKind) => {
      sounds.gunshot();
      if (hitKind) peds.panicNear(player.position.x, player.position.z, 30);
    })) {
      // Shot fired this frame.
    }
  }
  combat.update(dt);

  // Siren follows the wanted level; engine hum follows the speed.
  if (player.wanted > 0) sounds.startSiren();
  else sounds.stopSiren();
  const speedRatio = player.vehicle ? Math.abs(player.vehicle.speed) / CONFIG.carMaxSpeed : 0;
  sounds.setEngine(speedRatio, !!player.vehicle);

  player.updateWanted(dt);

  if (player.health <= 0 && !gameOver) {
    endGame('WASTED!', 'Marco tumbang. Sunshine City masih menunggumu — coba lagi.');
  }

  // Autosave progress every 10 seconds.
  saveTimer += dt;
  if (saveTimer > 10) {
    saveTimer = 0;
    storeSave({
      cash: player.cash,
      missionsCompleted: missions.index,
      carsStolen: player.carsStolen,
      bestScore: Math.max(saved.bestScore || 0, player.cash),
    });
  }

  updateCamera(dt);
  hud.update(player, missions, !!player.vehicle);
  minimap.draw(city, player, traffic, police, peds, missions);
  renderer.render(scene, camera);
}

// Pre-render one frame behind the start screen so the menu shows the city.
updateCamera(0.016);
hud.update(player, missions, false);
minimap.draw(city, player, traffic, police, peds, missions);
renderer.render(scene, camera);

if (autoStart) {
  startGame();
} else {
  hud.showStart();
}

requestAnimationFrame(tick);
