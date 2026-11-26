/* Meridian Courier: game loop, input, state machine and screenshot staging. */
'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const panel = document.getElementById('panel');
  const toast = document.getElementById('toast');
  const endcard = document.getElementById('endcard');
  const endTitle = document.getElementById('endTitle');
  const endText = document.getElementById('endText');
  const endStats = document.getElementById('endStats');
  const brief = document.getElementById('brief');

  const VIEW_W = 1280, VIEW_H = 720;

  function resize() {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
  }
  resize();

  const world = buildWorld(20261126);
  let missionKind = 'rings';
  let mission = buildMission(missionKind);
  let plane = createPlane();
  let state = 'menu'; /* menu | flying | paused | done */
  let elapsed = 0;
  let prevZ = 0;
  let note = null; /* {text, sub, until} centre note */
  let toastTimer = null;
  let lastWarn = 0;
  let autopilot = false; /* screenshot staging flies straight and level */
  let shotMode = null;

  const input = {
    left: false, right: false, up: false, down: false,
    throttleUp: false, throttleDown: false, brake: false, mouseX: null,
  };

  const params = new URLSearchParams(window.location.search);
  shotMode = params.get('shot');

  function showToast(text, ms) {
    toast.textContent = text;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.style.opacity = '0'; }, ms || 1600);
  }

  function showNote(text, sub, secs) {
    note = { text: text, sub: sub, until: performance.now() / 1000 + secs };
  }

  function startMission(kind, opts) {
    opts = opts || {};
    missionKind = kind;
    mission = buildMission(kind);
    plane = createPlane();
    plane.fuel = mission.fuelStart;
    elapsed = 0;
    prevZ = 0;
    note = null;
    state = 'flying';
    panel.classList.add('hidden');
    endcard.classList.add('hidden');
    AudioBus.startEngine();
    if (opts.z !== undefined) plane.z = opts.z;
    if (opts.alt !== undefined) plane.alt = opts.alt;
    if (opts.x !== undefined) plane.x = opts.x;
    if (opts.speed !== undefined) plane.speed = opts.speed;
    if (opts.throttle !== undefined) plane.throttle = opts.throttle;
    if (opts.autopilot) autopilot = true;
    prevZ = plane.z;
    if (!shotMode) showToast(mission.title + ' — GO!', 1800);
  }

  function endSortie(title, text, landed) {
    state = 'done';
    const result = scoreSortie(mission, plane, elapsed, landed);
    AudioBus.setEngine(0, 0, false);
    if (landed === 'smooth' || result.passed === result.total) AudioBus.fanfare();
    endTitle.textContent = title;
    endText.textContent = text;
    endStats.textContent = 'Score ' + result.score + '  ·  Rings ' + result.passed + '/' + result.total +
      '  ·  Distance ' + plane.distance.toFixed(1) + ' nm  ·  Fuel left ' + Math.round(plane.fuel) +
      '%  ·  Damage ' + Math.round(plane.damage) + '%  ·  Time ' +
      Math.floor(elapsed / 60) + ':' + String(Math.floor(elapsed % 60)).padStart(2, '0');
    endcard.classList.remove('hidden');
  }

  /* ---- input ---- */
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
  };
  window.addEventListener('keydown', function (e) {
    if (e.code === 'KeyW' && !e.repeat) input.throttleUp = true;
    if (e.code === 'KeyS' && !e.repeat) input.throttleDown = true;
    if (KEYMAP[e.code]) input[KEYMAP[e.code]] = true;
    if (e.code === 'Space') { input.brake = true; e.preventDefault(); }
    if (e.code === 'KeyM') { const m = AudioBus.toggleMute(); showToast(m ? 'SOUND OFF' : 'SOUND ON', 900); }
    if (e.code === 'KeyP') {
      if (state === 'flying') { state = 'paused'; showNote('PAUSED', 'Press P to keep flying', 9999); }
      else if (state === 'paused') { state = 'flying'; note = null; }
    }
    if (e.code === 'KeyR') startMission(missionKind);
    if (e.code === 'Enter' && state === 'menu') startMission(missionKind);
    if (e.code === 'Digit1') pickMission('rings');
    if (e.code === 'Digit2') pickMission('landing');
    if (e.code === 'Digit3') pickMission('canyon');
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    if (e.code === 'KeyW') input.throttleUp = false;
    if (e.code === 'KeyS') input.throttleDown = false;
    if (KEYMAP[e.code]) input[KEYMAP[e.code]] = false;
    if (e.code === 'Space') input.brake = false;
  });
  canvas.addEventListener('mousemove', function (e) {
    const r = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - r.left) / r.width - 0.5) * 2;
  });
  canvas.addEventListener('mouseleave', function () { input.mouseX = null; });

  function pickMission(kind) {
    missionKind = kind;
    document.querySelectorAll('.mission').forEach(function (b) {
      b.classList.toggle('picked', b.dataset.mission === kind);
    });
    brief.textContent = MISSION_BRIEFS[kind];
  }
  document.querySelectorAll('.mission').forEach(function (b) {
    b.addEventListener('click', function () { pickMission(b.dataset.mission); });
  });
  document.getElementById('flyBtn').addEventListener('click', function () { startMission(missionKind); });
  document.getElementById('againBtn').addEventListener('click', function () { startMission(missionKind); });

  /* ---- screenshot staging: ?shot=cover|rings|landing|canyon ---- */
  function applyShot() {
    if (!shotMode) return;
    if (shotMode === 'cover') {
      startMission('rings', { z: 1500, x: -110, alt: 280, speed: 130, throttle: 0.7, autopilot: true });
    } else if (shotMode === 'rings') {
      startMission('rings', { z: 4000, alt: 430, speed: 135, throttle: 0.7, autopilot: true });
      mission.rings[0].passed = true; /* staged mid-run: rings 1 and 2 are behind the plane */
      mission.rings[1].passed = true;
    } else if (shotMode === 'landing') {
      startMission('landing', { z: 14400, x: -45, alt: 200, speed: 100, throttle: 0.45, autopilot: true });
    } else if (shotMode === 'canyon') {
      startMission('canyon', { z: 3600, alt: 250, speed: 140, throttle: 0.75, autopilot: true });
      mission.rings[0].passed = true; /* staged mid-run: gate 1 is behind the plane */
    }
  }

  /* ---- per-frame update ---- */
  function update(dt, nowSec) {
    if (state !== 'flying') return;
    elapsed += dt;
    prevZ = plane.z;

    if (autopilot) {
      /* Gentle autopilot: hold altitude near the next target, fly straight. */
      const target = nextTarget(mission);
      const wantAlt = target ? target.alt : 220;
      plane.pitch = clamp((wantAlt - plane.alt) * 0.02, -6, 6);
      plane.bank = clamp((target ? target.x - plane.x : 0) * 0.12, -18, 18);
      plane.throttle = 0.62;
      plane.heading += clamp(plane.bank * 0.16 * dt, -0.05, 0.05);
      const mps = plane.speed * 0.514444;
      plane.z += mps * dt;
      plane.x += Math.sin(degToRad(plane.heading)) * mps * dt;
      plane.alt += (plane.vspeed / 60) * dt;
      plane.vspeed = Math.sin(degToRad(plane.pitch)) * plane.speed * 91;
      plane.fuel = Math.max(0, plane.fuel - 0.35 * dt);
    } else {
      stepPhysics(plane, input, dt, {});
    }

    /* Ground and runway logic. */
    const r = world.runway;
    const overRunway = plane.z >= r.zStart && plane.z <= r.zEnd && Math.abs(plane.x - r.x) <= r.halfWidth + 8;
    if (plane.alt <= 0) {
      plane.alt = 0;
      if (overRunway && plane.speed < 150) {
        const verdict = touchdownVerdict(plane, r);
        if (verdict === 'crash') {
          AudioBus.thud();
          endSortie('CRASHED ON THE RUNWAY', 'Too fast, too steep, or off the centreline. The courier mail is scattered across runway 09.', 'crash');
        } else {
          plane.onGround = true;
          plane.speed = Math.max(0, plane.speed - 60 * dt);
          if (plane.speed <= 2) {
            endSortie(verdict === 'smooth' ? 'PERFECT LANDING' : 'LANDED — HARD',
              verdict === 'smooth'
                ? 'Three-point touchdown, mail intact, crowd cheering at the valley strip.'
                : 'You are down, but the landing gear will remember that one. Mail intact, barely.',
              verdict);
          }
        }
      } else if (overRunway) {
        AudioBus.thud();
        endSortie('RUNWAY OVERSPEED', 'You touched the runway far too fast and ran off the end into the fence.', 'crash');
      } else {
        AudioBus.thud();
        endSortie('TERRAIN STRIKE', 'The valley floor came up to meet you. The courier walks home from here.', 'crash');
      }
      return;
    }

    /* Low-altitude warning over the valley floor (not over the runway). */
    if (plane.alt < 90 && !overRunway && nowSec - lastWarn > 4) {
      lastWarn = nowSec;
      AudioBus.warningBuzz();
      showToast('PULL UP — TERRAIN', 1200);
    }

    /* Ring / gate passes. */
    const pass = checkRingPass(plane, prevZ, mission);
    if (pass) {
      if (pass.ok) {
        AudioBus.ringChime();
        showToast('RING ' + pass.ring.label + ' — CLEAN!', 1300);
        plane.fuel = clamp(plane.fuel + 4, 0, 100);
        if (!nextTarget(mission)) {
          endSortie('ALL RINGS FLOWN', 'Every ring threaded, mail delivered on time. The valley remembers this run.', 'smooth');
          return;
        }
      } else {
        AudioBus.warningBuzz();
        showToast('MISSED RING ' + pass.ring.label + ' — ' + pass.miss + ' m OFF', 1600);
        plane.damage = clamp(plane.damage + 8, 0, 100);
      }
    }

    /* Fuel and damage endings. */
    if (plane.fuel <= 0) {
      endSortie('OUT OF FUEL', 'The engine sputters and dies over the valley. A glider landing was never in the brochure.', 'crash');
      return;
    }
    if (plane.damage >= 100) {
      endSortie('AIRFRAME FAILURE', 'Too many knocks. The courier is coming apart and the sortie is over.', 'crash');
      return;
    }
    if (elapsed >= mission.timeLimit) {
      endSortie('OUT OF TIME', 'The mail window closed before the run was done.', 'crash');
      return;
    }
    /* Flying past the runway without landing ends the landing mission. */
    if (mission.kind === 'landing' && plane.z > r.zEnd + 600 && !plane.onGround) {
      endSortie('MISSED THE RUNWAY', 'You flew past runway 09 without touching down. The mail goes around again tomorrow.', 'crash');
      return;
    }
    /* Canyon mission ends at the last gate or the valley end. */
    if (mission.kind === 'canyon' && !nextTarget(mission)) {
      endSortie('CANYON CLEARED', 'All eight gates threaded low over the river. Smooth, fast, and still in one piece.', 'smooth');
      return;
    }
  }

  /* ---- render ---- */
  function render(nowSec) {
    const view = {
      w: VIEW_W, h: VIEW_H, cx: VIEW_W / 2,
      horizonY: 300, focal: 620,
    };
    drawTerrain(ctx, plane, world, view, nowSec);
    for (const ring of mission.rings) drawRing(ctx, plane, view, ring, nowSec);
    drawNextRingArrow(ctx, plane, view, nextTarget(mission));
    drawAircraft(ctx, plane, view);
    drawCompass(ctx, plane, view);
    drawAttitude(ctx, plane, view);
    drawTape(ctx, 62, 210, 240, plane.speed, 'KNOTS', 20, function (v) { return String(Math.round(v)); });
    drawTape(ctx, VIEW_W - 62, 210, 240, plane.alt, 'FEET', 100, function (v) { return String(Math.round(v)); });
    drawBars(ctx, plane, view);
    drawObjective(ctx, mission, plane, elapsed, view);
    if (state === 'menu') {
      /* Dim the scene behind the menu panel so the title reads. */
      ctx.fillStyle = 'rgba(8,22,38,0.35)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (note && nowSec < note.until) drawCentreNote(ctx, note.text, note.sub, view);
    if (state === 'paused') drawCentreNote(ctx, 'PAUSED', 'Press P to keep flying', view);
    AudioBus.setEngine(plane.throttle, plane.speed, state === 'flying');
  }

  /* ---- main loop ---- */
  let last = performance.now();
  function frame(nowMs) {
    const nowSec = nowMs / 1000;
    const dt = clamp((nowMs - last) / 1000, 0, 0.05);
    last = nowMs;
    update(dt, nowSec);
    render(nowSec);
    requestAnimationFrame(frame);
  }

  applyShot();
  requestAnimationFrame(frame);
})();
