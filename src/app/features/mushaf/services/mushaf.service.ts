import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Ayah, PaginatedSuras, Sura } from '../models/mushaf.model';

@Injectable({
  providedIn: 'root',
})
export class MushafService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = environment.API_BASE_URL;

  /**
   * Get the full list of suras (114). Requests a large page size so the whole
   * list arrives in a single call.
   * @returns {Observable<PaginatedSuras>}
   */
  getSuras() {
    return this.http.get<PaginatedSuras>(`${this.BASE_URL}/suras/`, {
      params: { page_size: 200 },
    });
  }

  /**
   * Get a single sura's metadata by its number.
   * @param suraId {number}
   * @returns {Observable<Sura>}
   */
  getSura(suraId: number) {
    return this.http.get<Sura>(`${this.BASE_URL}/suras/${suraId}/`);
  }

  /**
   * Get all ayahs of a sura (each including its words), ordered within the sura.
   * @param suraId {number}
   * @returns {Observable<Ayah[]>}
   */
  getSuraAyahs(suraId: number) {
    return this.http.get<Ayah[]>(`${this.BASE_URL}/suras/${suraId}/ayahs/`);
  }

  /**
   * Get a single ayah (including its words) by sura number and ayah number.
   * @param suraId {number}
   * @param numberInSura {number}
   * @returns {Observable<Ayah>}
   */
  getAyah(suraId: number, numberInSura: number) {
    return this.http.get<Ayah>(`${this.BASE_URL}/suras/${suraId}/ayahs/${numberInSura}/`);
  }
}
