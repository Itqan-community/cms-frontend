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

/** A permission with its name in the request's language. */
export interface PermissionOut {
  code_name: string;
  name: string;
}

/** A permission in the role editor's catalogue, with every permission it brings along. */
export interface CataloguePermissionOut extends PermissionOut {
  implies: string[];
}

/** Permissions grouped by usage (reciters, members, …), named in the request's language. */
export interface PermissionGroupOut {
  key: string;
  name: string;
  permissions: CataloguePermissionOut[];
}

export interface GroupDetailOut extends GroupListOut {
  permissions: PermissionOut[];
}

/** Both names are required when creating or renaming a role. */
export interface GroupNamesIn {
  name_en: string;
  name_ar: string;
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
