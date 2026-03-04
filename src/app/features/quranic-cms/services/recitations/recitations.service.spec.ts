import { TestBed } from '@angular/core/testing';
import { RecitationsService } from './recitations.service';

describe('RecitationsService', () => {
  let service: RecitationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecitationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return stats', (done: DoneFn) => {
    service.getStats().subscribe((stats) => {
      expect(stats).toBeTruthy();
      expect(stats.totalReciters).toBeGreaterThan(0);
      done();
    });
  });

  it('should return all recitations initially', (done: DoneFn) => {
    service.getRecitations().subscribe((res) => {
      expect(res.results.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should filter recitations by Arabic name', (done: DoneFn) => {
    service.getRecitations({ searchQuery: 'مشاري' }).subscribe((res) => {
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].reciter.name).toContain('مشاري');
      done();
    });
  });

  it('should filter recitations by English name', (done: DoneFn) => {
    service.getRecitations({ searchQuery: 'mishary' }).subscribe((res) => {
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].reciter.name.toLowerCase()).toContain('mishary');
      done();
    });
  });

  it('should filter recitations by Riwayah', (done: DoneFn) => {
    service.getRecitations({ riwayah: 'حفص عن عاصم' }).subscribe((res) => {
      expect(res.results.length).toBeGreaterThan(0);
      done();
    });
  });

  it('should filter recitations by exact Type', (done: DoneFn) => {
    service.getRecitations({ recitationType: 'مجود' }).subscribe((res) => {
      expect(res.results.length).toBeGreaterThan(0);
      expect(res.results[0].recitation_type).toBe('مجود');
      done();
    });
  });
});
