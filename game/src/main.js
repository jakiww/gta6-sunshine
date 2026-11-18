// Sunshine City — the game itself: renderer, loop, state, and the
// wiring between every system. Marco Reyes, a sun-soaked procedural
// city, stealable cars, traffic, police, three story missions, a
// pistol, and a save that survives a reload.

import { WORLD, ECONOMY, WANTED, MISSIONS } from './config.js';
import { clamp } from './util.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { City } from './city.js';
import { Player } from './player.js';
import { Traffic, spawnParkedCars } from './vehicles.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { saveGame, loadGame } from './save.js';
import { applyShotPreset } from './shots.js';

export class Game {
  constructor() {
    this.time = 0;
    this.cash = ECONOMY.startCash;
    this.wanted = 0;
    this.state = 'start'; // 'start' | 'playing' | 'busted'
    this.lastCrashSound = -10;
    this._wantedAccumulator = 0;

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fd3f4);
    this.scene.fog = new THREE.Fog(0x8fd3f4, 180, 520);

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(-100, 30, 10);

    // Sun + sky fill.
    const sun = new THREE.DirectionalLight(0xfff2c0, 1.6);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -260;
    sun.shadow.camera.right = 260;
    sun.shadow.camera.top = 260;
    sun.shadow.camera.bottom = -260;
    sun.shadow.camera.far = 600;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xbfd9ff, 0.55));

    this.city = new City(this.scene);
    this.player = new Player(this.scene, this.city);
    this.traffic = new Traffic(this.scene, this.city);
    this.parkedCars = spawnParkedCars(this.scene, this.city, 12);
    this.sounds = new SoundBank();
    this.police = new Police(this.scene, this.city, this.sounds);
    this.hud = new Hud();
    this.minimap = new Minimap(document.getElementById('minimap'), this.city);
    this.missions = new Missions(this.scene, this.city, this);
    this.combat = new Combat(this.scene, this);
    this.input = new Input(canvas);

    this._restoreSave();
    this._wireButtons();
    this._wireResize();

    // Screenshot presets (?shot=cover|walk|chase|mission) skip the
    // start screen and jump straight into a real game state.
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      this.startGame();
      applyShotPreset(this, shot);
      // Give the scene a few frames to settle before the screenshot.
      this._shotWarmup = 45;
    } else {
      this.hud.showStart();
    }

    this._last = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  allCars() {
    return [...this.traffic.cars, ...this.parkedCars, ...this.police.cars];
  }

  setWanted(level) {
    this.wanted = clamp(level, 0, WANTED.max);
  }

  addWanted(amount) {
    this.setWanted(this.wanted + amount);
  }

  startGame() {
    this.sounds.unlock();
    this.state = 'playing';
    this.hud.hideStart();
    this.hud.hideBusted();
    this.hud.showMessage('Lena: ' + this.missions.current.brief, 7);
  }

  busted() {
    if (this.state !== 'playing') return;
    this.state = 'busted';
    this.sounds.fail();
    this.player.health = Math.max(this.player.health, 25);
    this.setWanted(0);
    this.police.clearAll();
    if (this.player.inCar) this.player.exitCar();
    this.player.pos.x = -110;
    this.player.pos.z = -20;
    this.player.mesh.position.set(this.player.pos.x, 0, this.player.pos.z);
    this.player.bustedTimer = 0;
    const fine = Math.min(this.cash, 200);
    this.cash -= fine;
    this.hud.showBusted();
    document.getElementById('busted-fine').textContent =
      'The cops caught you. Fine: $' + fine + '. Health restored — try again, cleaner this time.';
    this.saveGame();
  }

  resumeAfterBusted() {
    this.state = 'playing';
    this.hud.hideBusted();
    this.player.health = 100;
  }

  saveGame() {
    saveGame({
      cash: this.cash,
      missionsDone: this.missions.done ? MISSIONS.length : this.missions.index,
      wanted: this.wanted,
      health: this.player.health,
      pos: this.player.pos,
    });
  }

  _restoreSave() {
    const data = loadGame();
    if (!data) return;
    this.cash = data.cash || ECONOMY.startCash;
    if (data.missionsDone > 0 && data.missionsDone < MISSIONS.length) {
      this.missions.index = data.missionsDone;
      this.missions._setMarkerForCurrent();
    } else if (data.missionsDone >= MISSIONS.length) {
      this.missions.index = MISSIONS.length;
      this.missions.done = true;
      this.missions.marker = null;
    }
    this.hud.setStartStats(this.cash, Math.min(data.missionsDone || 0, MISSIONS.length));
  }

  _wireButtons() {
    document.getElementById('start-button').addEventListener('click', () => this.startGame());
    document.getElementById('resume-button').addEventListener('click', () => this.resumeAfterBusted());
    document.getElementById('mute-button').addEventListener('click', (e) => {
      const muted = !this.sounds.muted;
      this.sounds.setMuted(muted);
      e.target.textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On';
    });
    document.getElementById('help-button').addEventListener('click', () => this.hud.toggleHelp());
  }

  _wireResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _handleActions() {
    const input = this.input;
    const p = this.player;

    if (input.hit('KeyE')) {
      if (p.inCar) {
        p.exitCar();
        this.sounds.door();
        this.saveGame();
      } else {
        const car = p.nearestParkedCar(this.parkedCars, 4.5);
        if (car) {
          p.enterCar(car);
          car.parked = false;
          if (!car.stolen) {
            car.stolen = true;
            this.addWanted(WANTED.stealCar);
            this.missions.onCarStolen();
            this.sounds.door();
          }
        }
      }
    }

    if (input.hit('KeyF') || input.hit('MouseLeft')) {
      this.combat.shoot();
    }

    if (input.hit('KeyH')) this.hud.toggleHelp();
    if (input.hit('KeyM')) {
      this.sounds.setMuted(!this.sounds.muted);
    }
  }

  _updatePlaying(dt) {
    const p = this.player;

    // Wanted decays while Marco stays out of trouble.
    if (this.wanted > 0) {
      this._wantedAccumulator += WANTED.decayPerSecond * dt;
      if (this._wantedAccumulator >= 1) {
        this._wantedAccumulator -= 1;
        this.setWanted(this.wanted - 1);
      }
    } else {
      this._wantedAccumulator = 0;
    }

    if (p.inCar) {
      p.inCar.drive(dt, this.input, this.city);
      p.update(dt, this.input, this);
      // Speeding past police at high speed draws attention.
      if (Math.abs(p.inCar.speed) > 30 && this.wanted < WANTED.max) {
        this._speedHeat = (this._speedHeat || 0) + dt;
        if (this._speedHeat > 6) {
          this._speedHeat = 0;
          this.addWanted(1);
          this.hud.flashMessage('Speeding past the cops — wanted level up!', 0.4);
        }
      } else {
        this._speedHeat = 0;
      }
    } else {
      p.update(dt, this.input, this);
    }

    this.traffic.update(dt, this.allCars());
    this.police.update(dt, this);
    this.missions.update(dt);
    this.combat.update(dt);
    this.city.animate(dt, this.time);

    // Health slowly recovers when Marco is safe.
    if (this.wanted === 0 && p.health < 100 && !p.inCar) {
      p.heal(2 * dt);
    }
    if (p.health <= 0) this.busted();

    // Interaction prompt.
    if (!p.inCar) {
      const near = p.nearestParkedCar(this.parkedCars, 4.5);
      this.hud.showPrompt(near ? 'Press E to steal this car' : null);
    } else {
      this.hud.showPrompt('E — exit car   •   F — shoot (on foot)   •   H — help');
    }

    // Engine hum follows the driven car.
    this.sounds.engine(
      p.inCar ? Math.abs(p.inCar.speed) / 38 : 0,
      !!p.inCar,
    );

    this._handleActions();
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.time += dt;

    if (this.state === 'playing') {
      this._updatePlaying(dt);
      if (this._shotWarmup) {
        this._shotWarmup -= 1;
        // Freeze the warmup camera so screenshots are deterministic.
        if (this._shotWarmup === 0) window.__shotReady = true;
      }
    }

    this.player.updateCamera(this.camera, dt);
    this.minimap.draw(this);
    this.hud.update(this);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}

// Boot once the DOM is ready; the script tag sits at the end of body,
// so this runs immediately.
window.__game = new Game();
