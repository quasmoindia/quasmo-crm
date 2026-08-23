import { FiTablet } from 'react-icons/fi';
import { Button } from '../Button';
import { Card } from '../Card';

type KioskPairingRequiredProps = {
  onRetry?: () => void;
};

export function KioskPairingRequired({ onRetry }: KioskPairingRequiredProps) {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
          <FiTablet className="size-8" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Kiosk not paired</h1>
        <p className="mt-2 text-sm text-slate-600">
          This tablet is set up for shared kiosk punch, but it is not linked to a kiosk device yet. OTP
          login is only for employees on their personal phones — not for gate tablets.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-slate-900">How to fix (HR / admin)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            In Hexa CRM go to <strong>Attendance → Settings → Kiosk devices</strong> (or create a device
            there).
          </li>
          <li>Create or regenerate a device and copy the <strong>setup link</strong>.</li>
          <li>Open that link <strong>on this tablet</strong> (one time). It pairs the device automatically.</li>
          <li>
            Bookmark this page after setup:{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/attendance/punch?kiosk=1</code>
          </li>
        </ol>
        <p className="text-xs text-slate-500">
          If the device was revoked or browser data was cleared, generate a new setup link and open it
          again on this tablet.
        </p>
        {onRetry ? (
          <Button variant="outline" fullWidth onClick={onRetry}>
            I completed setup — check again
          </Button>
        ) : null}
      </Card>

      <Card className="border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-800">Employee on a personal phone?</strong> Use{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">/attendance/punch</code> without{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">?kiosk=1</code> — that flow uses OTP
          to verify identity.
        </p>
      </Card>
    </div>
  );
}
