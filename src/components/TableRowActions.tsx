import type { IconType } from 'react-icons';
import { FiLoader } from 'react-icons/fi';

export type TableRowActionVariant = 'default' | 'primary' | 'danger';

export type TableRowActionItem = {
  key: string;
  label: string;
  icon: IconType;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  variant?: TableRowActionVariant;
};

const VARIANT_CLASSES: Record<TableRowActionVariant, string> = {
  default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  primary: 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700',
  danger: 'text-red-500 hover:bg-red-50 hover:text-red-700',
};

/** Compact icon button group for DataTable row actions — stays on one line. */
export function TableRowActions({ items }: { items: TableRowActionItem[] }) {
  const visible = items.filter((item) => !item.hidden);
  if (!visible.length) return <span className="text-slate-300">—</span>;

  return (
    <div
      className="inline-flex flex-nowrap items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-50/50 p-0.5"
      role="group"
      aria-label="Row actions"
    >
      {visible.map((item) => {
        const Icon = item.icon;
        const variant = item.variant ?? 'default';
        return (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            disabled={item.disabled || item.loading}
            onClick={() => void item.onClick()}
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]}`}
          >
            {item.loading ? (
              <FiLoader className="size-4 animate-spin" aria-hidden />
            ) : (
              <Icon className="size-4" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
