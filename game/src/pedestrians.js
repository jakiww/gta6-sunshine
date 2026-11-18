// Pedestrians: stroll the sidewalks, flee gunfire, get knocked down by cars.
import * as THREE from 'three';
import { createRandom } from './random.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0xf1c40f, 0xecf0f1, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xfd79a8];

export function createPedestrians(scene, streets, seed) {
  const rand = createRandom(seed + 21);
  const peds = [];

  function makePed() {
    const group = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(rand() * SHIRTS.length)] });
    const skin = new THREE.MeshLambertMaterial({ color: [0xc98d64, 0x8a5a3b, 0xe8b98a][Math.floor(rand() * 3)] });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), shirt);
    torso.position.y = 1.0; group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    head.position.y = 1.72; group.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
    legs.position.y = 0.4; group.add(legs);
    scene.add(group);
    return group;
  }

  function respawn(ped) {
    const street = streets[Math.floor(rand() * streets.length)];
    const horizontal = rand() > 0.5;
    ped.horizontal = horizontal;
    ped.dir = rand() > 0.5 ? 1 : -1;
    ped.speed = 1.2 + rand() * 1.4;
    ped.down = false;
    ped.downTimer = 0;
    ped.flee = 0;
    ped.pos.x = horizontal ? (rand() * 2 - 1) * 280 : street + 9.5;
    ped.pos.z = horizontal ? street + 9.5 : (rand() * 2 - 1) * 280;
    ped.mesh.rotation.set(0, 0, 0);
    ped.mesh.visible = true;
  }

  for (let i = 0; i < 16; i += 1) {
    const ped = { mesh: makePed(), pos: new THREE.Vector3(), horizontal: true, dir: 1, speed: 1.5, down: false, downTimer: 0, flee: 0 };
    ped.pos = ped.mesh.position;
    respawn(ped);
    ped.knockDown = () => {
      ped.down = true;
      ped.downTimer = 6;
      ped.mesh.rotation.z = Math.PI / 2;
      ped.mesh.position.y = 0.3;
    };
    peds.push(ped);
  }

  function update(dt) {
    for (const ped of peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) respawn(ped);
        continue;
      }
      const speed = ped.flee > 0 ? ped.speed * 3.2 : ped.speed;
      if (ped.flee > 0) ped.flee -= dt;
      if (ped.horizontal) {
        ped.pos.x += ped.dir * speed * dt;
        if (Math.abs(ped.pos.x) > 290) ped.dir *= -1;
        ped.mesh.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        ped.pos.z += ped.dir * speed * dt;
        if (Math.abs(ped.pos.z) > 290) ped.dir *= -1;
        ped.mesh.rotation.y = ped.dir > 0 ? 0 : Math.PI;
      }
    }
  }

  function fleeFrom(x, z, radius) {
    for (const ped of peds) {
      if (ped.down) continue;
      const dx = ped.pos.x - x; const dz = ped.pos.z - z;
      if (dx * dx + dz * dz < radius * radius) ped.flee = 2.5;
    }
  }

  return { peds, update, fleeFrom, respawn };
}
