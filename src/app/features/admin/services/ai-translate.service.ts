import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type AiTranslateMode = 'translate' | 'web';
export type AiTranslateCategory = 'mushaf' | 'text' | 'font' | 'recitation' | 'reciter';
export type AiFieldKey =
  | 'name'
  | 'description'
  | 'long_description'
  | 'bio'
  | 'version_name'
  | 'version_summary';
/** Fields "Write from the web" can also write in Arabic. */
export type AiWebFieldKey = 'description' | 'long_description' | 'bio';

/** Inputs for the package slug suggested by the same call (asset create forms; not reciters). */
export interface AiSlugFor {
  name_ar: string;
  name_en: string;
  language?: string;
  reciter_id?: number;
  riwayah_id?: number;
  year?: number;
  /** Text assets: the tag that prefixes the package name. */
  tag?: string;
}

export interface AiTranslateContext {
  reciter?: string;
  riwayah?: string;
}

export interface AiTranslateRequest {
  mode: AiTranslateMode;
  category: AiTranslateCategory;
  /** Arabic values keyed by field name. */
  fields: Partial<Record<AiFieldKey, string>>;
  context?: AiTranslateContext;
  slug_for?: AiSlugFor;
  /** Arabic values whose English is already filled: prompt context only, never returned. */
  reference?: Partial<Record<AiFieldKey, string>>;
  /** `web` mode: fields whose Arabic is empty, to write in Arabic too (returned in `fields_ar`). */
  fill_arabic?: AiWebFieldKey[];
}

export interface AiTranslateResponse {
  /** English values for the requested fields. */
  fields: Partial<Record<AiFieldKey, string>>;
  /** Arabic values written in `web` mode for the requested `fill_arabic` fields. */
  fields_ar?: Partial<Record<AiWebFieldKey, string>>;
  /** Web pages used in `web` mode. */
  sources: string[];
  /** Suggested package slug when `slug_for` was sent; null when none could be made. */
  slug: string | null;
}

/** Arabic → English translation of create-form fields (portal, Gemini free tier). */
@Injectable({ providedIn: 'root' })
export class AiTranslateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/ai/translate/`;

  translate(req: AiTranslateRequest): Observable<AiTranslateResponse> {
    return this.http.post<AiTranslateResponse>(this.apiUrl, req);
  }
}
