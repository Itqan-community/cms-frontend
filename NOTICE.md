# Third-Party Notices

## Mushaf SVG rendering data

The mushaf reader (`src/app/features/mushaf/`) renders Quran pages using the **quran-svg** dataset
from Quranpedia, loaded at runtime from the jsDelivr CDN
(`https://cdn.jsdelivr.net/gh/quranpedia/quran-svg`).

- Source: https://github.com/quranpedia/quran-svg
- These assets are **not** bundled or redistributed by this repository; they are fetched on demand
  from the public CDN.
- Attribution is surfaced in the UI under each rendered mushaf page.

> ⚠️ The upstream `quran-svg` repository does not currently include an explicit LICENSE file.
> Confirm redistribution/usage rights with the upstream project before relying on these assets in
> production.

Related dataset (not currently bundled): https://github.com/quranpedia/qiraat-ayah-map (MIT).
