# UniPath v2.8.0 — Web Exploration Release

## Why this release

v2.7 made the underlying list model more stable. v2.8 makes the product easier to understand and makes each recommendation worth opening. The design goal is fewer repeated micro-disclaimers in list views and more useful depth behind deliberate clicks.

## 1. First-use guide

New accounts/browsers receive a four-step modal walkthrough:

1. Complete one persistent Profile.
2. Run the College Model, then use sorting/filter controls to inspect it.
3. Open original projects for execution and application-impact plans.
4. Use Roadmap + Advisor as a continuing planning system.

The guide is stored locally per signed-in account and can be replayed from Settings.

## 2. College sorting

College results can now be sorted by:

- UniPath recommendation order
- U.S. News category rank
- QS rank
- Modeled chance, high → low
- Modeled chance, low → high
- Course fit
- Project fit
- Explicit student preference

U.S. News National Universities and National Liberal Arts Colleges are grouped in their separate ranking systems; a LAC #10 is not silently treated as the same ranking object as a National University #10.

## 3. School-specific College Detail

A new `data/school-insights.json` knowledge layer contains hand-researched source-backed admissions/culture profiles for 34 high-priority schools. Sources are primarily current official undergraduate-admission pages, plus official admissions/student blogs or guides where they add useful institutional voice.

The first researched set includes major reach/recommendation schools such as Harvard, MIT, Stanford, Princeton, Yale, Brown, UChicago, Northwestern, Cornell, Johns Hopkins, Penn, Duke, Georgetown, Columbia, Rice, Vanderbilt, Dartmouth, Tufts, USC, Michigan, NYU, Boston University, Emory, UC Berkeley, UCLA and UVA, plus priority liberal arts colleges including Williams, Amherst, Pomona, Swarthmore, Bowdoin, Middlebury, Claremont McKenna and Haverford.

For these schools, detail pages now show:

- a school-specific signature
- values/signals the institution publicly emphasizes
- how the applicant's file could read in that context
- a school-specific positioning direction
- what generic framing to avoid
- institutional/student voice context
- direct research-source links

For the rest of the 150-school catalog, v2.8 generates a differentiated fallback from institution type, research intensity, setting, program match and the applicant's evidence. It does **not** claim that an unresearched school officially values a specific trait.

## 4. Original Project Detail

Generated projects are no longer giant cards containing the whole plan. The list view is concise; clicking **View full plan** opens:

- why this project fits the student
- the evidence gap it is designed to address
- its likely application role if actually completed
- milestones / phases and proof to retain
- final deliverables
- success metrics
- external validation options
- resources and execution risks
- legitimate application uses

The UI explicitly distinguishes planned work from completed evidence and avoids implying that creating a project guarantees admission benefit.

## 5. Project planner output

The DeepSeek project-planner JSON contract now requests:

- `milestones`
- `resources`
- `risks`
- `admissions_impact.primary_signal`
- `admissions_impact.why_it_matters`
- `admissions_impact.secondary_signals`
- `admissions_impact.application_uses`

Older cached project objects remain viewable because the frontend derives safe fallback impact/milestone text when those fields are absent.

## 6. Persistence polish

The latest generated original-project set is mirrored to local storage per signed-in account, reducing accidental loss when the user leaves/reloads the Opportunities page.

Advisor persistence from v2.7 remains unchanged and continues to use server-first writes + local recovery.

## Validation performed

- `app/page.jsx` parsed successfully with the installed TypeScript JSX transpiler.
- `lib/project-planner-ai.js` parsed successfully.
- JSON data files including `school-insights.json` parse successfully.
- Source-backed school insight coverage: 34 institutions.
- Production `next build` could not run in this sandbox because `node_modules` is not installed (`next: not found`). Vercel build should be used as the production integration check after push.
