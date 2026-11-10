import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AssetTag } from '../models/text-assets.models';

/** The text asset tags (tafsir, translation, …). Itqan staff manage the list. */
@Injectable({ providedIn: 'root' })
export class AssetTagsService {
  private readonly http = inject(HttpClient);
  /** Fetched once per session: the list changes only when staff add a tag. */
  private readonly tags$ = this.http
    .get<AssetTag[]>(`${environment.API_BASE_URL}/asset-tags/`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  list(): Observable<AssetTag[]> {
    return this.tags$;
  }
}
