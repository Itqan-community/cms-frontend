export enum Categories {
  TEXT = 'text',
  RECITATION = 'recitation',
  FONT = 'font',
  PROGRAM = 'program',
}

/** Tags of text assets the gallery filters by, next to the other categories. */
export const GALLERY_TEXT_TAGS = ['tafsir', 'translation'] as const;

/** Gallery filter options in display order: text asset tags, then categories. */
export const GALLERY_CATEGORY_ORDER: string[] = [
  ...GALLERY_TEXT_TAGS,
  Categories.RECITATION,
  Categories.FONT,
  Categories.PROGRAM,
];

/** Icon for an asset: text assets by their first tag, others by category. */
export function assetKindIcon(category: string, tags: { slug: string }[] = []): string {
  const kind = category === Categories.TEXT ? (tags[0]?.slug ?? category) : category;
  switch (kind) {
    case 'tafsir':
    case Categories.TEXT:
      return 'lucideFileText';
    case 'translation':
      return 'lucideLanguages';
    case Categories.RECITATION:
      return 'lucideMic';
    case Categories.FONT:
      return 'lucideType';
    case Categories.PROGRAM:
      return 'lucideLayers';
    default:
      return 'lucideFile';
  }
}
