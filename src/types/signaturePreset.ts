export type SignaturePresetSlot = 'stamp' | 'signature' | 'digitalSignature';

export interface SignaturePreset {
  _id: string;
  label: string;
  issuerStampUrl?: string;
  issuerSignatureUrl?: string;
  issuerDigitalSignatureUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SignaturePresetsListResponse {
  data: SignaturePreset[];
}
