import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RecitationsService } from './recitations.service';
import { MaddLevel, MeemBehavior } from '../models/recitations.models';

describe('RecitationsService', () => {
  let service: RecitationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecitationsService],
    });
    service = TestBed.inject(RecitationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose qiraah and riwayah options (mock)', (done) => {
    service.qiraahOptions().subscribe((q) => {
      expect(q.length).toBeGreaterThan(0);
      service.riwayahOptions().subscribe((r) => {
        expect(r.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  it('getList should return mock results without HTTP', (done) => {
    service
      .getList({
        page: 1,
        page_size: 10,
        search: 'تلاوة',
      })
      .subscribe((res) => {
        expect(res.count).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(res.results)).toBe(true);
        done();
      });
  });

  it('getDetail should return mock detail', (done) => {
    service.getDetail(1).subscribe((d) => {
      expect(d.id).toBe(1);
      expect(d.madd_level).toBeDefined();
      expect([MaddLevel.TWASSUT, MaddLevel.QASR]).toContain(d.madd_level);
      expect([MeemBehavior.SILAH, MeemBehavior.SKOUN]).toContain(d.meem_behavior);
      done();
    });
  });

  it('delete should complete (mock)', (done) => {
    service.delete(1).subscribe(() => done());
  });
});
