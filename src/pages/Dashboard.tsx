import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '../api/auth';
import {
  listComplaintsApi,
  complaintsListKey,
  useComplaintsList,
} from '../api/complaints';
import { listLeadsApi, leadsListKey, useLeadsList } from '../api/leads';
import { listTaxInvoicesApi, taxInvoicesListKey } from '../api/taxInvoices';
import { useUsersList } from '../api/users';
import { Card } from '../components/Card';
import { canAccessModule } from '../config/roles';
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
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${accent ?? ''}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
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

  const complaintsRecent = useComplaintsList({ page: 1, limit: 5 }, { enabled: canComplaints });
  const leadsRecent = useLeadsList({ page: 1, limit: 5 }, { enabled: canLeads });
  const usersList = useUsersList({ enabled: canUsers });

  const invoicesCountQuery = useQuery({
    queryKey: taxInvoicesListKey({ page: 1, limit: 1 }),
    queryFn: () => listTaxInvoicesApi({ page: 1, limit: 1 }),
    enabled: canInvoices,
    staleTime: 30_000,
  });

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
  const invoicesLoading = canInvoices && invoicesCountQuery.isLoading;

  const recentComplaints: Complaint[] = complaintsRecent.data?.data ?? [];
  const recentLeads: Lead[] = leadsRecent.data?.data ?? [];
  const userCount = usersList.data?.data?.length ?? 0;
  const invoicesTotal = invoicesCountQuery.data?.pagination?.total ?? 0;

  const hasAnyModule =
    canComplaints || canLeads || canUsers || canInvoices || canRoles;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          {meLoading ? (
            'Loading…'
          ) : user?.fullName ? (
            <>
              Welcome back, <span className="font-medium text-slate-800">{user.fullName}</span>.
              Here’s a snapshot of complaints, leads, invoices, and team activity.
            </>
          ) : (
            'Welcome to Quasmo CRM. Here’s a snapshot of your workspace.'
          )}
        </p>
      </div>

      {hasAnyModule && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {canComplaints && (
            <StatTile
              label="Total complaints"
              value={complaintsLoading ? '…' : complaintsTotal}
              sub="All statuses"
              accent="border-l-4 border-l-indigo-500"
            />
          )}
          {canLeads && (
            <StatTile
              label="Total leads"
              value={leadsLoading ? '…' : leadsTotal}
              sub="Pipeline"
              accent="border-l-4 border-l-sky-500"
            />
          )}
          {canUsers && (
            <StatTile
              label="Team users"
              value={usersList.isLoading ? '…' : userCount}
              sub="Registered accounts"
              accent="border-l-4 border-l-emerald-500"
            />
          )}
          {canInvoices && (
            <StatTile
              label="Tax documents"
              value={invoicesLoading ? '…' : invoicesTotal}
              sub="Invoices, proformas & quotes"
              accent="border-l-4 border-l-violet-500"
            />
          )}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:col-span-2 xl:col-span-2">
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
