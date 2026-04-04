export interface Publisher {
  id: number;
  name: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description?: string;
  description_ar?: string;
  description_en?: string;
  address?: string;
  website?: string;
  contact_email?: string;
  is_verified?: boolean;
  foundation_year?: number;
  country?: string;
  icon_url?: string;
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
  | 'icon_url'
  | 'foundation_year'
  | 'address'
  | 'is_verified'
  | 'contact_email'
  | 'description'
>;
