import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  AuthenticatedResponse,
  AuthenticationMeta,
  WebAuthnCredentialRequestData,
} from './headless-api.types';
import { HeadlessAppTokenService } from './headless-app-token.service';
import { getWebAuthnRequestOptions, publicKeyCredentialToJson } from './webauthn.util';
import { AuthService } from '../services/auth.service';

function isAuthenticatedResponseBody(b: unknown): b is AuthenticatedResponse {
  return (
    b !== null &&
    typeof b === 'object' &&
    'status' in b &&
    (b as { status: unknown }).status === 200 &&
    'meta' in b &&
    typeof (b as { meta: unknown }).meta === 'object'
  );
}

export interface PasskeyFlowSuccess {
  ok: true;
  nextUrl: string;
}
export interface PasskeyFlowCancelled {
  ok: false;
  reason: 'cancelled';
}
export interface PasskeyFlowSignupSessionMissing {
  ok: false;
  reason: 'signup_session_missing';
}
export type PasskeyLoginFlowResult = PasskeyFlowSuccess | PasskeyFlowCancelled;
export type PasskeySignupFlowResult =
  | PasskeyFlowSuccess
  | PasskeyFlowCancelled
  | PasskeyFlowSignupSessionMissing;

@Injectable({ providedIn: 'root' })
export class PasskeyAuthFlowService {
  private readonly authService = inject(AuthService);
  private readonly tokenStore = inject(HeadlessAppTokenService);

  /** Drop stale app session; block dead `sessionid` cookie but allow fresh stage token from GET options. */
  async loginWithPasskey(continueUrl: string): Promise<PasskeyLoginFlowResult> {
    if (!this.authService.isLoggedIn()) {
      this.tokenStore.blockSessionCookieFallback();
    }
    const res = await firstValueFrom(this.authService.headlessAuth.getWebauthnLoginOptions());
    const data = res.data as WebAuthnCredentialRequestData;
    const publicKey = await getWebAuthnRequestOptions(data);
    const cred = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;
    if (!cred) {
      return { ok: false, reason: 'cancelled' };
    }
    const body = publicKeyCredentialToJson(cred);
    const r = await firstValueFrom(this.authService.headlessAuth.postWebauthnLogin(body));
    await firstValueFrom(this.authService.applyHeadlessSuccess(r, { fetchProfile: true }));
    return { ok: true, nextUrl: continueUrl };
  }

  /**
   * OpenAPI: POST `{ email }` → (optional session) → GET assertion options →
   * `credentials.get` → PUT `{ credential }`.
   */
  async signupWithPasskey(email: string, continueUrl: string): Promise<PasskeySignupFlowResult> {
    const trimmedEmail = email.trim();
    if (!this.authService.isLoggedIn()) {
      this.tokenStore.blockSessionCookieFallback();
    }

    const initResp = await firstValueFrom(
      this.authService.headlessAuth.initiatePasskeySignup(trimmedEmail)
    );
    const initBody = initResp.body;
    if (initResp.ok && initBody && isAuthenticatedResponseBody(initBody)) {
      await firstValueFrom(
        this.authService.applyHeadlessSuccess(initBody, { fetchProfile: false })
      );
    } else if (initResp.ok && initBody) {
      this.applyMetaFromHeadlessBody(initBody);
    }

    if (initResp.ok && !this.tokenStore.getSessionToken()) {
      return { ok: false, reason: 'signup_session_missing' };
    }

    const res = await firstValueFrom(this.authService.headlessAuth.getWebauthnSignupOptions());
    const data = res.data as WebAuthnCredentialRequestData;
    const publicKey = await getWebAuthnRequestOptions(data);
    const cred = (await navigator.credentials.get({
      publicKey,
    })) as PublicKeyCredential | null;
    if (!cred) {
      return { ok: false, reason: 'cancelled' };
    }
    const body = publicKeyCredentialToJson(cred);
    const r = await firstValueFrom(this.authService.headlessAuth.completePasskeySignup(body));
    await firstValueFrom(this.authService.applyHeadlessSuccess(r, { fetchProfile: true }));
    return { ok: true, nextUrl: continueUrl };
  }

  private applyMetaFromHeadlessBody(body: unknown): void {
    if (!body || typeof body !== 'object') {
      return;
    }
    const meta = (body as { meta?: AuthenticationMeta }).meta;
    if (meta && typeof meta === 'object') {
      this.authService.applyMetaTokens(meta);
    }
  }
}
