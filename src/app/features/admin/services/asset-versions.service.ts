import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  mockCreateVersion as mockCreateFontVersion,
  mockDeleteVersion as mockDeleteFontVersion,
  mockListVersions as mockListFontVersions,
  mockUpdateVersion as mockUpdateFontVersion,
} from '../fonts/services/fonts.mock-store';
import {
  mockCreateVersion as mockCreateProgramVersion,
  mockDeleteVersion as mockDeleteProgramVersion,
  mockListVersions as mockListProgramVersions,
  mockUpdateVersion as mockUpdateProgramVersion,
} from '../programs/services/programs.mock-store';
import {
  mockCreateVersion,
  mockDeleteVersion,
  mockListVersions,
  mockUpdateVersion,
} from '../mushafs/services/mushafs.mock-store';
import type {
  AssetVersion,
  AssetVersionFormPayload,
  AssetVersionParentKind,
  AssetVersionsListParams,
  AssetVersionsListResponse,
} from '../models/asset-versions.models';

@Injectable({ providedIn: 'root' })
export class AssetVersionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.ADMIN_API_BASE_URL;

  list(
    kind: AssetVersionParentKind,
    slug: string,
    params: AssetVersionsListParams
  ): Observable<AssetVersionsListResponse> {
    const mock = this.mockList(kind, slug, params);
    if (mock) return mock;

    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('page_size', params.page_size.toString());
    if (params.search?.trim()) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    return this.http.get<AssetVersionsListResponse>(this.listUrl(kind, slug), {
      params: httpParams,
    });
  }

  create(
    kind: AssetVersionParentKind,
    slug: string,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> {
    const mock = this.mockCreate(kind, slug, payload);
    if (mock) return mock;
    return this.http.post<AssetVersion>(this.listUrl(kind, slug), this.toFormData(payload));
  }

  update(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> {
    const mock = this.mockUpdate(kind, slug, versionId, payload);
    if (mock) return mock;
    return this.http.patch<AssetVersion>(
      this.versionItemUrl(kind, slug, versionId),
      this.toFormData(payload)
    );
  }

  delete(kind: AssetVersionParentKind, slug: string, versionId: number): Observable<void> {
    const mock = this.mockDelete(kind, slug, versionId);
    if (mock) return mock;
    return this.http.delete<void>(this.versionItemUrl(kind, slug, versionId));
  }

  private mockList(
    kind: AssetVersionParentKind,
    slug: string,
    params: AssetVersionsListParams
  ): Observable<AssetVersionsListResponse> | null {
    if (kind === 'mushaf' && environment.useMushafsMockApi) {
      return mockListVersions(slug, params);
    }
    if (kind === 'font' && environment.useFontsMockApi) {
      return mockListFontVersions(slug, params);
    }
    if (kind === 'program' && environment.useProgramsMockApi) {
      return mockListProgramVersions(slug, params);
    }
    return null;
  }

  private mockCreate(
    kind: AssetVersionParentKind,
    slug: string,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> | null {
    if (kind === 'mushaf' && environment.useMushafsMockApi) {
      return mockCreateVersion(slug, payload);
    }
    if (kind === 'font' && environment.useFontsMockApi) {
      return mockCreateFontVersion(slug, payload);
    }
    if (kind === 'program' && environment.useProgramsMockApi) {
      return mockCreateProgramVersion(slug, payload);
    }
    return null;
  }

  private mockUpdate(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number,
    payload: AssetVersionFormPayload
  ): Observable<AssetVersion> | null {
    if (kind === 'mushaf' && environment.useMushafsMockApi) {
      return mockUpdateVersion(slug, versionId, payload);
    }
    if (kind === 'font' && environment.useFontsMockApi) {
      return mockUpdateFontVersion(slug, versionId, payload);
    }
    if (kind === 'program' && environment.useProgramsMockApi) {
      return mockUpdateProgramVersion(slug, versionId, payload);
    }
    return null;
  }

  private mockDelete(
    kind: AssetVersionParentKind,
    slug: string,
    versionId: number
  ): Observable<void> | null {
    if (kind === 'mushaf' && environment.useMushafsMockApi) {
      return mockDeleteVersion(slug, versionId);
    }
    if (kind === 'font' && environment.useFontsMockApi) {
      return mockDeleteFontVersion(slug, versionId);
    }
    if (kind === 'program' && environment.useProgramsMockApi) {
      return mockDeleteProgramVersion(slug, versionId);
    }
    return null;
  }

  private segmentForKind(kind: AssetVersionParentKind): string {
    switch (kind) {
      case 'tafsir':
        return 'tafsirs';
      case 'translation':
        return 'translations';
      case 'mushaf':
        return 'mushafs';
      case 'font':
        return 'fonts';
      case 'program':
        return 'programs';
    }
  }

  private listUrl(kind: AssetVersionParentKind, slug: string): string {
    const segment = this.segmentForKind(kind);
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/`;
  }

  private versionItemUrl(kind: AssetVersionParentKind, slug: string, versionId: number): string {
    const segment = this.segmentForKind(kind);
    return `${this.base}/${segment}/${encodeURIComponent(slug)}/versions/${versionId}/`;
  }

  private toFormData(payload: AssetVersionFormPayload): FormData {
    const data = new FormData();
    data.append('asset_id', String(payload.asset_id));
    data.append('name', payload.name);
    data.append('summary', payload.summary);
    if (payload.file) {
      data.append('file', payload.file);
    }
    return data;
  }
}
