/* Meridian Courier: missions. One job: define each sortie's goals and score them. */
'use strict';

var MISSION_BRIEFS = {
  rings: 'Ring Run: thread every glowing ring before your fuel runs dry. Smooth turns beat hard banks, and full throttle burns fuel twice as fast.',
  landing: 'Valley Landing: fly down the valley, line up with runway 09, and touch down slow and level. A hard touchdown or a hillside ends the sortie.',
  canyon: 'Canyon Slalom: thread the red gates low over the river. Stay under 400 ft through the gates or they do not count.',
};

/* Build the rings / gates for a mission. alt is in feet, radius in metres. */
function buildMission(kind) {
  if (kind === 'landing') {
    return {
      kind: kind,
      title: 'VALLEY LANDING',
      rings: [],
      runway: { x: 0, zStart: 14800, zEnd: 16400, halfWidth: 16 },
      fuelStart: 100,
      timeLimit: 360,
    };
  }
  if (kind === 'canyon') {
    const gates = [];
    const xs = [-70, 60, -40, 90, -80, 30, -60, 70];
    for (let i = 0; i < 8; i++) {
      gates.push({
        x: xs[i], z: 2200 + i * 1700, alt: 240, radius: 26,
        kind: 'gate', label: String(i + 1), passed: false, maxAlt: 400,
      });
    }
    return {
      kind: kind, title: 'CANYON SLALOM', rings: gates,
      runway: { x: 0, zStart: 14800, zEnd: 16400, halfWidth: 16 },
      fuelStart: 100, timeLimit: 300,
    };
  }
  /* rings: a gentle slalom down the valley, climbing then descending. */
  const rings = [];
  const xs = [0, -90, 80, -60, 110, -100, 40, 0];
  const alts = [300, 380, 460, 420, 520, 430, 340, 300];
  for (let i = 0; i < 8; i++) {
    rings.push({
      x: xs[i], z: 1800 + i * 1500, alt: alts[i], radius: 30,
      kind: 'ring', label: String(i + 1), passed: false, maxAlt: 9999,
    });
  }
  return {
    kind: kind, title: 'RING RUN', rings: rings,
    runway: { x: 0, zStart: 14800, zEnd: 16400, halfWidth: 16 },
    fuelStart: 100, timeLimit: 300,
  };
}

/* Next unpassed ring or gate, or null when all are done. */
function nextTarget(mission) {
  for (const r of mission.rings) if (!r.passed) return r;
  return null;
}

/* Check a ring pass: plane within the ring disc as it crosses the ring plane. */
function checkRingPass(p, prevZ, mission) {
  const target = nextTarget(mission);
  if (!target) return null;
  if (prevZ < target.z && p.z >= target.z) {
    const dx = p.x - target.x;
    const dy = p.alt - target.alt;
    const dist = Math.sqrt(dx * dx + dy * dy * 0.09); /* altitude in feet, scaled to metres */
    if (dist <= target.radius && p.alt <= target.maxAlt) {
      target.passed = true;
      return { ok: true, ring: target };
    }
    return { ok: false, ring: target, miss: Math.round(dist) };
  }
  return null;
}

/* Score a finished sortie. */
function scoreSortie(mission, p, elapsed, landed) {
  let score = 0;
  const passed = mission.rings.filter(function (r) { return r.passed; }).length;
  score += passed * 500;
  score += Math.round(p.distance * 120);
  score += Math.round(p.fuel) * 4;
  score -= Math.round(p.damage) * 6;
  if (landed === 'smooth') score += 1200;
  if (landed === 'hard') score += 500;
  if (mission.rings.length > 0 && passed === mission.rings.length) score += 800;
  const timeBonus = Math.max(0, Math.round((mission.timeLimit - elapsed) * 3));
  score += timeBonus;
  return { score: Math.max(0, score), passed: passed, total: mission.rings.length, timeBonus: timeBonus };
}
