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

  it('returns localStorage sessionToken when set', () => {
    localStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'from-storage');
    expect(service.getSessionToken()).toBe('from-storage');
  });

  it('migrates sessionStorage token into localStorage on first read', () => {
    sessionStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'legacy-tab-token');
    expect(service.getSessionToken()).toBe('legacy-tab-token');
    expect(localStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)).toBe('legacy-tab-token');
    expect(sessionStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('prefers localStorage over readable sessionid cookie', () => {
    localStorage.setItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY, 'from-storage');
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=from-cookie');
    expect(service.getSessionToken()).toBe('from-storage');
  });

  it('falls back to sessionid cookie and persists into localStorage', () => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=cookie-val; Path=/');
    expect(service.getSessionToken()).toBe('cookie-val');
    expect(localStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)).toBe('cookie-val');
  });

  it('returns null when neither localStorage nor cookie', () => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('');
    expect(service.getSessionToken()).toBeNull();
  });

  it('does not read sessionid cookie while session cookie fallback is blocked', () => {
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=cookie-val; Path=/');
    service.blockSessionCookieFallback();
    expect(service.getSessionToken()).toBeNull();
    expect(localStorage.getItem(ALLAUTH_SESSION_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it('still returns localStorage token while cookie fallback is blocked', () => {
    service.blockSessionCookieFallback();
    service.setSessionToken('passkey-stage-token');
    spyOnProperty(document, 'cookie', 'get').and.returnValue('sessionid=stale-cookie; Path=/');
    expect(service.getSessionToken()).toBe('passkey-stage-token');
  });

  it('setFromMeta persists API session_token while cookie fallback is blocked', () => {
    service.blockSessionCookieFallback();
    service.setFromMeta({
      is_authenticated: false,
      session_token: 'from-api',
      access_token: 'acc',
    });
    expect(service.getSessionToken()).toBe('from-api');
    expect(service.getAccessToken()).toBe('acc');
  });
});
