export type MemberStatus = 'pending' | 'active';

export interface MemberOut {
  id: number;
  name: string;
  email: string;
  /** Group name returned by the API. */
  role: string;
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
  group_id: number;
}

export interface MemberUpdateIn {
  name?: string;
  group_id?: number;
}

export interface MemberUiFilters {
  search?: string;
  status?: MemberStatus;
}
