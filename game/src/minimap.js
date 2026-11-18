// Sunshine City — the 2D minimap: a top-down canvas drawing the street
// grid, the beach and sea, the player arrow, traffic, police, and the
// active mission beacon.

import { CONFIG } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = CONFIG.minimapSize;
    canvas.width = this.size;
    canvas.height = this.size;
  }

  worldToMap(x, z) {
    const range = CONFIG.minimapRange;
    const px = ((x + range) / (range * 2)) * this.size;
    const py = ((z + range) / (range * 2)) * this.size;
    return { x: px, y: py };
  }

  draw(city, player, traffic, police, peds, missions) {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);

    // Background: land, then sea at the bottom.
    ctx.fillStyle = '#6a9e52';
    ctx.fillRect(0, 0, s, s);
    const seaTop = this.worldToMap(0, CONFIG.beachStart).y;
    ctx.fillStyle = '#2a9db8';
    ctx.fillRect(0, seaTop, s, s - seaTop);
    const sandTop = this.worldToMap(0, CONFIG.beachStart - 8).y;
    ctx.fillStyle = '#f0d9a0';
    ctx.fillRect(0, sandTop, s, seaTop - sandTop);

    // Streets.
    ctx.strokeStyle = '#3a3d42';
    ctx.lineWidth = 5;
    for (const c of city.roads) {
      const vx = this.worldToMap(c, 0).x;
      ctx.beginPath();
      ctx.moveTo(vx, 0);
      ctx.lineTo(vx, s);
      ctx.stroke();
      const hz = this.worldToMap(0, c).y;
      ctx.beginPath();
      ctx.moveTo(0, hz);
      ctx.lineTo(s, hz);
      ctx.stroke();
    }

    // Garage and dock.
    const garage = this.worldToMap(city.garagePos.x, city.garagePos.z);
    ctx.fillStyle = '#2f6fd4';
    ctx.fillRect(garage.x - 5, garage.y - 5, 10, 10);
    const dock = this.worldToMap(city.dockPos.x, city.dockPos.z);
    ctx.fillStyle = '#9a7a4a';
    ctx.fillRect(dock.x - 5, dock.y - 5, 10, 10);

    // Mission beacon.
    if (missions.beaconTarget) {
      const b = this.worldToMap(missions.beaconTarget.x, missions.beaconTarget.z);
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      ctx.fillStyle = '#f2c230';
      ctx.beginPath();
      ctx.arc(b.x, b.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Pedestrians as faint dots.
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (const ped of peds.peds) {
      if (!ped.alive) continue;
      const p = this.worldToMap(ped.x, ped.z);
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }

    // Traffic as grey dots.
    ctx.fillStyle = '#d8d8d8';
    for (const car of traffic.cars) {
      const p = this.worldToMap(car.x, car.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Police as flashing blue/red dots.
    const flashBlue = Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = flashBlue ? '#2244ff' : '#ff2222';
    for (const cruiser of police.cruisers) {
      const p = this.worldToMap(cruiser.x, cruiser.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player arrow, rotated to the heading.
    const pos = player.position;
    const p = this.worldToMap(pos.x, pos.z);
    const heading = player.vehicle ? player.vehicle.heading : player.heading;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5.5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // North marker.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('N', 6, 14);
  }
}
