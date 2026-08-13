# UniPath v2.5 release notes

## Fixed
- Repeated predictions no longer drift heavily: AI holistic evidence is cached by applicant fingerprint and list banding is deterministic.
- School preference aliases now resolve to the internal catalog and are preserved in portfolio construction when compatible with the chosen scope.
- Added T30/T35/T50/T75/T100/all U.S. recommendation scopes.
- Roadmap generation is anchored to today + graduation year; past-dated open items can be explicitly cleared.
- UK track is independent of the U.S. ladder and preserves compatible Oxford/Cambridge/Imperial/LSE options. Oxbridge is never labeled UK Safer.
- Monte Carlo now renders one concrete simulated application cycle as well as aggregates.
- AI-provider branding was removed from student-facing analysis/loading/errors.

## Added
- Core English / Simplified Chinese UI setting and AI-response language propagation.
- Comfortable/compact density setting.
- AI-generated original student projects based on academic/project/interdisciplinary gaps.
- Admin one-click creation/reset of five non-admin demo users and demo selector on login.
- Provider-neutral API error messages.

## Model QA performed
- Identical applicant profile + identical AI evidence gives an identical Common App list across repeated predictions.
- T30/T35/T50 scopes produce 20 recommendation slots in representative social-science tests.
- Explicit UChicago/Northwestern/Brown/Cornell preferences survive list construction when within scope.
- Sociology UK test includes Oxford/Cambridge/LSE in competitive bands instead of all-safe output.
- Materials test includes Oxford/Cambridge/Imperial as competitive choices when field-compatible.
- Monte Carlo returns a non-empty visible cycle.
