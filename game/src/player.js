// Sunshine City — Marco Reyes on foot: movement, third-person orbit
// camera, and getting in and out of cars.

import { PLAYER, WORLD } from './config.js';
import { clamp, distance2D } from './util.js';

export class Player {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.pos = { x: -110, y: 0, z: -20 };
    this.heading = 0; // facing angle, radians
    this.health = 100;
    this.inCar = null; // the Car object Marco is driving, or null
    this.speed = 0;
    this.bustedTimer = 0;

    // Orbit camera state.
    this.camYaw = Math.PI * 0.75;
    this.camPitch = 0.42;
    this.camDistance = 11;

    this.mesh = this._buildMesh();
    scene.add(this.mesh);
  }

  _buildMesh() {
    const group = new THREE.Group();
    const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2fa36b });
    const pants = new THREE.MeshLambertMaterial({ color: 0x2b3a55 });
    const hair = new THREE.MeshLambertMaterial({ color: 0x201510 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.5), shirt);
    torso.position.y = 1.25;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
    head.position.y = 2.05;
    head.castShadow = true;
    group.add(head);

    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.6), hair);
    hairTop.position.y = 2.36;
    group.add(hairTop);

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), pants);
    this.leftLeg.position.set(-0.22, 0.45, 0);
    this.leftLeg.castShadow = true;
    group.add(this.leftLeg);
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), pants);
    this.rightLeg.position.set(0.22, 0.45, 0);
    this.rightLeg.castShadow = true;
    group.add(this.rightLeg);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), shirt);
    this.leftArm.position.set(-0.58, 1.25, 0);
    this.leftArm.castShadow = true;
    group.add(this.leftArm);
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), shirt);
    this.rightArm.position.set(0.58, 1.25, 0);
    this.rightArm.castShadow = true;
    group.add(this.rightArm);

    // The pistol is hidden until Marco draws it.
    this.gun = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.55), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    this.gun.position.set(0.58, 1.0, 0.3);
    this.gun.visible = false;
    group.add(this.gun);

    group.position.set(this.pos.x, 0, this.pos.z);
    return group;
  }

  update(dt, input, game) {
    if (this.inCar) {
      // Hidden while driving; the car carries him.
      this.mesh.visible = false;
      this.pos.x = this.inCar.pos.x;
      this.pos.z = this.inCar.pos.z;
      this.heading = this.inCar.heading;
      this.speed = Math.abs(this.inCar.speed);
      return;
    }
    this.mesh.visible = true;

    // Mouse orbit.
    const mouse = input.consumeMouse();
    this.camYaw -= mouse.dx * 0.0035;
    this.camPitch = clamp(this.camPitch + mouse.dy * 0.0028, 0.08, 1.1);

    const mv = input.moveVector();
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const targetSpeed = (mv.forward !== 0 || mv.strafe !== 0)
      ? (running ? PLAYER.runSpeed : PLAYER.walkSpeed)
      : 0;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 8);

    if (this.speed > 0.3) {
      // Movement is relative to the camera yaw.
      const moveAngle = this.camYaw + Math.PI;
      const strafeAngle = moveAngle + Math.PI / 2;
      const fx = Math.sin(moveAngle) * mv.forward + Math.sin(strafeAngle) * mv.strafe;
      const fz = Math.cos(moveAngle) * mv.forward + Math.cos(strafeAngle) * mv.strafe;
      const len = Math.hypot(fx, fz) || 1;
      this.pos.x += (fx / len) * this.speed * dt;
      this.pos.z += (fz / len) * this.speed * dt;
      this.heading = Math.atan2(fx, fz);
      this.city.resolveCircle(this.pos, 0.7);

      // Walk-cycle swing on arms and legs.
      const swing = Math.sin(game.time * 11) * 0.55 * (this.speed / PLAYER.runSpeed);
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x = swing * 0.8;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
  }

  // Third-person camera: behind and above Marco, or behind the car.
  updateCamera(camera, dt) {
    const focus = this.inCar ? this.inCar.pos : this.pos;
    const yaw = this.inCar ? this.inCar.heading + Math.PI : this.camYaw;
    const dist = this.inCar ? 13 : this.camDistance;
    const height = this.inCar ? 5.5 : 4.5 + this.camPitch * 4;
    const tx = focus.x + Math.sin(yaw) * dist;
    const tz = focus.z + Math.cos(yaw) * dist;
    const speed = this.inCar ? 6 : 10;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * speed);
    camera.position.y += (height - camera.position.y) * Math.min(1, dt * speed);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * speed);
    camera.lookAt(focus.x, 1.5, focus.z);
  }

  enterCar(car) {
    this.inCar = car;
    car.driver = this;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    car.driver = null;
    this.inCar = null;
    // Step out on the driver's side.
    const side = car.heading + Math.PI / 2;
    this.pos.x = car.pos.x + Math.sin(side) * 2.2;
    this.pos.z = car.pos.z + Math.cos(side) * 2.2;
    this.city.resolveCircle(this.pos, 0.7);
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.visible = true;
  }

  nearestParkedCar(cars, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of cars) {
      if (car.isPolice || car.driver) continue;
      const d = distance2D(this.pos.x, this.pos.z, car.pos.x, car.pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  reset() {
    this.pos = { x: -110, y: 0, z: -20 };
    this.heading = 0;
    this.health = 100;
    this.inCar = null;
    this.speed = 0;
    this.mesh.visible = true;
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
  }
}
