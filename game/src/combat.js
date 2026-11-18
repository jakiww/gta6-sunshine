// Pistol combat: click to shoot from the camera centre, raycast against police
// cars and pedestrians, tracer lines, wanted heat for shooting.
import * as THREE from 'three';

export function createCombat(scene) {
  const raycaster = new THREE.Raycaster();
  const tracers = [];
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
  let cooldown = 0;

  function shoot(G, camera) {
    if (cooldown > 0) return false;
    cooldown = 0.28;
    G.audio.shoot();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 120;
    const targets = [];
    for (const cop of G.police.cops) if (cop.alive) targets.push(cop.mesh);
    for (const ped of G.peds.peds) if (!ped.down) targets.push(ped.mesh);
    const hits = raycaster.intersectObjects(targets, true);
    let end;
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point.clone();
      // Walk up to the car/ped root object.
      let obj = hit.object;
      while (obj.parent && obj.parent !== scene) obj = obj.parent;
      const cop = G.police.cops.find((c) => c.mesh === obj);
      if (cop) {
        const destroyed = G.police.damageCop(cop, 34);
        G.toast(destroyed ? 'Cop car destroyed!' : 'Hit! Cop car damaged.', 1.2);
        if (destroyed) G.police.addWanted(G, 1);
      } else {
        const ped = G.peds.peds.find((p) => p.mesh === obj);
        if (ped) {
          ped.knockDown();
          G.police.addWanted(G, 1);
          G.toast('You hit a pedestrian! Wanted +1', 1.5);
        }
      }
    } else {
      end = raycaster.ray.at(90, new THREE.Vector3());
    }
    // Tracer from the camera to the hit point.
    const start = camera.position.clone();
    const dir = end.clone().sub(start);
    const len = dir.length();
    const geo = new THREE.BoxGeometry(0.06, 0.06, len);
    const mesh = new THREE.Mesh(geo, tracerMat);
    mesh.position.copy(start).addScaledVector(dir, 0.5);
    mesh.lookAt(end);
    scene.add(mesh);
    tracers.push({ mesh, life: 0.09 });
    G.peds.fleeFrom(G.playerPos().x, G.playerPos().z, 25);
    G.police.addWanted(G, 0); // refresh lastCrime without raising stars
    if (G.wanted === 0) G.police.addWanted(G, 1);
    return true;
  }

  function update(dt) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = tracers.length - 1; i >= 0; i -= 1) {
      tracers[i].life -= dt;
      if (tracers[i].life <= 0) {
        scene.remove(tracers[i].mesh);
        tracers[i].mesh.geometry.dispose();
        tracers.splice(i, 1);
      }
    }
  }

  return { shoot, update };
}
