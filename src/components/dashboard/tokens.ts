/**
 * Dashboard chart tokens.
 *
 * The pipeline ramp is an ORDINAL scale — complaint statuses, lead stages and order
 * stages all encode position in a sequence, so the colour has to carry the order.
 * One hue, monotone lightness, light end clearing the white surface.
 *
 * Validated with the dataviz palette checker against surface #ffffff:
 *   monotone L: PASS · adjacent ΔL >= 0.06: PASS · light-end contrast 2.98:1: PASS · single hue (2° spread): PASS
 *
 * Do not insert a fifth step — indigo-600 sits only 0.054 ΔL from indigo-700 and fails
 * the adjacent-step gate. Four stages is the cap, which every pipeline in this app fits.
 */
export const PIPELINE_RAMP = ['#818cf8', '#6366f1', '#4338ca', '#312e81'] as const;

/** Terminal / dropped-out stage. Deliberately outside the ramp — "lost" is not a later stage. */
export const PIPELINE_TERMINAL = '#94a3b8';

/** Single-series charts. One hue, no legend — the title names the series. */
export const SERIES_HUE = '#4338ca';

/**
 * Reserved status scale. Never reused as a categorical series colour, and never the sole
 * encoding — every use ships with an icon and a text label.
 */
export const STATUS = {
  critical: { fg: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  serious: { fg: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
  warning: { fg: '#a16207', bg: '#fefce8', border: '#fde68a' },
  good: { fg: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
} as const;

export type StatusTone = keyof typeof STATUS;

/** Compact INR. Indian numbering — lakh and crore, not K/M. */
export function formatInrCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `₹${(amount / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `₹${Math.round(amount)}`;
}

export function formatInrFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}
