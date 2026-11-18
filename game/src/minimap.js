// Sunshine City — the 2D minimap: roads, beach, player arrow, cars,
// police (red/blue) and the golden mission marker, drawn on a small
// canvas in the corner of the screen.

import { WORLD } from './config.js';

export class Minimap {
  constructor(canvas, city) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.city = city;
    this.size = canvas.width;
  }

  _toMap(x, z) {
    const half = WORLD.halfSize + 40;
    const s = this.size / (half * 2);
    return { x: (x + half) * s, y: (z + half) * s };
  }

  draw(game) {
    const ctx = this.ctx;
    const S = this.size;
    ctx.clearRect(0, 0, S, S);
    // Backdrop.
    ctx.fillStyle = 'rgba(20, 30, 40, 0.85)';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#5d8a4a';
    ctx.fillRect(0, 0, S, S);

    // Sea + sand at the south edge.
    const beach = this._toMap(0, WORLD.beachZ);
    ctx.fillStyle = '#e8d29a';
    ctx.fillRect(0, beach.y, S, S - beach.y);
    const sea = this._toMap(0, WORLD.seaZ);
    ctx.fillStyle = '#1e7fa8';
    ctx.fillRect(0, sea.y, S, S - sea.y);

    // Roads.
    ctx.strokeStyle = '#3a3f46';
    ctx.lineWidth = 4;
    for (const c of this.city.roadsX) {
      const a = this._toMap(c, -WORLD.halfSize);
      const b = this._toMap(c, WORLD.halfSize);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const c of this.city.roadsZ) {
      const a = this._toMap(-WORLD.halfSize, c);
      const b = this._toMap(WORLD.halfSize, c);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Mission marker.
    const marker = game.missions.marker;
    if (marker) {
      const m = this._toMap(marker.x, marker.z);
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Traffic + parked cars.
    ctx.fillStyle = '#dfe6ee';
    for (const car of game.allCars()) {
      if (car.isPolice) continue;
      const p = this._toMap(car.pos.x, car.pos.z);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }

    // Police cars flash red/blue.
    for (const car of game.police.cars) {
      const p = this._toMap(car.pos.x, car.pos.z);
      ctx.fillStyle = Math.sin(game.time * 6) > 0 ? '#ff2222' : '#2244ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player arrow, rotated to face the heading.
    const pp = this._toMap(game.player.pos.x, game.player.pos.z);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(game.player.heading);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
