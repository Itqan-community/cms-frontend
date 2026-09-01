# Asset Deep Edit — Backend Contract

Frontend repo: `cms-frontend`. Portal base: `{ADMIN_API_BASE_URL}` (`/portal`).

This document defines the API the admin content editor needs for templates, language instances,
diff-based review, and scaled word editing. Shapes follow existing portal conventions (Django Ninja
pagination, `error_name` errors).

---

## 1. Asset fields (write-once at creation)

Extend `TafsirOut` / `TranslationOut` and create payloads:

| Field              | Type   | Required                   | Notes                                                           |
| ------------------ | ------ | -------------------------- | --------------------------------------------------------------- |
| `template`         | enum   | yes                        | `surah` \| `ayah` \| `page` \| `word`                           |
| `mushaf_print`     | enum   | when `template === 'page'` | `madinah_1405` \| `madinah_1422` \| `madinah_1441` \| `indopak` |
| `default_language` | string | no                         | BCP-47 code; seeds default language instance                    |

**Rules:** `template` and `mushaf_print` are immutable after `POST`. PATCH/PUT must reject changes
with `TEMPLATE_IMMUTABLE`.

---

## 2. Language instances

Mirror recitation folders router.

```
GET    /portal/content/{tafsirs|translations}/{slug}/languages/
POST   /portal/content/{tafsirs|translations}/{slug}/languages/
PATCH  /portal/content/{tafsirs|translations}/{slug}/languages/{lang_slug}/
DELETE /portal/content/{tafsirs|translations}/{slug}/languages/{lang_slug}/
```

### `LanguageInstanceOut`

```json
{
  "id": 1,
  "language_code": "ar",
  "name": "Arabic",
  "slug": "ar",
  "is_default": true,
  "is_visible": true,
  "entries_count": 6236,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### `LanguageInstanceWriteIn`

```json
{
  "language_code": "en",
  "name": "English",
  "is_visible": true,
  "is_default": false
}
```

**Rules:**

- One instance per `language_code` per asset.
- Exactly one `is_default: true`; default cannot be deleted or hidden.
- All content endpoints below accept optional language scope via path prefix:
  `/portal/content/{kind}/{slug}/languages/{lang_slug}/…`

---

## 3. Content draft & entries (language-scoped)

Existing routes, optionally prefixed with `/languages/{lang_slug}/`:

```
POST   …/draft/
GET    …/versions/{id}/entries/?page=&page_size=&sura=
PATCH  …/versions/{id}/entries/     { "rows": [ { "ayah_id", "text", "footnotes" } ] }
POST   …/versions/{id}/publish/     { "name?", "summary?" }
DELETE …/versions/{id}/
GET    …/versions/{id}/export/
```

### New query param

| Param  | Type | Purpose                                                             |
| ------ | ---- | ------------------------------------------------------------------- |
| `sura` | int  | Return only entries for one surah (required for `word` template UX) |

---

## 4. Version state machine

Extend `ContentVersionOut.state`:

```
draft | ready_for_review | changes_requested | published
```

### Submit for review (diff only)

```
POST …/versions/{id}/submit-review/
```

**Behaviour:**

- Compare draft entries to latest `published` version for the same language instance.
- Persist only changed rows as the review unit.
- Transition `draft` → `ready_for_review`.
- If no diff rows, return `400` with `error_name: NO_CHANGES_TO_REVIEW`.

### Publish from review

```
POST …/versions/{id}/publish/
```

When `state === ready_for_review`, require all diff rows approved before transition to `published`.

---

## 5. Diff endpoint

```
GET …/versions/{id}/diff/?base={base_version_id}
```

### `ContentDiffResponse`

```json
{
  "version_id": 12,
  "base_version_id": 11,
  "state": "ready_for_review",
  "count": 3,
  "results": [
    {
      "row_key": "2:255",
      "sura": 2,
      "aya": 255,
      "surah_name": "البقرة",
      "before_text": "…",
      "after_text": "…",
      "before_footnotes": "",
      "after_footnotes": "1",
      "approved": false,
      "comments_count": 0
    }
  ]
}
```

`row_key` format by template:

| Template    | Key             |
| ----------- | --------------- |
| ayah / word | `{sura}:{aya}`  |
| surah       | `{sura}`        |
| page        | `{page_number}` |

---

## 6. Per-row approve & comments

```
POST   …/versions/{id}/rows/{row_key}/approve/
GET    …/versions/{id}/rows/{row_key}/comments/
POST   …/versions/{id}/rows/{row_key}/comments/   { "body": "…" }
```

Reviewers have read-only access to entries; they cannot PATCH rows.

### `ContentRowCommentOut`

```json
{
  "id": 1,
  "version_id": 12,
  "row_key": "2:255",
  "author_id": 5,
  "author_name": "Reviewer",
  "body": "Please cite the source.",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## 7. Permissions

Add `PermissionChoice` seeds:

| Code                                | Purpose                    |
| ----------------------------------- | -------------------------- |
| `portal_review_tafsir_content`      | Open tafsir review UI      |
| `portal_review_translation_content` | Open translation review UI |
| `portal_approve_content_changes`    | Approve diff rows          |

---

## 8. Reference data (backend-owned)

| Data                                    | Why                       |
| --------------------------------------- | ------------------------- |
| Per-print page maps (604 pages × print) | Page template row seeding |
| Canonical word IDs (~77k)               | Word template stable keys |

Frontend currently bundles a single print in `quraan_data.json` for empty-template CSV MVP only.

---

## 9. Frontend feature flags

| Flag                     | When `true`                                       |
| ------------------------ | ------------------------------------------------- |
| `assetTemplates`         | Send `template` / `mushaf_print` on create        |
| `assetLanguageInstances` | Hit language router; language-scoped content URLs |
| `contentReviewWorkflow`  | Hit submit-review / diff / approve / comment APIs |
| `contentDiffView`        | Client-side diff MVP (superseded by §5)           |
