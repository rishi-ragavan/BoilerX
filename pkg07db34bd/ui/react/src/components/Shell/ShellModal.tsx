/*
 * X-style modal (Lane C owns Shell*; Lane D may reuse): black, rounded 16px, 1px border, close X top-left,
 * blue-grey backdrop. Escape or a backdrop click closes it. Focus moves into the dialog on open.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function ShellModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="bc-modal">
      <button type="button" className="bc-modal__backdrop" aria-label="Close dialog" tabIndex={-1} onClick={onClose} />
      <div ref={dialogRef} className="bc-modal__dialog" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="bc-modal__header">
          <button type="button" className="bc-iconbtn" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
          <h2 className="bc-modal__title">{title}</h2>
        </div>
        <div className="bc-modal__body">{children}</div>
        {footer && <div className="bc-modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
