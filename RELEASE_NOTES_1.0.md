# UniPath 1.0 — Formal Release Notes

## Release status

This release merges the planned v2.9 College Intelligence work and v3.0 Applicant Intelligence work into **UniPath 1.0**, the first formal web release.

The product focus changes from “more recommendation features” to a longitudinal admissions-planning system: understand the applicant, understand the institution, make a plan, execute it, then measure what changed.

## 1. Applicant Intelligence

A new deterministic-first evidence graph replaces the idea that an applicant can be summarized by one opaque number.

The graph contains five clusters:

1. Academic readiness
2. Intellectual profile
3. Execution & output
4. Leadership & impact
5. Application narrative

Sub-dimensions preserve interpretable evidence such as course rigor, major foundations, testing, research depth, independent thinking, sustained commitment, ownership, finished outputs, external validation, leadership, community contribution, measurable impact, coherence, distinctiveness, major alignment and voice readiness.

The model also produces an application identity, strongest current signals, gaps, and an evidence-confidence label.

## 2. Planning ranges + confidence

College results now emphasize a **planning range** and evidence-confidence label instead of presenting the model center as a precise personal acceptance probability.

The internal center remains available to simulation/list logic. The public-facing range is deliberately wider when profile evidence is incomplete and tighter when more auditable inputs exist.

This remains a planning heuristic, not an admissions-office probability.

## 3. Prediction Version History

Saved predictions now preserve the 1.0 applicant graph. The History page compares adjacent runs and surfaces:

- overall applicant-signal change;
- changed evidence dimensions;
- largest modeled school-range movements;
- the application identity from each saved moment.

Older runs remain visible and are labeled `LEGACY RUN` until a 1.0 prediction is generated.

## 4. College Intelligence expansion

The source-backed school profile library expands from 34 to **69 institutions**, using **148 official/institutional links** in the shipped data file.

The expanded group includes additional U.S. universities, all 23 liberal arts colleges in the modeled LAC catalog, and Oxford/Cambridge/Imperial/UCL/LSE.

School profiles are designed to capture real differences in institutional review and academic culture. UniPath does not convert those qualitative profiles into hidden probability boosts.

Schools without a hand-researched profile still receive a differentiated interpretation based on institution type, research intensity, setting, program support and applicant evidence. The UI explicitly labels this as UniPath interpretation rather than an official institutional rubric.

## 5. College Detail + personalized positioning

College Detail now connects school-specific research to the current applicant:

- What the school appears to value
- Admissions DNA / signature
- How the current profile could read there
- Strongest modeled alignment
- Weakest modeled fit dimension
- Open question / unresolved gap
- Course and project evidence
- Culture / institutional voice
- What not to default to
- Current round/ranking context
- Research sources

## 6. College Compare

Users can select 2–4 schools and compare them side by side.

Comparison includes planning range, range confidence, course/project/interdisciplinary fit, explicit preference, ranking context, Admissions DNA, and a personalized strongest/weakest fit read.

A deterministic comparison takeaway identifies the strongest combined fit signal and, when different, the user's highest stated preference. It is framed as a discussion tool—not a ranking or admission guarantee.

## 7. Formal-release onboarding

The first-use guide now introduces:

- Applicant Intelligence before prediction;
- College Intelligence / comparison rather than ranking-first behavior;
- executable Project Detail;
- Prediction History + Roadmap + persistent Advisor.

## 8. Existing v2.8/v2.7 stability retained

- Liberal Arts College include/exclude control
- T30/T35/T50/T75/T100 category-aware filtering
- profile-aware T20/T30 frontier
- separate U.S. / UK modeling
- Project Detail
- Roadmap date correction
- Advisor server-first persistence + local recovery
- Light / Dark / System appearance
- Monte Carlo + visible sample cycle
- demo-user/admin workflow

## Migration from v2.8

No new Supabase table is required.

The 1.0 graph and model version are stored inside `prediction_runs.result`, so existing schemas remain compatible. Old prediction rows continue to load; only new 1.0 runs contain the Applicant Intelligence graph.

Recommended deployment sequence:

1. Replace the repository root with the UniPath 1.0 files while preserving `.git` and private local environment files.
2. Commit and push to the production branch.
3. Let Vercel run the production build.
4. Sign in with a normal account and run one new prediction.
5. Verify Applicant Intelligence, College Compare, College Detail sources, Prediction History, LAC ON/OFF, Advisor persistence, and Monte Carlo.
6. Check Vercel runtime logs for any API or Supabase errors before inviting external testers.

## Product principle for 1.0

UniPath should be more useful than repeatedly asking a general chatbot “what colleges can I get into?” because it preserves structured applicant evidence, institution-specific research, stable deterministic planning logic, version history, and an execution loop over time.
