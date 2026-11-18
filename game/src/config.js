// Sunshine City — shared tuning constants.
// One place for every number the other systems agree on, so a balance
// change never means hunting through five files.

export const WORLD = {
  // Playable city block, in metres. The beach and sea sit past +Z.
  halfSize: 220,
  roadSpacing: 55,
  roadWidth: 10,
  // Sea starts here; the sand strip runs just before it.
  beachZ: 190,
  seaZ: 205,
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 14,
  healthMax: 100,
  // How close Marco must be to a parked car to steal it.
  stealRange: 4.5,
};

export const CAR = {
  accel: 16,
  brake: 30,
  reverseAccel: 10,
  maxSpeed: 38,
  maxReverse: 10,
  steerRate: 1.9,
  drag: 0.6,
};

export const WANTED = {
  max: 5,
  // Wanted decays slowly when Marco stays clean.
  decayPerSecond: 0.045,
  stealCar: 1,
  shoot: 1,
  // A police car touching Marco on foot builds up a bust.
  bustHoldSeconds: 1.6,
};

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'First Wheels',
    giver: 'Lena Cruz',
    brief: 'Lena needs wheels. Steal any parked car and bring it to the garage.',
    reward: 500,
  },
  {
    id: 'package-run',
    title: 'Package Run',
    giver: 'Lena Cruz',
    brief: 'Pick up the package at the pier, then deliver it to the north garage in 90 seconds.',
    reward: 800,
    timeLimit: 90,
  },
  {
    id: 'lose-the-heat',
    title: 'Lose the Heat',
    giver: 'Lena Cruz',
    brief: 'The cops are all over you. Lose the wanted level completely to clear your name.',
    reward: 1200,
  },
];

export const ECONOMY = {
  startCash: 150,
};

export const COLORS = {
  sky: 0x8fd3f4,
  sun: 0xfff2c0,
  sand: 0xe8d29a,
  sea: 0x1e7fa8,
  seaDeep: 0x0f5e84,
  grass: 0x7fae56,
  asphalt: 0x3a3f46,
  sidewalk: 0x9aa0a6,
  line: 0xf5d90a,
  buildingPalette: [0xd98a6a, 0x7fa8c9, 0xe0b45c, 0x9db08a, 0xc97f9a, 0x6a8caf],
  palmTrunk: 0x8a6b48,
  palmLeaf: 0x3f9e4d,
  policeBlue: 0x2244ff,
  policeRed: 0xff2222,
};
