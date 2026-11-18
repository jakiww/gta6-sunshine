// HUD: cash, wanted stars, health bar, speed, objective line, hints, toast,
// and the 2D top-down minimap (roads, beach, player arrow, police, mission marker).
export function createHud() {
  const cash = document.getElementById('cash');
  const stars = document.getElementById('stars');
  const healthFill = document.getElementById('healthFill');
  const speedVal = document.getElementById('speedVal');
  const mtitle = document.getElementById('mtitle');
  const mobj = document.getElementById('mobj');
  const hint = document.getElementById('hint');
  const crosshair = document.getElementById('crosshair');
  const toastEl = document.getElementById('toast');
  const map = document.getElementById('minimap');
  const mctx = map.getContext('2d');

  let toastUntil = 0;
  let lastStars = -1;
  let lastCash = -1;

  function showToast(text, seconds, now) {
    toastEl.textContent = text;
    toastEl.style.display = 'block';
    toastUntil = now + seconds;
  }

  function drawMinimap(G) {
    const W = 160; const H = 160;
    const scale = W / 640; // world -320..320 maps to the canvas
    const toX = (x) => (x + 320) * scale;
    const toY = (z) => (z + 320) * scale;
    mctx.fillStyle = '#1d3a2a';
    mctx.fillRect(0, 0, W, H);
    // Sea + beach (south edge).
    mctx.fillStyle = '#2a9fd8';
    mctx.fillRect(0, toY(290), W, H - toY(290));
    mctx.fillStyle = '#f2ddab';
    mctx.fillRect(0, toY(255), W, toY(290) - toY(255));
    // Roads.
    mctx.strokeStyle = '#555c66';
    mctx.lineWidth = 3;
    for (const s of G.city.streets) {
      mctx.beginPath(); mctx.moveTo(toX(-320), toY(s)); mctx.lineTo(toX(320), toY(s)); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(toX(s), toY(-320)); mctx.lineTo(toX(s), toY(320)); mctx.stroke();
    }
    // Mission marker.
    const target = G.missions.state.target;
    if (target) {
      mctx.fillStyle = '#ffd23f';
      mctx.beginPath(); mctx.arc(toX(target.x), toY(target.z), 5 + Math.sin(G.time * 5) * 1.5, 0, Math.PI * 2); mctx.fill();
    }
    // Traffic.
    mctx.fillStyle = '#9aa5b1';
    for (const car of G.vehicles.allCars()) {
      mctx.fillRect(toX(car.pos.x) - 1.5, toY(car.pos.z) - 1.5, 3, 3);
    }
    // Police.
    mctx.fillStyle = '#ff3b30';
    for (const cop of G.police.cops) {
      if (!cop.alive) continue;
      mctx.beginPath(); mctx.arc(toX(cop.pos.x), toY(cop.pos.z), 3.5, 0, Math.PI * 2); mctx.fill();
    }
    // Player arrow.
    const p = G.playerPos();
    const heading = G.inCar() ? G.vehicles.driven.car.heading : G.player.state.yaw;
    mctx.save();
    mctx.translate(toX(p.x), toY(p.z));
    // Canvas y points down (= +z), arrow is drawn pointing up: rotate by (PI - heading).
    mctx.rotate(Math.PI - heading);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -7); mctx.lineTo(5, 5); mctx.lineTo(0, 2); mctx.lineTo(-5, 5); mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  function update(G) {
    if (G.cash !== lastCash) {
      lastCash = G.cash;
      cash.textContent = `$${G.cash.toLocaleString('en-US')}`;
    }
    if (G.wanted !== lastStars) {
      lastStars = G.wanted;
      let html = '';
      for (let i = 0; i < 5; i += 1) html += `<span class="${i < G.wanted ? '' : 'off'}">★</span>`;
      stars.innerHTML = html;
    }
    healthFill.style.width = `${Math.max(0, G.player.state.health)}%`;
    const speed = G.inCar() ? Math.abs(G.vehicles.driven.speed) * 2.2 : 0;
    speedVal.textContent = String(Math.round(speed));
    mtitle.textContent = G.missions.state.index >= 3 ? 'FREE ROAM' : `MISSION ${G.missions.state.index + 1} / 3`;
    mobj.textContent = G.missions.objectiveText();
    hint.textContent = G.hintText();
    crosshair.style.display = G.inCar() ? 'none' : 'block';
    if (toastUntil && G.time > toastUntil) {
      toastEl.style.display = 'none';
      toastUntil = 0;
    }
    drawMinimap(G);
  }

  return { update, showToast };
}
