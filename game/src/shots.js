// Screenshot scenes behind ?shot=cover|onfoot|chase|mission (with &seed=N).
// Each stages the real game state deterministically — a real car, real traffic,
// real wanted level, a real mission — then the loop drives it forward a couple
// of seconds with a scripted input so the frame is what the game really looks
// like, and the same seed always gives the same frame.
import { createRandom } from './random.js';

const KNOWN = ['cover', 'onfoot', 'chase', 'mission'];

export function isShot(name) { return KNOWN.includes(name); }

// Put the player in a car on a straight street, heading along it.
function putInCar(G, x, z, heading) {
  const car = G.vehicles.parked[0] || G.vehicles.traffic[0];
  G.vehicles.steal(car);
  car.pos.x = x; car.pos.z = z; car.heading = heading;
  car.mesh.position.set(x, 0, z);
  car.mesh.rotation.y = heading;
  G.player.state.mesh.visible = false;
  return car;
}

export function stageShot(name, G) {
  const rand = createRandom(G.seed + 99);
  void rand;
  G.startPlay();
  G.time = 0;
  if (name === 'onfoot') {
    // Marco on foot on a sidewalk, pedestrians strolling past, buildings behind.
    G.teleportPlayer(9.5, 60);
    G.camYaw = 0; // camera south of Marco, looking north up the street
    G.camPitch = 0.32;
    G.camDist = 7;
    for (let i = 0; i < 5; i += 1) {
      const ped = G.peds.peds[i];
      ped.pos.x = 4 + i * 4;
      ped.pos.z = 40 - i * 6;
      ped.horizontal = true; ped.dir = 1;
    }
    G.shotInput = { x: 0, z: 0 };
    G.shotCam = { yaw: 0, pitch: 0.32, dist: 7 };
  } else if (name === 'chase') {
    // Three-star chase: Marco driving south through the city, cops on his tail.
    const car = putInCar(G, 0, -60, 0);
    G.setWanted(3);
    G.police.update(0.1, 3, car.pos, true, G.city.colliders, 0);
    // All four cops as a roadblock far ahead (visible in frame, light bars
    // flashing). They close ~130 m over the shot's 2.75 s of sim, so they are
    // still ~20 m ahead — a wall of blue lights — when the frame is taken.
    const roadblockX = [-6, -2, 2, 6];
    let i = 0;
    for (const cop of G.police.cops) {
      cop.pos.x = roadblockX[i % roadblockX.length];
      cop.pos.z = car.pos.z + 145 + i * 5;
      cop.heading = Math.PI;
      cop.speed = 20;
      i += 1;
    }
    G.shotInput = { x: 0, z: 1 };
    G.shotCam = { yaw: Math.PI, pitch: 0.28, dist: 13, follow: true };
  } else if (name === 'mission') {
    // Mission 2 in progress: package on board, beacon at the delivery point ahead.
    G.missions.start(1);
    G.missions.state.stage = 'deliver';
    G.missions.state.hasPackage = true;
    G.missions.state.timer = 74;
    G.missions.setTarget(G.loc.deliver);
    const car = putInCar(G, -132, 60, Math.PI); // on the delivery street, heading north
    G.setWanted(1);
    G.shotInput = { x: 0, z: 1 };
    // Car drives -z, so the camera sits south of it (yaw 0) and follows behind.
    G.shotCam = { yaw: 0, pitch: 0.3, dist: 13, follow: true };
    G.updateObjective();
  } else {
    // cover: golden-hour street from the car, HUD + minimap, traffic ahead.
    // Drive north from mid-city so the car stays among buildings for the shot.
    G.missions.start(0);
    G.missions.state.stage = 'drive';
    G.missions.setTarget(G.loc.garage);
    const car = putInCar(G, 3.5, 100, Math.PI);
    G.shotInput = { x: 0, z: 1 };
    // Put three traffic cars ahead on the same street so the cover has traffic.
    G.vehicles.traffic.slice(0, 3).forEach((c, i) => {
      c.horizontal = false; c.street = 0; c.dir = -1; c.speed = 10;
      c.pos.x = i % 2 === 0 ? -3.5 : 3.5;
      c.pos.z = car.pos.z - 45 - i * 30;
      c.mesh.position.set(c.pos.x, 0, c.pos.z);
      c.mesh.rotation.y = Math.PI;
    });
    // Car drives -z (north); camera behind it is south (yaw 0).
    G.shotCam = { yaw: 0, pitch: 0.24, dist: 12, follow: true };
    G.updateObjective();
  }
  G.hud.update(G);
}
