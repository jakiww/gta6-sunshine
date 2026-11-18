// Sunshine City — the story: three missions from Lena Cruz, played in
// order. Each mission has a marker in the world, an objective line in
// the HUD, and a cash reward. The mission beacon is a spinning golden
// ring the player drives or walks into.

import { MISSIONS } from './config.js';
import { distance2D, formatTime } from './util.js';

export class Missions {
  constructor(scene, city, game) {
    this.scene = scene;
    this.city = city;
    this.game = game;
    this.index = 0; // which mission is active
    this.done = false;
    this.stage = 'start'; // per-mission stage, e.g. 'pickup' then 'deliver'
    this.timeLeft = 0;
    this.marker = null;
    this.beacon = null;
    this._makeBeacon();
    this._setMarkerForCurrent();
  }

  get current() {
    return this.done ? null : MISSIONS[this.index];
  }

  _makeBeacon() {
    const geo = new THREE.TorusGeometry(3, 0.35, 10, 28);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd23e });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.rotation.x = Math.PI / 2;
    this.scene.add(this.beacon);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 30, 6);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.25 });
    this.beaconPole = new THREE.Mesh(poleGeo, poleMat);
    this.scene.add(this.beaconPole);
  }

  _setMarkerForCurrent() {
    const m = this.current;
    if (!m) {
      this.marker = null;
      this.beacon.visible = false;
      this.beaconPole.visible = false;
      return;
    }
    if (m.id === 'first-wheels') {
      this.marker = { x: this.city.places.garageDoor.x, z: this.city.places.garageDoor.z, radius: 6, label: 'Garage' };
      this.stage = 'deliver-car';
    } else if (m.id === 'package-run') {
      this.marker = { x: this.city.places.pier.x, z: this.city.places.pier.z, radius: 5, label: 'Pier pickup' };
      this.stage = 'pickup';
    } else if (m.id === 'lose-the-heat') {
      this.marker = null;
      this.stage = 'evade';
      // The heat starts the moment the mission begins.
      this.game.setWanted(3);
      this.game.hud.showMessage('Lose the cops! Wanted level must hit zero.', 5);
    }
    this._placeBeacon();
  }

  _placeBeacon() {
    if (!this.marker) {
      this.beacon.visible = false;
      this.beaconPole.visible = false;
      return;
    }
    this.beacon.visible = true;
    this.beaconPole.visible = true;
    this.beacon.position.set(this.marker.x, 1.2, this.marker.z);
    this.beaconPole.position.set(this.marker.x, 15, this.marker.z);
  }

  objectiveText() {
    const m = this.current;
    if (!m) return 'All missions complete — free roam. Press M for the next job.';
    if (m.id === 'first-wheels') return 'MISSION 1 — First Wheels: steal a parked car (E), drive it to the garage.';
    if (m.id === 'package-run') {
      if (this.stage === 'pickup') return 'MISSION 2 — Package Run: pick up the package at the pier.';
      return 'MISSION 2 — Package Run: deliver to the north garage! Time left ' + formatTime(this.timeLeft);
    }
    if (m.id === 'lose-the-heat') return 'MISSION 3 — Lose the Heat: stay clean until your wanted level hits zero.';
    return m.brief;
  }

  completeMission() {
    const m = this.current;
    if (!m) return;
    this.game.cash += m.reward;
    this.game.sounds.cash();
    this.game.sounds.missionDone();
    this.game.hud.showMessage('MISSION COMPLETE: ' + m.title + '  +$' + m.reward, 5);
    this.game.saveGame();
    this.index += 1;
    if (this.index >= MISSIONS.length) {
      this.done = true;
      this.marker = null;
      this.beacon.visible = false;
      this.beaconPole.visible = false;
      this.game.hud.showMessage('ALL MISSIONS DONE! Sunshine City is yours, Marco.', 8);
    } else {
      this._setMarkerForCurrent();
      const next = this.current;
      this.game.hud.showMessage('NEW MISSION: ' + next.title + ' — ' + next.brief, 7);
    }
  }

  update(dt) {
    const m = this.current;
    if (!m) return;
    // Spin the beacon.
    if (this.beacon.visible) {
      this.beacon.rotation.z += dt * 1.5;
      this.beacon.position.y = 1.2 + Math.sin(this.game.time * 2) * 0.3;
    }
    const p = this.game.player;
    const pos = p.inCar ? p.inCar.pos : p.pos;

    if (m.id === 'first-wheels') {
      // Complete when Marco arrives at the garage in a stolen car.
      if (p.inCar && p.inCar.stolen && this.marker) {
        if (distance2D(pos.x, pos.z, this.marker.x, this.marker.z) < this.marker.radius) {
          this.completeMission();
        }
      }
    } else if (m.id === 'package-run') {
      if (this.stage === 'pickup') {
        if (this.marker && distance2D(pos.x, pos.z, this.marker.x, this.marker.z) < this.marker.radius) {
          this.stage = 'deliver';
          this.timeLeft = m.timeLimit;
          this.marker = { x: -137.5, z: -82.5, radius: 6, label: 'North garage' };
          this._placeBeacon();
          this.game.sounds.pickup();
          this.game.hud.showMessage('Package picked up! Deliver to the north garage in 90 seconds!', 5);
        }
      } else if (this.stage === 'deliver') {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.game.sounds.fail();
          this.game.hud.showMessage('Too slow — the package run failed. Try again from the pier.', 5);
          this.stage = 'pickup';
          this.marker = { x: this.city.places.pier.x, z: this.city.places.pier.z, radius: 5, label: 'Pier pickup' };
          this._placeBeacon();
        } else if (this.marker && distance2D(pos.x, pos.z, this.marker.x, this.marker.z) < this.marker.radius) {
          this.completeMission();
        }
      }
    } else if (m.id === 'lose-the-heat') {
      if (this.game.wanted <= 0) {
        this.completeMission();
      }
    }
  }

  // Called when Marco steals a car during mission 1, so the HUD can
  // point him at the garage.
  onCarStolen() {
    if (this.current && this.current.id === 'first-wheels') {
      this.game.hud.showMessage('Nice wheels! Now drive to the yellow garage marker.', 4);
    }
  }

  reset() {
    this.index = 0;
    this.done = false;
    this.stage = 'start';
    this.timeLeft = 0;
    this._setMarkerForCurrent();
  }
}
