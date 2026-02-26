import type { ReactNode } from 'react';
import { Button } from './Button';
import { exportToCsv as doExportCsv } from '../utils/csv';

function getPaginationItems(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 1) return [];
  const pages = new Set<number>([1, totalPages]);
  pages.add(page);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) result.push('ellipsis');
    result.push(sorted[i]!);
  }
  return result;
}

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Used for CSV export when no render; defaults to row[key] */
  exportValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  title?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    /** Called when user presses Enter in the search input */
    onSearchSubmit?: () => void;
  };
  filters?: ReactNode;
  exportCsv?: {
    filename: string;
    getRows: () => (string | number)[][];
  };
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyMessage?: string;
  renderActions?: (row: T) => ReactNode;
}

export function DataTable<T extends object>({
  title,
  columns,
  data,
  rowKey,
  search,
  filters,
  exportCsv,
  pagination,
  isLoading = false,
  emptyMessage = 'No data found.',
  renderActions,
}: DataTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      {(title || search || filters || exportCsv) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {title && (
            <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          )}
          <div className="flex flex-1 flex-wrap items-end gap-3">
            {search && (
              <div className="min-w-[200px] flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Search
                </label>
                <input
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      search.onSearchSubmit?.();
                    }
                  }}
                  placeholder={search.placeholder ?? 'Search...'}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
            {filters}
            {exportCsv && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const rows = exportCsv.getRows();
                  if (rows.length) doExportCsv(rows, exportCsv.filename);
                }}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading...
          </div>
        ) : !data.length ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 font-medium first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {col.label}
                  </th>
                ))}
                {renderActions && (
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-800">
                      {col.render
                        ? col.render(row)
                        : String(String((row as Record<string, unknown>)[col.key] ?? '—'))}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 py-3 text-right">{renderActions(row)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.totalPages > 1 && !isLoading && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="h-9 min-h-9 py-0"
            >
              Prev
            </Button>
            {getPaginationItems(pagination.page, pagination.totalPages).map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => pagination.onPageChange(item)}
                  className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-medium transition-colors ${
                    item === pagination.page
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-current={item === pagination.page ? 'page' : undefined}
                >
                  {item}
                </button>
              )
            )}
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="h-9 min-h-9 py-0"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
