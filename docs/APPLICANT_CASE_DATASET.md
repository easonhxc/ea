# Applicant case dataset

`data/applicant_cases.csv` is the reviewed training table for public, self-reported U.S. undergraduate application cases.

Only rows with `review_status=verified` may be used for model training. A row must keep the original public URL, collection date, a short evidence excerpt, and the fields used to assign its admission labels.

## Allowed collection scope

- Public pages that are accessible without login, CAPTCHA bypass, a paywall bypass, or session replay.
- Search engines are discovery tools. Store the original page URL as `source_url`; do not treat a search-result snippet as evidence.
- Respect each site's robots.txt, rate limits, and terms. Use an official API or written permission when a platform requires it.
- Remove names, usernames, emails, phone numbers, exact addresses, photos, student IDs, and other direct or linkable identifiers before a row is saved.
- Do not store age or date of birth. Keep only an application year and broad applicant type.
- Keep an outcome as `unknown` when the source does not clearly support admitted, rejected, or waitlisted.

## Field conventions

- `discovery_engine`: `google`, `bing`, `manual`, or `api`.
- `source_platform`: `xiaohongshu_public`, `wechat_public`, `personal_blog`, `forum`, `news`, or `other`.
- `admitted_schools`, `rejected_schools`, and `waitlisted_schools`: semicolon-separated school names; preserve the source's wording.
- `ap_ib_alevel_courses`, `activities`, `awards`, and `leadership`: concise semicolon-separated facts, not copied full posts.
- `label_confidence`: `high`, `medium`, or `low`.
- `pii_removed`: must be `true` for a verified row.
- `consent_or_license`: `public_self_report`, `permission`, or `licensed`; `unknown` rows cannot be verified.
- `review_status`: `pending`, `verified`, or `rejected`.

The first collection pass should populate a review queue. It should not silently turn unverified pages into training labels or add synthetic examples to this file.
