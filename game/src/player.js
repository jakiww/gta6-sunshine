// Marco Reyes on foot: WASD movement relative to the camera, Shift to run,
// simple walk bob, building collision.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { collideCircle } from './city.js';

export function createPlayer(scene, spawn) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const jacket = new THREE.MeshLambertMaterial({ color: 0x1f8a70 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x1c1410 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.5), jacket);
  torso.position.y = 1.05; group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), skin);
  head.position.y = 1.85; group.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 6, 0, Math.PI * 2, 0, 1.1), hair);
  cap.position.y = 1.92; group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), pants);
  legL.position.set(-0.22, 0.42, 0); group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.22; group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), jacket);
  armL.position.set(-0.6, 1.05, 0); group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.6; group.add(armR);

  group.position.set(spawn.x, 0, spawn.z);
  scene.add(group);

  const state = {
    mesh: group, legL, legR, armL, armR,
    pos: group.position, yaw: Math.PI, // facing the camera start
    health: PLAYER.maxHealth,
    lastDamage: -99,
    moving: false,
  };

  function update(dt, input, camYaw, colliders, bounds, time) {
    const ax = input.axis();
    const speed = input.running() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    let mx = 0; let mz = 0;
    if (ax.x !== 0 || ax.z !== 0) {
      // Camera-relative: W moves away from the camera.
      // Forward (away from camera) = (-sin(camYaw), -cos(camYaw)) in xz.
      const fx = -Math.sin(camYaw); const fz = -Math.cos(camYaw);
      const rx = -fz; const rz = fx;
      mx = fx * ax.z + rx * ax.x;
      mz = fz * ax.z + rz * ax.x;
      const len = Math.hypot(mx, mz) || 1;
      mx /= len; mz /= len;
      state.pos.x += mx * speed * dt;
      state.pos.z += mz * speed * dt;
      state.yaw = Math.atan2(mx, mz);
      state.moving = true;
    } else {
      state.moving = false;
    }
    // Clamp to the playable area and push out of buildings.
    state.pos.x = Math.max(-bounds, Math.min(bounds, state.pos.x));
    state.pos.z = Math.max(-bounds, Math.min(bounds + 60, state.pos.z));
    collideCircle(state.pos, PLAYER.radius, colliders);
    group.rotation.y = state.yaw;
    const swing = state.moving ? Math.sin(time * (input.running() ? 14 : 10)) * 0.55 : 0;
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.7; armR.rotation.x = swing * 0.7;
    group.position.y = state.moving ? Math.abs(Math.sin(time * 10)) * 0.08 : 0;
  }

  return { state, update };
}
