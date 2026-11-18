// Sunshine City — the HUD: cash, wanted stars, health, speed,
// mission objective, message toasts, and the busted / start screens.
// All DOM, updated from the game state every frame.

import { formatMoney } from './util.js';

export class Hud {
  constructor() {
    this.cashEl = document.getElementById('hud-cash');
    this.starsEl = document.getElementById('hud-stars');
    this.healthFill = document.getElementById('hud-health-fill');
    this.healthText = document.getElementById('hud-health-text');
    this.speedEl = document.getElementById('hud-speed');
    this.objectiveEl = document.getElementById('hud-objective');
    this.messageEl = document.getElementById('hud-message');
    this.promptEl = document.getElementById('hud-prompt');
    this.bustedEl = document.getElementById('busted-screen');
    this.startEl = document.getElementById('start-screen');
    this.helpEl = document.getElementById('help-panel');
    this._messageTimer = 0;
    this._flashTimer = 0;
  }

  update(game) {
    this.cashEl.textContent = formatMoney(game.cash);
    const wanted = Math.round(game.wanted);
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < wanted ? '★' : '☆';
    this.starsEl.textContent = stars;
    this.starsEl.classList.toggle('hot', wanted >= 3);

    const hp = Math.max(0, Math.round(game.player.health));
    this.healthFill.style.width = hp + '%';
    this.healthFill.style.background = hp > 50 ? '#37c978' : hp > 25 ? '#f2c230' : '#e5484d';
    this.healthText.textContent = hp;

    const kmh = Math.round(Math.abs(game.player.inCar ? game.player.inCar.speed : game.player.speed) * 3.6);
    this.speedEl.textContent = kmh + ' km/h';

    this.objectiveEl.textContent = game.missions.objectiveText();

    if (this._messageTimer > 0) {
      this._messageTimer -= 1 / 60;
      if (this._messageTimer <= 0) this.messageEl.classList.add('hidden');
    }
    if (this._flashTimer > 0) {
      this._flashTimer -= 1 / 60;
      if (this._flashTimer <= 0) this.messageEl.classList.add('hidden');
    }
  }

  showMessage(text, seconds) {
    this.messageEl.textContent = text;
    this.messageEl.classList.remove('hidden');
    this._messageTimer = seconds || 4;
    this._flashTimer = 0;
  }

  // A short-lived warning that does not fight the main message timer.
  flashMessage(text, seconds) {
    this.messageEl.textContent = text;
    this.messageEl.classList.remove('hidden');
    this._flashTimer = seconds || 0.5;
  }

  showPrompt(text) {
    if (!text) {
      this.promptEl.classList.add('hidden');
      return;
    }
    this.promptEl.textContent = text;
    this.promptEl.classList.remove('hidden');
  }

  showStart() { this.startEl.classList.remove('hidden'); }
  hideStart() { this.startEl.classList.add('hidden'); }

  showBusted() { this.bustedEl.classList.remove('hidden'); }
  hideBusted() { this.bustedEl.classList.add('hidden'); }

  toggleHelp() { this.helpEl.classList.toggle('hidden'); }

  // Fill the start screen with the live save summary, if any.
  setStartStats(cash, missionsDone) {
    const el = document.getElementById('start-stats');
    if (el) el.textContent = 'Cash ' + formatMoney(cash) + '  •  Missions done: ' + missionsDone + '/3';
  }
}
