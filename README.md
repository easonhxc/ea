# UniPath v2.7 — Admissions Planning OS

UniPath is a deployable Next.js + Supabase university-planning system for high-school applicants. It keeps one persistent applicant profile and connects subject-level academics, project evidence, school/major recommendations, round strategy, opportunity planning, roadmap generation, simulation, and a continuous AI advisor.

## Core product

- Persistent Supabase account + applicant profile.
- AI profile import from mixed Chinese/English résumé-style text.
- Subject-level AP / IB / A-level evaluation rather than AP-5 counts or IB totals alone.
- Major fit uses prerequisites, course relevance, actual project content, finished outputs, and interdisciplinary evidence.
- Hybrid admissions planning model: deterministic engine is primary; AI holistic evidence is bounded and cached for stability.
- Re-running an unchanged profile reuses the same AI assessment so the school list does not drift randomly.
- Explicit school preferences are normalized across common aliases and materially influence list/ED planning without changing admission probabilities.
- U.S. recommendation scope can be limited to T30 / T35 / T50 / T75 / T100 or all modeled institutions, with National Universities and National Liberal Arts Colleges kept in separate ranking categories.
- Liberal arts colleges can be globally included/excluded; LAC recommendation priority is field-aware rather than a blanket bonus.
- T20/T30 portfolio construction uses a profile-aware frontier separate from the admission-probability calculation, with explicit warnings when a strict rank scope forces extra reaches.
- Automatic 20-school U.S. Common App planning list when catalog coverage permits.
- Separate U.S. non-Common-App track and separate UK track; UK schools are not mixed into the U.S. reach/target ladder.
- UK modeling is more academic/subject-centric and explicitly preserves Oxford/Cambridge/Imperial/LSE when the field is compatible.
- QS 2026 and U.S. News 2026 ranking snapshot displayed as context only; rankings do not alter probability.
- ED I / ED II / EA / REA / SCEA / RD / UC / UCAS strategy generated automatically from the modeled list; manually saving schools is optional.
- Monte Carlo portfolio stress test plus one visible sample application cycle, including T20-category and T30-category hit rates.
- 150-institution seed catalog including 23 U.S. liberal arts colleges, 114 majors, 43 high-school directory/context records, and 69 curated opportunity pathways.
- Curated summer/research/competition/work catalog plus AI-generated original projects based on the student's concrete strengths and gaps.
- Persistent roadmap anchored to the current date and graduation year, with a cleanup action for stale past-dated open items.
- Persistent AI advisor conversation grounded in saved profile, predictions, plans and roadmap. User turns are persisted before AI generation; the latest 100 messages are server-synced and mirrored locally so navigation/reload does not silently discard recent chat.
- English / Simplified Chinese core interface setting, AI output language, compact/comfortable density, System/Light/Dark appearance, default U.S. ranking scope and a liberal-arts-college preference.
- Admin data overrides and one-click creation/reset of five ordinary non-admin classmate demo accounts.

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
       |    - school + major probability intervals
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
DEEPSEEK_MODEL=deepseek-v4-flash

NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

# Preferred server key; legacy service role also works as fallback.
SUPABASE_SECRET_KEY=sb_secret_xxx
# SUPABASE_SERVICE_ROLE_KEY=legacy_service_role_if_needed

ADMIN_EMAILS=you@example.com
```

Never expose `DEEPSEEK_API_KEY`, `SUPABASE_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` in browser code or GitHub.

## Supabase

For a fresh installation, run the complete file:

```text
supabase/schema.sql
```

If the existing UniPath database already has the v2.x schema (profiles, plans, prediction runs, opportunity saves, roadmap, conversation messages with `metadata`, overrides and feedback), v2.7 adds no required table migration.

## Classmate demo accounts

Do **not** hard-code a shared password into a public repository. Sign in with an admin account and open **Admin → Classmate test accounts**. Choose a temporary password and click **Create / reset demo accounts**. The server creates five ordinary non-admin Supabase users:

```text
unipath.demo1@example.com
unipath.demo2@example.com
unipath.demo3@example.com
unipath.demo4@example.com
unipath.demo5@example.com
```

The login page includes a demo-account selector. Classmates can sign in directly after the admin seeds the accounts; they do not need to register. Reset/remove the demo accounts after testing because they can consume paid AI requests.

## Stability model

Two pieces are deliberately separated:

1. **Applicant evidence** — academic/course fit, activities, awards, finished outputs, project-major fit, interdisciplinary fit and a small bounded AI holistic layer.
2. **Portfolio construction** — explicit school preference, U.S. ranking scope, risk bands, Common App slot balance and round availability.

For an unchanged applicant profile, the API reuses the latest AI evidence assessment. Changing only T30/T35/T50 scope or the liberal-arts-college include/exclude setting does not re-run AI. This prevents random model wording from producing a materially different college list on every click.

## Important model boundaries

- Probability intervals are planning heuristics, not official personal admission probabilities.
- Rankings are display/filter context only.
- Planned activities receive strongly reduced evidence weight and are never treated as completed achievements.
- High-school aggregate outcome context is used only when verified and is capped at a small relative adjustment.
- Sensitive traits are not scored.
- Current program availability, admissions policies, deadlines, testing rules and financial-aid rules must be verified with each university before submission.
