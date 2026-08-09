import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBox,
  FiClock,
  FiDollarSign,
  FiFileText,
  FiPackage,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { useCurrentUser } from '../api/auth';
import { listComplaintsApi, complaintsListKey, useComplaintsList } from '../api/complaints';
import { listLeadsApi, leadsListKey, useLeadsList } from '../api/leads';
import { listTaxInvoicesApi, taxInvoicesListKey } from '../api/taxInvoices';
import { getExpenseAnalyticsApi } from '../api/expenses';
import { getProductAnalyticsApi } from '../api/products';
import { useAttendanceDashboard } from '../api/attendance';
import { get } from '../utils/api';
import { Card } from '../components/Card';
import { MetricBand, type Metric } from '../components/dashboard/MetricBand';
import { CategoryBars, type CategoryDatum } from '../components/dashboard/CategoryBars';
import { PipelineBar, type PipelineStage } from '../components/dashboard/PipelineBar';
import { TrendColumns, type TrendPoint } from '../components/dashboard/TrendColumns';
import { TriageStrip, type TriageItem } from '../components/dashboard/TriageStrip';
import { formatInrCompact } from '../components/dashboard/tokens';
import { canAccessModule } from '../config/roles';
import { canUseDefaultSelfPunch } from '../config/attendanceAccess';
import type { ComplaintStatus, Complaint } from '../types/complaint';
import { STATUS_OPTIONS } from '../types/complaint';
import type { LeadStatus, Lead } from '../types/lead';
import { LEAD_STATUS_OPTIONS } from '../types/lead';
import type { OrderStatus } from '../types/order';
import { ORDER_STATUS_OPTIONS } from '../types/order';
import type { ExpenseAnalytics } from '../types/expense';
import { EXPENSE_CATEGORY_OPTIONS } from '../types/expense';
import type { ProductAnalytics } from '../types/product';

const COMPLAINT_STATUSES: ComplaintStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const LEAD_STATUSES: LeadStatus[] = LEAD_STATUS_OPTIONS.map((o) => o.value);
const ORDER_STATUSES: OrderStatus[] = ORDER_STATUS_OPTIONS.map((o) => o.value);

/**
 * Dropped out rather than progressed — greyed, outside the ordinal ramp.
 * "Closed (won)" is NOT here: it is the successful end of the progression, so it takes the
 * ramp's darkest step. That leaves exactly four progression stages, which is the ramp's cap.
 */
const LEAD_TERMINAL: LeadStatus[] = ['lost'];

/** Settled either way, so no longer in play. Distinct from terminal, which is about colour. */
const LEAD_SETTLED: LeadStatus[] = ['closed', 'lost'];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const user = me?.user;
  const role = user?.role;
  const roleModules = user?.roleModules;

  const canComplaints = canAccessModule(role, 'complaints', roleModules);
  const canLeads = canAccessModule(role, 'leads', roleModules);
  const canUsers = canAccessModule(role, 'users', roleModules);
  const canInvoices = canAccessModule(role, 'invoices', roleModules);
  const canRoles = canAccessModule(role, 'roles', roleModules);
  const canAttendance = canAccessModule(role, 'attendance', roleModules);
  const canOrders = canAccessModule(role, 'orders', roleModules);
  const canProducts = canAccessModule(role, 'products', roleModules);
  const canExpenses = canAccessModule(role, 'expenses', roleModules);
  const canCustomers = canAccessModule(role, 'customers', roleModules);
  const canSelfPunch = canUseDefaultSelfPunch(role);

  const now = new Date();
  const today = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // ─── Data ──────────────────────────────────────────────────────────────────
  // Every query is gated on module access so a scoped role never fires a request
  // it would be refused. `limit: 1` where only pagination.total is needed.

  const attendance = useAttendanceDashboard(canAttendance);

  const complaintsRecent = useComplaintsList({ page: 1, limit: 5 }, { enabled: canComplaints });
  const leadsRecent = useLeadsList({ page: 1, limit: 5 }, { enabled: canLeads });

  const complaintStatusQueries = useQueries({
    queries: COMPLAINT_STATUSES.map((status) => ({
      queryKey: complaintsListKey({ status, page: 1, limit: 1 }),
      queryFn: () => listComplaintsApi({ status, page: 1, limit: 1 }),
      enabled: canComplaints,
      staleTime: 30_000,
    })),
  });

  const leadStatusQueries = useQueries({
    queries: LEAD_STATUSES.map((status) => ({
      queryKey: leadsListKey({ status, page: 1, limit: 1 }),
      queryFn: () => listLeadsApi({ status, page: 1, limit: 1 }),
      enabled: canLeads,
      staleTime: 30_000,
    })),
  });

  const orderStatusQueries = useQueries({
    queries: ORDER_STATUSES.map((status) => ({
      queryKey: ['orders', { status, page: 1, limit: 1 }],
      queryFn: () =>
        get<{ data: unknown[]; pagination?: { total?: number } }>('/orders', {
          params: { status, page: '1', limit: '1' },
        }),
      enabled: canOrders,
      staleTime: 30_000,
    })),
  });

  const products = useQuery({
    queryKey: ['products', 'analytics'],
    queryFn: getProductAnalyticsApi,
    enabled: canProducts,
    staleTime: 60_000,
  });

  const expenses = useQuery({
    queryKey: ['expenses', 'analytics', undefined],
    queryFn: () => getExpenseAnalyticsApi(),
    enabled: canExpenses,
    staleTime: 60_000,
  });

  const invoices = useQuery({
    queryKey: taxInvoicesListKey({ page: 1, limit: 1 }),
    queryFn: () => listTaxInvoicesApi({ page: 1, limit: 1 }),
    enabled: canInvoices,
    staleTime: 60_000,
  });

  const customers = useQuery({
    queryKey: ['customers', { page: 1, limit: 1 }],
    queryFn: () =>
      get<{ data: unknown[]; pagination?: { total?: number } }>('/customers', {
        params: { page: '1', limit: '1' },
      }),
    enabled: canCustomers,
    staleTime: 60_000,
  });

  // ─── Derived ───────────────────────────────────────────────────────────────

  const totalOf = (q: { data?: { pagination?: { total?: number } } }) => q.data?.pagination?.total ?? 0;

  const complaintCounts = COMPLAINT_STATUSES.map((s, i) => ({
    status: s,
    count: totalOf(complaintStatusQueries[i] ?? {}),
  }));
  const leadCounts = LEAD_STATUSES.map((s, i) => ({
    status: s,
    count: totalOf(leadStatusQueries[i] ?? {}),
  }));
  const orderCounts = ORDER_STATUSES.map((s, i) => ({
    status: s,
    count: totalOf(orderStatusQueries[i] ?? {}),
  }));

  const complaintsTotal = complaintCounts.reduce((n, c) => n + c.count, 0);
  const openComplaints = complaintCounts.find((c) => c.status === 'open')?.count ?? 0;
  const leadsTotal = leadCounts.reduce((n, c) => n + c.count, 0);
  const ordersTotal = orderCounts.reduce((n, c) => n + c.count, 0);

  /** Leads still in play — neither won nor lost. */
  const openLeads = leadCounts
    .filter((c) => !LEAD_SETTLED.includes(c.status))
    .reduce((n, c) => n + c.count, 0);

  const productData = products.data as ProductAnalytics | undefined;
  const expenseData = expenses.data as ExpenseAnalytics | undefined;
  const pendingExpenses = expenseData?.statusSummary.find((s) => s._id === 'open');
  const attendanceStats = attendance.data?.stats;

  const complaintsLoading =
    canComplaints && (complaintsRecent.isLoading || complaintStatusQueries.some((q) => q.isLoading));
  const leadsLoading = canLeads && (leadsRecent.isLoading || leadStatusQueries.some((q) => q.isLoading));
  const ordersLoading = canOrders && orderStatusQueries.some((q) => q.isLoading);

  const recentComplaints: Complaint[] = complaintsRecent.data?.data ?? [];
  const recentLeads: Lead[] = leadsRecent.data?.data ?? [];

  // ─── Triage ────────────────────────────────────────────────────────────────

  const triageItems: TriageItem[] = [
    canAttendance && {
      id: 'flagged',
      count: attendanceStats?.flagged ?? 0,
      label: 'flagged record',
      detail: 'Attendance needs review',
      tone: 'critical' as const,
      icon: FiAlertTriangle,
      to: '/dashboard/attendance',
    },
    canComplaints && {
      id: 'open-complaints',
      count: openComplaints,
      label: 'open complaint',
      detail: 'Not yet picked up',
      tone: 'serious' as const,
      icon: FiAlertCircle,
      to: '/dashboard/complaints',
    },
    canAttendance && {
      id: 'open-sessions',
      count: attendanceStats?.openSessions ?? 0,
      label: 'missing punch-out',
      detail: 'Punched in, never out',
      tone: 'serious' as const,
      icon: FiClock,
      to: '/dashboard/attendance',
    },
    canExpenses && {
      id: 'pending-expenses',
      count: pendingExpenses?.count ?? 0,
      label: 'expense',
      detail: `${formatInrCompact(pendingExpenses?.total ?? 0)} awaiting approval`,
      tone: 'warning' as const,
      icon: FiDollarSign,
      to: '/dashboard/expenses',
    },
    canProducts && {
      id: 'low-stock',
      count: productData?.lowStockItems ?? 0,
      label: 'low-stock product',
      labelPlural: 'low-stock products',
      detail: 'At or below reorder level',
      tone: 'warning' as const,
      icon: FiPackage,
      to: '/dashboard/products',
    },
  ].filter(Boolean) as TriageItem[];

  const triageLoading =
    (canAttendance && attendance.isLoading) ||
    (canComplaints && complaintStatusQueries.some((q) => q.isLoading)) ||
    (canExpenses && expenses.isLoading) ||
    (canProducts && products.isLoading);

  // ─── Expense trend ─────────────────────────────────────────────────────────

  const categories: CategoryDatum[] = (expenseData?.categorySummary ?? []).map((c) => ({
    key: c._id,
    label: EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === c._id)?.label ?? c._id,
    value: c.total,
    count: c.count,
  }));

  const trend: TrendPoint[] = (expenseData?.monthlyTrend ?? [])
    .slice()
    .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month)
    .slice(-6)
    .map((m) => ({
      key: `${m._id.year}-${m._id.month}`,
      label: MONTH_SHORT[m._id.month - 1] ?? '',
      fullLabel: `${MONTH_LONG[m._id.month - 1] ?? ''} ${m._id.year}`,
      value: m.total,
      meta: `${m.count} claim${m.count === 1 ? '' : 's'} · ${formatInrCompact(m.paid)} paid`,
    }));

  // ─── Metric band ───────────────────────────────────────────────────────────

  /**
   * Holiday context, because without it the headline lies. On a company holiday almost the
   * whole roll shows as "absent", which reads as a crisis rather than a Sunday.
   */
  const holidayToday = attendance.data?.holidaysToday?.[0]?.name;
  const onHoliday = attendanceStats?.onHoliday ?? 0;
  const onRoll = attendanceStats?.totalActive ?? 0;

  const attendanceSub = holidayToday
    ? holidayToday
    : onHoliday > 0
      ? `of ${onRoll} on roll · ${onHoliday} on holiday`
      : `of ${onRoll} on roll · ${attendanceStats?.late ?? 0} late`;

  const metrics: Metric[] = [
    canAttendance && {
      key: 'attendance',
      label: 'On site today',
      value: attendanceStats?.present ?? 0,
      sub: attendanceSub,
      icon: FiUserCheck,
      to: '/dashboard/attendance',
      loading: attendance.isLoading,
      meter: onRoll > 0 ? (attendanceStats?.present ?? 0) / onRoll : undefined,
    },
    canLeads && {
      key: 'leads',
      label: 'Leads in play',
      value: openLeads,
      sub: `of ${leadsTotal} total`,
      icon: FiTrendingUp,
      to: '/dashboard/leads',
      loading: leadsLoading,
      meter: leadsTotal > 0 ? openLeads / leadsTotal : undefined,
    },
    canExpenses && {
      key: 'expenses',
      label: 'Expenses',
      value: formatInrCompact(expenseData?.totals.totalAmount ?? 0),
      sub: `${formatInrCompact(pendingExpenses?.total ?? 0)} pending approval`,
      icon: FiDollarSign,
      to: '/dashboard/expenses',
      loading: expenses.isLoading,
    },
    canProducts && {
      key: 'products',
      label: 'Catalogue',
      value: productData?.activeProducts ?? 0,
      sub:
        (productData?.lowStockItems ?? 0) > 0 ? (
          <>
            active · <span className="font-medium text-amber-700">{productData?.lowStockItems} low</span>
          </>
        ) : (
          `active of ${productData?.totalProducts ?? 0}`
        ),
      icon: FiBox,
      to: '/dashboard/products',
      loading: products.isLoading,
    },
    canCustomers && {
      key: 'customers',
      label: 'Customers',
      value: customers.data?.pagination?.total ?? 0,
      icon: FiUsers,
      to: '/dashboard/customers',
      loading: customers.isLoading,
    },
    canInvoices && {
      key: 'invoices',
      label: 'Documents',
      value: invoices.data?.pagination?.total ?? 0,
      sub: 'Invoices, quotes, POs',
      icon: FiFileText,
      to: '/dashboard/invoices',
      loading: invoices.isLoading,
    },
  ].filter(Boolean) as Metric[];

  const hasAnyModule =
    canComplaints || canLeads || canUsers || canInvoices || canRoles || canAttendance ||
    canOrders || canProducts || canExpenses || canCustomers || canSelfPunch;

  const showTriage = canAttendance || canComplaints || canExpenses || canProducts;

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {meLoading ? (
              <span className="inline-block h-8 w-56 animate-pulse rounded bg-slate-100 align-middle" />
            ) : (
              <>
                {greeting(now.getHours())}
                {user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
              </>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {showTriage ? "Here's what's waiting on you." : 'Your workspace overview.'}
          </p>
        </div>
        <p className="text-sm tabular-nums text-slate-500">{today}</p>
      </header>

      {showTriage && <TriageStrip items={triageItems} loading={triageLoading} />}

      {!hasAnyModule && (
        <Card>
          <p className="text-slate-600">
            Your role can access this dashboard only. Ask an administrator if you need access to
            complaints, leads, tax invoices, users, or roles.
          </p>
        </Card>
      )}

      {hasAnyModule && <MetricBand metrics={metrics} />}

      {/* Three across on wide screens: these panels are short, and two-up left half the row
          empty. items-start stops a short panel stretching to match a taller neighbour. */}
      {(canComplaints || canLeads || canOrders) && (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {canComplaints && (
            <Card title="Complaints by stage">
              {complaintStatusQueries.some((q) => q.isError) ? (
                <p className="text-sm text-rose-600">Could not load complaint stats.</p>
              ) : (
                <PipelineBar
                  loading={complaintsLoading}
                  total={complaintsTotal}
                  emptyLabel="No complaints logged yet."
                  linkTo={() => '/dashboard/complaints'}
                  stages={COMPLAINT_STATUSES.map((status) => ({
                    key: status,
                    label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
                    count: complaintCounts.find((c) => c.status === status)?.count ?? 0,
                  }))}
                />
              )}
            </Card>
          )}

          {canLeads && (
            <Card title="Leads by stage">
              {leadStatusQueries.some((q) => q.isError) ? (
                <p className="text-sm text-rose-600">Could not load lead stats.</p>
              ) : (
                <PipelineBar
                  loading={leadsLoading}
                  total={leadsTotal}
                  emptyLabel="No leads yet."
                  linkTo={() => '/dashboard/leads'}
                  stages={LEAD_STATUSES.map<PipelineStage>((status) => ({
                    key: status,
                    label: LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
                    count: leadCounts.find((c) => c.status === status)?.count ?? 0,
                    terminal: LEAD_TERMINAL.includes(status),
                  }))}
                />
              )}
            </Card>
          )}

          {canOrders && (
            <Card title="Orders in production">
              {orderStatusQueries.some((q) => q.isError) ? (
                <p className="text-sm text-rose-600">Could not load order stats.</p>
              ) : (
                <PipelineBar
                  loading={ordersLoading}
                  total={ordersTotal}
                  emptyLabel="No orders in production."
                  linkTo={() => '/dashboard/orders'}
                  stages={ORDER_STATUSES.map((status) => ({
                    key: status,
                    label: ORDER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status,
                    count: orderCounts.find((c) => c.status === status)?.count ?? 0,
                  }))}
                />
              )}
            </Card>
          )}

        </div>
      )}

      {/* The trend needs width to be readable; the ranked list does not. 2:1 rather than 1:1. */}
      {canExpenses && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card title="Expense spend by month" className="lg:col-span-2">
            {expenses.isError ? (
              <p className="text-sm text-rose-600">Could not load expense analytics.</p>
            ) : (
              <TrendColumns
                data={trend}
                loading={expenses.isLoading}
                emptyLabel="No expenses recorded yet."
              />
            )}
          </Card>

          <Card title="Where it goes">
            {expenses.isError ? (
              <p className="text-sm text-rose-600">Could not load expense categories.</p>
            ) : (
              <CategoryBars
                data={categories}
                loading={expenses.isLoading}
                emptyLabel="No categorised spend yet."
              />
            )}
          </Card>
        </div>
      )}

      {(canComplaints || canLeads) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canComplaints && (
            <Card title="Latest complaints">
              {complaintsRecent.isError ? (
                <p className="text-sm text-rose-600">Failed to load complaints.</p>
              ) : complaintsRecent.isLoading ? (
                <ul className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-50" />
                  ))}
                </ul>
              ) : recentComplaints.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Nothing logged yet. New complaints will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentComplaints.map((c) => (
                    <li key={c._id}>
                      <Link
                        to="/dashboard/complaints"
                        className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
                      >
                        <span className="min-w-0 flex-1">
                          {c.ticketId ? (
                            <span className="block font-mono text-[11px] font-semibold text-indigo-600">
                              {c.ticketId}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block truncate text-sm font-medium text-slate-800">
                            {c.subject}
                          </span>
                        </span>
                        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">
                          {formatShortDate(c.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Link
                  to="/dashboard/complaints"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  All complaints →
                </Link>
              </div>
            </Card>
          )}

          {canLeads && (
            <Card title="Latest leads">
              {leadsRecent.isError ? (
                <p className="text-sm text-rose-600">Failed to load leads.</p>
              ) : leadsRecent.isLoading ? (
                <ul className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-12 animate-pulse rounded-lg bg-slate-50" />
                  ))}
                </ul>
              ) : recentLeads.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No leads yet. Imported and manual leads will appear here.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentLeads.map((l) => (
                    <li key={l._id}>
                      <Link
                        to="/dashboard/leads"
                        className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {l.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {l.phone}
                            {l.company ? ` · ${l.company}` : ''}
                          </span>
                        </span>
                        <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-400">
                          {formatShortDate(l.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <Link
                  to="/dashboard/leads"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  All leads →
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
