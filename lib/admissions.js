import schools from "@/data/schools.json";

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function majorCategory(major = "") {
  const m = major.toLowerCase();
  if (/(computer|software|data|artificial|cyber)/.test(m)) return "computing";
  if (/(engineering|materials|robotics)/.test(m)) return "engineering";
  if (/(economics|finance|business|account)/.test(m)) return "business";
  if (/(politic|sociolog|psycholog|policy|international relations|anthrop)/.test(m)) return "social";
  if (/(history|philosophy|english|literature|classic|linguistic|relig)/.test(m)) return "humanities";
  if (/(art|design|architecture|film|music|theatre)/.test(m)) return "arts";
  if (/(biology|biomedical|neuroscience|health|nursing|public health)/.test(m)) return "life";
  if (/(physics|chemistry|mathematics|geology|earth|environmental science)/.test(m)) return "natural";
  return "other";
}

function canonicalMajorSlug(text = "") {
  const q = text.toLowerCase().trim();
  const map = [
    ["materials", "materials_engineering"], ["computer science", "computer_science"],
    ["environmental engineering", "environmental_engineering"], ["mechanical", "mechanical_engineering"],
    ["electrical", "electrical_engineering"], ["biomedical engineering", "biomedical_engineering"],
    ["economics", "economics"], ["finance", "finance"], ["business", "business_administration"],
    ["political", "political_science"], ["international relations", "international_relations"],
    ["psychology", "psychology"], ["history", "history"], ["philosophy", "philosophy"],
    ["english", "english"], ["biology", "biology"], ["neuroscience", "neuroscience"],
    ["physics", "physics"], ["chemistry", "chemistry"], ["mathematics", "mathematics"],
    ["architecture", "architecture"], ["film", "film"], ["music", "music"],
  ];
  for (const [needle, slug] of map) if (q.includes(needle)) return slug;
  return q.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function gradeScore(p) {
  return ({ top1: 98, top5: 92, top10: 84, top25: 72, mid: 56, unknown: 76 }[p.grade_band] ?? 76);
}

function activityScore(profile) {
  const acts = profile.activities || [];
  if (!acts.length) return 58;
  const scope = {self:50,school:63,local:75,regional:84,national:93,international:98,unknown:60};
  let vals = acts.map(a => {
    let s = 55;
    if ((a.years || 0) >= 3) s += 12; else if ((a.years || 0) >= 2) s += 8; else if ((a.years || 0) >= 1) s += 4;
    if ((a.hours_per_week || 0) >= 10) s += 8; else if ((a.hours_per_week || 0) >= 5) s += 5;
    if (/founder|president|captain|lead|director|创办|负责人|队长/i.test(a.role || "")) s += 10;
    s += ((scope[a.impact_scope] || 60) - 60) * 0.35;
    if (a.measurable_outcome) s += 6;
    return clamp(s, 45, 98);
  });
  vals.sort((a,b)=>b-a);
  const top = vals.slice(0, 5);
  return clamp(top.reduce((a,b)=>a+b,0)/top.length + Math.min(acts.length,5)*1.2, 45, 100);
}

function awardsScore(profile) {
  const awards = profile.awards || [];
  if (!awards.length) return 45;
  const map = {school:48,regional:63,national:79,international:90,elite:100,unknown:55};
  const vals = awards.map(a => (map[a.level] || 55) + (a.major_related ? 3 : 0)).sort((a,b)=>b-a);
  return clamp(vals.slice(0,5).reduce((a,b)=>a+b,0)/Math.min(vals.length,5), 40, 100);
}

function outputScore(profile) {
  const n = (profile.distinctive_outputs || []).length;
  const activityOutputs = (profile.activities || []).filter(a => a.measurable_outcome).length;
  return clamp(52 + Math.min(n,4)*8 + Math.min(activityOutputs,4)*4, 45, 100);
}

export function scoreProfile(profile, majorText) {
  const category = majorCategory(majorText || profile.primary_major || "");
  let academic = gradeScore(profile);
  if (profile.sat) academic = academic * .80 + clamp((profile.sat - 1200) / 400 * 100, 0, 100) * .20;
  if (profile.act) academic = Math.max(academic, academic * .80 + clamp((profile.act - 24) / 12 * 100, 0, 100) * .20);
  academic += profile.academic_rigor === "highest" ? 5 : profile.academic_rigor === "strong" ? 2 : 0;
  academic += (profile.ap_5_count || 0) * .7;
  academic = clamp(academic, 0, 100);

  const activities = activityScore(profile);
  const awards = awardsScore(profile);
  const output = outputScore(profile);
  const writing = profile.writing_preparation === "strong" ? 88 : profile.writing_preparation === "weak" ? 58 : 74;
  const narrative = clamp(writing + Math.min((profile.activities || []).length,4)*1.5, 55, 95);

  const weights = {
    engineering:{academic:.37,activities:.26,output:.10,awards:.12,narrative:.15},
    computing:{academic:.38,activities:.24,output:.10,awards:.12,narrative:.16},
    natural:{academic:.37,activities:.25,output:.11,awards:.11,narrative:.16},
    life:{academic:.35,activities:.26,output:.11,awards:.11,narrative:.17},
    business:{academic:.34,activities:.27,output:.08,awards:.11,narrative:.20},
    social:{academic:.31,activities:.29,output:.06,awards:.09,narrative:.25},
    humanities:{academic:.30,activities:.28,output:.07,awards:.08,narrative:.27},
    arts:{academic:.24,activities:.24,output:.30,awards:.06,narrative:.16},
    other:{academic:.34,activities:.28,output:.10,awards:.10,narrative:.18},
  }[category];

  const overall = academic*weights.academic + activities*weights.activities + output*weights.output + awards*weights.awards + narrative*weights.narrative;
  return { academic, activities, output, awards, narrative, overall, category, weights };
}

function programName(s, slug) {
  return s.over?.[slug] || slug.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function probabilityForSchool(s, profile, score, majorSlug) {
  let base = s.sel;
  const schoolwide = ["Harvard","MIT","Stanford","Princeton","Yale","Caltech","Brown","UChicago","Georgia Tech"].includes(s.name);
  const cat = score.category;

  if (!schoolwide) {
    const factor = {
      computing:.70, engineering:.90, business:.86, arts:.80,
      social:1.05, humanities:1.08, natural:1.00, life:.95, other:1.00
    }[cat] || 1;
    base *= factor;
  }

  const intl = profile.applicant_type === "china_international" || profile.applicant_type === "other_international";
  if (intl) base *= s.country === "us" ? (s.name.startsWith("UC ") || ["Michigan","UVA","UT Austin","Georgia Tech","UIUC","Purdue"].includes(s.name) ? .90 : .96) : .98;
  if (intl && profile.aid_need === "high" && s.country === "us" && !["Harvard","Yale","Princeton","MIT","Brown"].includes(s.name)) base *= .78;

  const anchor = s.sel < .05 ? 86 : s.sel < .10 ? 84 : s.sel < .20 ? 81 : s.sel < .35 ? 77 : 72;
  const mult = clamp(Math.exp((score.overall - anchor) / (s.sel < .20 ? 17 : 22)), .55, s.sel < .20 ? 1.70 : 1.45);
  let p = base * mult;
  const ceiling = s.ultra ? .14 : s.sel < .10 ? .24 : s.sel < .20 ? .40 : .78;
  p = clamp(p, .006, ceiling);
  return {
    center: p,
    min: clamp(p*.76,.006,ceiling),
    max: clamp(p*1.28,p+.012,ceiling),
  };
}

function tier(p) {
  if (p < .05) return "Lottery";
  if (p < .10) return "Super Reach";
  if (p < .20) return "Reach";
  if (p < .40) return "Target";
  return "Likely";
}

export function predict(profile, primaryMajorText, secondaryMajorText) {
  const primarySlug = canonicalMajorSlug(primaryMajorText || profile.primary_major || "");
  const secondarySlug = secondaryMajorText ? canonicalMajorSlug(secondaryMajorText) : null;
  const primaryScore = scoreProfile(profile, primaryMajorText);
  const secondaryScore = secondaryMajorText ? scoreProfile(profile, secondaryMajorText) : null;

  const out = [];
  for (const s of schools) {
    const hasPrimary = s.support.includes(primarySlug);
    const hasSecondary = secondarySlug && s.support.includes(secondarySlug);
    if (!hasPrimary && !hasSecondary) continue;

    let chosen = hasPrimary ? primarySlug : secondarySlug;
    let score = hasPrimary ? primaryScore : secondaryScore;
    let p1 = hasPrimary ? probabilityForSchool(s, profile, primaryScore, primarySlug) : null;
    let p2 = hasSecondary ? probabilityForSchool(s, profile, secondaryScore, secondarySlug) : null;

    const schoolwide = ["Harvard","MIT","Stanford","Princeton","Yale","Caltech","Brown","UChicago","Georgia Tech"].includes(s.name);
    let secondMajorReason = null;
    if (p1 && p2) {
      if (schoolwide) {
        p2 = {...p2, center:p1.center, min:p1.min, max:p1.max};
        secondMajorReason = "This university is modeled as schoolwide admission; the second major does not create an admissions boost.";
      } else if (p2.center >= Math.max(p1.center + .025, p1.center*1.18)) {
        chosen = secondarySlug;
        score = secondaryScore;
        secondMajorReason = "The second direction is modeled as a meaningfully less competitive pool. Use it only if your coursework and activities genuinely support it.";
      }
    }

    const pr = chosen === primarySlug ? p1 : p2;
    out.push({
      school: s.name,
      country: s.country,
      rank: s.rank,
      major: chosen === primarySlug ? (primaryMajorText || profile.primary_major) : secondaryMajorText,
      program: programName(s, chosen),
      probability: pr.center,
      interval: [pr.min, pr.max],
      tier: tier(pr.center),
      score: Math.round(score.overall),
      second_major_reason: secondMajorReason,
    });
  }

  return {
    profile_scores: primaryScore,
    primary_major: primaryMajorText || profile.primary_major,
    secondary_major: secondaryMajorText || null,
    schools: out.sort((a,b) => a.rank - b.rank || b.probability - a.probability).slice(0,30),
  };
}
