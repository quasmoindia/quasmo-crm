import { useMemo, useState } from 'react';
import { FiExternalLink, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useTradeIndiaInquiries, useTradeIndiaStatus } from '../api/tradeIndiaInquiries';

const ACCENT = '#0E7490';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function collectColumns(items: Record<string, unknown>[], max = 8): string[] {
  const keys = new Set<string>();
  for (const item of items.slice(0, 20)) {
    Object.keys(item).forEach((key) => keys.add(key));
    if (keys.size >= max) break;
  }
  return Array.from(keys).slice(0, max);
}

export function TradeIndiaInquiries() {
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [limit, setLimit] = useState('10');
  const [pageNo, setPageNo] = useState('1');
  const [fetchEnabled, setFetchEnabled] = useState(false);

  const { data: status } = useTradeIndiaStatus();
  const queryParams = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      limit: Number(limit) || 10,
      page_no: Number(pageNo) || 1,
    }),
    [fromDate, toDate, limit, pageNo]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useTradeIndiaInquiries(
    queryParams,
    fetchEnabled
  );

  const items = data?.items ?? [];
  const columnKeys = collectColumns(items);

  const columns = columnKeys.map((key) => ({
    key,
    label: key.replace(/_/g, ' '),
    render: (row: Record<string, unknown>) => (
      <span className="block max-w-[14rem] truncate text-slate-700" title={formatCell(row[key])}>
        {formatCell(row[key])}
      </span>
    ),
  }));

  const runFetch = () => {
    if (!fetchEnabled) setFetchEnabled(true);
    else void refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">TradeIndia inquiries</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pull inquiries from TradeIndia&apos;s My Inquiry API via the backend proxy. Parsed rows and the raw
            response are shown below so you can see exactly how data arrives.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {status?.configured ? 'API configured' : 'Add credentials to backend .env'}
        </span>
      </div>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="From date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input label="To date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <Input label="Limit" type="number" min={1} max={100} value={limit} onChange={(e) => setLimit(e.target.value)} />
          <Input label="Page" type="number" min={1} value={pageNo} onChange={(e) => setPageNo(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={runFetch} disabled={isFetching}>
            <FiSearch className="size-4" aria-hidden />
            {isFetching ? 'Fetching…' : fetchEnabled ? 'Refresh' : 'Fetch inquiries'}
          </Button>
          {fetchEnabled ? (
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <FiRefreshCw className="size-4" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>
      </Card>

      {isError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error instanceof Error ? error.message : 'Could not fetch TradeIndia inquiries.'}
        </Card>
      ) : null}

      {data?.notice ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.notice}</Card>
      ) : null}

      {data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items parsed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.itemCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Response type</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{data.parseKind}</p>
            <p className="text-xs text-slate-500">{data.contentType}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fetched at</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {new Date(data.fetchedAt).toLocaleString()}
            </p>
          </Card>
        </div>
      ) : null}

      {data?.request?.url ? (
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Request URL (key redacted)</p>
          <a
            href={data.request.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 break-all text-sm font-medium text-[#305dff] hover:underline"
          >
            {data.request.url}
            <FiExternalLink className="size-3.5 shrink-0" aria-hidden />
          </a>
        </Card>
      ) : null}

      {fetchEnabled ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Parsed inquiries</h2>
            <p className="text-sm text-slate-600">
              Columns are inferred from the API payload. When TradeIndia returns a new shape, this table adapts
              automatically.
            </p>
          </div>
          {isLoading ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No inquiry rows could be parsed from the response.</p>
          ) : (
            <DataTable columns={columns} data={items} rowKey={(row) => JSON.stringify(row).slice(0, 80)} />
          )}
        </Card>
      ) : null}

      {data ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">Raw API response</h2>
          <p className="mt-1 text-sm text-slate-600">Exact payload returned by TradeIndia (after JSON parse when applicable).</p>
          <pre
            className="mt-4 max-h-[28rem] overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-emerald-100"
            style={{ borderLeft: `4px solid ${ACCENT}` }}
          >
            {JSON.stringify(data.raw, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
