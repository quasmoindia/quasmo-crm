export interface BankAccount {
  _id: string;
  label: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  branch: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankAccountsListResponse {
  data: BankAccount[];
}
