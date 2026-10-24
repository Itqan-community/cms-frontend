/** The language to show first: the UI language when the asset offers it, else its first one. */
export function preferredLanguage(available: readonly string[], uiLang: string): string | null {
  return available.includes(uiLang) ? uiLang : (available[0] ?? null);
}
