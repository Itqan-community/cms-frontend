/**
 * Selection rules for the role editor's permission checklist.
 *
 * The backend grants every permission a selected one implies (e.g. CREATE brings READ and
 * UPDATE). The editor mirrors that: it keeps the permissions the user chose ("explicit") and
 * shows everything they imply as included — ticked and locked — so it is clear that granting
 * one permission grants the others too. The explicit set is kept minimal: a choice that another
 * choice already implies is dropped, so CREATE and UPDATE (which imply each other) never lock
 * each other.
 */

/** Permission code → every code it implies (transitively), as returned by the catalogue. */
export type ImpliesMap = ReadonlyMap<string, readonly string[]>;

/** Everything granted by `explicit`: the codes themselves plus all they imply. */
export function includedPermissions(explicit: Iterable<string>, implies: ImpliesMap): Set<string> {
  const included = new Set<string>();
  for (const code of explicit) {
    included.add(code);
    for (const implied of implies.get(code) ?? []) {
      included.add(implied);
    }
  }
  return included;
}

/** The new explicit set after the user ticks or unticks `code`. */
export function togglePermission(
  explicit: readonly string[],
  code: string,
  checked: boolean,
  implies: ImpliesMap,
  order: readonly string[]
): string[] {
  if (!checked) {
    return explicit.filter((c) => c !== code);
  }
  // The clicked permission wins ties, so ticking UPDATE keeps UPDATE explicit (not CREATE).
  return minimalExplicit([code, ...explicit.filter((c) => c !== code)], implies, order, code);
}

/** The explicit set for a saved role (the backend stores the full implied closure). */
export function explicitFromSaved(
  saved: readonly string[],
  implies: ImpliesMap,
  order: readonly string[]
): string[] {
  return minimalExplicit(saved, implies, order);
}

/**
 * Strongest-first greedy cover: take permissions with the largest implied set first and skip any
 * already covered by an earlier pick. Ties go to `preferred`, then to catalogue `order`.
 */
function minimalExplicit(
  codes: readonly string[],
  implies: ImpliesMap,
  order: readonly string[],
  preferred?: string
): string[] {
  const rank = (code: string) => {
    const index = order.indexOf(code);
    return index === -1 ? order.length : index;
  };
  const candidates = [...new Set(codes)].sort((a, b) => {
    const bySize = (implies.get(b)?.length ?? 0) - (implies.get(a)?.length ?? 0);
    if (bySize !== 0) return bySize;
    if (a === preferred) return -1;
    if (b === preferred) return 1;
    return rank(a) - rank(b);
  });
  const covered = new Set<string>();
  const explicit: string[] = [];
  for (const code of candidates) {
    if (covered.has(code)) continue;
    explicit.push(code);
    for (const included of includedPermissions([code], implies)) {
      covered.add(included);
    }
  }
  return explicit;
}
