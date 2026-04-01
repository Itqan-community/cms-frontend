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
}

export interface PublisherStatistics {
  total_publishers: number;
  total_active: number;
  total_countries: number;
}
