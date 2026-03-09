export interface Publisher {
  id: string;
  name_ar: string;
  name_en: string;
  country?: string;
  website?: string;
  icon_url?: string;
  foundation_year?: number;
  address?: string;
  is_verified?: boolean;
  contact_email?: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PublishersListResponse {
  data: Publisher[];
  total: number;
  page: number;
  limit: number;
}

export interface PublisherFilters {
  search?: string;
  is_active?: boolean;
  page: number;
  limit: number;
}

export interface PublisherStatistics {
  total_publishers: number;
  total_active: number;
  total_countries: number;
}
