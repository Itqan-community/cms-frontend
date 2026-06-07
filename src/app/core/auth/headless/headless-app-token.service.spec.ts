import { TestBed } from '@angular/core/testing';
import {
  ALLAUTH_SESSION_TOKEN_STORAGE_KEY,
  HeadlessAppTokenService,
} from './headless-app-token.service';

describe('HeadlessAppTokenService', () => {
  let service: HeadlessAppTokenService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [HeadlessAppTokenService],
    });
    service = TestBed.inject(HeadlessAppTokenService);
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns sessionStorage sessionToken when set', () => {
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'from-storage');
    expect(service.getSessionToken()).toBe('from-storage');
  });

  it('prefers sessionStorage over readable sessionid cookie', () => {
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'from-storage');
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=from-cookie');
    expect(service.getSessionToken()).toBe('from-storage');
  });

  it('falls back to sessionid cookie and persists into sessionStorage', () => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=cookie-val; Path=/');
    expect(service.getSessionToken()).toBe('cookie-val');
    expect(sessionStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)).toBe('cookie-val');
  });

  it('returns null when neither sessionStorage nor cookie', () => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('');
    expect(service.getSessionToken()).toBeNull();
  });
});
