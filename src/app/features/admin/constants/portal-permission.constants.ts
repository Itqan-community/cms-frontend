/** Backend `PermissionChoice` values (django) — use for guards and UI gates. */
export const PORTAL_PERMISSIONS = {
  PORTAL_ACCESS: 'portal_access',

  PORTAL_READ_RECITER: 'portal_read_reciter',
  PORTAL_CREATE_RECITER: 'portal_create_reciter',
  PORTAL_UPDATE_RECITER: 'portal_update_reciter',
  PORTAL_DELETE_RECITER: 'portal_delete_reciter',

  PORTAL_READ_RECITATION: 'portal_read_recitation',
  PORTAL_CREATE_RECITATION: 'portal_create_recitation',
  PORTAL_UPDATE_RECITATION: 'portal_update_recitation',
  PORTAL_DELETE_RECITATION: 'portal_delete_recitation',

  PORTAL_UPLOAD_TIMING: 'portal_upload_timing',

  PORTAL_READ_TAFSIR: 'portal_read_tafsir',
  PORTAL_CREATE_TAFSIR: 'portal_create_tafsir',
  PORTAL_UPDATE_TAFSIR: 'portal_update_tafsir',
  PORTAL_DELETE_TAFSIR: 'portal_delete_tafsir',

  PORTAL_READ_TRANSLATION: 'portal_read_translation',
  PORTAL_CREATE_TRANSLATION: 'portal_create_translation',
  PORTAL_UPDATE_TRANSLATION: 'portal_update_translation',
  PORTAL_DELETE_TRANSLATION: 'portal_delete_translation',
} as const;

export type PortalPermissionCode = (typeof PORTAL_PERMISSIONS)[keyof typeof PORTAL_PERMISSIONS];
