export interface GroupListOut {
  id: number;
  name: string;
}

export interface PagedGroupListOut {
  results: GroupListOut[];
  count: number;
}

export interface GroupListFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  name?: string;
}
