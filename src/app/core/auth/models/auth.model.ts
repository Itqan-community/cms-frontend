/**
 * Authentication models based on the Itqan CMS API schema
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_profile_completed: boolean;
  is_admin?: boolean;
  publisher_id?: number | null;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string; // +201012345678 +966555555555 format
  job_title?: string;
}

/** @deprecated Use refresh_token string for /auth/app/v1/tokens/refresh */
export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}

/** Headless app token refresh response (`data` wrapper) */
export interface AppRefreshTokenData {
  access_token: string;
  refresh_token?: string;
}

export interface UpdateProfileRequest {
  bio?: string;
  project_summary?: string;
  project_url?: string;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  name: string;
  phone: string;
  is_active: boolean;
  is_profile_completed: boolean;
  bio: string;
  project_summary: string;
  project_url: string;
  job_title: string;
  created_at: string;
  updated_at: string;
}

// API Error interfaces
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// Form validation interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
