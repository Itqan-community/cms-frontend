export type MemberRole = 'admin' | 'staff';
export type MemberStatus = 'pending' | 'active';

export interface MemberOut {
  id: number;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  publisher_id: number;
  expires_at: string | null;
  created_at: string;
}

export interface PagedMemberOut {
  results: MemberOut[];
  count: number;
}

export interface MemberListFilters {
  page: number;
  page_size: number;
  publisher_id?: number | null;
  status?: MemberStatus;
  search?: string;
  ordering?: string;
}

export interface MemberInviteIn {
  publisher_id: number;
  name: string;
  email: string;
  role?: MemberRole;
}

export interface MemberUpdateIn {
  name?: string;
  role?: MemberRole;
}

export interface MemberUiFilters {
  search?: string;
  status?: MemberStatus;
}
