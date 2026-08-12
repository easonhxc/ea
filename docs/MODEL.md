# UniPath Hybrid Model

## Purpose

UniPath is a student-facing planning model. It is not an admissions-office model and should not be presented as a university-issued probability.

## 1. Deterministic applicant score

The base score is field-aware and uses:

- academic record / testing / curriculum rigor;
- activities with duration, responsibility, impact and measurable output;
- awards / external validation;
- distinctive finished outputs;
- narrative preparation.

Planned activities and planned awards are discounted heavily. They cannot be treated as completed achievements.

## 2. Bounded AI holistic layer

DeepSeek evaluates six evidence dimensions:

- academic context;
- intellectual vitality;
- activity coherence;
- major fit;
- narrative strength;
- execution evidence.

The AI does **not** output an admissions probability. Its overall evidence score receives a confidence-weighted share of the applicant score. Current maximum AI weight: 12%.

If DeepSeek fails, UniPath falls back to the deterministic model instead of failing the entire prediction flow.

## 3. High-school aggregate context

High-school name by itself receives no boost.

A context multiplier can be used only when a high-school record is marked verified and has public aggregate outcome data. The adjustment is capped at a small relative effect (currently max +6% relative to the modeled probability, not +6 percentage points).

Direct historical matriculation at a target university can add only a very small extra signal. A historical destination is evidence that the pathway exists; it is not an individual acceptance rate.

Unverified directory schools have `context_strength = 0`.

## 4. University baseline and major context

The university catalog contains a planning selectivity baseline. Some institutions are modeled schoolwide; others receive field-category adjustments. Expanded records are intentionally marked `data_quality: seed` until a verified current-cycle source is entered through Admin.

## 5. International / aid context

International and aid adjustments remain conservative and must be updated when school policies change. No race, religion, gender, sexuality, disability, health status or other protected/sensitive trait is scored.

## 6. Probability interval

The displayed interval is a planning uncertainty band around the modeled center. It should be used for portfolio balance, not as a literal forecast of a university decision.
