# UniPath v2.8 — guided, explorable planning

UniPath is a persistent university-planning system for high-school applicants. v2.8 focuses on making the web product understandable on first use and making recommendations explorable instead of flattening everything into repeated cards.

## v2.8 highlights

- First-use onboarding: a four-step guide explains Profile → College Model → original projects → persistent Advisor. It appears once per browser/account and can be replayed from Settings.
- Sortable College Model: keep the UniPath recommendation order or sort by QS, U.S. News category rank, modeled probability, course fit, project fit, or the student's explicit school preference.
- U.S. News category-aware sorting: National Universities and National Liberal Arts Colleges stay in separate published categories instead of being treated as one combined ranking.
- School-specific College Detail: 34 high-priority universities/LACs now have source-backed admissions profiles built from current official admissions pages, official admissions blogs/guides, and institutional student-voice material. All other catalog schools still receive a differentiated dynamic detail view from institution type, setting, research intensity, program support, and the applicant's actual evidence.
- School Detail now separates: what the school appears to value, how the applicant could be positioned, evidence behind fit, risks/gaps, culture/student voice, ranking/rounds, admissions context, and research sources.
- Original Project Detail: every generated project opens into its own page with admissions role, evidence gap addressed, milestones, deliverables, success metrics, external validation, resources/risks, and legitimate application uses.
- Project generation prompt now requests milestones, resources, risks, and an explicit non-promissory admissions-impact explanation.
- Generated original projects are cached locally per account so navigating away/reloading does not immediately erase the latest generated set.
- Existing v2.7 persistence remains: Advisor messages are written server-first, de-duplicated by client ID, latest-100 server-synced, mirrored locally, and refreshed on focus/visibility.

## Existing core

- Persistent Supabase account + structured applicant profile.
- AI import from mixed Chinese/English résumé and transcript notes.
- Subject-level AP / IB / A-level analysis and project-content evidence scoring.
- 150 modeled institutions including 23 U.S. liberal arts colleges; LACs can be included/excluded globally.
- U.S. rank scopes All / T30 / T35 / T50 / T75 / T100 by U.S. News category.
- Profile-aware National University T20/T30 frontier plus independent LAC fit/selectivity logic.
- 20-school Common App track, separate non-Common-App U.S. track, and independent UK track.
- Automatic ED/EA/RD/UC/UCAS planning and Monte Carlo portfolio simulation.
- Opportunity catalog + original project planner + graduation-year-aware Roadmap.
- English / Simplified Chinese, comfortable/compact density, System/Light/Dark appearance.
- Admin data overrides and ordinary classmate demo accounts.
