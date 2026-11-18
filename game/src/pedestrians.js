// Sunshine City — pedestrians strolling the sidewalks, with simple
// walk cycles, panic fleeing when a gun goes off, and a fall when hit.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { mulberry32, range, rangeInt } from './random.js';
import { roadCoords } from './city.js';

const SHIRT_COLORS = [0xe8e8e8, 0xd43a2f, 0x2f6fd4, 0xf2c230, 0x2fd47a, 0xd47a2f, 0x7a2fd4];
const PANTS_COLORS = [0x2a2a3a, 0x4a3a2a, 0x3a3a3a, 0x2f4a6a];

export class Pedestrian {
  constructor(mesh, x, z, heading, speed) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = speed;
    this.baseSpeed = speed;
    this.alive = true;
    this.panicTimer = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.leftLeg = mesh.userData.leftLeg;
    this.rightLeg = mesh.userData.rightLeg;
    this.leftArm = mesh.userData.leftArm;
    this.rightArm = mesh.userData.rightArm;
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    this.walkPhase += this.speed * 0.09;
    const swing = Math.sin(this.walkPhase) * 0.5 * Math.min(1, this.speed / 2);
    if (this.leftLeg) this.leftLeg.rotation.x = swing;
    if (this.rightLeg) this.rightLeg.rotation.x = -swing;
    if (this.leftArm) this.leftArm.rotation.x = -swing * 0.7;
    if (this.rightArm) this.rightArm.rotation.x = swing * 0.7;
  }
}

function buildPedestrianMesh(shirt, pants, skin) {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), skinMat);
  head.position.y = 1.62;
  group.add(head);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.34), shirtMat);
  torso.position.y = 1.12;
  group.add(torso);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), pantsMat);
  leftLeg.position.set(-0.16, 0.39, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.24), pantsMat);
  rightLeg.position.set(0.16, 0.39, 0);
  group.add(rightLeg);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), shirtMat);
  leftArm.position.set(-0.42, 1.15, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), shirtMat);
  rightArm.position.set(0.42, 1.15, 0);
  group.add(rightArm);

  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  return group;
}

export class PedestrianSystem {
  constructor(scene) {
    this.scene = scene;
    this.peds = [];
    const rand = mulberry32(99);
    const roads = roadCoords();
    for (let i = 0; i < CONFIG.pedestrianCount; i++) {
      const vertical = rand() < 0.5;
      const road = roads[rangeInt(rand, 0, roads.length - 1)];
      const along = range(rand, -190, 190);
      const side = rand() < 0.5 ? -1 : 1;
      const offset = CONFIG.roadWidth / 2 + 2.4;
      const x = vertical ? road + side * offset : along;
      const z = vertical ? along : road + side * offset;
      const heading = vertical ? (rand() < 0.5 ? 0 : Math.PI) : (rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const shirt = SHIRT_COLORS[rangeInt(rand, 0, SHIRT_COLORS.length - 1)];
      const pants = PANTS_COLORS[rangeInt(rand, 0, PANTS_COLORS.length - 1)];
      const skin = [0xf2c9a0, 0xc98a5a, 0x8a5a32, 0xf7d7b0][rangeInt(rand, 0, 3)];
      const mesh = buildPedestrianMesh(shirt, pants, skin);
      const ped = new Pedestrian(mesh, x, z, heading, range(rand, CONFIG.pedestrianSpeedMin, CONFIG.pedestrianSpeedMax));
      scene.add(mesh);
      this.peds.push(ped);
    }
  }

  panicNear(x, z, radius) {
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      const dist = Math.hypot(ped.x - x, ped.z - z);
      if (dist < radius) {
        ped.panicTimer = 4;
        ped.heading = Math.atan2(ped.x - x, ped.z - z);
      }
    }
  }

  update(dt) {
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      if (ped.panicTimer > 0) {
        ped.panicTimer -= dt;
        ped.speed = ped.baseSpeed * 3.2;
      } else {
        ped.speed = ped.baseSpeed;
      }
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
      if (ped.x > 205) ped.x = -205;
      if (ped.x < -205) ped.x = 205;
      if (ped.z > 205) ped.z = -205;
      if (ped.z < -205) ped.z = 205;
      ped.syncMesh();
    }
  }

  hitAt(x, z, radius) {
    for (const ped of this.peds) {
      if (!ped.alive) continue;
      if (Math.hypot(ped.x - x, ped.z - z) < radius) {
        ped.alive = false;
        ped.mesh.rotation.x = -Math.PI / 2;
        ped.mesh.position.y = 0.3;
        return ped;
      }
    }
    return null;
  }
}
