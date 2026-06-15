export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';
export type IntendedUse = 'commercial' | 'non-commercial';

export interface DeveloperRef {
  id: number;
  name: string;
  email: string;
}

export interface AssetRef {
  id: number;
  name: string;
  publisher_id: number;
}

export interface UserRef {
  id: number;
  name: string;
}

export interface AccessRequestOut {
  id: number;
  status: AccessRequestStatus;
  developer: DeveloperRef;
  asset: AssetRef;
  intended_use: IntendedUse;
  developer_access_reason: string;
  created_at: string;
}

export interface AccessRequestDetailOut extends AccessRequestOut {
  approved_at: string | null;
  approved_by: UserRef | null;
  rejected_at: string | null;
  rejected_by: UserRef | null;
  rejection_reason: string | null;
}

export interface PagedAccessRequestOut {
  results: AccessRequestOut[];
  count: number;
}

export interface AccessRequestListFilters {
  page: number;
  page_size: number;
  ordering?: string;
  status?: AccessRequestStatus;
  search?: string;
}

export interface AccessRequestUiFilters {
  search?: string;
  status?: AccessRequestStatus;
}

export interface RejectAccessRequestIn {
  rejection_reason: string;
}

export interface AutoAcceptanceOut {
  publisher_id: number;
  auto_accept_access_requests: boolean;
}

export interface AutoAcceptanceIn {
  auto_accept_access_requests: boolean;
}
