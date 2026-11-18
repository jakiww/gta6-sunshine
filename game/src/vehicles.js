// Sunshine City — cars: the boxy car factory, parked cars Marco can
// steal, and AI traffic cruising the road grid.

import { CAR, WORLD } from './config.js';
import { clamp, angleDelta, distance2D, mulberry32, pick } from './util.js';

const CAR_COLORS = [0xd94f3d, 0x3d7bd9, 0xf2c230, 0x7fb069, 0xe8e8e8, 0x222831, 0xc97f9a, 0x5aa9a0];

// A simple low-poly car: body, cabin, four wheels, headlights.
export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0xf2f2f2 : color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x181818 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 4.4), paint);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glass);
  cabin.position.set(0, 1.15, -0.2);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  group.userData.wheels = [];
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(wx, 0.38, wz);
    wheel.castShadow = true;
    group.add(wheel);
    group.userData.wheels.push(wheel);
  }

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const lx of [-0.6, 0.6]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), lightMat);
    light.position.set(lx, 0.6, 2.21);
    group.add(light);
  }

  if (isPolice) {
    // Black-and-white doors + light bar.
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.4, 1.6), doorMat);
    door.position.set(0, 0.6, 0.2);
    group.add(door);
    group.userData.strobeRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    group.userData.strobeRed.position.set(-0.45, 1.55, -0.2);
    group.add(group.userData.strobeRed);
    group.userData.strobeBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }),
    );
    group.userData.strobeBlue.position.set(0.45, 1.55, -0.2);
    group.add(group.userData.strobeBlue);
  }

  return group;
}

export class Car {
  constructor(scene, x, z, heading, color, isPolice) {
    this.scene = scene;
    this.pos = { x, z };
    this.heading = heading;
    this.speed = 0;
    this.color = color;
    this.isPolice = !!isPolice;
    this.driver = null; // Player when Marco drives, 'ai' for traffic
    this.parked = false;
    this.stolen = false;
    this.mesh = buildCarMesh(color, isPolice);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
  }

  // Arcade driving: accelerate, steer, drag, building collision.
  drive(dt, input, city) {
    const mv = input.moveVector();
    const steering = -mv.strafe; // A/D steer while driving
    if (mv.forward > 0) this.speed += CAR.accel * dt;
    else if (mv.forward < 0) {
      this.speed -= (this.speed > 0.5 ? CAR.brake : CAR.reverseAccel) * dt;
    } else {
      this.speed -= this.speed * CAR.drag * dt;
      if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }
    this.speed = clamp(this.speed, -CAR.maxReverse, CAR.maxSpeed);
    const steerAmount = steering * CAR.steerRate * dt * clamp(Math.abs(this.speed) / 8, 0, 1);
    this.heading += steerAmount * (this.speed >= 0 ? 1 : -1);
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    const before = { x: this.pos.x, z: this.pos.z };
    city.resolveCircle(this.pos, 2.2);
    if ((before.x !== this.pos.x || before.z !== this.pos.z) && Math.abs(this.speed) > 4) {
      this.speed *= 0.4; // scrape along the wall, don't stick to it
    }
    // Keep out of the sea.
    if (this.pos.z > WORLD.beachZ + 12) {
      this.pos.z = WORLD.beachZ + 12;
      this.speed *= 0.3;
    }
    this._syncMesh(dt);
  }

  _syncMesh(dt) {
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    const spin = (this.speed * dt) / 0.38;
    for (const w of this.mesh.userData.wheels || []) w.rotation.x += spin;
  }

  remove() {
    this.scene.remove(this.mesh);
  }
}

// AI traffic: cars that loop around one rectangular road circuit,
// stopping politely (slowing) when another car is right ahead.
export class Traffic {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.cars = [];
    this.rand = mulberry32(777);
    // Rectangular loops on the road grid.
    this.loops = [];
    for (const c of [-110, -55, 0, 55, 110]) {
      this.loops.push([
        { x: c, z: -165 }, { x: c, z: 165 },
        { x: c + 55, z: 165 }, { x: c + 55, z: -165 },
      ]);
    }
    for (let i = 0; i < 10; i++) this._spawnTrafficCar();
  }

  _spawnTrafficCar() {
    const loop = pick(this.rand, this.loops);
    const leg = Math.floor(this.rand() * 4);
    const t = this.rand();
    const a = loop[leg];
    const b = loop[(leg + 1) % 4];
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const car = new Car(this.scene, x, z, Math.atan2(b.x - a.x, b.z - a.z), pick(this.rand, CAR_COLORS), false);
    car.driver = 'ai';
    car.loop = loop;
    car.leg = leg;
    car.legT = t;
    car.cruise = 9 + this.rand() * 5;
    this.cars.push(car);
  }

  update(dt, allCars) {
    for (const car of this.cars) {
      const loop = car.loop;
      const a = loop[car.leg];
      const b = loop[(car.leg + 1) % 4];
      const segLen = distance2D(a.x, a.z, b.x, b.z) || 1;
      const targetHeading = Math.atan2(b.x - a.x, b.z - a.z);
      car.heading += angleDelta(car.heading, targetHeading) * Math.min(1, dt * 3);

      // Slow down if a car is close ahead.
      let blocked = false;
      for (const other of allCars) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x;
        const dz = other.pos.z - car.pos.z;
        const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
        if (ahead > 0 && ahead < 9 && side < 2.5) { blocked = true; break; }
      }
      const target = blocked ? 0 : car.cruise;
      car.speed += (target - car.speed) * Math.min(1, dt * 2);
      car.legT += (car.speed * dt) / segLen;
      if (car.legT >= 1) {
        car.leg = (car.leg + 1) % 4;
        car.legT = 0;
      }
      car.pos.x = a.x + (b.x - a.x) * car.legT;
      car.pos.z = a.z + (b.z - a.z) * car.legT;
      car._syncMesh(dt);
    }
  }
}

// Parked cars Marco can steal, placed on the city's parking spots.
export function spawnParkedCars(scene, city, count) {
  const rand = mulberry32(4242);
  const spots = city.parkingSpots.slice();
  // Shuffle the spots.
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  const cars = [];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const s = spots[i];
    const car = new Car(scene, s.x, s.z, s.angle + (rand() > 0.5 ? 0 : Math.PI), pick(rand, CAR_COLORS), false);
    car.parked = true;
    cars.push(car);
  }
  return cars;
}
