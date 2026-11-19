/*
 * Feed tabs + department chips (Lane C owns Feed*). Spaces: Student · Experts · Alumni (identical behavior).
 * Tabs: equal width; active = bold text with a 4px gold rounded underline sized to the label.
 * Chips: outlined pills, horizontally scrollable; selected = gold-soft background + gold text.
 */
import type { FeedTab } from '@/Interfaces';
import './FeedStyles.css';

// eslint-disable-next-line react-refresh/only-export-components
export const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: 'foryou', label: 'For You' },
  { id: 'students', label: 'Student' },
  { id: 'experts', label: 'Experts' },
  { id: 'alumni', label: 'Alumni' },
];

export function FeedTabs({ value, onChange }: { value: FeedTab; onChange: (tab: FeedTab) => void }) {
  return (
    <div role="tablist" aria-label="Feed" className="bc-tabs">
      {FEED_TABS.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`bc-tab-${t.id}`}
            aria-selected={active}
            aria-controls="bc-feed-panel"
            className={`bc-tab ${active ? 'bc-tab--active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            <span className="bc-tab__label">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FeedDeptChips({
  departments,
  value,
  onChange,
}: {
  departments: string[];
  value: string | null;
  onChange: (dept: string | null) => void;
}) {
  if (!departments.length) return null;
  const chips: { key: string; label: string; dept: string | null }[] = [
    { key: '__all', label: 'All departments', dept: null },
    ...departments.map((d) => ({ key: d, label: d, dept: d })),
  ];
  return (
    <div className="bc-chips" role="group" aria-label="Filter by department">
      {chips.map((c) => {
        const selected = c.dept === value;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={selected}
            className={`bc-chip ${selected ? 'bc-chip--selected' : ''}`}
            onClick={() => onChange(c.dept)}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
