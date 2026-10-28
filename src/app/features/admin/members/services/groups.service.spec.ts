import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { CALLER_SHOWS_ERRORS } from '../../../../core/interceptors/caller-shows-errors.context';
import { GroupsService } from './groups.service';

describe('GroupsService role management', () => {
  let service: GroupsService;
  let http: HttpTestingController;
  const base = `${environment.ADMIN_API_BASE_URL}/groups`;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [GroupsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GroupsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads one role', () => {
    service.get(7).subscribe();
    expect(http.expectOne(`${base}/7/`).request.method).toBe('GET');
  });

  it('creates a role with both names', () => {
    service.create({ name_en: 'Editors', name_ar: 'المحررون' }).subscribe();
    const req = http.expectOne(`${base}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'Editors', name_ar: 'المحررون' });
  });

  it('renames a role', () => {
    service.update(7, { name_en: 'Writers', name_ar: 'الكتّاب' }).subscribe();
    const req = http.expectOne(`${base}/7/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name_en: 'Writers', name_ar: 'الكتّاب' });
  });

  it('replaces a role’s permissions', () => {
    service.setPermissions(7, ['portal_read_reciter']).subscribe();
    const req = http.expectOne(`${base}/7/permissions/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissions: ['portal_read_reciter'] });
  });

  it('deletes a role', () => {
    service.delete(7).subscribe();
    expect(http.expectOne(`${base}/7/`).request.method).toBe('DELETE');
  });

  it('lists the permission catalogue', () => {
    service.listPermissions().subscribe();
    expect(http.expectOne(`${base}/permissions/`).request.method).toBe('GET');
  });

  it('shows its own errors on the roles page instead of the global toast', () => {
    service.list().subscribe();
    service.get(7).subscribe();
    service.create({ name_en: 'a', name_ar: 'ب' }).subscribe();
    service.update(7, { name_en: 'a', name_ar: 'ب' }).subscribe();
    service.setPermissions(7, []).subscribe();
    service.delete(7).subscribe();
    service.listPermissions().subscribe();
    const requests = http.match(() => true);
    expect(requests.length).toBe(7);
    for (const req of requests) {
      expect(req.request.context.get(CALLER_SHOWS_ERRORS))
        .withContext(`${req.request.method} ${req.request.url}`)
        .toBeTrue();
    }
  });
});
