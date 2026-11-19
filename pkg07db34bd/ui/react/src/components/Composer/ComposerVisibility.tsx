/*
 * Composer visibility control (Lane C owns Composer*), like X's "Everyone can reply": a gold text button that
 * opens a small menu — Everyone · Experts only · Cold-email experts — each with a one-line muted description.
 */
import { useCallback, useRef, useState } from 'react';
import { Check, Globe, Lock, Mail, type LucideIcon } from 'lucide-react';
import { useShellDismiss } from '@/components/Shell/ShellDismiss';

export type ComposerVisibility = 'PUBLIC' | 'EXPERTS_ONLY' | 'COLD_EMAIL';

interface Option {
  id: ComposerVisibility;
  label: string;
  trigger: string;
  description: string;
  icon: LucideIcon;
}

// eslint-disable-next-line react-refresh/only-export-components
export const VISIBILITY_OPTIONS: Option[] = [
  {
    id: 'PUBLIC',
    label: 'Everyone',
    trigger: 'Everyone can see',
    description: 'Shows in the feed for all verified Boilers',
    icon: Globe,
  },
  {
    id: 'EXPERTS_ONLY',
    label: 'Experts only',
    trigger: 'Only matched experts can see',
    description: 'Hidden from the feed; only you and the matched experts see it',
    icon: Lock,
  },
  {
    id: 'COLD_EMAIL',
    label: 'Cold-email experts',
    trigger: 'Experts only + email drafts',
    description: 'Experts only, plus AI-drafted emails you copy and send yourself',
    icon: Mail,
  },
];

export function ComposerVisibilityMenu({
  value,
  onChange,
  lockedReason,
  onLocked,
  disabled = false,
}: {
  value: ComposerVisibility;
  onChange: (v: ComposerVisibility) => void;
  /** When set the control is locked to "Everyone" (e.g. Articles); clicking explains why. */
  lockedReason?: string | null;
  onLocked?: (reason: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useShellDismiss(rootRef, open, close);

  const current = VISIBILITY_OPTIONS.find((o) => o.id === (lockedReason ? 'PUBLIC' : value)) ?? VISIBILITY_OPTIONS[0];
  const Icon = current.icon;

  const onTrigger = () => {
    if (lockedReason) {
      onLocked?.(lockedReason);
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={rootRef} className="bc-vis">
      <button
        type="button"
        className="bc-vis__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={lockedReason ? true : undefined}
        title={lockedReason ?? 'Choose who can see this post'}
        disabled={disabled}
        onClick={onTrigger}
      >
        <Icon size={16} aria-hidden />
        {current.trigger}
      </button>
      {open && (
        <div className="bc-vis__menu" role="menu" aria-label="Who can see this post">
          <p className="bc-vis__menu-title">Who can see this?</p>
          {VISIBILITY_OPTIONS.map((o) => {
            const OptIcon = o.icon;
            const selected = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className="bc-vis__option"
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                <span className="bc-vis__option-icon">
                  <OptIcon size={18} aria-hidden />
                </span>
                <span className="bc-vis__option-text">
                  <span className="bc-vis__option-label">{o.label}</span>
                  <span className="bc-vis__option-desc">{o.description}</span>
                </span>
                {selected && <Check size={18} className="bc-vis__check" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
