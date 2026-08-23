import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getKioskDeviceToken } from '../api/attendance';

/** Set when a device was paired; helps detect lost tokens on kiosk tablets. */
export const KIOSK_PAIRED_FLAG_KEY = 'attendanceKioskWasPaired';

export function markKioskDevicePaired() {
  localStorage.setItem(KIOSK_PAIRED_FLAG_KEY, '1');
}

export function clearKioskPairedFlag() {
  localStorage.removeItem(KIOSK_PAIRED_FLAG_KEY);
}

export function kioskPunchHomeUrl() {
  return '/attendance/punch?kiosk=1';
}

/**
 * Distinguishes a paired shared kiosk (no OTP) from the public employee punch page (OTP).
 * A tablet bookmarked to /attendance/punch without ?kiosk=1 and without a stored device token
 * incorrectly falls through to OTP — use ?kiosk=1 or complete kiosk setup first.
 */
export function useKioskPunchMode() {
  const [searchParams] = useSearchParams();
  const [deviceToken, setDeviceToken] = useState(() => getKioskDeviceToken());

  useEffect(() => {
    setDeviceToken(getKioskDeviceToken());
  }, []);

  const isKioskUrl = searchParams.get('kiosk') === '1';
  const isPaired = Boolean(deviceToken);
  const wasPaired = localStorage.getItem(KIOSK_PAIRED_FLAG_KEY) === '1';
  const expectsKiosk = isKioskUrl || isPaired || wasPaired;

  return {
    isPaired,
    expectsKiosk,
    /** Device has a valid kiosk token — use kiosk APIs, skip OTP. */
    isKioskDevice: isPaired,
    /** Kiosk tablet but token missing/revoked — show pairing instructions, not OTP. */
    needsPairing: expectsKiosk && !isPaired,
    refreshPairing: () => setDeviceToken(getKioskDeviceToken()),
  };
}
