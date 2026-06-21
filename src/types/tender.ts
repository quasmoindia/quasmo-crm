export interface Tender {
  _id: string;
  tenderNo: string;
  location?: string;
  department?: string;
  modelNumber?: string;
  itemQuoted?: string;
  priceQuoted?: number;
  createdBy?: { _id: string; fullName: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenderPayload {
  tenderNo: string;
  location?: string;
  department?: string;
  modelNumber?: string;
  itemQuoted?: string;
  priceQuoted: number;
}

export interface TendersListResponse {
  data: Tender[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
