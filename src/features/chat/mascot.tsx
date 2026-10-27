import { forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties } from 'react';

// Adapted from page-mascot 0.1.0 by Kamran Ahmed (MIT).
// Original Koboyo CRT sheets; see public/licenses/page-mascot.txt.
const directions = [5, 8, 7, 6, 3, 0, 1, 2];
const cell = (index: number): CSSProperties => ({ backgroundPosition: `${index % 3 * 50}% ${Math.floor(index / 3) * 50}%` });

export const CrtMascot = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function CrtMascot({ className = '', onClick, children, ...props }, ref) {
  const faceRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [direction, setDirection] = useState(4);
  const [reaction, setReaction] = useState<number | null>(null);
  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    let sector = -1;
    const aim = () => {
      frame = 0;
      if (!media.matches || !pointer || !faceRef.current) return;
      const box = faceRef.current.getBoundingClientRect();
      const dx = pointer.x - box.left - box.width / 2;
      const dy = pointer.y - box.top - box.height / 2;
      if (Math.hypot(dx, dy) < 70) { sector = -1; setDirection(4); return; }
      const angle = Math.atan2(dy, dx);
      const delta = angle - sector * Math.PI / 4;
      if (sector !== -1 && Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < Math.PI / 8 + .12) return;
      sector = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
      setDirection(directions[sector]);
    };
    const move = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; if (!frame) frame = requestAnimationFrame(aim); };
    const reset = () => { if (!media.matches) setDirection(4); };
    window.addEventListener('pointermove', move, { passive: true });
    media.addEventListener('change', reset);
    return () => { window.removeEventListener('pointermove', move); media.removeEventListener('change', reset); cancelAnimationFrame(frame); clearTimeout(timer.current); };
  }, []);
  return <button ref={ref} type="button" className={`mascot-launcher ${className}`} {...props} onClick={event => {
    clearTimeout(timer.current); setReaction(0); timer.current = setTimeout(() => setReaction(null), 560); onClick?.(event);
  }}>
    {children}
    <span ref={faceRef} className="crt-mascot" aria-hidden="true">
      <span className="crt-sheet" style={{ ...cell(direction), backgroundImage: 'url(/mascots/crt-directions.webp)', opacity: reaction === null ? 1 : 0 }} />
      <span className="crt-sheet" style={{ ...cell(reaction ?? 0), backgroundImage: 'url(/mascots/crt-reactions.webp)', opacity: reaction === null ? 0 : 1 }} />
    </span>
  </button>;
});

export function CrtAvatar() {
  return <span className="crt-avatar" aria-hidden="true" style={{ ...cell(4), backgroundImage: 'url(/mascots/crt-directions.webp)' }} />;
}
