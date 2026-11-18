// Sunshine City — the police: spawn count follows the wanted level,
// chase cars ram and block, and a bust happens when they hold Marco
// on foot. Strobes flash; sirens wail through the SoundBank.

import { WANTED } from './config.js';
import { clamp, angleDelta, distance2D } from './util.js';
import { Car } from './vehicles.js';

export class Police {
  constructor(scene, city, sounds) {
    this.scene = scene;
    this.city = city;
    this.sounds = sounds;
    this.cars = [];
    this.spawnTimer = 0;
    this.strobePhase = 0;
  }

  wantedCount(wanted) {
    return Math.min(wanted, WANTED.max);
  }

  update(dt, game) {
    const wanted = game.wanted;
    const target = this.wantedCount(wanted);
    this.spawnTimer -= dt;

    // Spawn up to the wanted level, one car every couple of seconds,
    // just off-screen on a nearby road.
    if (this.cars.length < target && this.spawnTimer <= 0) {
      this.spawnTimer = 2;
      const p = game.player.pos;
      const angle = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 25;
      const x = clamp(p.x + Math.sin(angle) * dist, -200, 200);
      const z = clamp(p.z + Math.cos(angle) * dist, -200, 185);
      const car = new Car(this.scene, x, z, Math.atan2(p.x - x, p.z - z), 0xf2f2f2, true);
      car.driver = 'ai';
      this.cars.push(car);
    }
    // Wanted dropped: extra cars peel off and despawn.
    while (this.cars.length > target) {
      const car = this.cars.pop();
      car.remove();
    }

    this.strobePhase += dt * 6;
    const playerCar = game.player.inCar;
    const targetPos = playerCar ? playerCar.pos : game.player.pos;

    for (const car of this.cars) {
      // Chase: steer towards the target, faster at higher wanted levels.
      const wantHeading = Math.atan2(targetPos.x - car.pos.x, targetPos.z - car.pos.z);
      car.heading += angleDelta(car.heading, wantHeading) * Math.min(1, dt * 2.2);
      const topSpeed = 24 + wanted * 2.5;
      car.speed += (topSpeed - car.speed) * Math.min(1, dt * 0.8);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      this.city.resolveCircle(car.pos, 2.2);
      car._syncMesh(dt);

      // Flash the light bar alternately.
      const redOn = Math.sin(this.strobePhase) > 0;
      if (car.mesh.userData.strobeRed) car.mesh.userData.strobeRed.visible = redOn;
      if (car.mesh.userData.strobeBlue) car.mesh.userData.strobeBlue.visible = !redOn;

      const d = distance2D(car.pos.x, car.pos.z, targetPos.x, targetPos.z);
      if (playerCar) {
        // Ram: shove the player's car and slow it.
        if (d < 4.6) {
          const push = 9 * dt;
          const away = Math.atan2(playerCar.pos.x - car.pos.x, playerCar.pos.z - car.pos.z);
          playerCar.pos.x += Math.sin(away) * push;
          playerCar.pos.z += Math.cos(away) * push;
          playerCar.speed *= 1 - 0.35 * dt;
          car.speed *= 0.6;
          if (game.time - (game.lastCrashSound || 0) > 0.7) {
            game.sounds.crash();
            game.lastCrashSound = game.time;
          }
        }
      } else {
        // On foot: touching a police car builds the bust meter.
        if (d < 3.4) {
          game.player.bustedTimer += dt;
          game.hud.flashMessage('POLICE ON YOU — RUN!', 0.2);
          if (game.player.bustedTimer >= WANTED.bustHoldSeconds) {
            game.busted();
          }
        } else {
          game.player.bustedTimer = Math.max(0, game.player.bustedTimer - dt * 1.5);
        }
      }
    }

    if (this.cars.length > 0) {
      this.sounds.siren(dt, clamp(1.5 - distance2D(this.cars[0].pos.x, this.cars[0].pos.z, targetPos.x, targetPos.z) / 60, 0.3, 1));
    }
  }

  clearAll() {
    for (const car of this.cars) car.remove();
    this.cars = [];
  }

  reset() {
    this.clearAll();
    this.spawnTimer = 0;
  }
}
