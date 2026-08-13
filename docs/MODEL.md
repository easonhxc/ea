# UniPath 1.0 Hybrid Planning Model

## Purpose

UniPath is a student-facing planning model, not an admissions-office model. Planning ranges help build and stress-test an application portfolio; they do not claim to know an individual's official acceptance probability.

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

## 2. Applicant Intelligence graph

UniPath 1.0 exposes the evidence model through five clusters:

- Academic readiness
- Intellectual profile
- Execution & output
- Leadership & impact
- Application narrative

Each cluster contains interpretable dimensions and evidence traces. The graph also generates an application identity, strongest signals and gaps.

The graph is a planning representation of the entered evidence, not a psychological profile or a reproduction of any university's confidential review process.

## 3. Bounded AI evidence layer

AI can assess holistic evidence but does **not** invent an admissions probability. The deterministic score remains primary. The AI contribution is confidence-weighted and capped at a small share of the combined applicant signal. Repeated predictions reuse a cached AI assessment when the applicant evidence has not changed, reducing list drift caused by model wording randomness.

If AI is unavailable, UniPath falls back to the deterministic model.

## 4. Project + interdisciplinary fit

Project labels alone are insufficient. UniPath analyzes descriptions for evidence such as experimental method, data work, engineering design, writing, policy analysis, creative production, community context, computation and finished deliverables.

Interdisciplinary fit is major-specific. For example, environmental engineering can value technical + environmental/policy bridges, while sociology can value writing + qualitative research + statistics/data.

## 5. Planning ranges and evidence confidence

The school model starts from an institutional baseline and adjusts it using bounded applicant competitive signal, program fit and limited verified context. The resulting internal center is used for portfolio logic and simulation.

The student-facing UI emphasizes a range around that center. Range width depends partly on how complete and auditable the entered applicant evidence is. Confidence therefore describes **confidence in the planning input/model evidence**, not confidence that the applicant will be admitted.

Preference never changes the admission range.

## 6. High-school aggregate context

High-school name by itself receives no boost. A small context multiplier is used only for verified public aggregate outcome data and is capped at a small relative adjustment (max +6% relative, not +6 percentage points). Unverified directory schools have no adjustment.

## 7. College Intelligence

School-specific Admissions DNA is an explanation layer. It is grounded in current official/institutional admissions material when a source-backed profile exists and is clearly labeled as an UniPath interpretation when it does not.

School-insight text changes explanation and positioning guidance. It does not secretly raise or lower the planning range.

## 8. U.S. portfolio construction

The U.S. list is built separately from the admission-range model. It considers:

- deterministic applicant band;
- course/project/interdisciplinary fit;
- explicit school preferences;
- risk-band balance;
- selected U.S. ranking scope (T30/T35/T50/T75/T100/all);
- Common App vs separate application systems;
- field-aware Liberal Arts College suitability.

National University T20/T30 frontier calibration and Liberal Arts College ranking-category logic remain separate. U.S. News National University rank 20 is not treated as numerically equivalent to Liberal Arts College rank 20.

Rankings are a filter/display context only and do not raise or lower admission probability.

## 9. UK track

UK recommendations are separate from the U.S. reach/target/likely ladder and are more subject/academic-centric. Oxford/Cambridge and field-compatible Imperial/LSE options are preserved as aspirational/competitive choices rather than being mislabeled as safeties.

Course-specific requirements, tests, written work and interviews still need current official verification.

## 10. Round strategy

ED I / ED II / EA / REA / SCEA / RD recommendations are generated from the current modeled portfolio; users do not need to manually save schools first. Binding ED requires genuine preference and is never assigned merely because a school is easier.

## 11. Prediction history

Each prediction run stores its model result JSON. In 1.0 that includes the Applicant Intelligence graph. Adjacent saved runs can therefore be compared for evidence changes and modeled range movement.

A change in a planning range is not proof that an admissions office would change its evaluation by the same amount.

## 12. International / aid context

International and aid adjustments are conservative planning heuristics and must be updated as university policies change. Race, religion, gender, sexual orientation, disability, health status and other protected/sensitive traits are not scored.
