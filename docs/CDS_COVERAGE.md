# Common Data Set coverage

Generated: 2026-09-06

UniPath uses school-published Common Data Set documents for U.S. institutions. The discovery API is used only as a source index and extraction layer; every stored record retains the school's original CDS URL, document year, CDS field identifiers, extraction quality, and verification timestamp.

- U.S. schools in catalog: 110
- Official CDS documents located: 98
- CDS documents with usable structured values: 87
- Baseline admit rates updated from CDS counts: 78
- Documents held for year/source review: 11
- No CDS match/document found: 0

## Data rules

- Only values whose provenance layer is `cds` and whose extraction quality is `reported` or `derived` are stored.
- Acceptance rate is recalculated only when the same CDS supplies both total first-year applicants and admits.
- Yield is recalculated only when the same CDS supplies admits and enrolled first-year students.
- Missing values remain missing. IPEDS and College Scorecard figures are not copied into the CDS object.
- Documents without a canonical academic year are retained as `needs_review`; their extracted values do not update the catalog.
- Non-U.S. school records are left byte-for-byte equivalent at the object-data level and receive no CDS fields.

## Schools without a resolved CDS

- None
