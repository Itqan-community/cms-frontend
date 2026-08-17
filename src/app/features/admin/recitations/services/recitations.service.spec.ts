import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RecitationsService } from './recitations.service';

describe('RecitationsService', () => {
  let service: RecitationsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecitationsService],
    });
    service = TestBed.inject(RecitationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose qiraah and riwayah options from API list', (done) => {
    service.qiraahOptions().subscribe((q) => {
      expect(q).toEqual([{ id: 1, name: 'حفص' }]);

      service.riwayahOptions().subscribe((r) => {
        expect(r).toEqual([{ id: 11, name: 'عن عاصم' }]);
        done();
      });

      const req2 = httpMock.expectOne((req) => req.url.includes('/portal/filters/riwayahs/'));
      req2.flush({
        count: 1,
        results: [{ id: 11, name: 'عن عاصم' }],
      });
    });

    const req1 = httpMock.expectOne((req) => req.url.includes('/portal/filters/qiraahs/'));
    req1.flush({
      count: 1,
      results: [{ id: 1, name: 'حفص' }],
    });
  });

  it('getList should request recitations list from API', (done) => {
    service
      .getList({
        page: 1,
        page_size: 10,
        search: 'تلاوة',
      })
      .subscribe((res) => {
        expect(res.count).toBe(1);
        expect(Array.isArray(res.results)).toBe(true);
        done();
      });

    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/'));
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, results: [] });
  });

  it('getDetail should request detail from API by slug', (done) => {
    service.getDetail('recitation-1').subscribe((d) => {
      expect(d.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/recitation-1/'));
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1 });
  });

  it('delete should request API delete by slug', (done) => {
    service.delete('recitation-1').subscribe(() => done());
    const req = httpMock.expectOne((r) => r.url.includes('/portal/recitations/recitation-1/'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('recitationTracksList should GET recitation-scoped tracks with page params', (done) => {
    service
      .recitationTracksList({
        recitation_slug: 'my-recitation',
        asset_id: 42,
        page: 2,
        page_size: 10,
      })
      .subscribe((res) => {
        expect(res.count).toBe(1);
        expect(res.results.length).toBe(1);
        expect(res.results[0].id).toBe(7);
        expect(res.results[0].asset_id).toBe(42);
        expect(res.results[0].surah_number).toBe(1);
        expect(res.results[0].filename).toBe('001.mp3');
        expect(res.results[0].audio_url).toBe('https://example.com/a.mp3');
        done();
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/portal/recitations/my-recitation/recitation-tracks/') && r.method === 'GET'
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('10');
    expect(req.request.params.get('folder')).toBeNull();
    req.flush({
      count: 1,
      results: [
        {
          id: 7,
          surah_number: 1,
          audio_url: 'https://example.com/a.mp3',
          duration_ms: 120000,
          size_bytes: 500000,
          filename: '001.mp3',
        },
      ],
    });
  });

  it('recitationTracksList should pass folder query when provided', (done) => {
    service
      .recitationTracksList({
        recitation_slug: 'my-recitation',
        asset_id: 42,
        page: 1,
        page_size: 10,
        folder: 'with-echo',
      })
      .subscribe((res) => {
        expect(res.count).toBe(0);
        done();
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/portal/recitations/my-recitation/recitation-tracks/') && r.method === 'GET'
    );
    expect(req.request.params.get('folder')).toBe('with-echo');
    req.flush({ count: 0, results: [] });
  });

  it('should list recitation folders', (done) => {
    service.recitationFoldersList('my-recitation').subscribe((folders) => {
      expect(folders.length).toBe(1);
      expect(folders[0].slug).toBe('default');
      expect(folders[0].is_default).toBeTrue();
      done();
    });

    const req = httpMock.expectOne(
      (r) => r.url.includes('/portal/recitations/my-recitation/folders/') && r.method === 'GET'
    );
    req.flush([
      {
        id: 1,
        name: 'Default',
        name_ar: 'افتراضي',
        name_en: 'Default',
        slug: 'default',
        is_default: true,
        tracks_count: 2,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('should create a recitation folder', (done) => {
    service
      .recitationFolderCreate('my-recitation', { name_ar: 'صدى', name_en: 'Echo' })
      .subscribe((folder) => {
        expect(folder.slug).toBe('echo');
        expect(folder.is_default).toBeFalse();
        done();
      });

    const req = httpMock.expectOne(
      (r) => r.url.includes('/portal/recitations/my-recitation/folders/') && r.method === 'POST'
    );
    expect(req.request.body).toEqual({ name_ar: 'صدى', name_en: 'Echo' });
    req.flush({
      id: 2,
      name: 'صدى',
      name_ar: 'صدى',
      name_en: 'Echo',
      slug: 'echo',
      is_default: false,
      tracks_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should patch a recitation folder by slug', (done) => {
    service
      .recitationFolderPatch('my-recitation', 'echo', { name_en: 'With echo' })
      .subscribe((folder) => {
        expect(folder.name_en).toBe('With echo');
        done();
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/portal/recitations/my-recitation/folders/echo/') && r.method === 'PATCH'
    );
    expect(req.request.body).toEqual({ name_en: 'With echo' });
    req.flush({
      id: 2,
      name: 'With echo',
      name_ar: 'صدى',
      name_en: 'With echo',
      slug: 'echo',
      is_default: false,
      tracks_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });
  });

  it('should delete a recitation folder by slug', (done) => {
    service.recitationFolderDelete('my-recitation', 'echo').subscribe(() => done());

    const req = httpMock.expectOne(
      (r) =>
        r.url.includes('/portal/recitations/my-recitation/folders/echo/') && r.method === 'DELETE'
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('recitationTimingUpload should append folder_id when provided', (done) => {
    const file = new File(['{}'], '001.json', { type: 'application/json' });
    service.recitationTimingUpload(42, [file], 9).subscribe((res) => {
      expect(res.folder_id).toBe(9);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/portal/timing/upload/'));
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('asset_id')).toBe('42');
    expect(body.get('folder_id')).toBe('9');
    req.flush({
      asset_id: 42,
      folder_id: 9,
      created_total: 1,
      updated_total: 0,
      skipped_total: 0,
      missing_tracks: [],
      file_errors: [],
      synced_file_url: null,
      synced_filename: '',
    });
  });
});
