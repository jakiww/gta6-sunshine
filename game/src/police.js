// Police: wanted level, chase AI, ramming, busted on touch, destructible cars.
import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { collideCircle } from './city.js';
import { WANTED_MAX } from './config.js';

export function createPolice(scene) {
  const cops = [];
  let flash = 0;

  function spawnCop(near) {
    const mesh = makeCarMesh(0x111418, true);
    scene.add(mesh);
    const cop = {
      mesh,
      pos: mesh.position,
      heading: 0,
      speed: 0,
      health: 100,
      alive: true,
    };
    // Spawn on a street near the player.
    const a = Math.random() * Math.PI * 2;
    cop.pos.set(near.x + Math.cos(a) * 55, 0, near.z + Math.sin(a) * 55);
    cop.pos.x = Math.max(-290, Math.min(290, cop.pos.x));
    cop.pos.z = Math.max(-290, Math.min(290, cop.pos.z));
    cops.push(cop);
    return cop;
  }

  function desiredCount(wanted) {
    return wanted === 0 ? 0 : Math.min(1 + wanted, 6);
  }

  function update(dt, wanted, targetPos, targetInCar, colliders, time) {
    const want = desiredCount(wanted);
    while (cops.filter((c) => c.alive).length < want) spawnCop(targetPos);
    flash += dt;
    const on = Math.floor(flash * 6) % 2 === 0;
    for (const cop of cops) {
      if (!cop.alive) continue;
      const barR = cop.mesh.userData.barR;
      const barB = cop.mesh.userData.barB;
      if (barR && barB) {
        barR.material.emissive.setHex(on ? 0xff0000 : 0x220000);
        barB.material.emissive.setHex(on ? 0x000022 : 0x0000ff);
      }
      const dx = targetPos.x - cop.pos.x;
      const dz = targetPos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - cop.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      const topSpeed = 24 + wanted * 2.5;
      cop.speed = Math.min(topSpeed, cop.speed + 14 * dt);
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      collideCircle(cop.pos, 2.2, colliders);
      cop.mesh.position.set(cop.pos.x, 0, cop.pos.z);
      cop.mesh.rotation.y = cop.heading;
      for (const w of cop.mesh.userData.wheels) w.rotation.x += cop.speed * dt * 2;
      void targetInCar; void time;
    }
  }

  function nearestCop(pos) {
    let best = null; let bestD = Infinity;
    for (const cop of cops) {
      if (!cop.alive) continue;
      const d = Math.hypot(cop.pos.x - pos.x, cop.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = cop; }
    }
    return { cop: best, dist: bestD };
  }

  function damageCop(cop, amount) {
    cop.health -= amount;
    if (cop.health <= 0 && cop.alive) {
      cop.alive = false;
      // Explosion flash: tip the car over and sink it.
      cop.mesh.rotation.z = 0.6;
      cop.mesh.position.y = -0.4;
      setTimeout(() => { cop.mesh.visible = false; }, 900);
      return true;
    }
    return false;
  }

  function addWanted(state, n) {
    state.wanted = Math.min(WANTED_MAX, state.wanted + n);
    state.lastCrime = state.time;
  }

  return { cops, update, nearestCop, damageCop, addWanted };
}
