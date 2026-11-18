// localStorage save: cash earned and missions completed. Nothing else leaves the browser.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: 0, missionsDone: [] };
    const data = JSON.parse(raw);
    return {
      cash: typeof data.cash === 'number' ? data.cash : 0,
      missionsDone: Array.isArray(data.missionsDone) ? data.missionsDone : [],
    };
  } catch {
    return { cash: 0, missionsDone: [] };
  }
}

export function writeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}
