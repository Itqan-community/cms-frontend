export interface Publisher {
  id: number;
  name: string;
  slug: string;
  name_ar?: string | null;
  name_en?: string | null;
  description?: string;
  description_ar?: string | null;
  description_en?: string | null;
  address?: string;
  website?: string;
  contact_email?: string;
  is_verified?: boolean;
  foundation_year?: number;
  country?: string;
  icon?: string | File;
  created_at?: string;
  updated_at?: string;
}

export interface PublishersListResponse {
  results: Publisher[];
  count: number;
}

export interface PublisherFilters {
  search?: string;
  is_verified?: boolean;
  country?: string;
  page: number;
  page_size: number;
  ordering?: string;
}

export interface PublisherUiFilters {
  search?: string;
  is_verified?: boolean;
  country?: string;
}

export type PublisherUpdatePayload = Pick<
  Publisher,
  | 'name_ar'
  | 'name_en'
  | 'country'
  | 'website'
  | 'foundation_year'
  | 'address'
  | 'is_verified'
  | 'contact_email'
  | 'description_ar'
  | 'description_en'
> & {
  icon?: File;
};

export type PublisherCreatePayload = PublisherUpdatePayload;
