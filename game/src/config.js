// Sunshine City — central tuning values for the whole game.
// Every system reads its numbers from here so balancing is one edit away.

export const CONFIG = {
  // World layout
  blockSize: 60,
  roadWidth: 14,
  roadCount: 7, // roads at -180, -120, -60, 0, 60, 120, 180 on both axes
  cityHalf: 210, // playable city extent before the beach
  beachStart: 215, // z beyond this is sand, then sea
  seaStart: 265,
  worldHalf: 320,

  // Player on foot
  walkSpeed: 9,
  runSpeed: 14,
  playerHealth: 100,
  stealRange: 4.5,
  enterCarTime: 0.4,

  // Driving
  carAccel: 26,
  carBrake: 42,
  carReverseAccel: 14,
  carMaxSpeed: 42,
  carMaxReverse: 10,
  carTurnRate: 1.9,
  carDrag: 0.6,

  // Traffic
  trafficCount: 14,
  trafficSpeedMin: 9,
  trafficSpeedMax: 15,

  // Pedestrians
  pedestrianCount: 26,
  pedestrianSpeedMin: 1.2,
  pedestrianSpeedMax: 2.4,

  // Police
  policeMax: 5,
  policeSpeed: 34,
  policeCatchRange: 3.2,
  policeRamDamage: 8,

  // Wanted
  wantedDecayCalmSeconds: 18,
  wantedDecayInterval: 12,

  // Combat
  pistolDamage: 34,
  pistolRange: 90,
  pistolCooldown: 0.28,
  policeCarHealth: 100,

  // Missions
  mission1Reward: 500,
  mission2Reward: 800,
  mission2TimeLimit: 90,
  mission3Reward: 1200,
  mission3EvadeSeconds: 45,

  // Camera
  cameraDistance: 13,
  cameraHeight: 7,
  cameraLerp: 6,

  // Minimap
  minimapSize: 190,
  minimapRange: 260,

  // Save
  saveKey: 'sunshine-city-save-v1',
};

export const MISSION_DEFS = [
  {
    id: 1,
    name: 'First Wheels',
    giver: 'Lena Cruz',
    briefing: 'Lena: "Marco, kita butuh mobil. Cari mobil parkir, tekan E, dan bawa ke garasi biru."',
    reward: CONFIG.mission1Reward,
  },
  {
    id: 2,
    name: 'Package Run',
    giver: 'Lena Cruz',
    briefing: 'Lena: "Paket ini harus sampai ke dermaga dalam 90 detik. Jangan sampai ketangkap polisi."',
    reward: CONFIG.mission2Reward,
  },
  {
    id: 3,
    name: 'Lose the Heat',
    giver: 'Lena Cruz',
    briefing: 'Lena: "Polisi sudah mengendus kita. Kabur dan hilangkan bintang wanted-mu. Bertahanlah."',
    reward: CONFIG.mission3Reward,
  },
];

export const CAR_COLORS = [
  0xd43a2f, 0x2f6fd4, 0xf2c230, 0x2fd47a, 0xe8e8e8,
  0x222831, 0x8a5a2b, 0x7a2fd4, 0x3ad4d4, 0xd47a2f,
];

export const BUILDING_COLORS = [
  0xf2e3c6, 0xe8b48a, 0x9fc3d4, 0xd49fb0, 0xb8d4a0,
  0xf7f0e0, 0xc9a06a, 0x8fb8c9, 0xe0cfa8, 0xd4d4d4,
];

export const SKY_COLOR = 0x87ceeb;
export const SUN_COLOR = 0xfff2cc;
export const GROUND_COLOR = 0x7fae62;
export const SAND_COLOR = 0xf0d9a0;
export const SEA_COLOR = 0x2a9db8;
export const ROAD_COLOR = 0x3a3d42;
export const SIDEWALK_COLOR = 0xb8b0a0;
