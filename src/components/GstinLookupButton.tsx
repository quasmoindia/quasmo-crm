import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Button } from './Button';
import { lookupGstinApi, type GstinLookupResponse } from '../api/leads';

export type { GstinLookupResponse };

export function GstinLookupButton({
  gstin,
  disabled,
  onSuccess,
  fullWidthOnMobile,
}: {
  gstin: string;
  disabled?: boolean;
  onSuccess: (d: GstinLookupResponse) => void;
  /** Stack full width on small screens (e.g. beside GST in a row on `sm+`) */
  fullWidthOnMobile?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className={`flex min-h-[42px] flex-col justify-end gap-1.5 ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''}`}>
      <Button
        type="button"
        variant="outline"
        className={`inline-flex items-center justify-center gap-1.5 border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50 ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''}`}
        disabled={disabled || loading}
        onClick={() => {
          void (async () => {
            setErr(null);
            setLoading(true);
            try {
              const data = await lookupGstinApi(gstin);
              onSuccess(data);
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setLoading(false);
            }
          })();
        }}
      >
        <FiSearch className="size-4 shrink-0 text-indigo-600" aria-hidden />
        <span className="hidden sm:inline">{loading ? 'Looking up…' : 'Look up from GSTIN'}</span>
        <span className="sm:hidden">{loading ? '…' : 'GST look up'}</span>
      </Button>
      {err && <p className="text-xs leading-snug text-red-600">{err}</p>}
    </div>
  );
}
