// Sunshine City — AI traffic: cars that cruise the street grid, keep their
// lane, slow down for the car ahead, and turn at intersections sometimes.

import { CONFIG, CAR_COLORS } from './config.js';
import { mulberry32, pick, range, rangeInt } from './random.js';
import { buildCarMesh, Vehicle } from './vehicles.js';
import { roadCoords } from './city.js';

const LANES = [-3.4, 3.4];

export class TrafficSystem {
  constructor(scene) {
    this.scene = scene;
    this.cars = [];
    const rand = mulberry32(4242);
    const roads = roadCoords();
    for (let i = 0; i < CONFIG.trafficCount; i++) {
      const vertical = rand() < 0.5;
      const road = pick(rand, roads);
      const along = range(rand, -190, 190);
      const lane = pick(rand, LANES);
      const direction = rand() < 0.5 ? 1 : -1;
      const color = pick(rand, CAR_COLORS);
      const mesh = buildCarMesh(color, false);
      const x = vertical ? road + lane : along;
      const z = vertical ? along : road + lane;
      const heading = vertical ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
      const car = new Vehicle(mesh, x, z, heading, color);
      car.speed = range(rand, CONFIG.trafficSpeedMin, CONFIG.trafficSpeedMax);
      car.cruiseSpeed = car.speed;
      car.vertical = vertical;
      car.direction = direction;
      car.lane = lane;
      car.road = road;
      scene.add(mesh);
      this.cars.push(car);
    }
    this.rand = rand;
  }

  carAhead(car) {
    let closest = null;
    let closestDist = 14;
    for (const other of this.cars) {
      if (other === car) continue;
      if (other.road !== car.road || other.vertical !== car.vertical) continue;
      const along = car.vertical ? other.z - car.z : other.x - car.x;
      const forward = along * car.direction;
      if (forward > 0 && forward < closestDist) {
        closestDist = forward;
        closest = other;
      }
    }
    return closest;
  }

  update(dt, playerCar) {
    for (const car of this.cars) {
      // Slow for the car ahead; stop for the player's car blocking the lane.
      let targetSpeed = car.cruiseSpeed;
      if (this.carAhead(car)) targetSpeed = Math.min(targetSpeed, 3);
      if (playerCar) {
        const dx = playerCar.x - car.x;
        const dz = playerCar.z - car.z;
        const forward = (dx * car.forwardX + dz * car.forwardZ) * 1;
        const lateral = Math.abs(dx * car.forwardZ - dz * car.forwardX);
        if (forward > 0 && forward < 12 && lateral < 3) targetSpeed = 0;
      }
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);

      car.x += car.forwardX * car.speed * dt;
      car.z += car.forwardZ * car.speed * dt;

      // Wrap around the far end of the road.
      if (car.vertical && car.z > 205) car.z = -205;
      if (car.vertical && car.z < -205) car.z = 205;
      if (!car.vertical && car.x > 205) car.x = -205;
      if (!car.vertical && car.x < -205) car.x = 205;

      // Sometimes turn at an intersection onto the cross street.
      const onIntersection =
        Math.abs(car.x - Math.round(car.x / 60) * 60) < 1.2 &&
        Math.abs(car.z - Math.round(car.z / 60) * 60) < 1.2;
      if (onIntersection && this.rand() < dt * 0.25) {
        const turn = this.rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
        car.heading += turn;
        car.vertical = !car.vertical;
        car.direction = car.vertical
          ? (Math.abs(car.heading) < 0.1 ? 1 : -1)
          : (Math.abs(car.heading - Math.PI / 2) < 0.1 ? 1 : -1);
        car.road = car.vertical
          ? Math.round(car.x / 60) * 60
          : Math.round(car.z / 60) * 60;
      }

      car.syncMesh();
    }
  }
}
