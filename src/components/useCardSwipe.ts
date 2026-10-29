import { useRef } from 'react';
import type { PointerEvent } from 'react';
import { isCalm } from '../fx';

const EDGE = 24; // ignore touches this close to the screen edge (Safari's back swipe)
const LOCK = 10; // movement before we decide between a sideways swipe and a scroll
const TRIGGER = 60; // distance that counts as a swipe
const FLICK = 0.5; // px per ms: a quick flick counts even when short

/**
 * Sideways swipe on one card, with plain pointer events. The card follows the
 * finger and snaps back; up-and-down drags are left to the page (pair with
 * `touch-action: pan-y`). Drags that start on a button or link, and mouse drags, are ignored.
 * `onSwipe(1)` means "next" (swiped left), `onSwipe(-1)` means "previous".
 */
export function useCardSwipe<T extends HTMLElement>(onSwipe: (dir: 1 | -1) => void, enabled: boolean) {
  const ref = useRef<T>(null);
  const drag = useRef<{ id: number; x: number; y: number; t: number; dx: number; axis: 'x' | 'y' | null } | null>(null);

  const move = (dx: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.2s ease' : 'none';
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 45}deg)` : '';
  };

  const end = (e: PointerEvent<T>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (d.axis !== 'x') return;
    const speed = Math.abs(d.dx) / Math.max(1, e.timeStamp - d.t);
    const go = !cancelled && (Math.abs(d.dx) >= TRIGGER || (speed > FLICK && Math.abs(d.dx) > 20));
    move(0, !go && !isCalm());
    if (go) onSwipe(d.dx < 0 ? 1 : -1);
  };

  const handlers = {
    onPointerDown: (e: PointerEvent<T>) => {
      // Touch and pen only: a mouse drag is usually someone selecting text.
      if (!enabled || !e.isPrimary || e.pointerType === 'mouse') return;
      if ((e.target as Element).closest('button, a, input, select, textarea, label')) return;
      if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, dx: 0, axis: null };
    },
    onPointerMove: (e: PointerEvent<T>) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.axis) {
        if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;
        d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (d.axis === 'y') {
          drag.current = null;
          return;
        }
        try {
          ref.current?.setPointerCapture(e.pointerId);
        } catch {
          // Capture is a nice-to-have.
        }
      }
      d.dx = dx;
      // Calm mode and reduced motion: no sliding, the swipe still works.
      if (!isCalm()) move(dx, false);
    },
    onPointerUp: (e: PointerEvent<T>) => end(e, false),
    onPointerCancel: (e: PointerEvent<T>) => end(e, true),
  };

  return { ref, handlers };
}
