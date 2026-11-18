// Sunshine City — keyboard + mouse input.
// WASD move/drive, Shift run, E steal/enter car, F exit car,
// Space brake, mouse orbit camera, click shoot, P pause, M mute.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.shootQueued = false;
    this.actionQueued = false;
    this.exitQueued = false;
    this.pauseQueued = false;
    this.muteQueued = false;
    this.pointerLocked = false;
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'KeyE') this.actionQueued = true;
      if (event.code === 'KeyF') this.exitQueued = true;
      if (event.code === 'KeyP' || event.code === 'Escape') this.pauseQueued = true;
      if (event.code === 'KeyM') this.muteQueued = true;
      if (event.code === 'Space') event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });

    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.shootQueued = true;
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    window.addEventListener('mousemove', (event) => {
      if (!this.pointerLocked) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
  }

  lockPointer() {
    try {
      this.canvas.requestPointerLock();
    } catch (e) { /* pointer lock unavailable */ }
  }

  unlockPointer() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(code) {
    return this.keys.has(code);
  }

  moveVector() {
    let x = 0;
    let z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  get running() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  get braking() {
    return this.down('Space');
  }

  consumeMouseDelta() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeShoot() {
    const value = this.shootQueued;
    this.shootQueued = false;
    return value;
  }

  consumeAction() {
    const value = this.actionQueued;
    this.actionQueued = false;
    return value;
  }

  consumeExit() {
    const value = this.exitQueued;
    this.exitQueued = false;
    return value;
  }

  consumePause() {
    const value = this.pauseQueued;
    this.pauseQueued = false;
    return value;
  }

  consumeMute() {
    const value = this.muteQueued;
    this.muteQueued = false;
    return value;
  }
}
