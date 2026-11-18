// Cars: traffic with simple lane-following AI, parked stealable cars, and the
// arcade driving model for the car the player is in.
import * as THREE from 'three';
import { CAR } from './config.js';
import { collideCircle } from './city.js';
import { createRandom } from './random.js';

const CAR_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x2c3e50, 0x9b59b6, 0x1abc9c, 0xe67e22];

export function makeCarMesh(color, police) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0x111418 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), bodyMat);
  body.position.y = 0.55; group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: police ? 0xf5f5f5 : 0x223344 }));
  cabin.position.set(0, 1.2, -0.2); group.add(cabin);
  if (police) {
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x880000 }));
    barR.position.set(-0.45, 1.6, -0.2); group.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x000088 }));
    barB.position.set(0.45, 1.6, -0.2); group.add(barB);
    group.userData.barR = barR; group.userData.barB = barB;
  }
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.38, z);
    group.add(w); wheels.push(w);
  }
  // Headlights.
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0x555533 });
  for (const x of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    l.position.set(x, 0.6, 2.22); group.add(l);
  }
  group.userData.wheels = wheels;
  return group;
}

export function createVehicles(scene, streets, seed) {
  const rand = createRandom(seed + 7);
  const traffic = [];
  const parked = [];
  const half = 300;

  function spawnTrafficCar() {
    const horizontal = rand() > 0.5;
    const street = streets[Math.floor(rand() * streets.length)];
    const dir = rand() > 0.5 ? 1 : -1;
    const lane = (rand() > 0.5 ? 3.5 : -3.5);
    const mesh = makeCarMesh(CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], false);
    scene.add(mesh);
    const car = {
      mesh, horizontal, street, dir, lane,
      speed: 8 + rand() * 6,
      pos: horizontal ? { x: (rand() * 2 - 1) * half, z: street + lane }
        : { x: street + lane, z: (rand() * 2 - 1) * half },
      heading: 0, driven: false, health: 100,
    };
    car.heading = horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    mesh.position.set(car.pos.x, 0, car.pos.z);
    mesh.rotation.y = car.heading;
    traffic.push(car);
    return car;
  }
  for (let i = 0; i < 14; i += 1) spawnTrafficCar();

  // Parked cars along street edges — the ones Marco can steal.
  for (let i = 0; i < 9; i += 1) {
    const street = streets[1 + Math.floor(rand() * (streets.length - 2))];
    const along = (rand() * 2 - 1) * 240;
    const horizontal = rand() > 0.5;
    const mesh = makeCarMesh(CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], false);
    scene.add(mesh);
    const car = {
      mesh, horizontal, street, dir: 1, lane: 0, speed: 0,
      pos: horizontal ? { x: along, z: street + 5.6 } : { x: street + 5.6, z: along },
      heading: horizontal ? Math.PI / 2 : 0, driven: false, parked: true, health: 100,
    };
    mesh.position.set(car.pos.x, 0, car.pos.z);
    mesh.rotation.y = car.heading;
    parked.push(car);
  }

  // The car the player drives (null until a steal).
  const driven = { car: null, speed: 0 };

  function updateTraffic(dt) {
    for (const car of traffic) {
      if (car.driven) continue;
      if (car.horizontal) car.pos.x += car.dir * car.speed * dt;
      else car.pos.z += car.dir * car.speed * dt;
      const a = car.horizontal ? car.pos.x : car.pos.z;
      if (a > half + 20) {
        if (car.horizontal) car.pos.x = -half - 20; else car.pos.z = -half - 20;
      }
      car.mesh.position.set(car.pos.x, 0, car.pos.z);
      for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
    }
  }

  // Arcade driving for the player's car. Returns collision events.
  function updateDriven(dt, input, colliders, bounds, peds, onHitPed, onCrash) {
    const car = driven.car;
    if (!car) return;
    const ax = input.axis();
    if (ax.z > 0) driven.speed += CAR.accel * dt;
    else if (ax.z < 0) driven.speed -= (driven.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
    else driven.speed -= Math.sign(driven.speed) * Math.min(Math.abs(driven.speed), 8 * dt);
    driven.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, driven.speed));
    const steer = ax.x * CAR.steer * (driven.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(driven.speed) / 8);
    car.heading += steer * dt * (driven.speed >= 0 ? 1 : -1) * -1;
    // Note: heading sign tuned so D turns right while driving forward.
    const fx = Math.sin(car.heading); const fz = Math.cos(car.heading);
    const oldX = car.pos.x; const oldZ = car.pos.z;
    car.pos.x += fx * driven.speed * dt;
    car.pos.z += fz * driven.speed * dt;
    car.pos.x = Math.max(-bounds, Math.min(bounds, car.pos.x));
    car.pos.z = Math.max(-bounds, Math.min(bounds + 55, car.pos.z));
    if (collideCircle(car.pos, 2.2, colliders)) {
      if (Math.abs(driven.speed) > 14) onCrash();
      driven.speed *= 0.4;
    }
    // Pedestrians under the wheels.
    for (const ped of peds) {
      if (ped.down) continue;
      const dx = ped.pos.x - car.pos.x; const dz = ped.pos.z - car.pos.z;
      if (dx * dx + dz * dz < 4.2 && Math.abs(driven.speed) > 3) {
        ped.knockDown();
        onHitPed(ped);
      }
    }
    car.mesh.position.set(car.pos.x, 0, car.pos.z);
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += driven.speed * dt * 2;
    void oldX; void oldZ;
  }

  function nearestStealable(pos, maxDist) {
    let best = null; let bestD = maxDist;
    for (const car of [...traffic, ...parked]) {
      if (car.driven) continue;
      const dx = car.pos.x - pos.x; const dz = car.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function steal(car) {
    if (car.parked) {
      const i = parked.indexOf(car);
      if (i >= 0) parked.splice(i, 1);
    } else {
      car.driven = true;
    }
    driven.car = car;
    driven.speed = 0;
    return car;
  }

  function exitCar() {
    const car = driven.car;
    if (!car) return null;
    driven.car = null;
    driven.speed = 0;
    car.driven = false;
    if (!car.parked) {
      // A stolen traffic car becomes parked where it stops.
      car.parked = true;
      parked.push(car);
      const i = traffic.indexOf(car);
      if (i >= 0) traffic.splice(i, 1);
      spawnTrafficCar();
    }
    return car;
  }

  return {
    traffic, parked, driven,
    updateTraffic, updateDriven, nearestStealable, steal, exitCar,
    allCars() { return [...traffic, ...parked]; },
  };
}
