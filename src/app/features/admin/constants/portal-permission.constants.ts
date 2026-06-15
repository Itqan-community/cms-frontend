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

  PORTAL_READ_PUBLISHER: 'portal_read_publisher',
  PORTAL_CREATE_PUBLISHER: 'portal_create_publisher',
  PORTAL_UPDATE_PUBLISHER: 'portal_update_publisher',
  PORTAL_DELETE_PUBLISHER: 'portal_delete_publisher',

  /** Issue reports (portal) — pending backend `PermissionChoice` seeds. */
  PORTAL_READ_ISSUE_REPORT: 'portal_read_issue_report',
  PORTAL_CREATE_ISSUE_REPORT: 'portal_create_issue_report',
  PORTAL_UPDATE_ISSUE_REPORT: 'portal_update_issue_report',
  PORTAL_DELETE_ISSUE_REPORT: 'portal_delete_issue_report',

  PORTAL_VIEW_PUBLISHER_MEMBERS: 'portal_view_publisher_members',
  PORTAL_INVITE_PUBLISHER_MEMBERS: 'portal_invite_publisher_members',
  PORTAL_UPDATE_PUBLISHER_MEMBERS: 'portal_update_publisher_members',
  PORTAL_DELETE_PUBLISHER_MEMBERS: 'portal_delete_publisher_members',
} as const;

export type PortalPermissionCode = (typeof PORTAL_PERMISSIONS)[keyof typeof PORTAL_PERMISSIONS];
