export interface GroupListOut {
  id: number;
  /** The role's name in the request's language. */
  name: string;
  name_en: string;
  name_ar: string;
}

/** Groups API ordering value that sorts roles by their name in the UI language. */
export function groupNameOrdering(lang: string | undefined): 'name_en' | 'name_ar' {
  return lang === 'ar' ? 'name_ar' : 'name_en';
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
