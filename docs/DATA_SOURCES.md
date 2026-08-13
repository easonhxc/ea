# Initial verified high-school context sources

These sources support only the initial high-school aggregate context layer. They do not justify individual acceptance probabilities.

## Shanghai High School International Division (SHSID)

Official 2026 College Admissions Review:

https://www.shsid.org/info/1661/133011.htm

The official review reports a Class of 2026 of 204 graduates and aggregate counts for students receiving offers to Ivy/Top-10, Top-20, Top-30 and Top-50 U.S. institutions. A separate official SHSID article reports three MIT offers for the Class of 2026.

School profile:

https://www.shsid.org/DOCUMENTS/School_Profile.htm

## Shanghai American School — Pudong

Official 2025-26 college profile:

https://www.saschina.org/sites/default/files/public/SASPD_College_Profile.pdf

Official Class of 2025 university matriculation list:

https://www.saschina.org/class-2025-matriculation

## Shanghai American School — Puxi

Official 2025-26 college profile:

https://www.saschina.org/sites/default/files/public/SASPX_College_Profile.pdf

Official Class of 2025 university matriculation list:

https://www.saschina.org/class-2025-matriculation

## UWC Changshu China

Official university counseling FAQ:

https://www.uwcchina.org/en/Orientation/single/113

Official Class of 2026 graduation page:

https://www.uwcchina.org/en/show/607

UWC Changshu receives a smaller context signal because the currently used public pages do not provide the same school-by-school aggregate acceptance counts.

## Maintenance rule

Before a high-school outcome override is marked `verified`, record:

- source URL;
- source year;
- whether the source is admissions, matriculation, or destinations;
- graduating class size when available;
- whether counts are students, offers, or enrollments;
- any overlap / double-counting limitation.

### Shanghai Starriver Bilingual School

- School: https://www.ssbs.sh.cn/siteIndex.action
- 2025 official admissions report: https://www.ssbs.sh.cn/siteIndex.action?ccid=10083&method=list
- Stored fields: graduating class 167; 132 US applicants; 78 students with at least one US News top-30 offer; reported Yale/MIT/Stanford offers.
- Treatment: aggregate context only. Offer history is weaker than confirmed matriculation history and receives only a small relative signal.

### Guanghua Cambridge International School

- School / 2026 admissions update: https://www.ghcis.com/
- School profile: https://www.ghcis.com/about/info.htm
- Stored fields: 2026 aggregate offer counts for Oxford, Cambridge, Imperial, LSE, UCL, HKU, HKUST and CUHK.
- Treatment: no cohort denominator is assumed, so the context strength is deliberately small.

# UniPath 1.0 College Intelligence source policy

`data/school-insights.json` contains the hand-researched College Intelligence layer. In the 1.0 release it contains 69 school profiles and 148 official/institutional source links.

## Source hierarchy

Prefer, in order:

1. current undergraduate admissions office pages;
2. official selection / review criteria pages;
3. official admissions blogs, applicant guides, departmental admissions pages, and institutional student-voice pages;
4. official university news or student publications when they add culture/context without claiming selection criteria.

Do not use anonymous forum claims or admissions-consulting speculation as evidence for what a school "likes."

## Interpretation rule

Public admissions pages rarely disclose a complete confidential rubric. Therefore each profile must distinguish between:

- what the institution explicitly states;
- a reasonable UniPath interpretation of those statements for applicant positioning;
- catalog-based fallback analysis when no hand-researched profile exists.

The College Intelligence layer may change explanations and positioning guidance. It must not create a hidden probability multiplier.

## Maintenance rule

Admissions criteria, essays, testing policies, majors, aid policies, deadlines and application rounds can change. Before editing a source-backed profile:

- open the current official source;
- record a stable URL where possible;
- avoid quoting long passages;
- paraphrase precisely;
- remove a claim when the current source no longer supports it;
- keep UK course-specific requirements separate from general university-level guidance.
