import { useEffect, useRef, type ReactNode } from 'react';
import { TIERS, type Supplement, type Tier } from '../domain/types';
import { IconX } from './Icons';

export function TierBadge({ tier, long }: { tier: Tier; long?: boolean }) {
  return (
    <span className="tier" data-tier={tier} title={`${tier} tier — ${TIERS[tier].label}`}>
      <i aria-hidden />
      {long ? TIERS[tier].label : tier}
    </span>
  );
}

export function Avatar({ s, size = 44 }: { s: Pick<Supplement, 'name' | 'image' | 'tier'>; size?: number }) {
  return (
    <span className="avatar" data-tier={s.tier} style={{ width: size, height: size }}>
      {s.image ? <img src={s.image} alt="" /> : <span>{initials(s.name)}</span>}
    </span>
  );
}

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

/** Modal sheet built on <dialog>: focus trap, Esc and backdrop close for free. */
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
    >
      {open && (
        <div className="sheet-inner">
          <header className="sheet-head">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <IconX />
            </button>
          </header>
          <div className="sheet-body">{children}</div>
          {footer && <footer className="sheet-foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

