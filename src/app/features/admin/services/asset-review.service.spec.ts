import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import type { ReviewChange, ReviewChangesResponse } from '../models/asset-review.models';
import { AssetReviewService } from './asset-review.service';

describe('AssetReviewService', () => {
  let service: AssetReviewService;
  let httpMock: HttpTestingController;
  const base = environment.ADMIN_API_BASE_URL;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AssetReviewService],
    });
    service = TestBed.inject(AssetReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listLanguages', () => {
    it('should fetch languages for a translation', (done) => {
      service.listLanguages('translation', 'en-sahih').subscribe((langs) => {
        expect(langs).toEqual(['en', 'fr']);
        done();
      });

      const req = httpMock.expectOne(`${base}/content/translations/en-sahih/review/languages/`);
      expect(req.request.method).toBe('GET');
      req.flush(['en', 'fr']);
    });

    it('should fetch languages for a tafsir with encoded slug', (done) => {
      service.listLanguages('tafsir', 'ar-muyassar/special').subscribe((langs) => {
        expect(langs).toEqual(['ar']);
        done();
      });

      const req = httpMock.expectOne(
        `${base}/content/tafsirs/ar-muyassar%2Fspecial/review/languages/`
      );
      expect(req.request.method).toBe('GET');
      req.flush(['ar']);
    });
  });

  describe('listChanges', () => {
    it('should fetch paginated changes with state filter', (done) => {
      const mockResponse: ReviewChangesResponse = {
        count: 1,
        results: [
          {
            id: 10,
            sura: 1,
            aya: 1,
            surah_name: 'الفاتحة',
            change_type: 'modified',
            old_text: 'old',
            new_text: 'new',
            baseline_text: 'baseline',
            commit_ref: 'abc1234',
            commit_id: 1,
            review_state: 'unreviewed',
            comment: '',
            reviewed_by: null,
            reviewed_at: null,
          },
        ],
      };

      service.listChanges('translation', 'en-sahih', 'en', 1, 25, 'unreviewed').subscribe((res) => {
        expect(res.count).toBe(1);
        expect(res.results.length).toBe(1);
        expect(res.results[0].id).toBe(10);
        done();
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${base}/content/translations/en-sahih/review/changes/` &&
          r.params.get('language') === 'en' &&
          r.params.get('page') === '1' &&
          r.params.get('page_size') === '25' &&
          r.params.get('state') === 'unreviewed'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should omit state param when not provided', (done) => {
      service.listChanges('tafsir', 'muyassar', 'ar', 2, 50, null).subscribe((res) => {
        expect(res.results).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${base}/content/tafsirs/muyassar/review/changes/` &&
          r.params.get('language') === 'ar' &&
          r.params.get('page') === '2' &&
          r.params.get('page_size') === '50' &&
          !r.params.has('state')
      );
      expect(req.request.method).toBe('GET');
      req.flush({ count: 0, results: [] });
    });
  });

  describe('setState', () => {
    it('should send a patch request to update review state and comment', (done) => {
      const mockUpdated: ReviewChange = {
        id: 42,
        sura: 2,
        aya: 255,
        surah_name: 'البقرة',
        change_type: 'modified',
        old_text: 'prev',
        new_text: 'curr',
        baseline_text: 'base',
        commit_ref: 'def5678',
        commit_id: 2,
        review_state: 'commented',
        comment: 'Please verify translation',
        reviewed_by: 'reviewer1',
        reviewed_at: '2026-09-15T12:00:00Z',
      };

      service
        .setState('translation', 'en-sahih', 42, 'commented', 'Please verify translation')
        .subscribe((res) => {
          expect(res.review_state).toBe('commented');
          expect(res.comment).toBe('Please verify translation');
          done();
        });

      const req = httpMock.expectOne(`${base}/content/translations/en-sahih/review/changes/42/`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        state: 'commented',
        comment: 'Please verify translation',
      });
      req.flush(mockUpdated);
    });

    it('should default comment to empty string if omitted', (done) => {
      service.setState('tafsir', 'muyassar', 99, 'approved').subscribe((res) => {
        expect(res.review_state).toBe('approved');
        done();
      });

      const req = httpMock.expectOne(`${base}/content/tafsirs/muyassar/review/changes/99/`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        state: 'approved',
        comment: '',
      });
      req.flush({ id: 99, review_state: 'approved' });
    });
  });
});
