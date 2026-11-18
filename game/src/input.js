// Keyboard + mouse input. Drag to orbit the camera; click shoots (handled by combat).
export const ACTION_PAUSE = 1;
export const ACTION_INTERACT = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const keys = new Set();
  let yawDelta = 0;
  let pitchDelta = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let clicked = false;
  let actions = 0;

  function keyName(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    if (!e.repeat) {
      if (k === 'Escape' || k === 'p' || k === 'P') actions |= ACTION_PAUSE;
      if (k === 'e' || k === 'E') actions |= ACTION_INTERACT;
      if (k === 'm' || k === 'M') actions |= ACTION_MUTE;
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    if (e.button === 0) clicked = true;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    yawDelta += e.clientX - lastX;
    pitchDelta += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });

  return {
    held(k) { return keys.has(k); },
    axis() {
      // x: strafe/steer, z: forward/back. WASD + arrows.
      let x = 0; let z = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) z += 1;
      if (keys.has('s') || keys.has('ArrowDown')) z -= 1;
      return { x, z };
    },
    running() { return keys.has('Shift'); },
    takeLook() {
      const d = { yaw: yawDelta * 0.0045, pitch: pitchDelta * 0.0045 };
      yawDelta = 0; pitchDelta = 0;
      return d;
    },
    takeClick() { const c = clicked; clicked = false; return c; },
    takeActions() { const a = actions; actions = 0; return a; },
  };
}
