import { useCallback, useRef } from 'react';
import { isCalm } from '../fx';

const EDGE = 24; // ignore touches this close to the screen edge (Safari's back swipe)
const LOCK = 10; // movement before we decide between a sideways swipe and a scroll
const TRIGGER = 60; // distance that counts as a swipe
const FLICK = 0.5; // px per ms: a quick flick counts even when short
const OUT = 200; // ms for the card to leave after a swipe

/**
 * Sideways swipe on one card. Uses touch events, which iPhones handle most
 * reliably: once the drag is clearly sideways we stop the page from taking it,
 * so the card follows the finger. Up-and-down drags are left to the page.
 * Drags that start on a button or link are ignored, and so is the mouse.
 * `onSwipe(1)` means "next" (swiped left), `onSwipe(-1)` means "previous".
 *
 * The card always follows your finger, since you are moving it yourself.
 * With calm mode or reduced motion it fades out instead of flying off.
 */
export function useCardSwipe<T extends HTMLElement>(onSwipe: (dir: 1 | -1) => void, enabled: boolean) {
  // Keep the latest values without re-attaching the listeners.
  const live = useRef({ onSwipe, enabled });
  live.current = { onSwipe, enabled };
  const busy = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);

  const ref = useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;

    let drag: { x: number; y: number; t: number; dx: number; axis: 'x' | 'y' | null } | null = null;

    const move = (dx: number, animate: boolean) => {
      el.style.transition = animate ? 'transform 0.2s ease' : 'none';
      el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 45}deg)` : '';
    };

    const start = (e: TouchEvent) => {
      if (!live.current.enabled || busy.current || e.touches.length !== 1) return;
      if ((e.target as Element).closest('button, a, input, select, textarea, label')) return;
      const p = e.touches[0];
      if (p.clientX < EDGE || p.clientX > window.innerWidth - EDGE) return;
      drag = { x: p.clientX, y: p.clientY, t: e.timeStamp, dx: 0, axis: null };
    };

    const track = (e: TouchEvent) => {
      if (!drag) return;
      const p = e.touches[0];
      const dx = p.clientX - drag.x;
      const dy = p.clientY - drag.y;
      if (!drag.axis) {
        if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (drag.axis === 'y') {
          drag = null;
          return;
        }
      }
      // Sideways: keep the page still and move the card with the finger.
      if (e.cancelable) e.preventDefault();
      drag.dx = dx;
      move(dx, false);
    };

    const finish = (e: TouchEvent, cancelled: boolean) => {
      const d = drag;
      drag = null;
      if (!d || d.axis !== 'x') return;
      const speed = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t);
      const go = !cancelled && (Math.abs(d.dx) >= TRIGGER || (speed > FLICK && Math.abs(d.dx) > 20));
      if (!go) return move(0, true);
      const dir = d.dx < 0 ? 1 : -1;
      const calm = isCalm();
      // Throw the card off the side (or fade it in calm mode), then show the next one.
      el.style.transition = `transform ${OUT}ms ease-in, opacity ${OUT}ms ease-in`;
      el.style.transform = calm ? el.style.transform : `translateX(${-dir * window.innerWidth}px) rotate(${-dir * 14}deg)`;
      el.style.opacity = '0';
      busy.current = true;
      setTimeout(() => {
        busy.current = false;
        el.style.transition = 'none';
        el.style.transform = '';
        el.style.opacity = '';
        live.current.onSwipe(dir);
      }, OUT);
    };

    const end = (e: TouchEvent) => finish(e, false);
    const cancel = (e: TouchEvent) => finish(e, true);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', track, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', cancel);
    cleanup.current = () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', track);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', cancel);
    };
  }, []);

  return { ref, handlers: {} };
}
