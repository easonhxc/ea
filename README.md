# UniPath 1.0 — Admissions Planning OS

UniPath 1.0 is the first formal release of a persistent university-planning system for high-school applicants. It combines a deterministic admissions-planning model with bounded AI evidence analysis, school-specific admissions intelligence, long-term applicant tracking, project planning, application strategy, and a persistent advisor.

The product is designed around one continuous loop:

```text
Profile
  -> Applicant Intelligence
  -> College Intelligence + portfolio
  -> Strategy + projects + roadmap
  -> completed evidence
  -> updated Profile
  -> new prediction version
```

## What is new in 1.0

### Applicant Intelligence

The profile is no longer reduced to a single applicant score. UniPath builds an evidence graph across five clusters:

- Academic readiness
- Intellectual profile
- Execution & output
- Leadership & impact
- Application narrative

Each cluster contains auditable sub-dimensions, evidence notes, and a score. The system also produces:

- an application identity;
- strongest current signals;
- evidence gaps;
- an overall evidence-confidence label;
- version-to-version changes after future prediction runs.

The graph is derived from entered facts such as subject-level courses, grades/testing context, activity depth, research methods, responsibility, outputs, awards, measurable outcomes and major alignment. It is not a personality diagnosis or an admissions-office rubric.

### Planning ranges instead of pseudo-precise odds

School predictions are now presented primarily as a planning interval with an evidence-confidence label. An internal center estimate is retained for Monte Carlo simulation and portfolio logic, but the UI avoids presenting that center as a precise personal acceptance probability.

The range is derived from institutional baseline data, applicant competitive signal, program fit, international/aid context where applicable, and bounded verified school context. It remains a planning model, not an admissions-office probability.

### Prediction Version History

Every saved prediction run preserves the Applicant Intelligence graph and school ranges from that moment. History can show:

- overall applicant-signal movement;
- the largest changed evidence dimensions;
- modeled school-range movement for overlapping schools;
- legacy labeling for prediction runs created before the 1.0 graph existed.

This turns UniPath into a longitudinal planning tool rather than a one-time calculator.

### College Intelligence

The College Model now separates four jobs that should not be conflated:

1. recommendation / portfolio construction;
2. admission-range modeling;
3. rankings as display context;
4. school-specific admissions interpretation.

UniPath 1.0 ships with **69 hand-researched, source-backed school profiles using 148 institutional/official links**. These include high-priority U.S. universities, all 23 liberal arts colleges in the modeled U.S. LAC catalog, and elite UK institutions. The remaining catalog schools receive a differentiated catalog-based interpretation that is explicitly labeled as UniPath analysis rather than an unpublished institutional rubric.

Each researched College Detail can contain:

- Admissions DNA / school signature;
- what the institution appears to value;
- how the current applicant could position their real evidence;
- strongest alignment and open question;
- school-specific culture / institutional voice;
- what not to default to in a Why School argument;
- official/institutional research sources;
- the applicant's course, project and interdisciplinary evidence;
- risks/gaps, rounds and ranking context.

### College Compare

Users can compare 2–4 schools side by side across:

- planning range and confidence;
- course fit;
- project fit;
- interdisciplinary fit;
- stated user preference;
- U.S. News / QS context;
- Admissions DNA;
- personalized strongest/weakest fit read.

The comparison explicitly avoids treating the highest rank as the automatic best choice.

## Existing core retained in 1.0

- First-use onboarding, replayable from Settings.
- Persistent Supabase account + structured applicant profile.
- AI profile import from mixed Chinese/English résumé-style text.
- Subject-level AP / IB / A-level evaluation rather than raw course counts.
- Major fit from prerequisites, course relevance, actual project content, outputs, and interdisciplinary evidence.
- Deterministic-first hybrid model; bounded AI holistic evidence is cached for stability.
- Explicit school preferences affect recommendation priority and ED planning, not admission probability.
- U.S. recommendation scopes: All / T30 / T35 / T50 / T75 / T100 by the correct U.S. News category.
- Global Liberal Arts College include/exclude preference.
- Profile-aware National University T20/T30 frontier plus independent field-aware LAC selection.
- Automatic 20-school Common App portfolio when catalog coverage permits.
- Separate U.S. non-Common-App and UK tracks.
- UK academic/course-specific modeling with Oxford/Cambridge/Imperial/LSE protected from U.S.-style safety labeling.
- QS 2026 and U.S. News 2026 ranking snapshots as display context only.
- Sorting by recommendation, U.S. News, QS, planning center, course fit, project fit, or explicit preference.
- Automatic ED I / ED II / EA / REA / SCEA / RD / UC / UCAS strategy.
- Monte Carlo portfolio stress test plus one visible sample cycle.
- 150-institution seed catalog including 23 U.S. liberal arts colleges and 114 majors.
- Curated opportunity catalog plus AI-generated original projects with full Project Detail plans.
- Graduation-year-aware Roadmap.
- Persistent AI Advisor: user messages are persisted before AI generation, recent messages are server-synced and locally mirrored for recovery.
- English / Simplified Chinese, comfortable/compact density, System/Light/Dark appearance.
- Admin data overrides and five ordinary non-admin demo-account helpers.

## Architecture

```text
Browser
  | Supabase Auth
  v
Next.js / Vercel
  |
  +-- /api/unipath
       |
       +-- AI provider (server-only)
       |    - profile extraction
       |    - bounded holistic evidence assessment
       |    - original project generation
       |    - roadmap generation
       |    - persistent advisor
       |
       +-- UniPath deterministic engine
       |    - subject-level academic fit
       |    - project/interdisciplinary evidence fit
       |    - Applicant Intelligence graph
       |    - school + major planning ranges
       |    - explicit preference/list construction
       |    - U.S./UK track separation
       |    - round strategy + Monte Carlo
       |
       +-- Supabase Postgres
            - profiles
            - application_plans
            - prediction_runs
            - saved_opportunities
            - roadmap_items
            - conversation_messages
            - school_overrides
            - high_school_outcome_overrides
            - feedback
```

## Environment variables

```env
DEEPSEEK_API_KEY=your_server_only_key
DEEPSEEK_MODEL=your_current_supported_model

NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Preferred server key; legacy service role also works as fallback.
SUPABASE_SECRET_KEY=sb_secret_xxx
# SUPABASE_SERVICE_ROLE_KEY=legacy_service_role_if_needed

ADMIN_EMAILS=admin@example.com
```

Never expose an AI provider key or Supabase server/service key through `NEXT_PUBLIC_*` variables or commit them to GitHub.

## Supabase

Run `supabase/schema.sql` when setting up a new project.

**Upgrade from v2.8:** UniPath 1.0 does not require a new database table or migration. The new Applicant Intelligence graph and model version are stored inside each `prediction_runs.result` JSON object. Existing historical runs remain readable and are labeled as legacy until a new prediction is created.

## Local development

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run build
npm start
```

## Data and model maintenance

- `data/schools.json` — institution seed catalog
- `data/rankings-2026.json` — ranking snapshot used for display/filter context
- `data/school-insights.json` — source-backed College Intelligence profiles
- `data/rounds.json` — application-round policy snapshot
- `data/major-fit-profiles.json` — subject/project fit definitions
- `data/high-schools.json` — school directory and verified aggregate context seeds
- `docs/DATA_SOURCES.md` — source/maintenance rules
- `docs/MODEL.md` — model principles

Admissions policies, deadlines, Common App participation, aid policies, course requirements and rankings can change. Re-verify them from current official sources before an actual application cycle.

## Scope and safety

UniPath is a planning and decision-support product. It does not know how an admissions office will decide an individual case and must not promise admission. Race, religion, gender, sexual orientation, disability, health status and other protected/sensitive traits are not used as scoring features.
