// The three story missions for Marco Reyes. Each has stages, a beacon marker in
// the world, a cash reward, and a save entry when finished.
import * as THREE from 'three';

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'MISSION 1 — FIRST WHEELS',
    reward: 500,
    intro: 'Lena: "No wheels, no job. Jack a car and bring it to my garage."',
  },
  {
    id: 'package-run',
    title: 'MISSION 2 — PACKAGE RUN',
    reward: 800,
    intro: 'Lena: "Package at the north docks. Deliver it across town — 90 seconds."',
  },
  {
    id: 'lose-the-heat',
    title: 'MISSION 3 — LOSE THE HEAT',
    reward: 1200,
    intro: 'Lena: "Cops are on you. Lose them at the safehouse — do NOT get busted."',
  },
];

export function createMissions(scene, G) {
  // Beacon: a glowing pillar + floating diamond marking the objective.
  const beacon = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 30, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  pillar.position.y = 15;
  beacon.add(pillar);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffd23f }),
  );
  diamond.position.y = 6;
  beacon.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);

  const state = {
    index: G.save.missionsDone.length >= 3 ? 3 : G.save.missionsDone.length,
    stage: 'idle',
    timer: 0,
    target: null,
    hasPackage: false,
  };

  function setTarget(pos) {
    state.target = pos;
    if (pos) {
      beacon.position.set(pos.x, 0, pos.z);
      beacon.visible = true;
    } else {
      beacon.visible = false;
    }
  }

  function objectiveText() {
    if (state.index >= 3) return 'Free roam — the debt is yours to pay. Explore Sunshine City.';
    const m = MISSIONS[state.index];
    if (state.index === 0) {
      return state.stage === 'steal'
        ? 'Steal a car — walk up to one and press E'
        : 'Drive to Lena\'s garage (follow the yellow beacon)';
    }
    if (state.index === 1) {
      if (state.stage === 'pickup') return 'Pick up the package at the beacon (press E)';
      return `Deliver the package — ${Math.max(0, Math.ceil(state.timer))}s left!`;
    }
    return 'Lose the cops — reach the safehouse beacon before you get BUSTED';
  }

  function start(index) {
    state.index = index;
    state.hasPackage = false;
    if (index === 0) {
      state.stage = 'steal';
      setTarget(null);
      G.toast(MISSIONS[0].intro, 4);
    } else if (index === 1) {
      state.stage = 'pickup';
      setTarget(G.loc.pickup);
      G.toast(MISSIONS[1].intro, 4);
    } else if (index === 2) {
      state.stage = 'heat';
      setTarget(G.loc.safehouse);
      G.setWanted(3);
      G.heatLock = true;
      G.toast(MISSIONS[2].intro, 4);
    }
    G.updateObjective();
  }

  function complete() {
    const m = MISSIONS[state.index];
    G.cash += m.reward;
    G.save.cash = G.cash;
    if (!G.save.missionsDone.includes(m.id)) G.save.missionsDone.push(m.id);
    G.writeSave();
    G.audio.chime();
    G.toast(`+$${m.reward} — ${m.title} complete!`, 3);
    setTarget(null);
    state.index += 1;
    state.stage = 'idle';
    G.heatLock = false;
    if (state.index >= 3) {
      G.showEnd('STORY COMPLETE', `All three jobs done. You earned $${m.reward} on the last one — $${G.cash} total. The debt is still there, but tonight, Sunshine City is yours.`, 'KEEP DRIVING');
    } else {
      G.showEnd('MISSION COMPLETE', `${m.title} — Lena wired you $${m.reward}. Cash: $${G.cash}.`, 'NEXT JOB');
    }
  }

  // Called when the player presses E near something mission-relevant.
  function interact() {
    if (state.index === 1 && state.stage === 'pickup' && state.target) {
      const p = G.playerPos();
      if (Math.hypot(p.x - state.target.x, p.z - state.target.z) < 5) {
        state.hasPackage = true;
        state.stage = 'deliver';
        state.timer = 90;
        setTarget(G.loc.deliver);
        G.audio.chime();
        G.toast('Package secured — GO! 90 seconds!', 2.5);
        G.updateObjective();
        return true;
      }
    }
    return false;
  }

  function update(dt) {
    if (state.index >= 3) return;
    diamond.rotation.y += dt * 2;
    diamond.position.y = 6 + Math.sin(G.time * 2) * 0.5;
    const p = G.playerPos();
    if (state.index === 0) {
      if (state.stage === 'steal' && G.inCar()) {
        state.stage = 'drive';
        setTarget(G.loc.garage);
        G.toast('Nice wheels. Now get to Lena\'s garage.', 2.5);
        G.updateObjective();
      } else if (state.stage === 'drive' && state.target) {
        if (Math.hypot(p.x - state.target.x, p.z - state.target.z) < 12) complete();
      }
    } else if (state.index === 1) {
      if (state.stage === 'deliver') {
        state.timer -= dt;
        if (state.timer <= 0) {
          G.toast('Too slow — the buyer walked. Package run failed, try again.', 3);
          start(1);
          return;
        }
        if (state.target && Math.hypot(p.x - state.target.x, p.z - state.target.z) < 12) complete();
      }
    } else if (state.index === 2) {
      if (state.target && Math.hypot(p.x - state.target.x, p.z - state.target.z) < 12) {
        G.setWanted(0);
        complete();
      }
    }
  }

  return { state, start, update, interact, objectiveText, setTarget };
}
