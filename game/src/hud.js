// Sunshine City — the DOM HUD: cash, wanted stars, health bar, speed,
// mission objective, message banner, crosshair, and the start / pause /
// game-over screens. All styling lives in index.html; this only updates text.

export class Hud {
  constructor() {
    this.cashEl = document.getElementById('hud-cash');
    this.starsEl = document.getElementById('hud-stars');
    this.healthFill = document.getElementById('hud-health-fill');
    this.healthText = document.getElementById('hud-health-text');
    this.speedEl = document.getElementById('hud-speed');
    this.objectiveEl = document.getElementById('hud-objective');
    this.messageEl = document.getElementById('hud-message');
    this.hintEl = document.getElementById('hud-hint');
    this.crosshairEl = document.getElementById('crosshair');
    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.overScreen = document.getElementById('gameover-screen');
    this.overTitle = document.getElementById('gameover-title');
    this.overText = document.getElementById('gameover-text');
    this.missionListEl = document.getElementById('hud-missions');
    this.lastMessage = '';
  }

  update(player, missions, driving) {
    if (this.cashEl) this.cashEl.textContent = `$${Math.floor(player.cash).toLocaleString('en-US')}`;
    if (this.starsEl) {
      let stars = '';
      for (let i = 0; i < 5; i++) stars += i < player.wanted ? '★' : '☆';
      this.starsEl.textContent = stars;
      this.starsEl.classList.toggle('hot', player.wanted >= 3);
    }
    if (this.healthFill) {
      this.healthFill.style.width = `${player.health}%`;
      this.healthFill.classList.toggle('low', player.health < 30);
    }
    if (this.healthText) this.healthText.textContent = `${Math.round(player.health)}`;
    if (this.speedEl) {
      this.speedEl.textContent = driving ? `${player.speedKmh} km/h` : '—';
    }
    if (this.objectiveEl) this.objectiveEl.textContent = missions.objectiveText;
    if (this.messageEl) {
      const text = missions.messageTimer > 0 ? missions.message : '';
      if (text !== this.lastMessage) {
        this.messageEl.textContent = text;
        this.messageEl.style.opacity = text ? '1' : '0';
        this.lastMessage = text;
      }
    }
    if (this.hintEl) {
      this.hintEl.textContent = driving
        ? 'WASD mengemudi · Spasi rem · F keluar mobil · Klik tembak · P jeda'
        : 'WASD jalan · Shift lari · E curi mobil · Klik tembak · P jeda';
    }
    if (this.crosshairEl) {
      this.crosshairEl.style.display = driving ? 'none' : 'block';
    }
    if (this.missionListEl) {
      const names = ['1. First Wheels', '2. Package Run', '3. Lose the Heat'];
      this.missionListEl.innerHTML = names
        .map((name, i) => {
          const done = i < missions.index;
          const current = i === missions.index && !missions.allDone;
          const cls = done ? 'done' : current ? 'current' : '';
          return `<div class="mission-row ${cls}">${done ? '✓' : current ? '▶' : '○'} ${name}</div>`;
        })
        .join('');
    }
  }

  showStart() {
    if (this.startScreen) this.startScreen.classList.remove('hidden');
    if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    if (this.overScreen) this.overScreen.classList.add('hidden');
  }

  hideStart() {
    if (this.startScreen) this.startScreen.classList.add('hidden');
  }

  showPause(paused) {
    if (this.pauseScreen) this.pauseScreen.classList.toggle('hidden', !paused);
  }

  showGameOver(title, text) {
    if (this.overTitle) this.overTitle.textContent = title;
    if (this.overText) this.overText.textContent = text;
    if (this.overScreen) this.overScreen.classList.remove('hidden');
  }

  hideGameOver() {
    if (this.overScreen) this.overScreen.classList.add('hidden');
  }
}
