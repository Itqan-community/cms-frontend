import type { ContentEntry } from '../models/asset-content.models';
import type { ContentTemplate } from '../models/content-template.models';
import { contentEntryKey } from './content-template.util';

export interface ContentDiffRow {
  key: string;
  entry: ContentEntry;
  beforeText: string;
  afterText: string;
  beforeFootnotes: string;
  afterFootnotes: string;
  textChanged: boolean;
  footnotesChanged: boolean;
}

/**
 * Compute changed rows between a base (published) version and the current draft.
 * Client-side MVP — superseded by `GET .../versions/{id}/diff/?base=` once the backend ships.
 */
export function computeContentDiff(
  template: ContentTemplate,
  baseEntries: ContentEntry[],
  draftEntries: ContentEntry[]
): ContentDiffRow[] {
  const baseByKey = new Map(baseEntries.map((e) => [contentEntryKey(template, e), e]));
  const diffs: ContentDiffRow[] = [];

  for (const entry of draftEntries) {
    const key = contentEntryKey(template, entry);
    const base = baseByKey.get(key);
    const beforeText = base?.text ?? '';
    const beforeFootnotes = base?.footnotes ?? '';
    const afterText = entry.text ?? '';
    const afterFootnotes = entry.footnotes ?? '';
    const textChanged = beforeText !== afterText;
    const footnotesChanged = beforeFootnotes !== afterFootnotes;
    if (textChanged || footnotesChanged) {
      diffs.push({
        key,
        entry,
        beforeText,
        afterText,
        beforeFootnotes,
        afterFootnotes,
        textChanged,
        footnotesChanged,
      });
    }
  }

  return diffs;
}
