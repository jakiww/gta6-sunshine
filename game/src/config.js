// Shared constants for Sunshine City.
export const WORLD = {
  // City grid: blocks of BLOCK size separated by ROAD-wide streets.
  block: 52,
  road: 14,
  blocks: 4, // blocks from -4..4 each way; city half-size ~ (2*4+1)*52/2
  // Beach strip along the south edge (positive z).
  beachZ: 235,
  seaZ: 275,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  radius: 0.7,
  maxHealth: 100,
};

export const CAR = {
  accel: 22,
  brake: 34,
  maxSpeed: 42,
  maxReverse: 12,
  steer: 1.9,
};

export const WANTED_MAX = 5;
export const SAVE_KEY = 'sunshine-city-save-v1';
