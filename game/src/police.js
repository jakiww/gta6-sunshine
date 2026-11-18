// Sunshine City — police pursuit. The number of cruisers on the street
// matches the wanted level; they chase, ram, and flash their light bars.
// On foot, getting caught means Busted.

import { CONFIG } from './config.js';
import { buildCarMesh, Vehicle } from './vehicles.js';
import { collideCircle } from './city.js';
import { clamp, angleLerp } from './random.js';

export class PoliceSystem {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.cruisers = [];
    this.strobeTimer = 0;
    this.spawnCooldown = 0;
    this.parade = false; // demo staging: cruisers cruise ahead in formation, strobes on
  }

  desiredCount(wanted) {
    return Math.min(CONFIG.policeMax, wanted);
  }

  spawnCruiser(targetX, targetZ) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 25;
    const x = clamp(targetX + Math.sin(angle) * dist, -195, 195);
    const z = clamp(targetZ + Math.cos(angle) * dist, -195, 195);
    const mesh = buildCarMesh(0xf2f2f2, true);
    const cruiser = new Vehicle(mesh, x, z, Math.atan2(targetX - x, targetZ - z), 0xf2f2f2);
    cruiser.isPolice = true;
    cruiser.speed = 10;
    this.scene.add(mesh);
    this.cruisers.push(cruiser);
    return cruiser;
  }

  removeCruiser(cruiser) {
    this.scene.remove(cruiser.mesh);
    const index = this.cruisers.indexOf(cruiser);
    if (index >= 0) this.cruisers.splice(index, 1);
  }

  clearAll() {
    for (const cruiser of this.cruisers.slice()) this.removeCruiser(cruiser);
  }

  update(dt, wanted, targetX, targetZ, targetSpeed, onCaught, onRam) {
    // Keep the cruiser count in step with the wanted level.
    this.spawnCooldown -= dt;
    const want = this.desiredCount(wanted);
    if (this.cruisers.length < want && this.spawnCooldown <= 0) {
      this.spawnCruiser(targetX, targetZ);
      this.spawnCooldown = 2.5;
    }
    while (this.cruisers.length > want) {
      this.removeCruiser(this.cruisers[this.cruisers.length - 1]);
    }

    // Strobe the light bars.
    this.strobeTimer += dt;
    const phase = Math.floor(this.strobeTimer * 6) % 2 === 0;
    for (const cruiser of this.cruisers) {
      const left = cruiser.mesh.userData.strobeLeft;
      const right = cruiser.mesh.userData.strobeRight;
      if (left) left.visible = phase;
      if (right) right.visible = !phase;
    }

    // Parade mode (screenshot staging): cruisers cruise ahead of the player
    // in formation instead of chasing, so their light bars stay in frame.
    if (this.parade) {
      for (const cruiser of this.cruisers) {
        cruiser.heading = Math.PI / 2 + Math.sin(this.strobeTimer * 0.8 + cruiser.x * 0.1) * 0.05;
        cruiser.speed += (16 - cruiser.speed) * Math.min(1, dt * 1.5);
        cruiser.x += Math.sin(cruiser.heading) * cruiser.speed * dt;
        cruiser.z += Math.cos(cruiser.heading) * cruiser.speed * dt;
        cruiser.syncMesh();
      }
      return;
    }

    for (const cruiser of this.cruisers.slice()) {
      if (cruiser.disabled) {
        cruiser.speed *= 1 - 1.5 * dt;
        cruiser.syncMesh();
        continue;
      }
      // Steer toward the target with a little wobble so it feels alive.
      const desired = Math.atan2(targetX - cruiser.x, targetZ - cruiser.z);
      cruiser.heading = angleLerp(cruiser.heading, desired, Math.min(1, dt * 1.6));
      const dist = Math.hypot(targetX - cruiser.x, targetZ - cruiser.z);
      const targetCruise = dist > 60 ? CONFIG.policeSpeed : CONFIG.policeSpeed * 0.85;
      cruiser.speed += (targetCruise - cruiser.speed) * Math.min(1, dt * 0.9);

      const nextX = cruiser.x + Math.sin(cruiser.heading) * cruiser.speed * dt;
      const nextZ = cruiser.z + Math.cos(cruiser.heading) * cruiser.speed * dt;
      const resolved = collideCircle(this.colliders, nextX, nextZ, 2.1);
      if (resolved.hit) cruiser.speed *= 0.5;
      cruiser.x = resolved.x;
      cruiser.z = resolved.z;
      cruiser.syncMesh();

      // Catch / ram checks.
      const afterDist = Math.hypot(targetX - cruiser.x, targetZ - cruiser.z);
      if (afterDist < CONFIG.policeCatchRange) {
        if (targetSpeed === 0) {
          // Target on foot and a cruiser is on top of them: busted.
          if (onCaught) onCaught(cruiser);
        } else if (onRam) {
          onRam(cruiser, afterDist);
        }
      }
    }
  }

  damageNearest(x, z, damage) {
    let best = null;
    let bestDist = 6;
    for (const cruiser of this.cruisers) {
      const dist = Math.hypot(cruiser.x - x, cruiser.z - z);
      if (dist < bestDist) {
        bestDist = dist;
        best = cruiser;
      }
    }
    if (!best) return null;
    best.health -= damage;
    if (best.health <= 0 && !best.disabled) {
      best.disabled = true;
      best.mesh.rotation.z = 0.12;
    }
    return best;
  }
}
