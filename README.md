# UniPath Next — DeepSeek Hybrid Admissions OS

A deployable Next.js + Supabase university-planning product. This rebuild replaces GitHub Models with the official DeepSeek API and redesigns UniPath around a persistent student profile, hybrid model, opportunity database, roadmap, application portfolio and continuous AI conversation.

## What changed

- Cleaner, restrained premium UI instead of the old dashboard-heavy layout.
- Official DeepSeek API (`deepseek-v4-flash` by default).
- Hybrid admissions model: deterministic applicant model + bounded AI holistic assessment.
- AI is not allowed to invent admission percentages. Its contribution is confidence-weighted and bounded inside the profile score.
- Verified high-school aggregate outcomes can add only a small, audited context multiplier; unverified schools add **zero** probability adjustment.
- High-school selector with 43 initial schools/directories, including additional Shanghai schools and Chinese-name aliases.
- Official-outcome seed context for SHSID, Shanghai American School Pudong/Puxi, and limited UWC Changshu context.
- 127 university planning records across the US, UK, Canada, Singapore, Hong Kong and Australia.
- 114 majors.
- 69 opportunity pathways covering summer programs, research, competitions, projects and work.
- Opportunity matching based on major, grade and profile gaps rather than prestige alone.
- Persistent roadmap stored in Supabase.
- Persistent AI Advisor conversation stored in Supabase.
- Saved application plans + early-round conflict checking + Monte Carlo simulation.
- Admin school-data overrides remain available without code redeployment.

## Architecture

```text
Browser
  | Supabase Auth
  v
Next.js / Vercel
  |
  +-- /api/unipath
       |
       +-- DeepSeek V4 Flash
       |    - profile extraction
       |    - bounded holistic scoring
       |    - roadmap generation
       |    - persistent AI advisor
       |
       +-- UniPath deterministic model
       |    - academics / activities / awards / output / narrative
       |    - school + major selectivity planning baseline
       |    - verified high-school aggregate context (small capped effect)
       |    - application-round simulation
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

## 1. Upgrade the existing Supabase database

Open Supabase → SQL Editor and run the **entire** file:

```text
supabase/schema.sql
```

It is written with `create table if not exists`, so it can be run on the existing UniPath project. It adds the new roadmap, opportunity and conversation tables.

## 2. Vercel environment variables

Remove the retired GitHub Models variables when convenient:

```text
GITHUB_TOKEN
GITHUB_MODEL
```

Add:

```env
DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-v4-flash
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_server_secret_key
ADMIN_EMAILS=your-email@example.com
```

The code also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` as a fallback, so an existing deployment does not have to migrate Supabase keys immediately.

Never expose `DEEPSEEK_API_KEY`, `SUPABASE_SECRET_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix.

## 3. Replace the GitHub repository files

Using GitHub Desktop:

1. Open the local `ea` repository with **Repository → Show in Finder**.
2. Keep the hidden `.git` directory.
3. Replace the project files with the contents of this folder.
4. Commit, for example: `Upgrade UniPath to DeepSeek hybrid planner`.
5. Push origin.
6. Vercel will create a new deployment automatically.

## 4. High-school context model

The high-school name is **not** treated as a prestige score. A context adjustment is enabled only where the catalog entry has verified public aggregate data. The current built-in effect is capped at a small relative multiplier and is surfaced in the college row as `School context`.

Current verified seed sources include:

- SHSID 2026 official admissions review.
- Shanghai American School 2025-26 college profiles and Class of 2025 university matriculation page.
- UWC Changshu official university-counseling / graduation context, with a smaller signal because school-by-school counts are not published in the same form.

For schools without enough verified public data, `context_strength = 0`, so selecting that school does not change the modeled probability.

## 5. Data quality

The expanded university catalog is a **planning seed database**, not a claim that every acceptance rate or program mapping is current. Each school record contains `data_quality`, `catalog_verified`, and `source_note`. Use Admin `school_overrides` for verified current-cycle data.

Opportunity records intentionally avoid hardcoding deadlines because deadlines change by cycle. The UI tells users to verify the current official page before applying.

## 6. Important product principle

UniPath is a student planning tool, not an official admissions model. Do not present its probability intervals as university-issued odds. Sensitive traits are excluded from scoring. Planned future achievements do not receive the same credit as completed evidence.


## Robust AI profile normalization
AI-imported enum labels and object-shaped outputs are normalized before Zod validation; malformed residuals receive one constrained repair pass.

## v2.3 — calibrated list + course/project fit

- The U.S. planner now treats the Common App list as a hard **20-slot** product invariant. It is generated from the model; users do not need to save schools first.
- The Applications page consumes that model list directly and assigns ED I / conditional ED II / EA / EA2 / REA/SCEA / RD according to the current rule catalog. Manual saves are overrides, not prerequisites.
- AP, IB and A-level courses are evaluated subject by subject (subject, level, score/grade, completed/current/planned status) against the intended major. Aggregate counts are only a fallback when subject-level data is absent.
- Project text is parsed into field evidence (materials, chemistry, physics, computation, engineering design, environment, writing/humanities, social science, service, etc.). Interdisciplinary fit is major-specific and requires the appropriate bridge evidence rather than generic breadth.
- U.S. recommendation guardrails are tighter so ultra-selective schools are not inserted as decorative reaches for profiles outside the corresponding calibration band.
- U.S. and UK ladders are displayed separately; the UK track uses its own aspirational / competitive / realistic / safer labels.
- `data/rankings-2026.json` now has an entry for all 127 universities. QS World University Rankings 2026 and U.S. News 2026 are display context only and are not probability inputs. U.S. schools use Best Colleges 2026 National University ranks (Rose-Hulman uses its category); non-U.S. schools use Best Global Universities 2026–27 where a verified snapshot was available, otherwise `NR` is explicit rather than invented.

### v2.3 final hardening

- Related-course substitution avoids double counting / double penalties: AP Calculus can demonstrate mathematics; IB/A-level Mathematics can partially demonstrate calculus preparation.
- ED I / ED II are generated from the model without saved schools, but a high-probability Likely is not turned into a binding recommendation unless the student explicitly rates it as a near-first-choice school.
- U.S. and UK recommendation ladders are calibrated separately. UK outcomes never pull a student into an implausible U.S. reach band.
