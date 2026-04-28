import { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

export interface SearchableSelectOption {
  value: string;
  label: string;
  meta?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  required,
  disabled,
  loading,
  emptyText = 'No options found',
  allowClear = true,
  showSelectedDetails = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  allowClear?: boolean;
  showSelectedDetails?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) =>
      `${option.label} ${option.meta ?? ''}`.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="w-full">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={`truncate ${selectedOption ? '' : 'text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FiChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {allowClear && selectedOption && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            aria-label={`Clear ${label}`}
            title="Clear selection"
          >
            <FiX className="size-4" />
          </button>
        )}
      </div>

      {showSelectedDetails && selectedOption && (
        <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/70 p-2.5">
          <p className="text-sm font-medium text-indigo-800">{selectedOption.label}</p>
          {selectedOption.meta && <p className="text-xs text-indigo-700">{selectedOption.meta}</p>}
        </div>
      )}

      {open && (
        <div className="relative z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {loading ? (
              <li className="px-3 py-2 text-sm text-slate-500">Loading...</li>
            ) : filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                      option.value === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                    }`}
                  >
                    <p className="font-medium">{option.label}</p>
                    {option.meta && <p className="text-xs text-slate-500">{option.meta}</p>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
