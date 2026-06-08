import { Input } from '../Input';
import { Button } from '../Button';

export type ShippingDetailsValues = {
  shipToName: string;
  shipToPhone: string;
  shipToAddress: string;
  labelCount: string;
};

export const emptyShippingDetails = (): ShippingDetailsValues => ({
  shipToName: '',
  shipToPhone: '',
  shipToAddress: '',
  labelCount: '1',
});

export function shippingDetailsFromSnapshot(snap?: {
  shipToName?: string;
  shipToPhone?: string;
  shipToAddress?: string;
  labelCount?: number;
} | null): ShippingDetailsValues {
  if (!snap) return emptyShippingDetails();
  return {
    shipToName: snap.shipToName ?? '',
    shipToPhone: snap.shipToPhone ?? '',
    shipToAddress: snap.shipToAddress ?? '',
    labelCount: String(snap.labelCount ?? 1),
  };
}

export function hasAnyShippingInput(values: ShippingDetailsValues): boolean {
  return Boolean(
    values.shipToName.trim() ||
      values.shipToPhone.trim() ||
      values.shipToAddress.trim() ||
      (values.labelCount.trim() && values.labelCount.trim() !== '1')
  );
}

/** Returns error message or null if valid. When `required` is false, empty values are allowed. */
export function validateShippingDetails(values: ShippingDetailsValues, required = false): string | null {
  const any = hasAnyShippingInput(values);
  if (!any && !required) return null;
  if (!values.shipToName.trim()) {
    return 'Ship-to name is required when shipping details are provided.';
  }
  const count = Number.parseInt(values.labelCount, 10);
  if (!Number.isFinite(count) || count < 1 || count > 99) {
    return 'Number of labels must be between 1 and 99.';
  }
  return null;
}

export function shippingDetailsToPayload(values: ShippingDetailsValues) {
  return {
    shipToName: values.shipToName.trim(),
    shipToPhone: values.shipToPhone.trim(),
    shipToAddress: values.shipToAddress.trim(),
    labelCount: Number.parseInt(values.labelCount, 10) || 1,
  };
}

type ShippingDetailsFieldsProps = {
  values: ShippingDetailsValues;
  onChange: (field: keyof ShippingDetailsValues, value: string) => void;
  onFillFromCustomer?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function ShippingDetailsFields({
  values,
  onChange,
  onFillFromCustomer,
  disabled,
  compact,
}: ShippingDetailsFieldsProps) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {onFillFromCustomer && (
        <Button type="button" variant="outline" onClick={onFillFromCustomer} disabled={disabled}>
          Use customer address
        </Button>
      )}
      <Input
        label="Ship-to name"
        value={values.shipToName}
        onChange={(e) => onChange('shipToName', e.target.value)}
        placeholder="Recipient name on label"
        disabled={disabled}
      />
      <Input
        label="Phone"
        type="tel"
        value={values.shipToPhone}
        onChange={(e) => onChange('shipToPhone', e.target.value)}
        placeholder="Contact phone for delivery"
        disabled={disabled}
      />
      <div>
        <label htmlFor="ship-to-address-field" className="mb-1 block text-sm font-medium text-slate-700">
          Address
        </label>
        <textarea
          id="ship-to-address-field"
          value={values.shipToAddress}
          onChange={(e) => onChange('shipToAddress', e.target.value)}
          disabled={disabled}
          rows={compact ? 3 : 4}
          placeholder="Street, city, state, PIN…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
        />
      </div>
      <Input
        label="Number of labels"
        type="number"
        min={1}
        max={99}
        value={values.labelCount}
        onChange={(e) => onChange('labelCount', e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-slate-500">
        Optional at order creation. Required ship-to name if you fill any shipping field. Label lines use order items when printed at packing.
      </p>
    </div>
  );
}
