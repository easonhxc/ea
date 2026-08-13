# UniPath Hybrid Planning Model

## Purpose

UniPath is a student-facing planning model, not an admissions-office model. Probability intervals are used to balance a portfolio, not to claim an official personal acceptance probability.

## 1. Deterministic applicant evidence

The deterministic core is field-aware and uses:

- transcript/rank/testing context;
- AP / IB / A-level subjects evaluated course-by-course against the intended major;
- activities with duration, responsibility, scope and measurable outcomes;
- project descriptions, methods, outputs and major alignment;
- interdisciplinary evidence appropriate to the field;
- awards / external validation;
- finished distinctive outputs;
- essay/recommendation preparation when supplied.

Planned activities and awards are strongly discounted and never treated as completed achievements.

## 2. Bounded AI evidence layer

AI assesses holistic evidence but does **not** invent an admissions probability. The deterministic score remains primary. The current AI contribution is confidence-weighted and capped at 6% of the combined applicant score. Repeated predictions reuse a cached AI assessment when the applicant evidence has not changed, which prevents list drift caused by model wording randomness.

If AI is unavailable, UniPath falls back to the deterministic model.

## 3. Project + interdisciplinary fit

Project labels alone are insufficient. UniPath analyzes project descriptions for evidence such as experimental method, data work, engineering design, writing, policy analysis, creative production, community context, computation and finished deliverables. Interdisciplinary fit is major-specific: e.g. environmental engineering can value technical + environmental/policy bridges, while sociology can value writing + qualitative research + statistics/data.

## 4. High-school aggregate context

High-school name by itself receives no boost. A small context multiplier is used only for verified public aggregate outcome data and is capped at a small relative adjustment (max +6% relative, not +6 percentage points). Unverified directory schools have no adjustment.

## 5. U.S. portfolio construction

The U.S. list is built separately from the applicant probability model. It considers:

- deterministic applicant band;
- course/project/interdisciplinary fit;
- explicit school preferences;
- risk-band balance;
- selected U.S. ranking scope (T30/T35/T50/T75/T100/all);
- Common App vs separate application systems.

Rankings are a filter/display context only and do not raise or lower admission probability.

## 6. UK track

UK recommendations are separate from the U.S. reach/target/likely ladder and are more subject/academic-centric. Oxford/Cambridge and field-compatible Imperial/LSE options are intentionally preserved as aspirational/competitive choices rather than being mislabeled as safeties.

## 7. Round strategy

ED I / ED II / EA / REA / SCEA / RD recommendations are generated from the current modeled portfolio; users do not need to manually save schools first. Binding ED requires genuine preference and is never assigned merely because a school is easier.

## 8. International / aid context

International and aid adjustments are conservative planning heuristics and must be updated as university policies change. Race, religion, gender, sexuality, disability, health status and other protected/sensitive traits are not scored.
