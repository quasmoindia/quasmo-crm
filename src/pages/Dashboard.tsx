import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiTrendingUp,
  FiClock,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useCurrentUser } from '../api/auth';
import {
  listComplaintsApi,
  complaintsListKey,
  useComplaintsList,
} from '../api/complaints';
import { listLeadsApi, leadsListKey, useLeadsList } from '../api/leads';
import { Card } from '../components/Card';
import { canAccessModule } from '../config/roles';
import { useAttendanceDashboard } from '../api/attendance';
import type { ComplaintStatus } from '../types/complaint';
import { STATUS_OPTIONS } from '../types/complaint';
import type { LeadStatus } from '../types/lead';
import { LEAD_STATUS_OPTIONS } from '../types/lead';
import type { Complaint } from '../types/complaint';
import type { Lead } from '../types/lead';

const COMPLAINT_STATUSES: ComplaintStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
const LEAD_STATUSES: LeadStatus[] = LEAD_STATUS_OPTIONS.map((o) => o.value);

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'indigo',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: IconType;
  tone?: 'indigo' | 'green' | 'violet' | 'orange' | 'blue' | 'rose';
}) {
  const toneClass: Record<NonNullable<typeof tone>, string> = {
    indigo: 'bg-indigo-600/10 text-indigo-600',
    green: 'bg-emerald-500/10 text-emerald-600',
    violet: 'bg-violet-500/10 text-violet-600',
    orange: 'bg-orange-500/10 text-orange-600',
    blue: 'bg-sky-500/10 text-sky-600',
    rose: 'bg-rose-500/10 text-rose-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-10 ${toneClass[tone]}`}>
          <Icon className="size-4 sm:size-5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-slate-900 sm:text-4xl">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
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

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceDashboard(canAttendance);

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

  const complaintsTotal = complaintStatusQueries.reduce(
    (sum, q) => sum + (q.data?.pagination?.total ?? 0),
    0
  );
  const leadsTotal = leadStatusQueries.reduce((sum, q) => sum + (q.data?.pagination?.total ?? 0), 0);

  const complaintsLoading =
    canComplaints && (complaintsRecent.isLoading || complaintStatusQueries.some((q) => q.isLoading));
  const leadsLoading = canLeads && (leadsRecent.isLoading || leadStatusQueries.some((q) => q.isLoading));

  const recentComplaints: Complaint[] = complaintsRecent.data?.data ?? [];
  const recentLeads: Lead[] = leadsRecent.data?.data ?? [];

  const hasAnyModule =
    canComplaints || canLeads || canUsers || canInvoices || canRoles || canAttendance;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl xl:text-5xl">
          Admin Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 sm:mt-2 sm:text-base">
          {meLoading ? (
            'Loading…'
          ) : user?.fullName ? (
            <>
              Comprehensive business overview for <span className="font-medium text-slate-800">{user.fullName}</span>.
            </>
          ) : (
            'Comprehensive business overview and analytics.'
          )}
        </p>
      </div>

      {hasAnyModule && (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          {canComplaints && (
            <StatTile
              label="Service requests"
              value={complaintsLoading ? '…' : complaintsTotal}
              sub="Open, in-progress, resolved"
              icon={FiAlertCircle}
              tone="violet"
            />
          )}
          {canLeads && (
            <StatTile
              label="Active leads"
              value={leadsLoading ? '…' : leadsTotal}
              sub="+ new this week"
              icon={FiTrendingUp}
              tone="green"
            />
          )}
          {canAttendance && (
            <StatTile
              label="Present today"
              value={attendanceLoading ? '…' : (attendanceData?.stats.present ?? 0)}
              sub={`${attendanceData?.stats.absent ?? 0} absent · ${attendanceData?.workDate ?? 'today'}`}
              icon={FiClock}
              tone="blue"
            />
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:col-span-2 xl:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quick links</p>
            <ul className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
              {canComplaints && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/complaints">
                    Complaint management →
                  </Link>
                </li>
              )}
              {canLeads && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/leads">
                    Lead management →
                  </Link>
                </li>
              )}
              {canInvoices && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/invoices">
                    Tax invoices →
                  </Link>
                </li>
              )}
              {canUsers && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/users">
                    User management →
                  </Link>
                </li>
              )}
              {canRoles && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/roles">
                    Role management →
                  </Link>
                </li>
              )}
              {canAttendance && (
                <li>
                  <Link className="text-indigo-600 hover:text-indigo-800 hover:underline" to="/dashboard/attendance">
                    Employee attendance →
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {!hasAnyModule && (
        <Card>
          <p className="text-slate-600">
            Your role can access this dashboard only. Ask an administrator if you need access to complaints, leads, tax
            invoices, users, or roles.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canComplaints && (
          <Card title="Complaints by status">
            {complaintStatusQueries.some((q) => q.isError) ? (
              <p className="text-sm text-red-600">Could not load complaint stats.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {COMPLAINT_STATUSES.map((status, i) => {
                  const q = complaintStatusQueries[i];
                  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
                  const n = q?.data?.pagination?.total ?? 0;
                  return (
                    <div
                      key={status}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center"
                    >
                      <p className="text-lg font-semibold tabular-nums text-slate-900">
                        {q?.isLoading ? '…' : n}
                      </p>
                      <p className="text-xs text-slate-600">{label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {canLeads && (
          <Card title="Leads by stage">
            {leadStatusQueries.some((q) => q.isError) ? (
              <p className="text-sm text-red-600">Could not load lead stats.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LEAD_STATUSES.map((status, i) => {
                  const q = leadStatusQueries[i];
                  const label = LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
                  const n = q?.data?.pagination?.total ?? 0;
                  return (
                    <div
                      key={status}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center"
                    >
                      <p className="text-lg font-semibold tabular-nums text-slate-900">
                        {q?.isLoading ? '…' : n}
                      </p>
                      <p className="text-xs text-slate-600">{label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canComplaints && (
          <Card title="Recent complaints">
            {complaintsRecent.isError ? (
              <p className="text-sm text-red-600">Failed to load complaints.</p>
            ) : complaintsRecent.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : recentComplaints.length === 0 ? (
              <p className="text-sm text-slate-500">No complaints yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentComplaints.map((c) => (
                  <li key={c._id} className="py-3 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        to="/dashboard/complaints"
                        className="min-w-0 flex-1 hover:opacity-90"
                      >
                        {c.ticketId ? (
                          <p className="font-mono text-xs font-semibold text-indigo-600">{c.ticketId}</p>
                        ) : null}
                        <p className="line-clamp-2 font-medium text-slate-800">{c.subject}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>
                      </Link>
                      <span className="shrink-0 text-xs text-slate-400">{formatShortDate(c.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Link
                to="/dashboard/complaints"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                View all complaints →
              </Link>
            </div>
          </Card>
        )}

        {canLeads && (
          <Card title="Recent leads">
            {leadsRecent.isError ? (
              <p className="text-sm text-red-600">Failed to load leads.</p>
            ) : leadsRecent.isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : recentLeads.length === 0 ? (
              <p className="text-sm text-slate-500">No leads yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentLeads.map((l) => (
                  <li key={l._id} className="flex flex-col gap-0.5 py-3 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        to="/dashboard/leads"
                        className="font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                      >
                        {l.name}
                      </Link>
                      <span className="text-xs text-slate-400">{formatShortDate(l.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {l.phone}
                      {l.company ? ` · ${l.company}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <Link to="/dashboard/leads" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                View all leads →
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
