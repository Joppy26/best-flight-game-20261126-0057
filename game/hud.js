/* Meridian Courier: HUD. One job: draw every instrument and readout. */
'use strict';

/* Compass tape across the top: heading in degrees with cardinal ticks. */
function drawCompass(ctx, p, view) {
  const cx = view.cx, y = 26;
  ctx.save();
  ctx.fillStyle = 'rgba(8,22,38,0.72)';
  ctx.fillRect(cx - 220, 8, 440, 36);
  ctx.strokeStyle = '#3f7fb8'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - 220, 8, 440, 36);
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW', 360: 'N' };
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let d = -60; d <= 60; d += 15) {
    const hdg = ((Math.round(p.heading / 15) * 15 + d) % 360 + 360) % 360;
    const x = cx + d * 3.2;
    const major = hdg % 45 === 0;
    ctx.strokeStyle = major ? '#ffd34d' : '#9fd0ff';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y + (major ? 16 : 12)); ctx.stroke();
    ctx.fillStyle = major ? '#ffd34d' : '#d6e9fa';
    ctx.font = major ? 'bold 12px Verdana, sans-serif' : '10px Verdana, sans-serif';
    ctx.fillText(labels[hdg] || String(hdg), x, y - 2);
  }
  /* Centre caret and digital heading. */
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.moveTo(cx - 7, 46); ctx.lineTo(cx + 7, 46); ctx.lineTo(cx, 54); ctx.closePath(); ctx.fill();
  ctx.font = 'bold 13px Verdana, sans-serif';
  ctx.fillText('HDG ' + String(((Math.round(p.heading) % 360) + 360) % 360).padStart(3, '0'), cx, 66);
  ctx.restore();
}

/* A vertical tape (airspeed left, altitude right) with a lit centre bug. */
function drawTape(ctx, x, yTop, height, value, unit, step, fmt) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,22,38,0.72)';
  ctx.fillRect(x - 46, yTop, 92, height);
  ctx.strokeStyle = '#3f7fb8';
  ctx.strokeRect(x - 46, yTop, 92, height);
  const cy = yTop + height / 2;
  const perStep = 34;
  const base = Math.round(value / step) * step;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let k = -3; k <= 3; k++) {
    const v = base + k * step;
    if (v < 0) continue;
    const yy = cy - (v - value) / step * perStep;
    if (yy < yTop + 8 || yy > yTop + height - 8) continue;
    ctx.fillStyle = k === 0 ? '#ffd34d' : '#d6e9fa';
    ctx.font = k === 0 ? 'bold 13px Verdana, sans-serif' : '11px Verdana, sans-serif';
    ctx.fillText(fmt(v), x, yy);
  }
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath(); ctx.moveTo(x - 46, cy - 8); ctx.lineTo(x - 36, cy); ctx.lineTo(x - 46, cy + 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 46, cy - 8); ctx.lineTo(x + 36, cy); ctx.lineTo(x + 46, cy + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eaf4ff';
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.fillText(unit, x, yTop + height + 14);
  ctx.restore();
}

/* Artificial horizon ball: sky, ground, pitch ladder and bank pointer. */
function drawAttitude(ctx, p, view) {
  const cx = view.w - 130, ay = view.h - 118;
  const R = 52;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, ay, R, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, ay);
  ctx.rotate(degToRad(-p.bank));
  const pitchPx = clamp(p.pitch * 3, -R, R);
  ctx.fillStyle = '#4f9fd8'; ctx.fillRect(-R - 4, -R - 4 - pitchPx, (R + 4) * 2, R + 4 + pitchPx);
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-R - 4, pitchPx, (R + 4) * 2, R + 4 - pitchPx + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-R, pitchPx); ctx.lineTo(R, pitchPx); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, ay, R, 0, Math.PI * 2); ctx.stroke();
  /* Fixed wings marker. */
  ctx.fillStyle = '#ffd34d';
  ctx.fillRect(cx - 34, ay - 2, 20, 4);
  ctx.fillRect(cx + 14, ay - 2, 20, 4);
  ctx.beginPath(); ctx.arc(cx, ay, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eaf4ff';
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATT', cx, ay + R + 14);
  ctx.restore();
}

/* Throttle, fuel and damage bars along the bottom, with lit warning colours. */
function drawBars(ctx, p, view) {
  const y = view.h - 34;
  drawBar(ctx, 24, y, 190, 'THR', p.throttle, '#ffd34d');
  drawBar(ctx, 238, y, 190, 'FUEL', p.fuel / 100, p.fuel < 25 ? '#ff5a4d' : '#7dff9a');
  drawBar(ctx, 452, y, 190, 'DMG', p.damage / 100, p.damage > 60 ? '#ff5a4d' : '#ff9a3d');
  /* Vertical speed readout beside the bars. */
  ctx.fillStyle = '#eaf4ff';
  ctx.font = 'bold 13px Verdana, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const vs = Math.round(p.vspeed);
  ctx.fillText('V/S ' + (vs >= 0 ? '+' : '') + vs + ' fpm', 668, y + 9);
  ctx.fillText('DIST ' + p.distance.toFixed(1) + ' nm', 820, y + 9);
}

function drawBar(ctx, x, y, w, label, frac, colour) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,22,38,0.72)';
  ctx.fillRect(x, y, w, 18);
  ctx.fillStyle = colour;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * clamp(frac, 0, 1)), 14);
  ctx.strokeStyle = '#3f7fb8';
  ctx.strokeRect(x, y, w, 18);
  ctx.fillStyle = '#10233a';
  ctx.font = 'bold 11px Verdana, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(label + ' ' + Math.round(clamp(frac, 0, 1) * 100) + '%', x + 6, y + 9);
  ctx.restore();
}

/* Mission objective line and timer, top-left. */
function drawObjective(ctx, mission, p, elapsed, view) {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(8,22,38,0.72)';
  ctx.fillRect(16, 56, 300, 62);
  ctx.strokeStyle = '#3f7fb8';
  ctx.strokeRect(16, 56, 300, 62);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 14px Verdana, sans-serif';
  ctx.fillText(mission.title, 28, 64);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '12px Verdana, sans-serif';
  const passed = mission.rings.filter(function (r) { return r.passed; }).length;
  const goal = mission.kind === 'landing'
    ? 'Land on runway 09, slow and level'
    : ('Rings ' + passed + ' / ' + mission.rings.length + '   Fuel ' + Math.round(p.fuel) + '%');
  ctx.fillText(goal, 28, 86);
  const left = Math.max(0, mission.timeLimit - elapsed);
  ctx.fillStyle = left < 45 ? '#ff5a4d' : '#9fd0ff';
  ctx.font = 'bold 12px Verdana, sans-serif';
  ctx.fillText('TIME ' + Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0'), 28, 102);
  ctx.restore();
}

/* Big centre message for stalls, warnings and wins, drawn over the scene. */
function drawCentreNote(ctx, text, sub, view) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8,22,38,0.78)';
  const w = Math.max(420, ctx.measureText(text).width + 80);
  ctx.fillRect(view.cx - w / 2, view.h * 0.30, w, 84);
  ctx.strokeStyle = '#ffd34d';
  ctx.strokeRect(view.cx - w / 2, view.h * 0.30, w, 84);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 26px Verdana, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, view.cx, view.h * 0.30 + 30);
  ctx.fillStyle = '#eaf4ff';
  ctx.font = '14px Verdana, sans-serif';
  ctx.fillText(sub, view.cx, view.h * 0.30 + 62);
  ctx.restore();
}
