// Sunshine City — Marco Reyes on foot and behind the wheel.
// Walking with camera-relative WASD, stealing parked cars with E,
// exiting with F, and taking damage from police rams.

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp, angleLerp } from './random.js';
import { collideCircle } from './city.js';
import { driveVehicle, nearestParkedCar } from './vehicles.js';

function buildMarcoMesh() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xc98a5a });
  const shirtMat = new THREE.MeshLambertMaterial({ color: 0x2fd4d4 });
  const jacketMat = new THREE.MeshLambertMaterial({ color: 0x1c2f42 });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 8), skinMat);
  head.position.y = 1.66;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.29, 0.12, 10), jacketMat);
  cap.position.y = 1.86;
  group.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.3), jacketMat);
  brim.position.set(0, 1.82, 0.3);
  group.add(brim);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.72, 0.36), shirtMat);
  torso.position.y = 1.16;
  group.add(torso);
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.5, 0.42), jacketMat);
  jacket.position.y = 1.3;
  group.add(jacket);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), pantsMat);
  leftLeg.position.set(-0.17, 0.4, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), pantsMat);
  rightLeg.position.set(0.17, 0.4, 0);
  group.add(rightLeg);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.64, 0.18), shirtMat);
  leftArm.position.set(-0.44, 1.18, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.64, 0.18), shirtMat);
  rightArm.position.set(0.44, 1.18, 0);
  group.add(rightArm);

  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  return group;
}

export class Player {
  constructor(scene, spawn) {
    this.mesh = buildMarcoMesh();
    this.x = spawn.x;
    this.z = spawn.z;
    this.heading = Math.PI;
    this.speed = 0;
    this.health = CONFIG.playerHealth;
    this.cash = 0;
    this.wanted = 0;
    this.vehicle = null;
    this.carsStolen = 0;
    this.walkPhase = 0;
    this.ramCooldown = 0;
    this.wantedCalmTimer = 0;
    this.wantedDecayTimer = 0;
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
  }

  get speedKmh() {
    const speed = this.vehicle ? Math.abs(this.vehicle.speed) : Math.abs(this.speed);
    return Math.round(speed * 3.6);
  }

  get position() {
    if (this.vehicle) return { x: this.vehicle.x, z: this.vehicle.z };
    return { x: this.x, z: this.z };
  }

  addWanted(amount) {
    this.wanted = clamp(this.wanted + amount, 0, 5);
    this.wantedCalmTimer = 0;
    this.wantedDecayTimer = 0;
  }

  setWanted(value) {
    this.wanted = clamp(value, 0, 5);
    this.wantedCalmTimer = 0;
    this.wantedDecayTimer = 0;
  }

  updateWanted(dt) {
    if (this.wanted === 0) return;
    this.wantedCalmTimer += dt;
    if (this.wantedCalmTimer > CONFIG.wantedDecayCalmSeconds) {
      this.wantedDecayTimer += dt;
      if (this.wantedDecayTimer > CONFIG.wantedDecayInterval) {
        this.wantedDecayTimer = 0;
        this.wanted = Math.max(0, this.wanted - 1);
      }
    }
  }

  takeDamage(amount) {
    this.health = clamp(this.health - amount, 0, CONFIG.playerHealth);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = clamp(this.health + amount, 0, CONFIG.playerHealth);
  }

  enterCar(car) {
    this.vehicle = car;
    car.isPlayer = true;
    this.mesh.visible = false;
    this.carsStolen += 1;
  }

  exitCar() {
    if (!this.vehicle) return;
    const car = this.vehicle;
    car.isPlayer = false;
    // Step out to the driver's side.
    const sideX = Math.cos(car.heading);
    const sideZ = -Math.sin(car.heading);
    this.x = car.x + sideX * 2.6;
    this.z = car.z + sideZ * 2.6;
    this.heading = car.heading;
    this.vehicle = null;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
  }

  update(dt, input, colliders, parkedCars, cameraYaw, callbacks) {
    this.ramCooldown = Math.max(0, this.ramCooldown - dt);

    if (this.vehicle) {
      const beforeSpeed = Math.abs(this.vehicle.speed);
      driveVehicle(this.vehicle, input, dt, colliders, (impactSpeed) => {
        if (callbacks.onCrash) callbacks.onCrash(impactSpeed);
      });
      if (input.consumeExit()) this.exitCar();
      return;
    }

    // On foot: camera-relative movement.
    const move = input.moveVector();
    const targetSpeed = move.x !== 0 || move.z !== 0
      ? (input.running ? CONFIG.runSpeed : CONFIG.walkSpeed)
      : 0;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 10);

    if (this.speed > 0.1) {
      const worldX = move.x * Math.cos(cameraYaw) - move.z * Math.sin(cameraYaw);
      const worldZ = move.x * Math.sin(cameraYaw) + move.z * Math.cos(cameraYaw);
      const targetHeading = Math.atan2(worldX, worldZ);
      this.heading = angleLerp(this.heading, targetHeading, Math.min(1, dt * 12));
      const nextX = this.x + Math.sin(this.heading) * this.speed * dt;
      const nextZ = this.z + Math.cos(this.heading) * this.speed * dt;
      const resolved = collideCircle(colliders, nextX, nextZ, 0.7);
      this.x = resolved.x;
      this.z = resolved.z;
    }

    // Walk cycle.
    this.walkPhase += this.speed * dt * 1.6;
    const swing = Math.sin(this.walkPhase) * 0.55 * Math.min(1, this.speed / 8);
    this.mesh.userData.leftLeg.rotation.x = swing;
    this.mesh.userData.rightLeg.rotation.x = -swing;
    this.mesh.userData.leftArm.rotation.x = -swing * 0.7;
    this.mesh.userData.rightArm.rotation.x = swing * 0.7;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;

    // Steal the nearest parked car with E.
    if (input.consumeAction()) {
      const car = nearestParkedCar(parkedCars, this.x, this.z, CONFIG.stealRange);
      if (car) {
        const index = parkedCars.indexOf(car);
        if (index >= 0) parkedCars.splice(index, 1);
        this.enterCar(car);
        this.addWanted(1);
        if (callbacks.onSteal) callbacks.onSteal(car);
      } else if (callbacks.onStealFail) {
        callbacks.onStealFail();
      }
    }
  }
}
