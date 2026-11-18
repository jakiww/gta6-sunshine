// Sunshine City — vehicles: the car mesh factory, parked cars you can
// steal, and the arcade driving model (accelerate, brake, steer, drift).

import * as THREE from 'three';
import { CONFIG, CAR_COLORS } from './config.js';
import { mulberry32, pick, range } from './random.js';
import { collideCircle, roadCoords } from './city.js';

export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2f42 });
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x181818 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.62;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.18, -0.25);
  group.add(cabin);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.7), bodyMat);
  nose.position.set(0, 0.52, 2.3);
  group.add(nose);

  // Headlights and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const side of [-0.65, 0.65]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    head.position.set(side, 0.62, 2.66);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), tailMat);
    tail.position.set(side, 0.62, -2.26);
    group.add(tail);
  }

  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    group.add(wheel);
    wheels.push(wheel);
  }

  let strobeLeft = null;
  let strobeRight = null;
  if (isPolice) {
    // Black-and-white police livery with a roof light bar.
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    stripe.position.y = 0.86;
    group.add(stripe);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.18, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222222 }),
    );
    bar.position.set(0, 1.56, -0.25);
    group.add(bar);
    strobeLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    strobeLeft.position.set(-0.35, 1.58, -0.25);
    group.add(strobeLeft);
    strobeRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.22, 0.42),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    strobeRight.position.set(0.35, 1.58, -0.25);
    group.add(strobeRight);
  }

  group.userData.wheels = wheels;
  group.userData.strobeLeft = strobeLeft;
  group.userData.strobeRight = strobeRight;
  return group;
}

export class Vehicle {
  constructor(mesh, x, z, heading, color) {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.color = color;
    this.health = 100;
    this.disabled = false;
    this.isPolice = false;
    this.isPlayer = false;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }

  get forwardX() {
    return Math.sin(this.heading);
  }

  get forwardZ() {
    return Math.cos(this.heading);
  }

  syncMesh() {
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.heading;
    const spin = this.speed * 0.6;
    for (const wheel of this.mesh.userData.wheels || []) {
      wheel.rotation.x += spin * 0.016;
    }
  }
}

export function spawnParkedCars(scene) {
  const rand = mulberry32(777);
  const cars = [];
  const roads = roadCoords();
  // Park along both sides of a few roads, facing along the road.
  for (let i = 0; i < 16; i++) {
    const vertical = rand() < 0.5;
    const road = pick(rand, roads);
    const along = range(rand, -180, 180);
    const side = rand() < 0.5 ? -1 : 1;
    const offset = CONFIG.roadWidth / 2 - 1.6;
    let x;
    let z;
    let heading;
    if (vertical) {
      x = road + side * offset;
      z = along;
      heading = side > 0 ? 0 : Math.PI;
    } else {
      x = along;
      z = road + side * offset;
      heading = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    const color = pick(rand, CAR_COLORS);
    const mesh = buildCarMesh(color, false);
    const car = new Vehicle(mesh, x, z, heading, color);
    scene.add(mesh);
    cars.push(car);
  }
  return cars;
}

// Arcade driving: throttle, steering that scales down with speed, drag,
// and a building collision that kills speed instead of clipping through.
export function driveVehicle(car, input, dt, colliders, onCrash) {
  if (car.disabled) {
    car.speed *= 1 - 2 * dt;
    car.syncMesh();
    return;
  }
  const move = input.moveVector();
  const throttle = -move.z; // W is forward (-z in input space)
  const steering = move.x;

  if (throttle > 0) {
    car.speed += CONFIG.carAccel * throttle * dt;
  } else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= CONFIG.carBrake * dt;
    else car.speed += CONFIG.carReverseAccel * throttle * dt;
  }
  if (input.braking) {
    car.speed -= Math.sign(car.speed) * CONFIG.carBrake * 1.4 * dt;
    if (Math.abs(car.speed) < 0.4) car.speed = 0;
  }
  car.speed -= car.speed * CONFIG.carDrag * dt;
  car.speed = Math.max(-CONFIG.carMaxReverse, Math.min(CONFIG.carMaxSpeed, car.speed));

  // Steering: heading grows turning left, and flips in reverse so the car
  // always turns the way the wheel points.
  const steerAmount = steering * CONFIG.carTurnRate * dt * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  car.heading -= steerAmount * Math.sign(car.speed || 1);

  const nextX = car.x + car.forwardX * car.speed * dt;
  const nextZ = car.z + car.forwardZ * car.speed * dt;
  const resolved = collideCircle(colliders, nextX, nextZ, 2.1);
  if (resolved.hit && Math.abs(car.speed) > 6) {
    if (onCrash) onCrash(Math.abs(car.speed));
    car.speed *= -0.25;
  } else if (resolved.hit) {
    car.speed *= 0.4;
  }
  car.x = resolved.x;
  car.z = resolved.z;
  car.syncMesh();
}

export function nearestParkedCar(cars, x, z, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of cars) {
    const dx = car.x - x;
    const dz = car.z - z;
    const dist = Math.hypot(dx, dz);
    if (dist < bestDist) {
      bestDist = dist;
      best = car;
    }
  }
  return best;
}
