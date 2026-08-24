export interface PasskeyEnvironmentSnapshot {
  publicKeyCredential: unknown;
  isSecureContext: unknown;
  hadIsSecureContextDescriptor: boolean;
}

export function snapshotPasskeyEnvironment(): PasskeyEnvironmentSnapshot {
  const g = globalThis as { PublicKeyCredential?: unknown; isSecureContext?: unknown };
  return {
    publicKeyCredential: g.PublicKeyCredential,
    isSecureContext: g.isSecureContext,
    hadIsSecureContextDescriptor:
      Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext') !== undefined,
  };
}

export function restorePasskeyEnvironment(snapshot: PasskeyEnvironmentSnapshot): void {
  const g = globalThis as { PublicKeyCredential?: unknown; isSecureContext?: unknown };
  if (snapshot.publicKeyCredential === undefined) {
    delete g.PublicKeyCredential;
  } else {
    g.PublicKeyCredential = snapshot.publicKeyCredential;
  }

  if (snapshot.hadIsSecureContextDescriptor) {
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: snapshot.isSecureContext,
      configurable: true,
      writable: true,
    });
    return;
  }

  delete g.isSecureContext;
}

/** Toggle FE passkey capability by shaping global WebAuthn prerequisites. */
export function setPasskeyClientEnvironmentSupported(supported: boolean): void {
  const g = globalThis as { PublicKeyCredential?: unknown };
  if (supported) {
    if (typeof g.PublicKeyCredential === 'undefined') {
      g.PublicKeyCredential = class {} as typeof PublicKeyCredential;
    }
    Object.defineProperty(globalThis, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true,
    });
    return;
  }

  delete g.PublicKeyCredential;
  Object.defineProperty(globalThis, 'isSecureContext', {
    value: false,
    configurable: true,
    writable: true,
  });
}
