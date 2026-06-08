import { Button } from '../Button';

type PunchConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PunchConfirmModal({
  open,
  title,
  message,
  loading,
  onConfirm,
  onCancel,
}: PunchConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} loading={loading}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
