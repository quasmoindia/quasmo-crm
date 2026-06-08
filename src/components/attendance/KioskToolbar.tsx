import { useState } from 'react';
import { FiLock, FiMaximize, FiMinimize, FiUnlock } from 'react-icons/fi';
import { Button } from '../Button';
import { Input } from '../Input';
import { getKioskPin, useKioskMode } from '../../hooks/useKioskMode';

type KioskToolbarProps = {
  className?: string;
};

export function KioskToolbar({ className = '' }: KioskToolbarProps) {
  const { fullscreen, locked, hasPin, toggleFullscreen, lock, unlock } = useKioskMode();
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleLockClick = () => {
    setError('');
    setPin('');
    setConfirmPin('');
    if (hasPin) {
      lock(getKioskPin()!);
    } else {
      setShowLockSetup(true);
    }
  };

  const submitLockSetup = () => {
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    lock(pin);
    setShowLockSetup(false);
    setPin('');
    setConfirmPin('');
  };

  const submitUnlock = () => {
    if (unlock(pin)) {
      setShowUnlock(false);
      setPin('');
      setError('');
    } else {
      setError('Wrong PIN. Try again.');
    }
  };

  if (locked) {
    return (
      <>
        <button
          type="button"
          onClick={() => { setShowUnlock(true); setPin(''); setError(''); }}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-slate-800/90 px-4 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
          title="Supervisor unlock"
        >
          <FiUnlock className="size-5" />
          Unlock
        </button>
        {showUnlock && (
          <KioskPinModal
            title="Unlock screen"
            subtitle="Enter supervisor PIN"
            pin={pin}
            onPinChange={setPin}
            error={error}
            onSubmit={submitUnlock}
            onClose={() => setShowUnlock(false)}
            submitLabel="Unlock"
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap items-center justify-end gap-2 ${className}`}>
        <Button type="button" variant="outline" onClick={() => void toggleFullscreen()}>
          {fullscreen ? <FiMinimize className="size-4" /> : <FiMaximize className="size-4" />}
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </Button>
        <Button type="button" variant="outline" onClick={handleLockClick}>
          <FiLock className="size-4" />
          Lock screen
        </Button>
      </div>

      {showLockSetup && (
        <KioskPinModal
          title="Set supervisor PIN"
          subtitle="Create a 4-digit PIN to unlock this screen later"
          pin={pin}
          onPinChange={setPin}
          confirmPin={confirmPin}
          onConfirmPinChange={setConfirmPin}
          error={error}
          onSubmit={submitLockSetup}
          onClose={() => setShowLockSetup(false)}
          submitLabel="Lock now"
        />
      )}
    </>
  );
}

function KioskPinModal({
  title,
  subtitle,
  pin,
  onPinChange,
  confirmPin,
  onConfirmPinChange,
  error,
  onSubmit,
  onClose,
  submitLabel,
}: {
  title: string;
  subtitle: string;
  pin: string;
  onPinChange: (v: string) => void;
  confirmPin?: string;
  onConfirmPinChange?: (v: string) => void;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-4 space-y-3">
          <Input
            label="PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            autoComplete="off"
          />
          {onConfirmPinChange && (
            <Input
              label="Confirm PIN"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin ?? ''}
              onChange={(e) => onConfirmPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              autoComplete="off"
            />
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="button" fullWidth onClick={onSubmit}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  );
}
