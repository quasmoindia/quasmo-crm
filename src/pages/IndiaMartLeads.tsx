import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiExternalLink, FiRefreshCw, FiSearch, FiUserPlus } from 'react-icons/fi';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';
import { TableRowActions } from '../components/TableRowActions';
import {
  useCheckIndiaMartDuplicates,
  useFetchIndiaMartLeads,
  useImportIndiaMartLeads,
  useIndiaMartStatus,
} from '../api/indiaMartLeads';
import type {
  IndiaMartDuplicateInfo,
  IndiaMartImportResult,
  IndiaMartLead,
} from '../types/indiaMartLead';
import {
  QUERY_TYPE_LABELS,
  indiaMartRowKey,
  isIndiaMartImportable,
} from '../types/indiaMartLead';

const ACCENT = '#C2410C';

/** Stable reference so the duplicate-check effect below doesn't re-fire every render. */
const NO_ITEMS: IndiaMartLead[] = [];

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

function CrmStatusBadge({ info }: { info?: IndiaMartDuplicateInfo }) {
  if (!info || info.status === 'new') {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Ready
      </span>
    );
  }

  if (info.status === 'imported') {
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
          In CRM
        </span>
        {info.leadName ? (
          <Link
            to="/dashboard/leads"
            className="text-xs text-indigo-600 hover:underline"
            title={info.leadId ? `Lead ID: ${info.leadId}` : undefined}
          >
            {info.leadName}
          </Link>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
        Phone match
      </span>
      {info.leadName ? (
        <Link
          to="/dashboard/leads"
          className="text-xs text-indigo-600 hover:underline"
          title={info.leadId ? `Existing lead: ${info.leadId}` : undefined}
        >
          {info.leadName}
        </Link>
      ) : null}
    </span>
  );
}

export function IndiaMartLeads() {
  const [mode, setMode] = useState<'recent' | 'range'>('recent');
  const [startDate, setStartDate] = useState(daysAgoIso(6));
  const [endDate, setEndDate] = useState(todayIso());
  const [hasFetched, setHasFetched] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [duplicateMap, setDuplicateMap] = useState<Record<string, IndiaMartDuplicateInfo>>({});
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<IndiaMartImportResult | null>(null);

  const { data: status } = useIndiaMartStatus();
  const fetchMutation = useFetchIndiaMartLeads();
  const checkDuplicatesMutation = useCheckIndiaMartDuplicates();
  const importMutation = useImportIndiaMartLeads();

  const data = fetchMutation.data;
  const isFetching = fetchMutation.isPending;
  const items = data?.items ?? NO_ITEMS;

  const refreshDuplicates = async (rows: IndiaMartLead[]) => {
    if (!rows.length) {
      setDuplicateMap({});
      return;
    }
    const result = await checkDuplicatesMutation.mutateAsync(rows);
    setDuplicateMap(result.duplicates);
  };

  useEffect(() => {
    if (!items.length) {
      setDuplicateMap({});
      setSelectedKeys(new Set());
      setImportResult(null);
      return;
    }

    let cancelled = false;
    setSelectedKeys(new Set());
    setImportResult(null);

    checkDuplicatesMutation
      .mutateAsync(items)
      .then((result) => {
        if (!cancelled) setDuplicateMap(result.duplicates);
      })
      .catch(() => {
        if (!cancelled) setDuplicateMap({});
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check when fetched items change only
  }, [items]);

  const importableKeys = useMemo(
    () =>
      items
        .map((row) => indiaMartRowKey(row))
        .filter((key) => isIndiaMartImportable(duplicateMap[key]?.status)),
    [items, duplicateMap]
  );

  const allImportableSelected =
    importableKeys.length > 0 && importableKeys.every((key) => selectedKeys.has(key));

  const toggleSelectAllImportable = () => {
    if (allImportableSelected) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(importableKeys));
  };

  const toggleRowSelection = (key: string) => {
    if (!isIndiaMartImportable(duplicateMap[key]?.status)) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyImportResult = async (result: IndiaMartImportResult) => {
    setImportResult(result);
    await refreshDuplicates(items);
    setSelectedKeys(new Set());
  };

  const importRows = async (rows: IndiaMartLead[]) => {
    if (!rows.length) return;
    const result = await importMutation.mutateAsync({ items: rows, skipDuplicates: true });
    await applyImportResult(result);
  };

  const importSingle = async (row: IndiaMartLead) => {
    const key = indiaMartRowKey(row);
    setImportingKey(key);
    try {
      await importRows([row]);
    } finally {
      setImportingKey(null);
    }
  };

  const importSelected = async () => {
    const rows = items.filter((row) => selectedKeys.has(indiaMartRowKey(row)));
    await importRows(rows);
  };

  const runFetch = () => {
    setHasFetched(true);
    setImportResult(null);
    const params =
      mode === 'range'
        ? { start_date: startDate, end_date: endDate }
        : { start_date: undefined, end_date: undefined };
    fetchMutation.mutate(params);
  };

  const columns = [
    {
      key: 'select',
      label: 'Select',
      render: (row: IndiaMartLead) => {
        const key = indiaMartRowKey(row);
        const importable = isIndiaMartImportable(duplicateMap[key]?.status);
        return (
          <input
            type="checkbox"
            checked={selectedKeys.has(key)}
            disabled={!importable || importMutation.isPending}
            onChange={() => toggleRowSelection(key)}
            aria-label={`Select ${formatCell(row.SENDER_NAME)}`}
            className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
          />
        );
      },
    },
    {
      key: 'crm_status',
      label: 'CRM status',
      render: (row: IndiaMartLead) => (
        <CrmStatusBadge info={duplicateMap[indiaMartRowKey(row)]} />
      ),
    },
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
      render: (row: IndiaMartLead) => (
        <span className="text-slate-700">{formatCell(row.SENDER_MOBILE)}</span>
      ),
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
      render: (row: IndiaMartLead) => (
        <span className="text-slate-600">{formatCell(row.SENDER_CITY)}</span>
      ),
    },
    {
      key: 'SENDER_STATE',
      label: 'State',
      render: (row: IndiaMartLead) => (
        <span className="text-slate-600">{formatCell(row.SENDER_STATE)}</span>
      ),
    },
  ];

  const errorMessage =
    fetchMutation.error instanceof Error ? fetchMutation.error.message : null;
  const importError =
    importMutation.error instanceof Error ? importMutation.error.message : null;

  const duplicateSummary = useMemo(() => {
    const values = Object.values(duplicateMap);
    return {
      ready: values.filter((d) => d.status === 'new').length,
      imported: values.filter((d) => d.status === 'imported').length,
      phoneDuplicate: values.filter((d) => d.status === 'phone_duplicate').length,
    };
  }, [duplicateMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IndiaMART leads</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pull leads from IndiaMART Lead Manager, review duplicates, and add them to CRM with source
            IndiaMART and full inquiry details.
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
          IndiaMART enforces a 5-minute cooldown per API key across all callers. Wait 5 minutes between
          pull attempts. Import to CRM does not use the IndiaMART API.
        </p>
      </Card>

      {fetchMutation.isError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage ?? 'Could not fetch IndiaMART leads.'}
        </Card>
      ) : null}

      {importError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{importError}</Card>
      ) : null}

      {importResult ? (
        <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Import complete: {importResult.created} created, {importResult.skipped} skipped,{' '}
          {importResult.failed} failed.
          {importResult.failed > 0 ? (
            <ul className="mt-2 list-inside list-disc text-emerald-800">
              {importResult.details
                .filter((d) => d.status === 'failed')
                .slice(0, 5)
                .map((d) => (
                  <li key={d.rowKey}>{d.reason ?? 'Failed'}</li>
                ))}
            </ul>
          ) : null}
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

      {items.length > 0 && Object.keys(duplicateMap).length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready to import</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{duplicateSummary.ready}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Already in CRM</p>
            <p className="mt-1 text-2xl font-bold text-sky-700">{duplicateSummary.imported}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone duplicates</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{duplicateSummary.phoneDuplicate}</p>
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
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Lead records</h2>
              <p className="text-sm text-slate-600">
                Parsed from IndiaMART RESPONSE array. Duplicates are detected by inquiry ID and phone number.
              </p>
            </div>
            {items.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  disabled={!importableKeys.length || importMutation.isPending}
                  onClick={toggleSelectAllImportable}
                >
                  {allImportableSelected ? 'Deselect all' : 'Select all importable'}
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedKeys.size || importMutation.isPending}
                  onClick={() => setSelectedKeys(new Set())}
                >
                  Clear selection ({selectedKeys.size})
                </Button>
                <Button
                  disabled={!selectedKeys.size || importMutation.isPending}
                  loading={importMutation.isPending && !importingKey}
                  onClick={() => void importSelected()}
                >
                  <FiUserPlus className="size-4" aria-hidden />
                  Add selected to CRM ({selectedKeys.size})
                </Button>
              </div>
            ) : null}
          </div>
          {isFetching && !data ? (
            <p className="p-5 text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No leads returned for this request.</p>
          ) : checkDuplicatesMutation.isPending && !Object.keys(duplicateMap).length ? (
            <p className="p-5 text-sm text-slate-500">Checking CRM duplicates…</p>
          ) : (
            <div className="p-4 pt-0">
              <DataTable
                columns={columns}
                data={items}
                rowKey={(row) => indiaMartRowKey(row)}
                renderActions={(row) => {
                  const key = indiaMartRowKey(row);
                  const importable = isIndiaMartImportable(duplicateMap[key]?.status);
                  return (
                    <TableRowActions
                      items={[
                        {
                          key: 'add',
                          label: importable ? 'Add to CRM' : 'Already in CRM or duplicate phone',
                          icon: FiUserPlus,
                          variant: 'primary',
                          disabled: !importable || importMutation.isPending,
                          loading: importingKey === key,
                          onClick: () => importSingle(row),
                        },
                      ]}
                    />
                  );
                }}
              />
            </div>
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
