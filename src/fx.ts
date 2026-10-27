import confetti from 'canvas-confetti';

const COLORS = ['#FFC23D', '#FF7A2F', '#FF4FA3', '#8C7BFF', '#4FC3FF', '#3DDC97'];

export const burst = (big = false) => {
  confetti({
    particleCount: big ? 160 : 60,
    spread: big ? 100 : 70,
    startVelocity: big ? 45 : 35,
    origin: { y: big ? 0.45 : 0.6 },
    colors: COLORS,
    disableForReducedMotion: true,
  });
};

let ctx: AudioContext | null = null;

/** A short, happy chime made in the browser (no sound files needed). */
export const chime = (enabled: boolean, notes: number[] = [660, 880]) => {
  if (!enabled) return;
  try {
    ctx = ctx ?? new AudioContext();
    const t0 = ctx.currentTime;
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.09 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.09 + 0.35);
      o.connect(g).connect(ctx!.destination);
      o.start(t0 + i * 0.09);
      o.stop(t0 + i * 0.09 + 0.4);
    });
  } catch {
    // Sound is a nice-to-have.
  }
};

export const buzz = (enabled: boolean, pattern: number | number[] = 30) => {
  if (enabled && 'vibrate' in navigator) navigator.vibrate(pattern);
};
