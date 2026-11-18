// Procedural Sunshine City: street grid, sun-soaked buildings, sidewalks, palms,
// streetlights and a beach + sea edge. Returns colliders and key locations.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createRandom } from './random.js';

const PITCH = WORLD.block + WORLD.road; // 66
const STREETS = [];
for (let i = -WORLD.blocks; i <= WORLD.blocks; i += 1) STREETS.push(i * PITCH);

const PALETTE = [0xffb36b, 0xff8fa3, 0xffd166, 0x7fd1c0, 0x6fb7ff, 0xf7ead1, 0xff9d76, 0x9be08a, 0xe8a2c0, 0x8fd3e8];
const ROOFS = [0xd95f4b, 0x3f7f7a, 0x5b6b8c, 0xc98a2e, 0x7a5b8c];

function box(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

export function buildCity(scene, seed) {
  const rand = createRandom(seed);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  const half = STREETS[STREETS.length - 1] + PITCH / 2 + 20; // ~317

  // Ground: grass-green base, asphalt roads, sand beach, blue sea.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 120, half * 2 + 220),
    new THREE.MeshLambertMaterial({ color: 0x8fae6a }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 40);
  group.add(ground);

  // Roads (dark strips along every street line, both directions).
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  for (const s of STREETS) {
    const rx = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, WORLD.road), roadMat);
    rx.rotation.x = -Math.PI / 2; rx.position.set(0, 0.02, s); group.add(rx);
    const rz = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.road, half * 2), roadMat);
    rz.rotation.x = -Math.PI / 2; rz.position.set(s, 0.02, 0); group.add(rz);
    // Sidewalk borders.
    for (const off of [-WORLD.road / 2 - 2, WORLD.road / 2 + 2]) {
      const sx = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 4), walkMat);
      sx.rotation.x = -Math.PI / 2; sx.position.set(0, 0.03, s + off); group.add(sx);
      const sz = new THREE.Mesh(new THREE.PlaneGeometry(4, half * 2), walkMat);
      sz.rotation.x = -Math.PI / 2; sz.position.set(s + off, 0.03, 0); group.add(sz);
    }
  }

  // Beach sand + sea at the south edge (positive z).
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 120, 70),
    new THREE.MeshLambertMaterial({ color: 0xf2ddab }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.04, WORLD.beachZ + 18);
  group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 120, 160),
    new THREE.MeshLambertMaterial({ color: 0x2a9fd8 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.03, WORLD.seaZ + 95);
  group.add(sea);

  // Buildings: 1-3 per block, varied heights and sun-soaked colours.
  for (let bx = -WORLD.blocks; bx < WORLD.blocks; bx += 1) {
    for (let bz = -WORLD.blocks; bz < WORLD.blocks; bz += 1) {
      const cx = (bx + 0.5) * PITCH;
      const cz = (bz + 0.5) * PITCH;
      if (cz > WORLD.beachZ - 40) continue; // keep the beach clear
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k += 1) {
        const w = 14 + rand() * 18;
        const d = 14 + rand() * 18;
        const h = 8 + rand() * rand() * 34;
        const ox = (rand() - 0.5) * (WORLD.block - w - 6);
        const oz = (rand() - 0.5) * (WORLD.block - d - 6);
        const x = cx + ox;
        const z = cz + oz;
        const color = PALETTE[Math.floor(rand() * PALETTE.length)];
        const b = box(w, h, d, color, x, h / 2, z);
        group.add(b);
        const roof = box(w * 0.7, 1.2, d * 0.7, ROOFS[Math.floor(rand() * ROOFS.length)], x, h + 0.6, z);
        group.add(roof);
        // Window band: a slightly darker inset strip near the top.
        const band = box(w + 0.1, 1.6, d + 0.1, 0x2c3e50, x, h * 0.72, z);
        group.add(band);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // Palms along the beach + scattered street trees.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b46 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2fae6e });
  function palm(x, z, s) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.4 * s, 7 * s, 6), trunkMat);
    trunk.position.set(x, 3.5 * s, z); group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2 * s, 3.4 * s, 7), leafMat);
    crown.position.set(x, 8 * s, z); group.add(crown);
  }
  for (let x = -280; x <= 280; x += 40) palm(x + (rand() - 0.5) * 10, WORLD.beachZ + 8 + rand() * 30, 0.9 + rand() * 0.5);
  for (let i = 0; i < 26; i += 1) {
    const s = STREETS[Math.floor(rand() * STREETS.length)];
    const t = STREETS[Math.floor(rand() * STREETS.length)];
    palm(s + WORLD.road / 2 + 3.5, t + (rand() - 0.5) * 30, 0.7 + rand() * 0.4);
  }

  // Streetlights at intersections.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x554400 });
  for (const sx of STREETS) {
    for (const sz of STREETS) {
      if ((sx + sz) % 132 !== 0) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), poleMat);
      pole.position.set(sx + WORLD.road / 2 + 1.5, 3.5, sz + WORLD.road / 2 + 1.5);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
      lamp.position.set(sx + WORLD.road / 2 + 1.5, 7.2, sz + WORLD.road / 2 + 1.5);
      group.add(lamp);
    }
  }

  // Beach umbrellas.
  for (let i = 0; i < 8; i += 1) {
    const x = -240 + i * 68 + rand() * 20;
    const z = WORLD.beachZ + 20 + rand() * 25;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 5), poleMat);
    pole.position.set(x, 1.5, z); group.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: i % 2 ? 0xff5a4e : 0xffd23f }));
    top.position.set(x, 3.4, z); group.add(top);
  }

  // Key locations (street corners, reachable by car).
  const garage = { x: 66, z: -66 };
  const safehouse = { x: -198, z: 198 };
  const pickup = { x: 198, z: 132 };
  const deliver = { x: -132, z: -198 };
  const spawn = { x: 0, z: 30 };

  // Lena's garage: a low teal building with a yellow roof, next to the garage corner.
  const g = box(22, 7, 16, 0x2fae9e, garage.x + 18, 3.5, garage.z - 18);
  group.add(g);
  const gr = box(23, 1, 17, 0xffd23f, garage.x + 18, 7.5, garage.z - 18);
  group.add(gr);
  colliders.push({ minX: garage.x + 7, maxX: garage.x + 29, minZ: garage.z - 26, maxZ: garage.z - 10 });

  return { colliders, streets: STREETS, garage, safehouse, pickup, deliver, spawn, half };
}

// Push a circle (x, z, radius) out of building AABBs. Returns true if it collided.
export function collideCircle(pos, radius, colliders) {
  let hit = false;
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      hit = true;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
  return hit;
}
