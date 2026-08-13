# UniPath v2.7 — concise feature overview

UniPath is a persistent university-planning system. v2.7 focuses on the web product: a cleaner college list with dedicated College Detail views, a profile-aware T20/T30 recommendation frontier, calibrated probability intervals, optional liberal-arts-college inclusion, stronger LAC major-fit logic, and more durable AI Advisor history.

Core capabilities include:

- Persistent Supabase account + structured applicant profile.
- AI import from mixed Chinese/English résumé and transcript notes.
- Subject-level AP / IB / A-level analysis and project-content evidence scoring.
- 150 modeled institutions, including 23 U.S. liberal arts colleges.
- Liberal arts colleges can be included/excluded globally from Settings or toggled directly in College recommendations.
- U.S. ranking scopes: All / T30 / T35 / T50 / T75 / T100, with National Universities and National Liberal Arts Colleges kept in their separate U.S. News categories.
- Calibrated National University T20/T30 recommendation frontier that separates “worth recommending” from “admission probability,” while LACs use their own category-aware fit/selectivity logic.
- Strong-profile frontier quotas plus explicit rank-filter overflow warnings for profiles whose strict rank scope forces extra reaches.
- College Detail view for course evidence, project evidence, interdisciplinary fit, risks, ranking, round availability and model/source notes.
- Simplified college-list rows: no repeated model disclaimers or source notes under every school.
- 20-school Common App planning track, separate non-Common-App U.S. track and independent UK track.
- Automatic ED/EA/RD/UC/UCAS planning and Monte Carlo simulation with both T20-category and T30-category hit rates.
- Persistent AI Advisor with server-first message writes, idempotent client IDs, latest-100-message sync, local cache recovery and focus/visibility refresh.
- Graduation-year-aware Roadmap, opportunity matching and AI-generated original projects.
- English / Simplified Chinese, comfortable/compact density and System/Light/Dark appearance.
- Admin data overrides and non-admin demo accounts.
