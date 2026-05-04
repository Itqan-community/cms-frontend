/** Minimal typing for Google Identity Services (loaded at runtime). */

export type GsiCredentialCallback = (credentialResponse: { credential?: string }) => void;

export type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: GsiCredentialCallback;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: number | string;
      logo_alignment?: 'left' | 'center';
      locale?: string;
    }
  ) => void;
  cancel: () => void;
  prompt: (
    momentListener?: (notification: {
      getMomentType?: () => string;
      isDisplayed?: () => boolean;
      isSkippedMoment?: () => boolean;
      getSkippedReason?: () => string;
      isDismissedMoment?: () => boolean;
    }) => void
  ) => void;
};

export type GoogleGsiGlobal = {
  accounts: { id: GoogleAccountsId };
};

export function getGsiGoogle(): GoogleGsiGlobal | undefined {
  return (window as unknown as { google?: GoogleGsiGlobal }).google;
}
