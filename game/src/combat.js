// Sunshine City — combat: Marco's pistol. F fires a shot at the
// nearest traffic or police car in front of him; hits damage the car
// and raise the wanted level. Ammo is unlimited but the fire rate
// is capped, and every shot is loud.

import { distance2D } from './util.js';

export class Combat {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.cooldown = 0;
    this.ammo = Infinity;
    this.tracer = null;
    this.tracerLife = 0;
    this._makeTracer();
  }

  _makeTracer() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
    this.tracer = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe066 }));
    this.tracer.visible = false;
    this.scene.add(this.tracer);
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.tracerLife > 0) {
      this.tracerLife -= dt;
      if (this.tracerLife <= 0) this.tracer.visible = false;
    }
  }

  // Fire from Marco's position along his facing. Returns true on a hit.
  shoot() {
    if (this.cooldown > 0) return false;
    const p = this.game.player;
    if (p.inCar) return false; // no drive-by shooting in this build
    this.cooldown = 0.35;
    this.game.sounds.gunshot();
    p.gun.visible = true;
    setTimeout(() => { p.gun.visible = false; }, 120);

    const ox = p.pos.x;
    const oz = p.pos.z;
    const dx = Math.sin(p.heading);
    const dz = Math.cos(p.heading);
    const range = 45;

    let best = null;
    let bestAlong = range;
    for (const car of this.game.allCars()) {
      const cx = car.pos.x - ox;
      const cz = car.pos.z - oz;
      const along = cx * dx + cz * dz;
      if (along < 2 || along > range) continue;
      const side = Math.abs(cx * dz - cz * dx);
      if (side > 2.4) continue;
      if (along < bestAlong) { bestAlong = along; best = car; }
    }

    const endX = ox + dx * (best ? bestAlong : range);
    const endZ = oz + dz * (best ? bestAlong : range);
    const positions = this.tracer.geometry.attributes.position;
    positions.setXYZ(0, ox, 1.4, oz);
    positions.setXYZ(1, endX, 1.4, endZ);
    positions.needsUpdate = true;
    this.tracer.visible = true;
    this.tracerLife = 0.08;

    if (best) {
      this.game.setWanted(this.game.wanted + 1);
      this.game.hud.flashMessage('SHOT FIRED — wanted level up!', 0.3);
      if (best.isPolice) {
        // A hit police car backs off for a few seconds.
        best.speed = -8;
      } else if (best.driver === 'ai') {
        // A hit traffic car swerves away: give it a new heading.
        best.heading += 0.8;
        best.speed = Math.max(best.speed, 14);
      }
      return true;
    }
    return false;
  }
}
