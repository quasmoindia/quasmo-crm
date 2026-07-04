import { useState } from 'react';
import { Button } from '../Button';
import { useRequestRegularization } from '../../api/attendance';

type RegularizationRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function RegularizationRequestModal({ open, onClose, onSuccess }: RegularizationRequestModalProps) {
  const requestMutation = useRequestRegularization();
  const [workDate, setWorkDate] = useState(todayDate());
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async () => {
    setError('');
    if (!workDate) {
      setError('Pick the date you want corrected');
      return;
    }
    if (!inTime && !outTime) {
      setError('Enter the punch-in and/or punch-out time you want recorded');
      return;
    }
    if (!reason.trim()) {
      setError('Tell HR why this correction is needed');
      return;
    }
    try {
      await requestMutation.mutateAsync({
        workDate,
        requestedInAt: inTime ? new Date(`${workDate}T${inTime}`).toISOString() : undefined,
        requestedOutAt: outTime ? new Date(`${workDate}T${outTime}`).toISOString() : undefined,
        reason: reason.trim(),
      });
      setWorkDate(todayDate());
      setInTime('');
      setOutTime('');
      setReason('');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Request attendance correction</h3>
        <p className="mt-1 text-sm text-slate-500">
          Tell HR what should have been recorded. They'll review and apply it, or let you know why not.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Date
            <input
              type="date"
              value={workDate}
              max={todayDate()}
              onChange={(e) => setWorkDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Punch-in time
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Punch-out time
              <input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Forgot to punch out before leaving site"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#305dff] focus:outline-none focus:ring-1 focus:ring-[#305dff]"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={requestMutation.isPending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => void submit()} loading={requestMutation.isPending}>
            Submit request
          </Button>
        </div>
      </div>
    </div>
  );
}
