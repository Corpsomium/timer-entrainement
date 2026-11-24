import type { CSSProperties, ReactNode } from 'react';

interface StickyActionsBarProps {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

/** Fixed/in-flow footer used by session timer and overview screens. */
export function StickyActionsBar({ primary, secondary, className }: StickyActionsBarProps) {
  return (
    <div
      className={['session-sticky', 'actions-sticky', className].filter(Boolean).join(' ')}
      style={{ viewTransitionName: 'action-area' } as CSSProperties}
    >
      {primary}
      {secondary != null ? (
        <div className="actions duo session-sticky-secondary">{secondary}</div>
      ) : null}
    </div>
  );
}

/** Reserves scroll space so the last list item is not hidden under the sticky bar. */
export function StickyActionsSpacer({ className }: { className?: string }) {
  return (
    <div
      className={['actions-sticky-spacer', className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}
