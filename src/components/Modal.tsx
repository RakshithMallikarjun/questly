import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

/**
 * A real modal dialog: the page behind is blocked, Escape closes it, keyboard
 * focus stays inside, and focus goes back where it was when it closes.
 */
export function Modal({ label, onClose, className = '', children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const before = document.activeElement as HTMLElement | null;
    if (!d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    }
    return () => {
      if (d.open) d.close();
      before?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
    >
      {children}
    </dialog>
  );
}
