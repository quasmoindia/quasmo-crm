import { FiGlobe, FiMapPin, FiPackage, FiPhone, FiMail, FiUser } from 'react-icons/fi';
import type { Lead, LeadSource } from '../../types/lead';
import {
  LEAD_SOURCE_STYLES,
  getLeadSourceLabel,
  resolveLeadSource,
} from '../../types/lead';
import { QUERY_TYPE_LABELS } from '../../types/indiaMartLead';

export function leadInquiryTypeLabel(queryType: string | undefined): string | null {
  if (!queryType?.trim()) return null;
  return QUERY_TYPE_LABELS[queryType] ?? queryType;
}

export function leadProductLine(lead: Lead): string | null {
  const product = lead.inquiryMeta?.product?.trim();
  if (product) return product;
  const subject = lead.inquiryMeta?.subject?.trim();
  if (subject) return subject;
  return lead.company?.trim() || null;
}

export function leadLocationLine(lead: Lead): string | null {
  const meta = lead.inquiryMeta;
  const fromMeta = [meta?.city, meta?.state, meta?.pincode].filter(Boolean).join(', ');
  if (fromMeta) return fromMeta;
  const addr = lead.address?.trim();
  if (!addr) return null;
  const firstLine = addr.split('\n')[0]?.trim();
  return firstLine && firstLine.length <= 80 ? firstLine : addr.slice(0, 80);
}

export function LeadSourceBadge({
  source,
  size = 'sm',
  showDot = true,
}: {
  source: LeadSource | undefined;
  size?: 'sm' | 'md';
  showDot?: boolean;
}) {
  if (!source) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-slate-50 font-medium text-slate-500 ring-1 ring-slate-200/80 ${
          size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
        }`}
      >
        Not set
      </span>
    );
  }

  const style = LEAD_SOURCE_STYLES[source] ?? LEAD_SOURCE_STYLES.other;
  const label = getLeadSourceLabel(source);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${style} ${
        size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {showDot ? (
        <span
          className={`size-1.5 shrink-0 rounded-full bg-current opacity-70 ${size === 'md' ? 'size-2' : ''}`}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}

export function LeadInquiryTypeBadge({ queryType }: { queryType?: string }) {
  const label = leadInquiryTypeLabel(queryType);
  if (!label) return null;
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
      {label}
    </span>
  );
}

export function LeadSourceCell({ lead }: { lead: Lead }) {
  const source = resolveLeadSource(lead);
  return (
    <div className="space-y-1.5">
      <LeadSourceBadge source={source} />
      {source === 'indiamart' && lead.inquiryMeta?.queryType ? (
        <LeadInquiryTypeBadge queryType={lead.inquiryMeta.queryType} />
      ) : null}
      {lead.externalId ? (
        <p className="font-mono text-[10px] text-slate-400" title="External inquiry ID">
          #{lead.externalId.slice(-8)}
        </p>
      ) : null}
    </div>
  );
}

export function LeadContactCell({ lead }: { lead: Lead }) {
  return (
    <div className="min-w-[10rem] space-y-1">
      <p className="font-semibold text-slate-900">{lead.name}</p>
      {lead.phone ? (
        <p className="flex items-center gap-1.5 text-sm text-slate-600">
          <FiPhone className="size-3.5 shrink-0 text-slate-400" aria-hidden />
          {lead.phone}
        </p>
      ) : null}
      {lead.email ? (
        <p className="flex items-center gap-1.5 truncate text-sm text-slate-600" title={lead.email}>
          <FiMail className="size-3.5 shrink-0 text-slate-400" aria-hidden />
          <span className="truncate">{lead.email}</span>
        </p>
      ) : null}
    </div>
  );
}

export function LeadInterestCell({ lead }: { lead: Lead }) {
  const product = leadProductLine(lead);
  const location = leadLocationLine(lead);
  const mcat = lead.inquiryMeta?.mcat?.trim();

  if (!product && !location && !mcat && !lead.gstNumber) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className="max-w-[min(100%,18rem)] space-y-1.5">
      {product ? (
        <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-slate-800">
          <FiPackage className="mt-0.5 size-3.5 shrink-0 text-indigo-500" aria-hidden />
          <span className="line-clamp-2" title={product}>
            {product}
          </span>
        </p>
      ) : null}
      {mcat ? <p className="text-xs text-slate-500">{mcat}</p> : null}
      {location ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <FiMapPin className="size-3 shrink-0 text-slate-400" aria-hidden />
          <span className="line-clamp-1" title={location}>
            {location}
          </span>
        </p>
      ) : null}
      {lead.gstNumber ? (
        <p className="font-mono text-[11px] text-slate-400">GST {lead.gstNumber}</p>
      ) : null}
    </div>
  );
}

export function LeadKanbanMeta({ lead }: { lead: Lead }) {
  const source = resolveLeadSource(lead);
  const product = leadProductLine(lead);
  const location = leadLocationLine(lead);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <LeadSourceBadge source={source} />
        {lead.inquiryMeta?.queryType ? (
          <LeadInquiryTypeBadge queryType={lead.inquiryMeta.queryType} />
        ) : null}
      </div>
      {product ? (
        <p className="mb-1.5 flex items-start gap-1 text-xs font-medium leading-snug text-slate-700">
          <FiPackage className="mt-0.5 size-3 shrink-0 text-indigo-500" aria-hidden />
          <span className="line-clamp-2">{product}</span>
        </p>
      ) : null}
      {location ? (
        <p className="mb-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <FiMapPin className="size-3 shrink-0 text-slate-400" aria-hidden />
          <span className="line-clamp-1">{location}</span>
        </p>
      ) : null}
    </>
  );
}

export function LeadOriginPanel({ lead }: { lead: Lead }) {
  const source = resolveLeadSource(lead);
  const meta = lead.inquiryMeta;
  const hasInquiry =
    source === 'indiamart' &&
    (meta?.product ||
      meta?.subject ||
      meta?.queryTime ||
      meta?.queryType ||
      meta?.mcat ||
      meta?.catalog ||
      lead.externalId);

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-indigo-50/30 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <FiGlobe className="size-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Lead source</h3>
            <p className="text-xs text-slate-500">Where this lead came from</p>
          </div>
        </div>
        <LeadSourceBadge source={source} size="md" />
      </div>

      {hasInquiry ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          {lead.externalId ? (
            <div className="rounded-xl border border-orange-100 bg-orange-50/50 px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-orange-800/70">
                IndiaMART inquiry ID
              </dt>
              <dd className="mt-0.5 font-mono text-sm text-orange-950">{lead.externalId}</dd>
            </div>
          ) : null}
          {meta?.queryType ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Inquiry type</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {leadInquiryTypeLabel(meta.queryType) ?? meta.queryType}
              </dd>
            </div>
          ) : null}
          {meta?.queryTime ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Inquiry time</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{meta.queryTime}</dd>
            </div>
          ) : null}
          {meta?.product ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Product interest</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">{meta.product}</dd>
            </div>
          ) : null}
          {meta?.subject && meta.subject !== meta?.product ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Subject</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{meta.subject}</dd>
            </div>
          ) : null}
          {meta?.mcat ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Category</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{meta.mcat}</dd>
            </div>
          ) : null}
          {[meta?.city, meta?.state, meta?.pincode].some(Boolean) ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Buyer location</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {[meta?.city, meta?.state, meta?.pincode].filter(Boolean).join(', ')}
              </dd>
            </div>
          ) : null}
          {meta?.catalog ? (
            <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:col-span-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Catalog</dt>
              <dd className="mt-0.5 truncate text-sm text-indigo-700">
                <a href={meta.catalog} target="_blank" rel="noreferrer" className="hover:underline">
                  {meta.catalog}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-slate-600">
          {source
            ? `This lead was added via ${getLeadSourceLabel(source)}.`
            : 'No source recorded for this lead.'}
        </p>
      )}
    </section>
  );
}

export function LeadDetailHeader({ lead }: { lead: Lead }) {
  const source = resolveLeadSource(lead);
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h3 className="text-xl font-bold tracking-tight text-slate-900">{lead.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <LeadSourceBadge source={source} size="md" />
          {lead.inquiryMeta?.queryType ? (
            <LeadInquiryTypeBadge queryType={lead.inquiryMeta.queryType} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LeadDetailContactGrid({ lead }: { lead: Lead }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {lead.phone ? (
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
          <FiPhone className="mt-0.5 size-4 text-indigo-500" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Phone</p>
            <p className="text-sm font-medium text-slate-900">{lead.phone}</p>
          </div>
        </div>
      ) : null}
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
        <FiMail className="mt-0.5 size-4 text-indigo-500" aria-hidden />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
          <p className="text-sm font-medium text-slate-900">{lead.email || '—'}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:col-span-2">
        <FiUser className="mt-0.5 size-4 text-indigo-500" aria-hidden />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Assigned to</p>
          <p className="text-sm font-medium text-slate-900">
            {typeof lead.assignedTo === 'object' && lead.assignedTo?.fullName
              ? lead.assignedTo.fullName
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeadSourceSummaryBar({ leads }: { leads: Lead[] }) {
  const counts = leads.reduce<Partial<Record<LeadSource, number>>>((acc, lead) => {
    const source = resolveLeadSource(lead);
    if (source) acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  const entries = (Object.entries(counts) as [LeadSource, number][]).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">By source</span>
      {entries.map(([source, count]) => (
        <span
          key={source}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${LEAD_SOURCE_STYLES[source]}`}
        >
          {getLeadSourceLabel(source)}
          <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
        </span>
      ))}
    </div>
  );
}
