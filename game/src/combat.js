// Sunshine City — pistol combat. Click to fire a hitscan shot from the
// camera: tracer line, muzzle flash, hit sparks, and damage to pedestrians
// and police cruisers. Shooting raises the wanted level.

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class CombatSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.cooldown = 0;
    this.tracer = null;
    this.tracerTimer = 0;
    this.flash = new THREE.PointLight(0xffc860, 0, 14);
    this.scene.add(this.flash);
    this.lastShotAt = 0;
  }

  tryShoot(player, police, peds, onShotFired) {
    if (this.cooldown > 0) return false;
    this.cooldown = CONFIG.pistolCooldown;
    this.lastShotAt = performance.now();

    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    // Find the closest hit among peds and police cruisers along the ray.
    let bestDist = CONFIG.pistolRange;
    let hitPoint = origin.clone().add(direction.clone().multiplyScalar(CONFIG.pistolRange));
    let hitKind = null;
    let hitTarget = null;

    const ray = new THREE.Raycaster(origin, direction, 0.1, CONFIG.pistolRange);
    for (const ped of peds.peds) {
      if (!ped.alive) continue;
      const target = new THREE.Vector3(ped.x, 1.2, ped.z);
      const toTarget = target.clone().sub(origin);
      const along = toTarget.dot(direction);
      if (along < 0 || along > bestDist) continue;
      const closest = origin.clone().add(direction.clone().multiplyScalar(along));
      if (closest.distanceTo(target) < 1.4) {
        bestDist = along;
        hitPoint = closest.clone();
        hitKind = 'ped';
        hitTarget = ped;
      }
    }
    for (const cruiser of police.cruisers) {
      if (cruiser.disabled) continue;
      const target = new THREE.Vector3(cruiser.x, 1.0, cruiser.z);
      const toTarget = target.clone().sub(origin);
      const along = toTarget.dot(direction);
      if (along < 0 || along > bestDist) continue;
      const closest = origin.clone().add(direction.clone().multiplyScalar(along));
      if (closest.distanceTo(target) < 2.6) {
        bestDist = along;
        hitPoint = closest.clone();
        hitKind = 'police';
        hitTarget = cruiser;
      }
    }
    void ray;

    // Tracer + muzzle flash.
    if (this.tracer) this.scene.remove(this.tracer);
    const tracerGeo = new THREE.BufferGeometry().setFromPoints([origin, hitPoint]);
    this.tracer = new THREE.Line(
      tracerGeo,
      new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.9 }),
    );
    this.scene.add(this.tracer);
    this.tracerTimer = 0.07;
    this.flash.position.copy(origin).add(direction.clone().multiplyScalar(2));
    this.flash.intensity = 60;
    setTimeout(() => { this.flash.intensity = 0; }, 60);

    // Hit sparks.
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffd23a }),
    );
    spark.position.copy(hitPoint);
    this.scene.add(spark);
    setTimeout(() => this.scene.remove(spark), 120);

    if (hitKind === 'ped' && hitTarget) {
      peds.hitAt(hitTarget.x, hitTarget.z, 1.5);
      player.addWanted(2);
    } else if (hitKind === 'police' && hitTarget) {
      police.damageNearest(hitTarget.x, hitTarget.z, CONFIG.pistolDamage);
      player.addWanted(1);
    } else {
      // Wild shot still draws attention if police are near.
      player.addWanted(0);
    }

    if (onShotFired) onShotFired(hitKind, hitPoint);
    return true;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0 && this.tracer) {
        this.scene.remove(this.tracer);
        this.tracer = null;
      }
    }
  }
}
