// Sunshine City — save / load through localStorage.
// Only progress numbers are stored: cash, missions done, best wanted escape.

import { CONFIG } from './config.js';

export function loadSave() {
  const fallback = { cash: 0, missionsCompleted: 0, carsStolen: 0, bestScore: 0 };
  try {
    const raw = window.localStorage.getItem(CONFIG.saveKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      cash: typeof parsed.cash === 'number' ? parsed.cash : 0,
      missionsCompleted: typeof parsed.missionsCompleted === 'number' ? parsed.missionsCompleted : 0,
      carsStolen: typeof parsed.carsStolen === 'number' ? parsed.carsStolen : 0,
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
    };
  } catch (e) {
    return fallback;
  }
}

export function storeSave(state) {
  try {
    const data = {
      cash: Math.floor(state.cash),
      missionsCompleted: state.missionsCompleted,
      carsStolen: state.carsStolen,
      bestScore: state.bestScore,
    };
    window.localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(CONFIG.saveKey);
  } catch (e) { /* storage unavailable */ }
}
