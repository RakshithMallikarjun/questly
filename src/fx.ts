import confetti from 'canvas-confetti';
import { create } from 'zustand';

const COLORS = ['#FFC23D', '#FF7A2F', '#FF4FA3', '#8C7BFF', '#4FC3FF', '#3DDC97'];

/** Calm mode: no confetti or flying coins. Set from the profile in App. */
let calm = false;
export const setCalm = (on: boolean) => {
  calm = on;
  document.documentElement.classList.toggle('calm', on);
};
export const isCalm = () => calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const burst = (big = false, origin?: { x: number; y: number }) => {
  if (isCalm()) return;
  confetti({
    particleCount: big ? 160 : 45,
    spread: big ? 100 : 65,
    startVelocity: big ? 45 : 30,
    origin: origin ?? { y: big ? 0.45 : 0.6 },
    colors: COLORS,
    scalar: big ? 1 : 0.85,
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

/** Phone vibration (Android; iPhones ignore it). Missing setting means on. */
export const buzz = (enabled: boolean | undefined, pattern: number | number[] = 30) => {
  if (enabled !== false && 'vibrate' in navigator) navigator.vibrate(pattern);
};

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

/** Coins fly from a point to the coin counter in the header. */
export const flyCoins = (from: DOMRect, n = 6) => {
  if (isCalm()) return;
  const target = document.querySelector('[data-fx="coins"]')?.getBoundingClientRect();
  const a = center(from);
  const b = target ? center(target) : { x: a.x, y: 40 };
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'fx-coin';
    el.style.left = `${a.x - 10}px`;
    el.style.top = `${a.y - 10}px`;
    document.body.appendChild(el);
    const dx = (Math.random() - 0.5) * 120;
    const dy = -40 - Math.random() * 60;
    const anim = el.animate(
      [
        { transform: 'translate(0,0) scale(0.6)', opacity: 0 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(0.5)`, opacity: 0.9 },
      ],
      { duration: 750 + i * 60, delay: i * 40, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' },
    );
    anim.onfinish = () => {
      el.remove();
      if (i === n - 1) document.querySelector('[data-fx="coins"]')?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
        { duration: 300 },
      );
    };
  }
};

/** A label like "+25 XP" floats up and fades. */
export const floatText = (from: DOMRect, text: string, color = '#FFC23D') => {
  if (isCalm()) return;
  const el = document.createElement('div');
  el.className = 'fx-float';
  el.textContent = text;
  el.style.color = color;
  const a = center(from);
  el.style.left = `${a.x}px`;
  el.style.top = `${a.y - 20}px`;
  document.body.appendChild(el);
  el.animate(
    [
      { transform: 'translate(-50%, 0) scale(0.7)', opacity: 0 },
      { transform: 'translate(-50%, -30px) scale(1.15)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -90px) scale(1)', opacity: 0 },
    ],
    { duration: 1100, easing: 'ease-out', fill: 'forwards' },
  ).onfinish = () => el.remove();
};

/** Short-lived UI moments, such as the companion cheering after a quest. */
export const useFx = create<{ cheerAt: number; cheer: () => void }>((set) => ({
  cheerAt: 0,
  cheer: () => set({ cheerAt: Date.now() }),
}));
