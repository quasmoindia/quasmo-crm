import { useState } from 'react';
import { FiExternalLink, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { useFetchIndiaMartLeads, useIndiaMartStatus } from '../api/indiaMartLeads';
import type { IndiaMartLead } from '../types/indiaMartLead';
import { QUERY_TYPE_LABELS } from '../types/indiaMartLead';

const ACCENT = '#C2410C';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function stripHtml(value: string) {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

function formatCell(value: unknown): string {
  if (value == null || value === '' || value === '<nil>') return '—';
  if (typeof value === 'string') return stripHtml(value);
  return String(value);
}

function queryTypeLabel(type: unknown) {
  if (typeof type !== 'string' || !type) return '—';
  return QUERY_TYPE_LABELS[type] ?? type;
}

export function IndiaMartLeads() {
  const [mode, setMode] = useState<'recent' | 'range'>('recent');
  const [startDate, setStartDate] = useState(daysAgoIso(6));
  const [endDate, setEndDate] = useState(todayIso());
  const [hasFetched, setHasFetched] = useState(false);

  const { data: status } = useIndiaMartStatus();
  const fetchMutation = useFetchIndiaMartLeads();
  const data = fetchMutation.data;
  const isFetching = fetchMutation.isPending;

  const items = data?.items ?? [];

  const runFetch = () => {
    setHasFetched(true);
    const params =
      mode === 'range'
        ? { start_date: startDate, end_date: endDate }
        : { start_date: undefined, end_date: undefined };
    fetchMutation.mutate(params);
  };

  const columns = [
    {
      key: 'QUERY_TIME',
      label: 'Time',
      render: (row: IndiaMartLead) => (
        <span className="whitespace-nowrap text-slate-700">{formatCell(row.QUERY_TIME)}</span>
      ),
    },
    {
      key: 'QUERY_TYPE',
      label: 'Type',
      render: (row: IndiaMartLead) => (
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
          {queryTypeLabel(row.QUERY_TYPE)}
        </span>
      ),
    },
    {
      key: 'SENDER_NAME',
      label: 'Buyer',
      render: (row: IndiaMartLead) => (
        <span className="font-medium text-slate-800">{formatCell(row.SENDER_NAME)}</span>
      ),
    },
    {
      key: 'SENDER_MOBILE',
      label: 'Mobile',
      render: (row: IndiaMartLead) => <span className="text-slate-700">{formatCell(row.SENDER_MOBILE)}</span>,
    },
    {
      key: 'QUERY_PRODUCT_NAME',
      label: 'Product',
      render: (row: IndiaMartLead) => (
        <span className="block max-w-56 truncate text-slate-700" title={formatCell(row.QUERY_PRODUCT_NAME)}>
          {formatCell(row.QUERY_PRODUCT_NAME)}
        </span>
      ),
    },
    {
      key: 'SENDER_CITY',
      label: 'City',
      render: (row: IndiaMartLead) => <span className="text-slate-600">{formatCell(row.SENDER_CITY)}</span>,
    },
    {
      key: 'SENDER_STATE',
      label: 'State',
      render: (row: IndiaMartLead) => <span className="text-slate-600">{formatCell(row.SENDER_STATE)}</span>,
    },
  ];

  const errorMessage =
    fetchMutation.error instanceof Error ? fetchMutation.error.message : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IndiaMART leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pull leads from IndiaMART Lead Manager via the backend proxy. Use recent mode for new leads since
            your last fetch, or pick a date range (max 7 days).
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            status?.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {status?.configured ? 'Pull API configured' : 'Add INDIAMART_CRM_KEY to backend .env'}
        </span>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === 'recent' ? 'primary' : 'outline'} onClick={() => setMode('recent')}>
            Recent leads
          </Button>
          <Button variant={mode === 'range' ? 'primary' : 'outline'} onClick={() => setMode('range')}>
            Date range
          </Button>
        </div>

        {mode === 'range' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Fetches leads from the last 24 hours, or since your previous API hit (IndiaMART default).
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={runFetch} disabled={isFetching}>
            <FiSearch className="size-4" aria-hidden />
            {isFetching ? 'Fetching…' : hasFetched ? 'Refresh' : 'Fetch leads'}
          </Button>
          {hasFetched ? (
            <Button variant="outline" onClick={runFetch} disabled={isFetching}>
              <FiRefreshCw className="size-4" aria-hidden />
              Retry
            </Button>
          ) : null}
        </div>

        <p className="text-xs text-slate-500">
          IndiaMART enforces a 5-minute cooldown per API key across all callers (browser tests, recent fetch,
          date-range fetch, etc.). Wait 5 minutes between attempts.
        </p>
      </Card>

      {fetchMutation.isError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage ?? 'Could not fetch IndiaMART leads.'}
        </Card>
      ) : null}

      {data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leads</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.totalRecords}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">API status</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{data.apiStatus ?? '—'}</p>
            <p className="text-xs text-slate-500">Code {data.apiCode ?? '—'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
            <p className="mt-1 text-lg font-semibold capitalize text-slate-900">{data.mode}</p>
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

      {hasFetched ? (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Lead records</h2>
            <p className="text-sm text-slate-600">Parsed from IndiaMART RESPONSE array.</p>
          </div>
          {isFetching && !data ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No leads returned for this request.</p>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              rowKey={(row) => String(row.UNIQUE_QUERY_ID ?? JSON.stringify(row))}
            />
          )}
        </Card>
      ) : null}

      {data ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-900">Raw API response</h2>
          <p className="mt-1 text-sm text-slate-600">Exact JSON returned by IndiaMART Pull API v2.</p>
          <pre
            className="mt-4 max-h-112 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-emerald-100"
            style={{ borderLeft: `4px solid ${ACCENT}` }}
          >
            {JSON.stringify(data.raw, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
