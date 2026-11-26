/* Meridian Courier: valley terrain. One job: build the world and draw sky + ground. */
'use strict';

/* The valley the courier flies: a river, a road, fields, a town and runway 09. */
function buildWorld(seed) {
  const rng = makeRng(seed || 20261126);
  const features = []; /* trees, houses, barns, hay bales: {z, x, kind, size} */
  for (let z = 300; z < 26000; z += 90 + rng() * 160) {
    const side = rng() < 0.5 ? -1 : 1;
    const kind = rng();
    features.push({
      z: z,
      x: side * (55 + rng() * 260),
      kind: kind < 0.55 ? 'tree' : (kind < 0.8 ? 'house' : 'barn'),
      size: 0.7 + rng() * 0.9,
    });
  }
  const hills = []; /* distant ridge bumps: {z, x, w, h} */
  for (let z = 800; z < 26000; z += 900 + rng() * 700) {
    hills.push({ z: z, x: (rng() - 0.5) * 900, w: 500 + rng() * 700, h: 60 + rng() * 130 });
  }
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({ x: (rng() - 0.5) * 2400, y: 340 + rng() * 260, z: rng() * 24000, s: 60 + rng() * 130 });
  }
  return {
    runway: { x: 0, zStart: 14800, zEnd: 16400, halfWidth: 16, heading: 0 },
    riverX: -190,
    roadX: 120,
    features: features,
    hills: hills,
    clouds: clouds,
    length: 26000,
  };
}

/* Project a world point into screen space from the plane's camera. */
function project(p, wx, wy, wz, view) {
  const dx = wx - p.x;
  const dz = wz - p.z;
  const h = degToRad(p.heading);
  const rx = Math.cos(h) * dx - Math.sin(h) * dz;   /* right of the nose */
  const rz = Math.sin(h) * dx + Math.cos(h) * dz;   /* ahead of the nose */
  if (rz < 12) return null;
  const scale = view.focal / rz;
  const horizonY = view.horizonY + p.pitch * 7;
  return {
    x: view.cx + rx * scale,
    y: horizonY - (wy - p.alt * 0.3048) * scale,
    s: scale,
    rz: rz,
  };
}

/* Draw sky, sun, clouds, ridge and the receding valley floor. */
function drawTerrain(ctx, p, world, view, timeSec) {
  const W = view.w, H = view.h;
  const horizonY = view.horizonY + p.pitch * 7 - p.bank * 0.4;

  /* Sky: warm late-afternoon gradient. */
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  sky.addColorStop(0, '#2f6fb8');
  sky.addColorStop(0.55, '#7fb6e4');
  sky.addColorStop(1, '#ffe3a3');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, Math.max(0, horizonY + 40));

  /* Sun, low over the valley mouth. */
  const sunX = W * 0.72 - p.heading * 6;
  const sunY = horizonY - 150;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
  glow.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 200, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 200, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

  /* Clouds drift slowly with the heading so the sky feels alive. */
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of world.clouds) {
    const pr = project(p, c.x, c.y, c.z, view);
    if (!pr || pr.y > horizonY) continue;
    const w = c.s * pr.s * 2.2;
    if (w < 4) continue;
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(pr.x + w * 0.5, pr.y + w * 0.05, w * 0.6, w * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Distant ridge silhouette, parallaxed by heading. */
  ctx.fillStyle = '#5d7ea6';
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 2);
  for (let sx = 0; sx <= W; sx += 32) {
    const t = (sx / W) * Math.PI * 3 + p.heading * 0.03 + timeSec * 0.0;
    const y = horizonY - 26 - Math.abs(Math.sin(t * 1.7)) * 58 - Math.abs(Math.sin(t * 0.6)) * 34;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W, horizonY + 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6d8fb5';
  ctx.beginPath();
  ctx.moveTo(0, horizonY + 2);
  for (let sx = 0; sx <= W; sx += 32) {
    const t = (sx / W) * Math.PI * 2.2 + 1.3 + p.heading * 0.02;
    const y = horizonY - 8 - Math.abs(Math.sin(t)) * 30;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(W, horizonY + 2);
  ctx.closePath(); ctx.fill();

  /* Valley floor base so no gap shows between the ridge and the far strips. */
  ctx.fillStyle = '#5da244';
  ctx.fillRect(0, horizonY, W, H - horizonY);

  /* Valley floor: receding strips, alternating field greens, river and road. */
  const strips = 26;
  for (let i = strips - 1; i >= 0; i--) {
    const zNear = p.z + 40 + (i * i) * 2.1;
    const zFar = p.z + 40 + ((i + 1) * (i + 1)) * 2.1;
    const a = project(p, 0, 0, zNear, view);
    const b = project(p, 0, 0, zFar, view);
    if (!a || !b) continue;
    const topY = b.y, botY = a.y;
    if (botY <= horizonY + 1 && topY <= horizonY + 1) continue;
    const shade = (i % 2 === 0) ? '#5da244' : '#69b04e';
    ctx.fillStyle = shade;
    const halfNear = (view.focal / Math.max(12, zNear - p.z)) * 700;
    const halfFar = (view.focal / Math.max(12, zFar - p.z)) * 700;
    const cxNear = a.x, cxFar = b.x;
    ctx.beginPath();
    ctx.moveTo(cxFar - halfFar, topY); ctx.lineTo(cxFar + halfFar, topY);
    ctx.lineTo(cxNear + halfNear, botY); ctx.lineTo(cxNear - halfNear, botY);
    ctx.closePath(); ctx.fill();
    /* River band on the left, road band on the right. */
    drawBand(ctx, p, view, world.riverX, 7, zNear, zFar, '#4f9fd8');
    drawBand(ctx, p, view, world.roadX, 5, zNear, zFar, '#8a7a5f');
  }

  /* Runway 09: grey strip with white centreline and threshold bars. */
  drawRunway(ctx, p, world, view);

  /* Near features: trees, houses, barns as billboards. */
  const near = world.features.filter(function (f) {
    const dz = f.z - p.z;
    return dz > 10 && dz < 2600;
  }).sort(function (a, b) { return b.z - a.z; });
  for (const f of near) {
    const pr = project(p, f.x, 0, f.z, view);
    if (!pr) continue;
    const h = 26 * f.size * pr.s;
    const w = h * 0.7;
    if (h < 2 || h > 400) continue;
    if (f.kind === 'tree') {
      ctx.fillStyle = '#7a5230'; ctx.fillRect(pr.x - w * 0.08, pr.y - h * 0.3, w * 0.16, h * 0.3);
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y - h); ctx.lineTo(pr.x - w * 0.5, pr.y - h * 0.28); ctx.lineTo(pr.x + w * 0.5, pr.y - h * 0.28); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = f.kind === 'house' ? '#e8dcc8' : '#b0523c';
      ctx.fillRect(pr.x - w * 0.5, pr.y - h * 0.55, w, h * 0.55);
      ctx.fillStyle = '#5b3a24';
      ctx.beginPath(); ctx.moveTo(pr.x - w * 0.58, pr.y - h * 0.55); ctx.lineTo(pr.x, pr.y - h); ctx.lineTo(pr.x + w * 0.58, pr.y - h * 0.55); ctx.closePath(); ctx.fill();
    }
  }
}

function drawBand(ctx, p, view, centreX, halfW, zNear, zFar, colour) {
  const a1 = project(p, centreX - halfW, 0, zNear, view);
  const a2 = project(p, centreX + halfW, 0, zNear, view);
  const b1 = project(p, centreX - halfW, 0, zFar, view);
  const b2 = project(p, centreX + halfW, 0, zFar, view);
  if (!a1 || !a2 || !b1 || !b2) return;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y);
  ctx.lineTo(a2.x, a2.y); ctx.lineTo(a1.x, a1.y);
  ctx.closePath(); ctx.fill();
}

function drawRunway(ctx, p, world, view) {
  const r = world.runway;
  const steps = 14;
  ctx.fillStyle = '#3d4450';
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const z = r.zStart + (r.zEnd - r.zStart) * (i / steps);
    const l = project(p, r.x - r.halfWidth, 0, z, view);
    const rr = project(p, r.x + r.halfWidth, 0, z, view);
    if (!l || !rr) continue;
    if (!started) { ctx.moveTo(l.x, l.y); started = true; }
    else ctx.lineTo(l.x, l.y);
  }
  for (let i = steps; i >= 0; i--) {
    const z = r.zStart + (r.zEnd - r.zStart) * (i / steps);
    const rr = project(p, r.x + r.halfWidth, 0, z, view);
    if (!rr) continue;
    ctx.lineTo(rr.x, rr.y);
  }
  ctx.closePath(); ctx.fill();
  /* Centreline dashes and the big 09 numerals at the threshold. */
  ctx.fillStyle = '#f5f5f5';
  for (let i = 0; i < 10; i++) {
    const z = r.zStart + 120 + i * 150;
    const c1 = project(p, r.x - 1.2, 0, z, view);
    const c2 = project(p, r.x + 1.2, 0, z + 70, view);
    if (!c1 || !c2) continue;
    ctx.fillRect(Math.min(c1.x, c2.x), Math.min(c1.y, c2.y), Math.abs(c2.x - c1.x) + 2, Math.abs(c2.y - c1.y) + 2);
  }
  const num = project(p, r.x, 0, r.zStart + 60, view);
  if (num && num.s > 0.4) {
    ctx.font = 'bold ' + Math.round(clamp(num.s * 26, 10, 64)) + 'px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('09', num.x, num.y - 6);
  }
}
