
## Warm Academic production interface

UniPath 1.0 uses the selected **Warm Academic / Classic Editorial** visual system across the signed-out and signed-in web experience. The system uses an ivory canvas, forest-green primary actions, sage active states, editorial serif headings, low-contrast borders and restrained shadows. Light, Dark and System appearance controls remain available, with dark mode using the same academic identity rather than the previous blue/purple tech treatment.

# UniPath 1.0 — formal release feature map

UniPath 1.0 combines the planned College Intelligence and Applicant Intelligence releases into one formal web release.

## Applicant Intelligence

- Five-cluster applicant evidence graph:
  - Academic readiness
  - Intellectual profile
  - Execution & output
  - Leadership & impact
  - Application narrative
- Sub-dimension scoring with evidence traces rather than a single unexplained score.
- Application identity generated from the student's strongest recurring evidence.
- Strongest-signal and gap detection.
- Evidence-confidence label based on profile completeness and auditable inputs.
- Subject-level AP / IB / A-level preparation and major-foundation coverage.
- Project-content, method, output, duration, ownership and measurable-impact analysis.
- Bounded AI evidence layer remains subordinate to the deterministic model.

## Probability / portfolio model

- Student-facing output emphasizes a planning interval rather than a pseudo-precise percentage.
- Range confidence is separated from the modeled range itself.
- Internal center estimate retained for portfolio construction and Monte Carlo only.
- Explicit preference affects list priority, not admission probability.
- National University T20/T30 profile frontier remains separate from LAC category ranks.
- Strict U.S. rank filters surface clearly labeled reach overflow rather than pretending extra reaches are Targets.
- Liberal Arts Colleges can be globally included or excluded.
- LAC recommendation priority is field-aware and capped independently from the National University frontier.

## College Intelligence

- 69 source-backed admissions profiles using 148 official/institutional source links.
- Coverage includes high-priority U.S. research universities, all 23 modeled U.S. liberal arts colleges, Oxford, Cambridge, Imperial, UCL and LSE.
- College Detail differentiates:
  - Admissions DNA
  - institutional values / review emphasis
  - current applicant positioning
  - strongest alignment
  - open question / gap
  - culture / institutional voice
  - avoid / misuse guidance
  - course and project evidence
  - rounds, rankings and application-system context
  - source links
- Unresearched schools use a differentiated catalog interpretation explicitly labeled as UniPath analysis.
- College list shows a Source-backed badge when a hand-researched profile is available.
- Compare 2–4 schools across planning range, confidence, fit dimensions, preference, ranking context and Admissions DNA.
- Compare view includes a deterministic decision-frame takeaway and personalized strongest/weakest fit read.
- College sorting: UniPath recommendation / U.S. News / QS / chance high-low / chance low-high / course fit / project fit / preference.

## Prediction Version History

- Latest 12 runs loaded from Supabase.
- Each 1.0 run preserves its Applicant Intelligence graph.
- History compares the current run to the preceding saved run.
- Shows overall applicant-signal movement and largest changed evidence dimensions.
- Shows largest modeled school-range shifts for overlapping schools.
- Pre-1.0 runs remain visible as legacy history.

## Execution system

- First-use onboarding explains Applicant Intelligence, College Intelligence, projects and persistent planning.
- Opportunity catalog plus AI-generated original projects.
- Project Detail with admissions role, milestones, deliverables, success metrics, validation, resources and risks.
- Latest generated project set locally recoverable per account.
- Graduation-year-aware Roadmap with stale-item cleanup.
- Persistent AI Advisor grounded in saved profile, predictions, plans and roadmap.
- Advisor messages persist server-first, de-duplicate by client ID, load the most recent 100, mirror locally and resync on focus/visibility.

## Application strategy

- 20-school Common App portfolio when modeled coverage permits.
- Separate U.S. non-Common-App track.
- Separate UK track with UK-specific competitiveness bands.
- Automatic ED I / ED II / EA / REA / SCEA / RD / UC / UCAS planning.
- Round-conflict validation retained.
- Monte Carlo portfolio stress test and one visible simulated cycle.

## Data / settings / admin

- 150 modeled institutions.
- 23 U.S. liberal arts colleges.
- 114 majors.
- QS 2026 and U.S. News 2026 ranking snapshot for display/filter context.
- English / Simplified Chinese core interface.
- System / Light / Dark appearance.
- Comfortable / Compact density.
- Default U.S. ranking scope and Liberal Arts College preference.
- Admin school/high-school overrides and demo-account management.
