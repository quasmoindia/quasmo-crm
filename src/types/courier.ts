export interface Courier {
  _id: string;
  name: string;
  contactNumber?: string;
  contactEmail?: string;
  trackingUrlPrefix?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourierPayload {
  name: string;
  contactNumber?: string;
  contactEmail?: string;
  trackingUrlPrefix?: string;
  isActive?: boolean;
}
