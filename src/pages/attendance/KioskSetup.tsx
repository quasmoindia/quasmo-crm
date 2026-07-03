import { useEffect, useState } from 'react';
import { setKioskDeviceToken } from '../../api/attendance';

export function KioskSetup() {
  const [status, setStatus] = useState<'working' | 'error'>('working');

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      return;
    }
    setKioskDeviceToken(token);
    window.history.replaceState(null, '', window.location.pathname);
    window.location.href = '/attendance/punch';
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        {status === 'working' ? (
          <>
            <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#305dff]" />
            <p className="text-lg font-semibold text-slate-800">Setting up this device…</p>
          </>
        ) : (
          <p className="text-lg font-semibold text-rose-600">
            This setup link is missing its token. Ask HR to generate a new one.
          </p>
        )}
      </div>
    </div>
  );
}
