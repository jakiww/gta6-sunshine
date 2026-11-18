// Sunshine City — the procedural city itself: ground, road grid,
// buildings, beach + sea, palm trees, garage and street props.
// Everything is built from plain three.js boxes and cylinders so the
// whole world loads offline with zero external assets.

import { WORLD, COLORS } from './config.js';
import { mulberry32, pick } from './util.js';

export class City {
  constructor(scene) {
    this.scene = scene;
    // Axis-aligned building boxes the player and cars collide with.
    this.colliders = [];
    // Road centre lines (for traffic loops and the minimap).
    this.roadsX = [];
    this.roadsZ = [];
    // Where parked cars may spawn: {x, z, angle}.
    this.parkingSpots = [];
    // Key places other systems need: garage, pier, delivery point.
    this.places = {};
    this.palms = [];
    this.rand = mulberry32(20261118);
    this._buildGround();
    this._buildRoads();
    this._buildBuildings();
    this._buildBeach();
    this._buildPalms();
    this._buildGarage();
    this._buildProps();
  }

  _mat(color, roughness) {
    return new THREE.MeshLambertMaterial({ color, roughness: roughness || 0.9 });
  }

  _box(w, h, d, color, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  _buildGround() {
    const size = WORLD.halfSize * 2 + 80;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      this._mat(COLORS.grass, 1),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _buildRoads() {
    const half = WORLD.halfSize;
    const lines = [];
    for (let c = -3; c <= 3; c++) lines.push(c * WORLD.roadSpacing);
    this.roadsX = lines.slice();
    this.roadsZ = lines.slice();

    // Asphalt strips in both directions.
    for (const c of lines) {
      const alongX = new THREE.Mesh(
        new THREE.PlaneGeometry(half * 2, WORLD.roadWidth),
        this._mat(COLORS.asphalt, 1),
      );
      alongX.rotation.x = -Math.PI / 2;
      alongX.position.set(0, 0.02, c);
      alongX.receiveShadow = true;
      this.scene.add(alongX);

      const alongZ = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.roadWidth, half * 2),
        this._mat(COLORS.asphalt, 1),
      );
      alongZ.rotation.x = -Math.PI / 2;
      alongZ.position.set(c, 0.03, 0);
      alongZ.receiveShadow = true;
      this.scene.add(alongZ);
    }

    // Dashed centre lines, one thin yellow box per dash.
    const dashGeo = new THREE.BoxGeometry(4, 0.05, 0.5);
    const dashMat = this._mat(COLORS.line, 0.6);
    for (const c of lines) {
      for (let p = -half + 10; p < half - 10; p += 12) {
        const d1 = new THREE.Mesh(dashGeo, dashMat);
        d1.position.set(p, 0.06, c);
        this.scene.add(d1);
        const d2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 4), dashMat);
        d2.position.set(c, 0.06, p);
        this.scene.add(d2);
      }
    }
  }

  _buildBuildings() {
    const rand = this.rand;
    const spacing = WORLD.roadSpacing;
    const margin = WORLD.roadWidth / 2 + 7;
    // One block per gap between roads; skip the beach strip and the
    // south-east corner, which stays an open plaza.
    for (let gx = -3; gx < 3; gx++) {
      for (let gz = -3; gz < 3; gz++) {
        const cx = gx * spacing + spacing / 2;
        const cz = gz * spacing + spacing / 2;
        if (cz > 150) continue; // beach side stays open
        if (gx === 2 && gz === 2) continue; // plaza
        const isGarageBlock = gx === -2 && gz === -1;
        const height = 10 + rand() * 26;
        const w = 18 + rand() * 14;
        const d = 18 + rand() * 14;
        const color = pick(rand, COLORS.buildingPalette);
        const tower = this._box(w, height, d, color, cx, height / 2, cz);
        tower.receiveShadow = true;
        this.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });

        // Lit windows: a slightly proud dark panel with emissive dots
        // faked by a second, lighter box on the sun side.
        const roof = this._box(w + 1, 0.8, d + 1, 0x555a60, cx, height + 0.4, cz);
        roof.castShadow = false;
        const win = this._box(w * 0.7, height * 0.55, 0.3, 0x2c3e50, cx, height * 0.55, cz + d / 2 + 0.15);
        win.castShadow = false;

        // A few blocks get a second, shorter neighbour tower.
        if (rand() > 0.55) {
          const h2 = 7 + rand() * 10;
          const w2 = 10 + rand() * 6;
          const d2 = 10 + rand() * 6;
          const x2 = cx + (rand() > 0.5 ? 1 : -1) * (w / 2 + w2 / 2 + 2);
          const z2 = cz + (rand() > 0.5 ? 1 : -1) * 4;
          if (Math.abs(x2) < WORLD.halfSize - 15 && Math.abs(z2) < 165) {
            this._box(w2, h2, d2, pick(rand, COLORS.buildingPalette), x2, h2 / 2, z2);
            this.colliders.push({ minX: x2 - w2 / 2, maxX: x2 + w2 / 2, minZ: z2 - d2 / 2, maxZ: z2 + d2 / 2 });
          }
        }

        // Parking spots along the block's road-facing edge.
        if (!isGarageBlock && rand() > 0.3) {
          const edge = cz - d / 2 - 4;
          this.parkingSpots.push({ x: cx - 6, z: edge, angle: 0 });
          this.parkingSpots.push({ x: cx + 6, z: edge, angle: 0 });
        }
      }
    }
  }

  _buildBeach() {
    // Sand strip, then animated sea.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.halfSize * 2 + 80, 30),
      this._mat(COLORS.sand, 1),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.04, WORLD.beachZ + 5);
    sand.receiveShadow = true;
    this.scene.add(sand);

    this.sea = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.halfSize * 2 + 400, 260),
      new THREE.MeshLambertMaterial({ color: COLORS.sea, transparent: true, opacity: 0.92 }),
    );
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(0, 0.05, WORLD.seaZ + 130);
    this.scene.add(this.sea);

    // Wooden pier jutting into the sea — the package pickup point.
    const pierMat = this._mat(0x9a7b52, 1);
    for (let i = 0; i < 6; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 6), pierMat);
      plank.position.set(60, 0.8, WORLD.beachZ + 18 + i * 6);
      plank.castShadow = true;
      this.scene.add(plank);
    }
    this.places.pier = { x: 60, z: WORLD.beachZ + 46 };
  }

  _buildPalms() {
    const rand = this.rand;
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.5, 8, 6);
    const leafGeo = new THREE.ConeGeometry(1.5, 3.2, 5);
    const trunkMat = this._mat(COLORS.palmTrunk, 1);
    const leafMat = this._mat(COLORS.palmLeaf, 1);
    const spots = [];
    // A row of palms along the sand.
    for (let x = -200; x <= 200; x += 22) {
      if (Math.abs(x - 60) < 12) continue; // keep the pier clear
      spots.push({ x: x + (rand() - 0.5) * 8, z: WORLD.beachZ + 2 + rand() * 8 });
    }
    // A few palms scattered on sidewalk corners.
    for (let i = 0; i < 14; i++) {
      spots.push({
        x: (rand() * 2 - 1) * 170,
        z: (rand() * 2 - 1) * 150,
      });
    }
    for (const s of spots) {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 4;
      trunk.rotation.z = (rand() - 0.5) * 0.16;
      trunk.castShadow = true;
      group.add(trunk);
      // A crown of narrow fronds fanning out from the trunk top, so the
      // palm reads as a palm instead of a green blob.
      for (let l = 0; l < 6; l++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const a = (l / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 1.7, 8.0, Math.sin(a) * 1.7);
        leaf.rotation.z = Math.cos(a) * 1.15;
        leaf.rotation.x = -Math.sin(a) * 1.15;
        leaf.castShadow = true;
        group.add(leaf);
      }
      // One upright frond at the very top.
      const top = new THREE.Mesh(leafGeo, leafMat);
      top.position.y = 8.6;
      top.scale.set(0.8, 0.8, 0.8);
      top.castShadow = true;
      group.add(top);
      group.position.set(s.x, 0, s.z);
      this.scene.add(group);
      this.palms.push(group);
    }
  }

  _buildGarage() {
    // Lena's garage: an open-fronted workshop on the west road.
    const gx = -137.5;
    const gz = -27.5;
    const walls = this._mat(0xb8b0a0, 0.9);
    const base = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 18), walls);
    base.position.set(gx, 4.5, gz);
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    // Dark open doorway facing the road.
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(12, 7, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x1c1c22 }),
    );
    door.position.set(gx + 13.2, 3.5, gz);
    this.scene.add(door);
    const roof = this._box(28, 0.8, 20, 0xd94f3d, gx, 9.4, gz);
    roof.castShadow = false;
    // Glowing sign so the player can find it from anywhere.
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(16, 2.2, 0.6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e }),
    );
    sign.position.set(gx + 6, 10.6, gz);
    this.scene.add(sign);
    this.colliders.push({ minX: gx - 13, maxX: gx + 13, minZ: gz - 9, maxZ: gz + 9 });
    this.places.garage = { x: gx + 20, z: gz };
    this.places.garageDoor = { x: gx + 14, z: gz };
  }

  _buildProps() {
    const rand = this.rand;
    // Street lamps along every road, every other block.
    const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 6, 6);
    const poleMat = this._mat(0x44484e, 0.7);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (const c of this.roadsX) {
      for (let p = -165; p <= 165; p += 55) {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(c + 6, 3, p + 6);
        this.scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
        lamp.position.set(c + 6, 6.2, p + 6);
        this.scene.add(lamp);
      }
    }
    // Plaza: benches and a fountain in the open south-east block.
    const px = 137.5;
    const pz = 137.5;
    const fountain = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 7, 1.2, 12),
      this._mat(0x9fb4c0, 0.8),
    );
    fountain.position.set(px, 0.6, pz);
    fountain.castShadow = true;
    this.scene.add(fountain);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 0.3, 12),
      new THREE.MeshLambertMaterial({ color: COLORS.sea, transparent: true, opacity: 0.85 }),
    );
    water.position.set(px, 1.3, pz);
    this.scene.add(water);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this._box(4, 0.5, 1.2, 0x8a6b48, px + Math.cos(a) * 11, 0.6, pz + Math.sin(a) * 11);
    }
    this.places.plaza = { x: px, z: pz };
  }

  // Push a circle (player or car) out of every building box it overlaps.
  // Returns true when a push happened.
  collideCircle(x, z, radius) {
    let hit = false;
    for (const b of this.colliders) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        hit = true;
        // The caller re-reads the corrected position via resolveCircle.
      }
    }
    return hit;
  }

  resolveCircle(pos, radius) {
    for (const b of this.colliders) {
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx;
      let dz = pos.z - cz;
      let d = Math.sqrt(dx * dx + dz * dz);
      if (d < radius) {
        if (d < 0.001) {
          // Dead centre of a box: shove out along the smallest axis.
          const left = pos.x - b.minX;
          const right = b.maxX - pos.x;
          const top = pos.z - b.minZ;
          const bottom = b.maxZ - pos.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) pos.x = b.minX - radius;
          else if (m === right) pos.x = b.maxX + radius;
          else if (m === top) pos.z = b.minZ - radius;
          else pos.z = b.maxZ + radius;
        } else {
          const push = (radius - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }
    }
    // World border: soft clamp, the sea blocks the south edge anyway.
    const lim = WORLD.halfSize + 30;
    pos.x = Math.max(-lim, Math.min(lim, pos.x));
    pos.z = Math.max(-lim, Math.min(lim, pos.z));
  }

  // Gentle sea shimmer.
  animate(dt, time) {
    if (this.sea) {
      this.sea.position.y = 0.05 + Math.sin(time * 0.8) * 0.05;
      this.sea.material.opacity = 0.9 + Math.sin(time * 0.5) * 0.03;
    }
    for (let i = 0; i < this.palms.length; i++) {
      this.palms[i].rotation.z = Math.sin(time * 0.7 + i) * 0.03;
    }
  }
}
