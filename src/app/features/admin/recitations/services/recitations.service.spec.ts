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

  it('getFolders should request folders list from API and map rows', (done) => {
    service.getFolders('my-recitation').subscribe((folders) => {
      expect(folders.length).toBe(2);
      expect(folders[0].id).toBe('10');
      expect(folders[0].name).toBe('Main');
      expect(folders[0].isDefault).toBeTrue();
      expect(folders[1].name).toBe('Variant 2');
      done();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/portal/recitations/my-recitation/folders/')
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      results: [
        { id: 10, name: 'Main', is_default: true, track_count: 114 },
        { id: 11, name: 'Variant 2', is_default: false, track_count: 30 },
      ],
    });
  });

  it('createFolder should POST new folder data', (done) => {
    service.createFolder('my-recitation', 'Variant 3').subscribe((folder) => {
      expect(folder.id).toBe('12');
      expect(folder.name).toBe('Variant 3');
      done();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/portal/recitations/my-recitation/folders/') && r.method === 'POST'
    );
    expect(req.request.body).toEqual({ name: 'Variant 3', is_default: false });
    req.flush({ id: 12, name: 'Variant 3', is_default: false, track_count: 0 });
  });

  it('setDefaultFolder should POST set-default endpoint', (done) => {
    service.setDefaultFolder('my-recitation', '11').subscribe((folder) => {
      expect(folder.isDefault).toBeTrue();
      done();
    });

    const req = httpMock.expectOne((r) =>
      r.url.includes('/portal/recitations/my-recitation/folders/11/set-default/') &&
      r.method === 'POST'
    );
    req.flush({ id: 11, name: 'Variant 2', is_default: true, track_count: 30 });
  });

  it('deleteFolder should send DELETE request', (done) => {
    service.deleteFolder('my-recitation', '11').subscribe(() => done());
    const req = httpMock.expectOne((r) =>
      r.url.includes('/portal/recitations/my-recitation/folders/11/') && r.method === 'DELETE'
    );
    req.flush(null);
  });
});
