# UniPath v2.7 — Web calibration & persistence release

Date: 2026-08-13

## 1. Recommendation frontier

- Admission probability and recommendation priority remain separate.
- Competitive signal now combines overall evidence, academics, auditable major fit and activities rather than using one overall number alone.
- Strong, well-matched applicants receive bounded National University T20/T30 portfolio slots. LAC ranks are not treated as numerically equivalent to National University ranks.
- Strict T30/T35/T50 filters no longer cause the fallback to prestige-sort into unnecessary National University T20s. The fallback exhausts lower-ranked in-scope choices first and reports any forced frontier overflow.
- User school preference changes list priority but does not modify admission probability.

Calibration spot-checks use current official institutional snapshots where available. Brown Class of 2030: 5.6% overall first-year admission; Northwestern Class of 2030: approximately 7%; Williams Class of 2029: 8.6%. These are baselines/context, not personal probabilities.

## 2. Liberal arts colleges

- `include_liberal_arts_colleges` is now a persistent profile setting, default `true`.
- College page has a one-click Include/Exclude LAC control; Settings has the same preference.
- Excluding LACs removes them from the actual model candidate universe, not just the UI filter.
- LAC list priority is field-aware: humanities/social science receives the strongest undergraduate-focus fit benefit; natural/life science receives a modest benefit; engineering/business do not receive a blanket LAC boost.
- Explicitly liked LACs can still receive recommendation priority when the modeled program is compatible.
- Rose-Hulman’s legacy generic seed catalog was corrected against its official undergraduate majors page so social-science majors are not incorrectly treated as direct programs there.

## 3. College Detail

College list rows are intentionally compact. Detailed information now lives in one dedicated detail surface:

- planning probability interval + modeled center
- course fit and supporting courses
- project-content fit and supporting activities/projects
- interdisciplinary fit
- academic/project gaps
- LAC-specific field-fit interpretation
- rankings and available rounds
- high-school context when available
- source/model note

This removes repeated disclaimer/source text from every list row.

## 4. Advisor persistence

The previous flow wrote the user question only after the AI request completed. v2.7 changes that order:

1. user question is inserted into Supabase immediately with a `client_id`;
2. an existing completed reply for that same client ID is reused instead of duplicated;
3. AI answer is written as a separate database row;
4. the browser mirrors recent messages to a per-user local cache;
5. returning to Advisor, browser focus and visibility restoration re-sync the server history;
6. history queries now fetch the latest 100 messages rather than the oldest 80/100.

If generation is interrupted, the question itself remains recoverable instead of disappearing with the page request.

## 5. Simulation

Monte Carlo output now exposes both:

- T20-category hit rate
- T30-category hit rate

These are computed from the same modeled application plan shown to the user.

## Validation performed

- Pure admissions-engine regression: strong Sociology profile, LAC on/off.
- Pure admissions-engine regression: strong Materials/Environmental Engineering profile.
- Weak-profile regression under strict T50 scope to test frontier overflow behavior.
- JavaScript syntax checks for admissions, simulator and API route.
- TypeScript parser check of `app/page.jsx` with JSX enabled.
- JSON parse validation for data/config files.

A full `next build` could not be completed in the current isolated environment because package installation has no network access. Vercel production/preview build remains the final deployment verification step.
