// Sunshine City — the procedural city itself.
// Grid streets, buildings with collision boxes, sidewalks, a beach and sea
// to the south, palm trees, street lamps, a blue garage and a wooden pier.

import * as THREE from 'three';
import {
  CONFIG, BUILDING_COLORS, SKY_COLOR, SUN_COLOR, GROUND_COLOR,
  SAND_COLOR, SEA_COLOR, ROAD_COLOR, SIDEWALK_COLOR,
} from './config.js';
import { mulberry32, pick, range, rangeInt } from './random.js';

export function roadCoords() {
  const coords = [];
  const half = (CONFIG.roadCount - 1) / 2;
  for (let i = 0; i < CONFIG.roadCount; i++) {
    coords.push((i - half) * CONFIG.blockSize);
  }
  return coords;
}

export function isOnRoad(x, z) {
  const halfRoad = CONFIG.roadWidth / 2;
  for (const c of roadCoords()) {
    if (Math.abs(x - c) < halfRoad || Math.abs(z - c) < halfRoad) return true;
  }
  return false;
}

export function nearestRoadCoord(value) {
  let best = roadCoords()[0];
  for (const c of roadCoords()) {
    if (Math.abs(c - value) < Math.abs(best - value)) best = c;
  }
  return best;
}

function makeBox(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function makePalm(rand) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 5.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a6a42 }),
  );
  trunk.position.y = 2.6;
  trunk.rotation.z = range(rand, -0.08, 0.08);
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e4f });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 3.2, 4),
      leafMat,
    );
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 1.1, 5.4, Math.sin(angle) * 1.1);
    leaf.rotation.z = Math.cos(angle) * 1.1;
    leaf.rotation.x = -Math.sin(angle) * 1.1;
    group.add(leaf);
  }
  const nut = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 6, 5),
    new THREE.MeshLambertMaterial({ color: 0x6a4a22 }),
  );
  nut.position.y = 5.0;
  group.add(nut);
  return group;
}

export function buildCity(scene) {
  const rand = mulberry32(20261118);
  const colliders = []; // { minX, maxX, minZ, maxZ }
  const roads = roadCoords();
  const halfRoad = CONFIG.roadWidth / 2;

  // Sky, sun and fog for the sun-soaked look.
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.Fog(0xbfd9e8, 260, 620);
  const sun = new THREE.DirectionalLight(SUN_COLOR, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.5);
  scene.add(hemi);

  // Ground: grass city floor.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  scene.add(ground);

  // Beach sand strip and the sea to the south (+z).
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 70),
    new THREE.MeshLambertMaterial({ color: SAND_COLOR }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, CONFIG.beachStart + 32);
  scene.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 300),
    new THREE.MeshLambertMaterial({ color: SEA_COLOR }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, CONFIG.seaStart + 130);
  scene.add(sea);

  // Asphalt roads, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: ROAD_COLOR });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d90a });
  for (const c of roads) {
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.roadWidth, 460), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(c, 0.0, 0);
    scene.add(vRoad);
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(460, CONFIG.roadWidth), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.0, c);
    scene.add(hRoad);
    // Dashed centre lines.
    for (let t = -210; t < 210; t += 12) {
      const dashV = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
      dashV.rotation.x = -Math.PI / 2;
      dashV.position.set(c, 0.06, t);
      scene.add(dashV);
      const dashH = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), lineMat);
      dashH.rotation.x = -Math.PI / 2;
      dashH.position.set(t, 0.06, c);
      scene.add(dashH);
    }
  }

  // Sidewalk frames around every block.
  const walkMat = new THREE.MeshLambertMaterial({ color: SIDEWALK_COLOR });
  for (let ix = 0; ix < roads.length - 1; ix++) {
    for (let iz = 0; iz < roads.length - 1; iz++) {
      const cx = (roads[ix] + roads[ix + 1]) / 2;
      const cz = (roads[iz] + roads[iz + 1]) / 2;
      const size = CONFIG.blockSize - CONFIG.roadWidth;
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(Math.round(size * 0.62), Math.round(size * 0.62)), walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.04, cz);
      scene.add(walk);
    }
  }

  // Buildings: one or two per block, with windows and a rooftop box.
  const windowMat = new THREE.MeshLambertMaterial({ color: 0x2a4a66 });
  for (let ix = 0; ix < roads.length - 1; ix++) {
    for (let iz = 0; iz < roads.length - 1; iz++) {
      const cx = (roads[ix] + roads[ix + 1]) / 2;
      const cz = (roads[iz] + roads[iz + 1]) / 2;
      // Keep the block south of the garage clear as a plaza.
      if (ix === 3 && iz === 5) continue;
      const count = rangeInt(rand, 1, 2);
      for (let b = 0; b < count; b++) {
        const w = range(rand, 14, 24);
        const d = range(rand, 14, 24);
        const h = range(rand, 10, 42);
        const ox = count === 1 ? 0 : (b === 0 ? -11 : 11);
        const oz = count === 1 ? 0 : (b === 0 ? -9 : 9);
        const bx = cx + ox;
        const bz = cz + oz;
        const color = pick(rand, BUILDING_COLORS);
        const building = makeBox(w, h, d, color, bx, h / 2, bz);
        scene.add(building);
        colliders.push({
          minX: bx - w / 2 - 0.4, maxX: bx + w / 2 + 0.4,
          minZ: bz - d / 2 - 0.4, maxZ: bz + d / 2 + 0.4,
        });
        // Window strips on the two street-facing sides.
        const floors = Math.max(1, Math.floor(h / 4));
        for (let f = 0; f < floors; f++) {
          for (let k = -1; k <= 1; k++) {
            const win = new THREE.Mesh(
              new THREE.PlaneGeometry(2.2, 1.6),
              windowMat,
            );
            win.position.set(bx + k * (w / 3.2), 3 + f * 4, bz + d / 2 + 0.06);
            scene.add(win);
          }
        }
        // Rooftop AC box.
        const roof = makeBox(3, 1.6, 3, 0x777777, bx + w / 4, h + 0.8, bz);
        scene.add(roof);
      }
    }
  }

  // Palm trees along the beach and on random sidewalks.
  const palmSpots = [];
  for (let x = -200; x <= 200; x += 20) {
    palmSpots.push([x + range(rand, -4, 4), CONFIG.beachStart + 8 + range(rand, 0, 18)]);
  }
  for (let i = 0; i < 26; i++) {
    const cx = (roads[rangeInt(rand, 0, 5)] + roads[rangeInt(rand, 0, 5)]) / 2;
    const cz = (roads[rangeInt(rand, 0, 5)] + roads[rangeInt(rand, 0, 5)]) / 2;
    palmSpots.push([cx + range(rand, -18, 18), cz + range(rand, -18, 18)]);
  }
  for (const [px, pz] of palmSpots) {
    if (isOnRoad(px, pz)) continue;
    const palm = makePalm(rand);
    palm.position.set(px, 0, pz);
    palm.rotation.y = rand() * Math.PI * 2;
    scene.add(palm);
  }

  // Street lamps at intersections.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff2aa });
  for (const rx of roads) {
    for (const rz of roads) {
      if (range(rand, 0, 1) < 0.45) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 6, 6), lampMat);
      pole.position.set(rx + halfRoad + 1.2, 3, rz + halfRoad + 1.2);
      scene.add(pole);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampHeadMat);
      head.position.set(rx + halfRoad + 1.2, 6.2, rz + halfRoad + 1.2);
      scene.add(head);
    }
  }

  // Blue garage (mission 1 destination) on the plaza block.
  const garagePos = { x: 30, z: 150 };
  const garage = new THREE.Group();
  const garageBody = makeBox(22, 9, 14, 0x2f6fd4, 0, 4.5, 0);
  garage.add(garageBody);
  const garageDoor = makeBox(14, 6.5, 0.4, 0xd8d8d8, 0, 3.25, 7.1);
  garage.add(garageDoor);
  const garageSign = new THREE.Mesh(
    new THREE.BoxGeometry(16, 2.2, 0.5),
    new THREE.MeshBasicMaterial({ color: 0xf2c230 }),
  );
  garageSign.position.set(0, 9.6, 7.1);
  garage.add(garageSign);
  garage.position.set(garagePos.x, 0, garagePos.z);
  scene.add(garage);
  colliders.push({
    minX: garagePos.x - 11.4, maxX: garagePos.x + 11.4,
    minZ: garagePos.z - 7.4, maxZ: garagePos.z + 7.4,
  });

  // Wooden pier and dock (mission 2 destination) reaching into the sea.
  const dockPos = { x: 90, z: 300 };
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x9a7a4a });
  for (let t = 0; t < 14; t++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 3.4), pierMat);
    plank.position.set(dockPos.x, 0.7, CONFIG.beachStart + 30 + t * 3.4);
    scene.add(plank);
  }
  const dockHouse = makeBox(7, 5, 6, 0xe8b48a, dockPos.x, 2.5, dockPos.z - 4);
  scene.add(dockHouse);

  // A few beach umbrellas for the postcard look.
  for (let i = 0; i < 8; i++) {
    const ux = -180 + i * 52 + range(rand, -8, 8);
    const uz = CONFIG.beachStart + 22 + range(rand, 0, 10);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 2.6, 5),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    pole.position.set(ux, 1.3, uz);
    scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: pick(rand, [0xd43a2f, 0x2f6fd4, 0xf2c230]) }),
    );
    top.position.set(ux, 3.0, uz);
    scene.add(top);
  }

  // Invisible walls at the world edge so nobody drives into the void.
  colliders.push({ minX: -CONFIG.worldHalf - 5, maxX: -CONFIG.worldHalf, minZ: -400, maxZ: 400 });
  colliders.push({ minX: CONFIG.worldHalf, maxX: CONFIG.worldHalf + 5, minZ: -400, maxZ: 400 });
  colliders.push({ minX: -400, maxX: 400, minZ: -CONFIG.worldHalf - 5, maxZ: -CONFIG.worldHalf });
  colliders.push({ minX: -400, maxX: 400, minZ: 345, maxZ: 350 });

  return {
    colliders,
    roads,
    garagePos,
    dockPos,
    spawn: { x: 0, z: -6 },
  };
}

// Circle (player / car) vs building AABB: push the circle out, return hit flag.
export function collideCircle(colliders, x, z, radius) {
  let hit = false;
  for (const c of colliders) {
    const closestX = Math.max(c.minX, Math.min(x, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      hit = true;
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        x += dx * push;
        z += dz * push;
      } else {
        // Centre inside the box: push out along the smallest penetration axis.
        const left = x - c.minX;
        const right = c.maxX - x;
        const top = z - c.minZ;
        const bottom = c.maxZ - z;
        const min = Math.min(left, right, top, bottom);
        if (min === left) x = c.minX - radius;
        else if (min === right) x = c.maxX + radius;
        else if (min === top) z = c.minZ - radius;
        else z = c.maxZ + radius;
      }
    }
  }
  return { x, z, hit };
}
