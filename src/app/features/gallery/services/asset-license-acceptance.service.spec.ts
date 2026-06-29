import { TestBed } from '@angular/core/testing';
import { AssetLicenseAcceptanceService } from './asset-license-acceptance.service';

describe('AssetLicenseAcceptanceService', () => {
  let service: AssetLicenseAcceptanceService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssetLicenseAcceptanceService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns false when user has not accepted', () => {
    expect(service.hasAccepted('user-1')).toBe(false);
  });

  it('returns true after recordAcceptance', () => {
    service.recordAcceptance('user-1');
    expect(service.hasAccepted('user-1')).toBe(true);
  });

  it('isolates acceptance per user id', () => {
    service.recordAcceptance('user-1');
    expect(service.hasAccepted('user-2')).toBe(false);
  });

  it('treats empty user id as not accepted', () => {
    service.recordAcceptance('');
    expect(service.hasAccepted('')).toBe(false);
  });
});
