# Third-Party Notices

## Mushaf SVG rendering data

The mushaf reader (`src/app/features/mushaf/`) renders Quran pages using the **quran-svg** dataset
from Quranpedia, loaded at runtime from the jsDelivr CDN, **pinned to commit**
`5fbcb1d4d92b5a2972ab51472fe991b6066bb6e2`:

`https://cdn.jsdelivr.net/gh/quranpedia/quran-svg@5fbcb1d4d92b5a2972ab51472fe991b6066bb6e2`

- Source: https://github.com/quranpedia/quran-svg
- These assets are **not** bundled or redistributed by this repository; they are fetched on demand
  from the public CDN.
- Attribution is surfaced in the UI under each rendered mushaf page.
- Five KFQC editions are offered (Hafs, Warsh, Qalun, Al-Duri, Shuʿbah). The Libyan Awqaf Qalun
  edition is omitted (non-commercial restriction / removed upstream).

> ⚠️ The upstream `quran-svg` repository does not currently include an explicit LICENSE file.
> Confirm redistribution/usage rights with the upstream project before relying on these assets in
> production.

Related dataset (not currently bundled): https://github.com/quranpedia/qiraat-ayah-map (MIT).
