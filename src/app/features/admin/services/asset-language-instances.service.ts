import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AssetContentLanguageKind,
  AssetLanguageInstance,
  AssetLanguageInstanceWriteIn,
} from '../models/asset-language-instance.models';
import {
  mockCreateLanguageInstance,
  mockDeleteLanguageInstance,
  mockListLanguageInstances,
  mockPatchLanguageInstance,
} from './asset-language-instances.mock-store';

@Injectable({ providedIn: 'root' })
export class AssetLanguageInstancesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  list(kind: AssetContentLanguageKind, slug: string): Observable<AssetLanguageInstance[]> {
    if (!environment.assetLanguageInstances) {
      return of(mockListLanguageInstances(kind, slug));
    }
    return this.http.get<AssetLanguageInstance[]>(this.languagesBase(kind, slug));
  }

  create(
    kind: AssetContentLanguageKind,
    slug: string,
    body: AssetLanguageInstanceWriteIn
  ): Observable<AssetLanguageInstance> {
    if (!environment.assetLanguageInstances) {
      try {
        return of(mockCreateLanguageInstance(kind, slug, body));
      } catch (e) {
        return throwError(() => e);
      }
    }
    return this.http.post<AssetLanguageInstance>(this.languagesBase(kind, slug), body);
  }

  patch(
    kind: AssetContentLanguageKind,
    slug: string,
    langSlug: string,
    body: Partial<AssetLanguageInstanceWriteIn>
  ): Observable<AssetLanguageInstance> {
    if (!environment.assetLanguageInstances) {
      try {
        return of(mockPatchLanguageInstance(kind, slug, langSlug, body));
      } catch (e) {
        return throwError(() => e);
      }
    }
    return this.http.patch<AssetLanguageInstance>(
      `${this.languagesBase(kind, slug)}${encodeURIComponent(langSlug)}/`,
      body
    );
  }

  delete(kind: AssetContentLanguageKind, slug: string, langSlug: string): Observable<void> {
    if (!environment.assetLanguageInstances) {
      try {
        mockDeleteLanguageInstance(kind, slug, langSlug);
        return of(undefined);
      } catch (e) {
        return throwError(() => e);
      }
    }
    return this.http.delete<void>(
      `${this.languagesBase(kind, slug)}${encodeURIComponent(langSlug)}/`
    );
  }

  private languagesBase(kind: AssetContentLanguageKind, slug: string): string {
    const segment = kind === 'tafsir' ? 'tafsirs' : 'translations';
    return `${this.base}/content/${segment}/${encodeURIComponent(slug)}/languages/`;
  }
}
