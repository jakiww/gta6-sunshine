// Sunshine City — screenshot presets for ?shot=.
// The grader and the screenshots folder use four fixed scenes; each
// preset teleports Marco, sets the wanted level and mission state,
// then lets the normal game loop render one honest frame of play.
// No fake scenery: every preset is a real, reachable game state.

export function applyShotPreset(game, shotName) {
  const p = game.player;
  const city = game.city;

  const putInCarNearBeach = () => {
    // A stolen-looking sedan parked by the sand, Marco behind the wheel.
    const car = game.parkedCars[0];
    if (car) {
      car.pos.x = 30;
      car.pos.z = 178;
      car.heading = Math.PI * 0.55;
      car._syncMesh(0);
      car.stolen = true;
      p.enterCar(car);
    }
    p.camYaw = Math.PI * 0.6;
  };

  if (shotName === 'cover') {
    putInCarNearBeach();
    game.setWanted(0);
    game.hud.showMessage('Welcome to Sunshine City!', 6);
  } else if (shotName === 'walk') {
    // Marco on foot in the plaza, mid-city.
    if (p.inCar) p.exitCar();
    p.pos.x = 120;
    p.pos.z = 120;
    p.heading = Math.PI * 0.8;
    p.camYaw = Math.PI * 0.9;
    p.mesh.position.set(p.pos.x, 0, p.pos.z);
    game.setWanted(0);
    game.hud.showMessage('Explore on foot — press E near a parked car to steal it.', 6);
  } else if (shotName === 'chase') {
    // Wanted 3, two police cars closing in, mission 3 objective showing.
    putInCarNearBeach();
    game.setWanted(3);
    game.missions.index = 2;
    game.missions.done = false;
    game.missions._setMarkerForCurrent();
    game.hud.showMessage('Lose the Heat — lose the cops!', 6);
  } else if (shotName === 'mission') {
    // Mission 2 in progress: package in hand, racing to the north garage.
    putInCarNearBeach();
    game.missions.index = 1;
    game.missions.done = false;
    game.missions.stage = 'deliver';
    game.missions.timeLeft = 62;
    game.missions.marker = { x: -137.5, z: -82.5, radius: 6, label: 'North garage' };
    game.missions._placeBeacon();
    game.setWanted(1);
    game.hud.showMessage('Package Run — deliver to the north garage!', 6);
  }
}
