/* Meridian Courier: flight physics. One job: move the aircraft state each tick. */
'use strict';

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function degToRad(d) { return d * Math.PI / 180; }

/* Deterministic pseudo-random helper so terrain and gates are stable per seed. */
function makeRng(seed) {
  let s = seed >>> 0;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Create a fresh aircraft state at the start of a sortie. */
function createPlane() {
  return {
    x: 0,            /* lateral offset from valley centreline, metres */
    z: 0,            /* distance flown along the valley, metres */
    alt: 260,        /* altitude above the valley floor, feet */
    heading: 0,      /* degrees, 0 = straight down the valley */
    pitch: 0,        /* degrees, positive = nose up */
    bank: 0,         /* degrees of roll, positive = right wing down */
    speed: 95,       /* knots */
    throttle: 0.62,  /* 0..1 */
    fuel: 100,       /* percent */
    damage: 0,       /* percent; 100 ends the sortie */
    vspeed: 0,       /* feet per minute */
    flaps: false,
    onGround: false,
    distance: 0,     /* nautical miles flown */
  };
}

/* Advance the plane one tick. input: {left,right,up,down,throttleUp,throttleDown,brake,mouseX}. */
function stepPhysics(p, input, dt, opts) {
  opts = opts || {};
  const maxSpeed = opts.maxSpeed || 210;
  const minSpeed = opts.minSpeed || 55;

  /* Throttle: W/S keys, gentle by design so fuel discipline matters. */
  if (input.throttleUp) p.throttle = clamp(p.throttle + 0.45 * dt, 0, 1);
  if (input.throttleDown) p.throttle = clamp(p.throttle - 0.45 * dt, 0, 1);
  if (input.brake) p.throttle = clamp(p.throttle - 0.9 * dt, 0, 1);

  /* Bank from keys or mouse. Mouse steers toward the pointer side. */
  let bankTarget = 0;
  if (input.left) bankTarget -= 38;
  if (input.right) bankTarget += 38;
  if (input.mouseX !== null && input.mouseX !== undefined) {
    bankTarget += clamp(input.mouseX * 55, -55, 55);
  }
  p.bank = lerp(p.bank, bankTarget, clamp(3.2 * dt, 0, 1));

  /* Turn rate grows with bank and falls off at very low speed. */
  const speedFactor = clamp(p.speed / 120, 0.45, 1);
  p.heading += p.bank * 0.16 * speedFactor * dt;
  if (p.heading > 180) p.heading -= 360;
  if (p.heading < -180) p.heading += 360;

  /* Pitch from keys, damped toward level when released. */
  let pitchTarget = 0;
  if (input.up) pitchTarget = 9;
  if (input.down) pitchTarget = -11;
  p.pitch = lerp(p.pitch, pitchTarget, clamp(2.6 * dt, 0, 1));

  /* Speed chases throttle; drag rises with the square of speed, so top speed costs fuel. */
  const targetSpeed = minSpeed + p.throttle * (maxSpeed - minSpeed);
  const accel = p.speed < targetSpeed ? 26 : 15;
  p.speed += clamp(targetSpeed - p.speed, -accel * dt, accel * dt);
  if (input.brake) p.speed = Math.max(minSpeed - 18, p.speed - 34 * dt);

  /* Climb: pitch converts speed into vertical speed; steep dives at low throttle sink fast. */
  const climbFpm = Math.sin(degToRad(p.pitch)) * p.speed * 101.3 * 0.9;
  const sink = p.throttle < 0.25 ? (0.25 - p.throttle) * 900 : 0;
  p.vspeed = lerp(p.vspeed, climbFpm - sink, clamp(2 * dt, 0, 1));

  /* Move along the heading. */
  const metresPerSec = p.speed * 0.514444;
  const hRad = degToRad(p.heading);
  p.x += Math.sin(hRad) * metresPerSec * dt;
  p.z += Math.cos(hRad) * metresPerSec * dt;
  p.distance += metresPerSec * dt / 1852;

  /* Altitude, with a soft ground floor handled by the caller (landing / crash). */
  p.alt += (p.vspeed / 60) * dt;

  /* Fuel: cruise sips, full throttle gulps, airbrake wastes speed not fuel. */
  const burn = (0.22 + p.throttle * p.throttle * 1.05) * dt;
  p.fuel = Math.max(0, p.fuel - burn);
  if (p.fuel <= 0) p.throttle = Math.max(0, p.throttle - 0.5 * dt);

  return p;
}

/* Damage from a hard touchdown. Returns a short verdict string. */
function touchdownVerdict(p, runway) {
  const vs = Math.abs(p.vspeed);
  const offCentre = Math.abs(p.x - runway.x);
  const aligned = Math.abs(p.heading) < 14;
  if (vs > 950 || !aligned || offCentre > runway.halfWidth + 6) return 'crash';
  if (vs > 620 || offCentre > runway.halfWidth - 4) return 'hard';
  return 'smooth';
}

/* Apply a ground strike (hill, tree line, or runway edge) to the plane. */
function applyStrike(p, severity) {
  p.damage = clamp(p.damage + severity, 0, 100);
  p.speed = Math.max(30, p.speed - severity * 1.4);
  return p.damage >= 100;
}
