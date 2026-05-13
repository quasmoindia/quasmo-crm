import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Light-weight localStorage-backed form draft.
 *
 * Usage:
 *   const { restoredAt, clear } = useDraftPersister({
 *     key: `lead-create-draft:${userId ?? 'anon'}`,
 *     enabled: true,           // false disables read+write (e.g. edit mode)
 *     snapshot: currentForm,   // object that JSON-serializes safely
 *     onRestore: (data) => setForm(data),
 *   });
 *
 * Lifecycle:
 *   - Hydrates once on mount when `enabled === true` and a stored draft is present.
 *   - Debounced (default 400ms) persist on every snapshot change after hydration.
 *   - Skips the very first write if the snapshot still equals the initial value
 *     AND nothing was restored, so empty modals don't pollute storage.
 *   - `clear()` removes the draft from storage (does NOT reset form state).
 */

const DRAFT_VERSION = 1;

interface DraftEnvelope<T> {
  v: number;
  savedAt: number;
  data: T;
}

interface UseDraftPersisterArgs<T extends object> {
  key: string;
  enabled: boolean;
  snapshot: T;
  onRestore: (data: T) => void;
  debounceMs?: number;
}

interface UseDraftPersisterResult {
  restoredAt: Date | null;
  clear: () => void;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function useDraftPersister<T extends object>({
  key,
  enabled,
  snapshot,
  onRestore,
  debounceMs = 400,
}: UseDraftPersisterArgs<T>): UseDraftPersisterResult {
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const initialSnapshotRef = useRef<string>(safeStringify(snapshot));
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  /** Latest snapshot ref so the unmount flush below sees the freshest value. */
  const latestSnapshotRef = useRef(snapshot);
  latestSnapshotRef.current = snapshot;
  const cancelledRef = useRef(false);

  // Hydrate exactly once per `enabled` activation.
  useEffect(() => {
    if (!enabled) {
      setHydrated(false);
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftEnvelope<T>;
        if (parsed && parsed.v === DRAFT_VERSION && parsed.data && typeof parsed.data === 'object') {
          onRestoreRef.current(parsed.data);
          if (typeof parsed.savedAt === 'number') {
            setRestoredAt(new Date(parsed.savedAt));
          }
        }
      }
    } catch {
      // ignore corrupt drafts
    }
    setHydrated(true);
  }, [enabled, key]);

  // Debounced persist whenever the snapshot changes after hydration.
  useEffect(() => {
    if (!enabled || !hydrated) return;
    // Skip writing the initial snapshot when nothing was restored: prevents an
    // empty modal that the user never touched from creating a draft.
    if (!restoredAt && safeStringify(snapshot) === initialSnapshotRef.current) return;

    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = {
          v: DRAFT_VERSION,
          savedAt: Date.now(),
          data: snapshot,
        };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // ignore quota / serialization errors silently
      }
    }, debounceMs);

    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [enabled, hydrated, key, snapshot, restoredAt, debounceMs]);

  // Flush any pending debounced write when the component unmounts so closing the
  // modal within the debounce window does not lose the latest typed value.
  useEffect(() => {
    return () => {
      if (cancelledRef.current) return;
      if (!enabled) return;
      const current = safeStringify(latestSnapshotRef.current);
      // Don't flush untouched initial state (avoids creating an "empty" draft).
      if (current === initialSnapshotRef.current && !restoredAt) return;
      try {
        const envelope: DraftEnvelope<T> = {
          v: DRAFT_VERSION,
          savedAt: Date.now(),
          data: latestSnapshotRef.current,
        };
        localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // ignore
      }
    };
  }, [enabled, key, restoredAt]);

  const clear = useCallback(() => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }
    cancelledRef.current = true;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setRestoredAt(null);
    // Reset the cancelled guard on the next tick so subsequent edits resume drafting.
    queueMicrotask(() => {
      cancelledRef.current = false;
      initialSnapshotRef.current = safeStringify(latestSnapshotRef.current);
    });
  }, [key]);

  return { restoredAt, clear };
}

/** Format a Date for the small "Draft restored from …" banner. */
export function formatDraftSavedAt(d: Date | null): string {
  if (!d) return '';
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}
