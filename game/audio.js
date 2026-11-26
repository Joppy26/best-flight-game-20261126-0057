/* Meridian Courier: sound. One job: synthesised WebAudio, no audio files. */
'use strict';

var AudioBus = (function () {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  }

  /* Start the engine hum after the first user gesture. */
  function startEngine() {
    if (started) return;
    const ac = ensure();
    if (!ac) return;
    started = true;
    engineOsc = ac.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 320;
    engineGain = ac.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(low);
    low.connect(engineGain);
    engineGain.connect(ac.destination);
    engineOsc.start();
  }

  /* Engine pitch and volume follow throttle and speed. */
  function setEngine(throttle, speed, flying) {
    if (!ctx || !engineOsc) return;
    const target = flying && !muted ? 0.03 + throttle * 0.05 : 0.0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 55 + speed * 0.12, ctx.currentTime, 0.2);
  }

  function blip(freq, dur, type, vol) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.16, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  function ringChime() {
    blip(880, 0.18, 'sine', 0.2);
    setTimeout(function () { blip(1318, 0.28, 'sine', 0.18); }, 90);
  }

  function warningBuzz() {
    blip(180, 0.3, 'square', 0.12);
    setTimeout(function () { blip(180, 0.3, 'square', 0.12); }, 220);
  }

  function thud() {
    blip(70, 0.4, 'sine', 0.3);
    setTimeout(function () { blip(55, 0.5, 'sine', 0.25); }, 120);
  }

  function fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach(function (n, i) {
      setTimeout(function () { blip(n, 0.3, 'triangle', 0.2); }, i * 130);
    });
  }

  function toggleMute() {
    muted = !muted;
    if (engineGain && ctx) engineGain.gain.setTargetAtTime(muted ? 0 : 0.05, ctx.currentTime, 0.1);
    return muted;
  }

  return {
    startEngine: startEngine,
    setEngine: setEngine,
    ringChime: ringChime,
    warningBuzz: warningBuzz,
    thud: thud,
    fanfare: fanfare,
    toggleMute: toggleMute,
  };
})();
