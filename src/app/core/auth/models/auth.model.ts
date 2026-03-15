/**
 * Authentication models based on the Itqan CMS API schema
 */

export interface User {
  id: string; // TODO: Change to number
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  is_profile_completed: boolean;
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
  phone: string; // +201012345678 +966555555555 format
  job_title: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
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
