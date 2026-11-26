import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { callerShowsErrors } from '../../../core/interceptors/caller-shows-errors.context';

export type InquiryContentKind = 'recitations' | 'mushafs' | 'text' | 'fonts' | 'several';

export interface PublisherInquiry {
  name: string;
  organization: string;
  email: string;
  content_kind: InquiryContentKind;
  message: string;
  /** Honeypot; people never see it, so it stays empty. */
  website: string;
}

/** The publisher page's "contact us to join" form (backend emails it to connect@itqan.dev). */
@Injectable({ providedIn: 'root' })
export class PublisherInquiryService {
  private readonly http = inject(HttpClient);

  send(inquiry: PublisherInquiry): Observable<{ message: string }> {
    // The form shows its own error inline.
    return this.http.post<{ message: string }>(
      `${environment.API_BASE_URL}/publisher-inquiries/`,
      inquiry,
      { context: callerShowsErrors() }
    );
  }
}
