import { useCallback, useEffect, useState } from 'react';

export type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function useAttendanceGeolocation(maxGpsAccuracyMeters?: number, watch = true) {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const poorAccuracy =
    coords != null &&
    maxGpsAccuracyMeters != null &&
    maxGpsAccuracyMeters > 0 &&
    coords.accuracy > maxGpsAccuracyMeters;

  const captureOnce = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setError('Unable to get GPS location. Enable location access and try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!watch) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    const onPosition = (pos: GeolocationPosition) => {
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setError(null);
    };
    const onError = () => {
      setError('Unable to get GPS location. Enable location access and try again.');
    };
    const options: PositionOptions = { enableHighAccuracy: true, maximumAge: 10000 };
    navigator.geolocation.getCurrentPosition(onPosition, onError, { ...options, timeout: 20000 });
    const watchId = navigator.geolocation.watchPosition(onPosition, onError, options);
    return () => navigator.geolocation.clearWatch(watchId);
  }, [watch]);

  return {
    coords,
    error,
    locating,
    poorAccuracy,
    maxGpsAccuracyMeters,
    captureOnce,
    accuracyLabel:
      coords != null
        ? `${Math.round(coords.accuracy)}m${poorAccuracy ? ' (above limit)' : ''}`
        : '—',
  };
}
