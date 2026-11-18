// Sunshine City — save / load through localStorage.
// Only numbers and small flags: cash, missions done, wanted level,
// health and Marco's position. Nothing sensitive, nothing personal.

const SAVE_KEY = 'sunshine-city-save-v1';

export function saveGame(state) {
  try {
    const data = {
      cash: Math.floor(state.cash),
      missionsDone: state.missionsDone,
      wanted: state.wanted,
      health: Math.round(state.health),
      pos: { x: Math.round(state.pos.x), z: Math.round(state.pos.z) },
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}
