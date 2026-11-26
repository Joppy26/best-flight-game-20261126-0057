/* Meridian Courier: the aircraft and the rings / gates it flies through. */
'use strict';

/* Draw the courier plane in chase view, banked with the roll, pitched with the climb. */
function drawAircraft(ctx, p, view) {
  const cx = view.cx;
  const cy = view.horizonY + 118;
  const bankRad = degToRad(p.bank);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bankRad * 0.55);
  const s = 1 + clamp(p.speed / 400, 0, 0.25);

  /* Soft shadow on the ground far below, scaled by altitude. */
  ctx.restore();
  ctx.save();
  const shadowScale = clamp(900 / (p.alt + 120), 0.25, 1.4);
  ctx.globalAlpha = 0.22 * shadowScale;
  ctx.fillStyle = '#10240a';
  ctx.beginPath();
  ctx.ellipse(cx + p.bank * 0.4, view.h - 60 - shadowScale * 30, 46 * shadowScale, 10 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bankRad * 0.55);
  ctx.scale(s, s);

  /* Tail fin and stabilisers. */
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.moveTo(-6, -58); ctx.lineTo(-16, -92); ctx.lineTo(-2, -88); ctx.lineTo(4, -62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath(); ctx.moveTo(-52, -52); ctx.lineTo(-64, -40); ctx.lineTo(-10, -44); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(52, -52); ctx.lineTo(64, -40); ctx.lineTo(10, -44); ctx.closePath(); ctx.fill();

  /* Wings: cream with red tips and a sun stripe. */
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-118, 6); ctx.lineTo(-112, 22); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -30); ctx.lineTo(118, 6); ctx.lineTo(112, 22); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath(); ctx.moveTo(-118, 6); ctx.lineTo(-96, 2); ctx.lineTo(-92, 14); ctx.lineTo(-112, 22); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(118, 6); ctx.lineTo(96, 2); ctx.lineTo(92, 14); ctx.lineTo(112, 22); ctx.closePath(); ctx.fill();

  /* Fuselage: warm yellow courier livery, nose to tail. */
  const body = ctx.createLinearGradient(0, -100, 0, 40);
  body.addColorStop(0, '#ffd34d');
  body.addColorStop(0.6, '#f5a623');
  body.addColorStop(1, '#d97b16');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -102);
  ctx.quadraticCurveTo(13, -70, 12, -20);
  ctx.quadraticCurveTo(11, 22, 0, 38);
  ctx.quadraticCurveTo(-11, 22, -12, -20);
  ctx.quadraticCurveTo(-13, -70, 0, -102);
  ctx.closePath(); ctx.fill();

  /* Cockpit glass, lit from inside. */
  ctx.fillStyle = '#bfe9ff';
  ctx.beginPath(); ctx.ellipse(0, -58, 8, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(-2, -64, 3, 8, 0.2, 0, Math.PI * 2); ctx.fill();

  /* Mail stripe and registration. */
  ctx.fillStyle = '#12324f';
  ctx.fillRect(-11, -14, 22, 5);
  ctx.fillStyle = '#12324f';
  ctx.font = 'bold 9px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MC-26', 0, 30);

  /* Propeller blur: a spinning disc ahead of the nose. */
  ctx.strokeStyle = 'rgba(60,60,60,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.ellipse(0, -102, 34, 7, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -102, 26, 5, 0, 0, Math.PI * 2); ctx.stroke();

  /* Navigation lights: red left, green right, blinking white tail. */
  ctx.fillStyle = '#ff2d2d'; ctx.beginPath(); ctx.arc(-118, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2dff5e'; ctx.beginPath(); ctx.arc(118, 12, 4, 0, Math.PI * 2); ctx.fill();
  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 38, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/* Draw one glowing ring (or canyon gate) at its world position. */
function drawRing(ctx, p, view, ring, timeSec) {
  const pr = project(p, ring.x, ring.alt * 0.3048, ring.z, view);
  if (!pr) return;
  const radius = ring.radius * pr.s;
  if (radius < 3 || radius > 900) return;
  const pulse = 1 + Math.sin(timeSec * 3 + ring.z) * 0.06;
  const r = radius * pulse;
  const passed = ring.passed;
  const colour = passed ? '#7dff9a' : (ring.kind === 'gate' ? '#ff5a4d' : '#ffd34d');
  ctx.save();
  ctx.globalAlpha = clamp(1.4 - pr.rz / 5200, 0.25, 1);
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.strokeStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(pr.x, pr.y, r * 0.82, 0, Math.PI * 2); ctx.stroke();
  if (!passed) {
    ctx.fillStyle = '#12324f';
    ctx.font = 'bold ' + Math.round(clamp(r * 0.42, 10, 30)) + 'px Verdana, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(ring.label), pr.x, pr.y);
  } else {
    ctx.fillStyle = '#1d5a2a';
    ctx.font = 'bold ' + Math.round(clamp(r * 0.5, 12, 32)) + 'px Verdana, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('OK', pr.x, pr.y);
  }
  ctx.restore();
}

/* Draw the next-ring guidance arrow at the top of the screen. */
function drawNextRingArrow(ctx, p, view, ring) {
  if (!ring) return;
  const pr = project(p, ring.x, ring.alt * 0.3048, ring.z, view);
  let ax = view.cx, ay = 96;
  if (pr) { ax = clamp(pr.x, 70, view.w - 70); ay = clamp(pr.y, 70, view.h - 220); }
  const dist = Math.max(0, Math.round((ring.z - p.z) * 3.28));
  ctx.save();
  ctx.fillStyle = 'rgba(18,50,79,0.85)';
  ctx.beginPath(); ctx.arc(ax, ay, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ax, ay, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px Verdana, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(ring.label), ax, ay - 1);
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.fillStyle = '#eaf4ff';
  ctx.fillText(dist + ' ft', ax, ay + 38);
  ctx.restore();
}
