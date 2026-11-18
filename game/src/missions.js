// Sunshine City — the three-mission story arc for Marco and Lena Cruz.
// Missions chain automatically: steal a car, run a timed package delivery,
// then lose a three-star wanted level. Each pays cash on completion.

import * as THREE from 'three';
import { CONFIG, MISSION_DEFS } from './config.js';
import { distance2D } from './random.js';

function makeBeacon(color) {
  const group = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
    }),
  );
  column.position.y = 15;
  group.add(column);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.25, 8, 24),
    new THREE.MeshBasicMaterial({ color }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.2, 8),
    new THREE.MeshBasicMaterial({ color }),
  );
  marker.position.y = 4.5;
  marker.rotation.x = Math.PI;
  group.add(marker);
  group.userData.marker = marker;
  group.userData.ring = ring;
  return group;
}

export class MissionSystem {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.index = 0; // 0-based into MISSION_DEFS
    this.state = 'idle'; // idle | active | done | complete
    this.beacon = null;
    this.beaconTarget = null;
    this.timer = 0;
    this.timerLimit = 0;
    this.evadeTimer = 0;
    this.stage = 0; // mission 2: 0 = pick up package, 1 = deliver it
    this.hasPackage = false;
    this.pickupPos = { x: -60, z: -60 };
    this.message = '';
    this.messageTimer = 0;
  }

  get current() {
    return MISSION_DEFS[this.index] || null;
  }

  get active() {
    return this.state === 'active';
  }

  get allDone() {
    return this.index >= MISSION_DEFS.length;
  }

  showMessage(text, seconds) {
    this.message = text;
    this.messageTimer = seconds || 5;
  }

  setBeacon(x, z, color) {
    this.clearBeacon();
    this.beacon = makeBeacon(color || 0xf2c230);
    this.beacon.position.set(x, 0, z);
    this.beaconTarget = { x, z };
    this.scene.add(this.beacon);
  }

  clearBeacon() {
    if (this.beacon) {
      this.scene.remove(this.beacon);
      this.beacon = null;
      this.beaconTarget = null;
    }
  }

  startMission(player) {
    const def = this.current;
    if (!def) {
      this.state = 'complete';
      return;
    }
    this.state = 'active';
    this.stage = 0;
    this.hasPackage = false;
    this.timer = 0;
    this.evadeTimer = 0;
    this.showMessage(`${def.name} — ${def.briefing}`, 7);
    if (def.id === 1) {
      // Point at the blue garage; the mission completes once Marco arrives in a car.
      this.setBeacon(this.city.garagePos.x, this.city.garagePos.z, 0x2f6fd4);
      this.timerLimit = 0;
    } else if (def.id === 2) {
      this.setBeacon(this.pickupPos.x, this.pickupPos.z, 0xf2c230);
      this.timerLimit = CONFIG.mission2TimeLimit;
    } else if (def.id === 3) {
      player.setWanted(3);
      this.clearBeacon();
      this.timerLimit = 0;
      this.showMessage('Lose the Heat — kabur dari polisi sampai bintang wanted hilang!', 7);
    }
  }

  completeMission(player, onReward) {
    const def = this.current;
    if (!def) return;
    player.cash += def.reward;
    this.showMessage(`Misi selesai: ${def.name}! +$${def.reward}`, 6);
    if (onReward) onReward(def.reward);
    this.clearBeacon();
    this.state = 'done';
    this.index += 1;
    this.doneTimer = 3;
  }

  failMission(reason) {
    this.showMessage(`Misi gagal: ${reason}. Coba lagi dari awal misi.`, 6);
    this.clearBeacon();
    this.state = 'idle';
    this.idleTimer = 2;
    this.timer = 0;
    this.evadeTimer = 0;
    this.hasPackage = false;
  }

  update(dt, player, onReward) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.beacon) {
      this.beacon.userData.marker.position.y = 4.5 + Math.sin(performance.now() / 300) * 0.5;
      this.beacon.userData.ring.rotation.z += dt;
    }

    if (this.state === 'idle') {
      this.idleTimer = (this.idleTimer || 0) - dt;
      if (this.idleTimer <= 0 && !this.allDone) {
        this.startMission(player);
      }
      return;
    }
    if (this.state === 'done') {
      this.doneTimer -= dt;
      if (this.doneTimer <= 0) {
        this.state = 'idle';
        this.idleTimer = 1;
      }
      return;
    }
    if (this.state !== 'active') return;

    const def = this.current;
    const pos = player.position;

    if (def.id === 1) {
      // Reach the garage while driving a stolen car.
      if (player.vehicle && this.beaconTarget) {
        if (distance2D(pos.x, pos.z, this.beaconTarget.x, this.beaconTarget.z) < 9) {
          this.completeMission(player, onReward);
        }
      }
    } else if (def.id === 2) {
      this.timer += dt;
      if (this.timer > this.timerLimit) {
        this.failMission('waktu habis — paket tidak sampai tepat waktu');
        return;
      }
      if (this.stage === 0 && this.beaconTarget) {
        if (distance2D(pos.x, pos.z, this.beaconTarget.x, this.beaconTarget.z) < 7) {
          this.hasPackage = true;
          this.stage = 1;
          this.setBeacon(this.city.dockPos.x, this.city.dockPos.z - 30, 0x2fd47a);
          this.showMessage('Paket didapat! Antar ke dermaga sebelum waktu habis.', 5);
        }
      } else if (this.stage === 1 && this.beaconTarget) {
        if (distance2D(pos.x, pos.z, this.beaconTarget.x, this.beaconTarget.z) < 8) {
          this.completeMission(player, onReward);
        }
      }
    } else if (def.id === 3) {
      if (player.wanted === 0) {
        this.evadeTimer += dt;
        if (this.evadeTimer > 3) {
          this.completeMission(player, onReward);
        }
      } else {
        this.evadeTimer = 0;
      }
    }
  }

  get objectiveText() {
    if (this.allDone) return 'Semua misi selesai — Sunshine City milikmu, Marco.';
    if (this.state === 'idle') return 'Misi berikutnya segera dimulai...';
    if (this.state === 'done') return 'Misi selesai! Bersiap untuk misi berikutnya.';
    const def = this.current;
    if (!def) return '';
    if (def.id === 1) return 'Misi 1 — First Wheels: curi mobil (E), lalu bawa ke garasi biru.';
    if (def.id === 2) {
      const left = Math.max(0, Math.ceil(this.timerLimit - this.timer));
      if (this.stage === 0) return `Misi 2 — Package Run: ambil paket di penanda kuning. Sisa ${left} dtk.`;
      return `Misi 2 — Package Run: antar paket ke dermaga! Sisa ${left} dtk.`;
    }
    if (def.id === 3) return 'Misi 3 — Lose the Heat: kabur sampai wanted hilang.';
    return def.name;
  }
}
