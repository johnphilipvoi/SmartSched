import {useEffect, useRef, type ReactNode} from 'react';

export default function Modal({label, onClose, wide, children}: {
  label: string; onClose: () => void; wide?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]'
    ) ?? []).filter(el => el.getClientRects().length);
    (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? focusable()[0] ?? ref.current)?.focus();
    // A confirmation can stack on top of an editor. Only the topmost dialog
    // should react to Escape or trap Tab, so dismissing the confirmation never
    // throws away the form the person is still filling in.
    const isTopmost = () => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      return backdrops[backdrops.length - 1] === ref.current?.parentElement;
    };
    const handle = (event: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>{children}</div>
  </div>;
}
