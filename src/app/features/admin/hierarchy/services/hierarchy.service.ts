import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  HierarchyAyah,
  HierarchyLetter,
  HierarchyList,
  HierarchySearchResult,
  HierarchySurah,
  HierarchyWord,
} from '../models/hierarchy.models';
import { HierarchyMockStore } from './hierarchy.mock-store';

/** Lazy, one level per call: the tree only asks for a level when its parent is opened. */
@Injectable({
  providedIn: 'root',
})
export class HierarchyService {
  private readonly http = inject(HttpClient);
  private readonly mockStore = inject(HierarchyMockStore);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/hierarchy/`;

  getSurahs(): Observable<HierarchyList<HierarchySurah>> {
    if (environment.useHierarchyMockApi) {
      return this.mockStore.getSurahs();
    }
    return this.http.get<HierarchyList<HierarchySurah>>(`${this.apiUrl}surahs/`);
  }

  getAyahs(surahNumber: number): Observable<HierarchyList<HierarchyAyah>> {
    if (environment.useHierarchyMockApi) {
      return this.mockStore.getAyahs(surahNumber);
    }
    return this.http.get<HierarchyList<HierarchyAyah>>(
      `${this.apiUrl}surahs/${surahNumber}/ayahs/`
    );
  }

  getWords(ayahKey: string): Observable<HierarchyList<HierarchyWord>> {
    if (environment.useHierarchyMockApi) {
      return this.mockStore.getWords(ayahKey);
    }
    return this.http.get<HierarchyList<HierarchyWord>>(
      `${this.apiUrl}ayahs/${encodeURIComponent(ayahKey)}/words/`
    );
  }

  getLetters(wordKey: string): Observable<HierarchyList<HierarchyLetter>> {
    if (environment.useHierarchyMockApi) {
      return this.mockStore.getLetters(wordKey);
    }
    return this.http.get<HierarchyList<HierarchyLetter>>(
      `${this.apiUrl}words/${encodeURIComponent(wordKey)}/letters/`
    );
  }

  search(query: string): Observable<HierarchyList<HierarchySearchResult>> {
    if (environment.useHierarchyMockApi) {
      return this.mockStore.search(query);
    }
    const params = new HttpParams().set('q', query);
    return this.http.get<HierarchyList<HierarchySearchResult>>(`${this.apiUrl}search/`, {
      params,
    });
  }
}
