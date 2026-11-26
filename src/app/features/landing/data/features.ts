/**
 * The landing-page feature showcase: features that work today, shown 5 at a time. The page never
 * states the total, so add or remove entries freely (with their copy). Copy lives in
 * i18n under LANDING.FEATURES.ITEMS.<key>; `icon` is a 24×24 stroke path. When a big feature ships,
 * ask whether it belongs here (TODO B9).
 */
export interface ShowcaseFeature {
  key: string;
  icon: string;
}

export const SHOWCASE_FEATURES: readonly ShowcaseFeature[] = [
  { key: 'F1', icon: 'M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 17.5l9 5 9-5' },
  { key: 'F2', icon: 'M14 3H6v18h12V7l-4-4ZM14 3v4h4M8 12h8M8 16h8M12 10v8' },
  { key: 'F3', icon: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2' },
  { key: 'F4', icon: 'M6 12h4m0 0 4-6h6M10 12l4 6h6M14 12h6' },
  {
    key: 'F5',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9M12 3C9.5 5.5 8.5 8.5 8.5 12s1 6.5 3.5 9',
  },
  { key: 'F6', icon: 'M3 12V4h8l10 10-8 8L3 12ZM7.5 7.5h.01' },
  { key: 'F7', icon: 'M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4' },
  { key: 'F8', icon: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM4 21a2 2 0 0 1 2-2h13' },
  { key: 'F9', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { key: 'F10', icon: 'M4 6h16v14H4V6ZM4 10h16M8 3v4M16 3v4' },
  { key: 'F11', icon: 'M5 21V4h11l-2 4 2 4H5' },
  {
    key: 'F12',
    icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6',
  },
  { key: 'F13', icon: 'M6 11h12v10H6V11ZM8 11V7a4 4 0 0 1 8 0v4' },
  {
    key: 'F14',
    icon: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  },
  { key: 'F15', icon: 'M4 5h16v14H4V5ZM7 9l3 3-3 3M12 15h5' },
  {
    key: 'F16',
    icon: 'M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4',
  },
  {
    key: 'F17',
    icon: 'M8 4c-2 0-2 2-2 4s-2 4-2 4 2 2 2 4 0 4 2 4M16 4c2 0 2 2 2 4s2 4 2 4-2 2-2 4 0 4-2 4',
  },
  { key: 'F18', icon: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15h3v5H4v-5ZM17 15h3v5h-3v-5Z' },
  { key: 'F19', icon: 'M3 5h10M8 3v2M5 5c1 4 4 7 7 8M11 5c-1 4-4 7-7 8M14 21l4-9 4 9M15.5 18h5' },
  {
    key: 'F20',
    icon: 'M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9',
  },
];

export const SHOWCASE_PAGE_SIZE = 5;
export const SHOWCASE_INTERVAL_MS = 6000;
