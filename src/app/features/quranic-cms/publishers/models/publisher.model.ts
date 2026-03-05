export interface Publisher {
  name_ar: string;
  name_en: string;
  country: string;
  website: string;
  icon_url: string;
  foundation_year: number;
  address: string;
  is_verified: boolean;
  contact_email: string;
  description: string;
}

export interface PublisherCreate {
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
}

export interface PublishersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Publisher[];
}

export interface PublishersStats {
  total_publishers: number;
  total_active: number;
  total_countries: number;
  isMock?: boolean;
}
