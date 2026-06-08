import { useCallback, useEffect, useState } from 'react';

const KIOSK_PIN_KEY = 'attendanceKioskPin';
const KIOSK_LOCKED_KEY = 'attendanceKioskLocked';
const KIOSK_EVENT = 'attendance-kiosk-change';

function isFullscreenActive() {
  return Boolean(document.fullscreenElement);
}

function notifyKioskChange() {
  window.dispatchEvent(new Event(KIOSK_EVENT));
}

export function getKioskPin(): string | null {
  return localStorage.getItem(KIOSK_PIN_KEY);
}

export function setKioskPin(pin: string) {
  localStorage.setItem(KIOSK_PIN_KEY, pin);
}

export function isKioskLocked(): boolean {
  return sessionStorage.getItem(KIOSK_LOCKED_KEY) === '1';
}

export function setKioskLocked(locked: boolean) {
  if (locked) sessionStorage.setItem(KIOSK_LOCKED_KEY, '1');
  else sessionStorage.removeItem(KIOSK_LOCKED_KEY);
  notifyKioskChange();
}

export function useKioskMode() {
  const [fullscreen, setFullscreen] = useState(isFullscreenActive);
  const [locked, setLocked] = useState(isKioskLocked);
  const [hasPin, setHasPin] = useState(Boolean(getKioskPin()));

  useEffect(() => {
    const sync = () => {
      setLocked(isKioskLocked());
      setHasPin(Boolean(getKioskPin()));
    };
    const onChange = () => setFullscreen(isFullscreenActive());
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener(KIOSK_EVENT, sync);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener(KIOSK_EVENT, sync);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser may block without user gesture — ignore
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // ignore
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreenActive()) await exitFullscreen();
    else await enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  const lock = useCallback((pin: string) => {
    setKioskPin(pin);
    setKioskLocked(true);
    setLocked(true);
    setHasPin(true);
    void enterFullscreen();
  }, [enterFullscreen]);

  const unlock = useCallback((pin: string) => {
    const saved = getKioskPin();
    if (!saved || saved !== pin) return false;
    setKioskLocked(false);
    setLocked(false);
    return true;
  }, []);

  return {
    fullscreen,
    locked,
    hasPin,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    lock,
    unlock,
  };
}
