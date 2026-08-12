import { deepseekJson } from "@/lib/deepseek";
import { ApplicantProfileSchema } from "@/lib/schema";

const TEMPLATE = ApplicantProfileSchema.parse({});

const token = v => String(v ?? "").trim().toLowerCase().replace(/[\s_\-./]+/g, "");
const text = v => {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const candidate = v.name ?? v.title ?? v.output ?? v.description ?? v.label ?? v.value;
    if (candidate != null) return text(candidate);
  }
  return null;
};
const num = v => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const bool = v => {
  if (typeof v === "boolean") return v;
  const t = token(v);
  if (["yes","true","y","1","majorrelated","related"].includes(t)) return true;
  if (["no","false","n","0","notmajorrelated","unrelated"].includes(t)) return false;
  return null;
};
const oneOf = (v, allowed, aliases = {}, fallback = "unknown") => {
  const t = token(v);
  if (!t) return fallback;
  for (const x of allowed) if (token(x) === t) return x;
  for (const [k, out] of Object.entries(aliases)) if (token(k) === t) return out;
  return fallback;
};

function normalizeCurriculum(v) {
  const t = token(v);
  if (!t) return "unknown";
  if (t.includes("advancedplacement") || t === "ap") return "ap";
  if (t.includes("internationalbaccalaureate") || t === "ib") return "ib";
  if (t.includes("alevel") || t.includes("cambridge") || t.includes("cie")) return "alevel";
  if (["us","american","uscurriculum","americancurriculum","highschooldiploma"].includes(t)) return "us";
  if (t === "unknown") return "unknown";
  return "other";
}

function normalizeStrength(v, rigor = false) {
  const t = token(v);
  if (!t) return "unknown";
  if (rigor) {
    if (["highest","highestavailable","mostrigorous","max","maximum","exceptional","veryrigorous"].includes(t)) return "highest";
    if (["strong","rigorous","high","verystrong","aboveaverage","advanced"].includes(t)) return "strong";
    if (["average","standard","normal","moderate","medium"].includes(t)) return "average";
    return "unknown";
  }
  if (["strong","excellent","verystrong","high","advanced","aboveaverage"].includes(t)) return "strong";
  if (["average","standard","normal","moderate","medium","good"].includes(t)) return "average";
  if (["weak","limited","low","belowaverage"].includes(t)) return "weak";
  return "unknown";
}

function normalizeAwardLevel(v) {
  const t = token(v);
  if (!t) return "unknown";
  if (t.includes("elite") || t.includes("topglobal") || t.includes("worldfinal")) return "elite";
  if (t.includes("international") || t.includes("global") || t.includes("world")) return "international";
  if (t.includes("national") || t.includes("countrywide")) return "national";
  if (t.includes("regional") || t.includes("province") || t.includes("provincial") || t.includes("state") || t.includes("city") || t.includes("district")) return "regional";
  if (t.includes("school") || t.includes("campus") || t.includes("internal")) return "school";
  return "unknown";
}

function normalizeImpact(v) {
  const t = token(v);
  if (!t) return "unknown";
  if (t.includes("international") || t.includes("global") || t.includes("world")) return "international";
  if (t.includes("national") || t.includes("countrywide")) return "national";
  if (t.includes("regional") || t.includes("province") || t.includes("state") || t.includes("city") || t.includes("district")) return "regional";
  if (t.includes("local") || t.includes("community") || t.includes("municipal")) return "local";
  if (t.includes("school") || t.includes("campus")) return "school";
  if (t.includes("self") || t.includes("individual") || t.includes("personal")) return "self";
  return "unknown";
}

function normalizeActivityCategory(v, name = "") {
  const t = token(v || name);
  if (!t) return "other";
  if (t.includes("research") || t.includes("paper") || t.includes("lab")) return "research";
  if (t.includes("robot") || t.includes("engineering") || t.includes("stem") || t.includes("computer") || t.includes("coding") || t.includes("technology") || t.includes("science")) return "stem";
  if (t.includes("business") || t.includes("entrepreneur") || t.includes("finance")) return "business";
  if (t.includes("service") || t.includes("volunteer") || t.includes("community")) return "service";
  if (t.includes("sport") || t.includes("athletic") || t.includes("badminton") || t.includes("tennis") || t.includes("running")) return "sports";
  if (t.includes("art") || t.includes("music") || t.includes("film") || t.includes("photo") || t.includes("drum") || t.includes("theater")) return "arts";
  if (t.includes("humanit") || t.includes("history") || t.includes("literature") || t.includes("philosophy")) return "humanities";
  if (t.includes("socialscience") || t.includes("sociology") || t.includes("politicalscience") || t.includes("economics")) return "social_science";
  if (t.includes("work") || t.includes("job") || t.includes("internship") || t.includes("employment")) return "work";
  if (t.includes("family") || t.includes("caregiving") || t.includes("responsibility")) return "family_responsibility";
  return oneOf(v, ["research","stem","business","service","sports","arts","humanities","social_science","work","family_responsibility","other"], {}, "other");
}

function normalizeCountries(v) {
  const arr = Array.isArray(v) ? v : (v == null ? [] : [v]);
  const out = [];
  for (const x of arr) {
    const t = token(x);
    let c = null;
    if (["us","usa","unitedstates","unitedstatesofamerica","america"].includes(t)) c = "us";
    else if (["uk","unitedkingdom","britain","greatbritain","england"].includes(t)) c = "uk";
    else if (t.includes("canada")) c = "canada";
    else if (t.includes("singapore")) c = "singapore";
    else if (["hk","hongkong","hongkongsar"].includes(t)) c = "hk";
    else if (t.includes("australia")) c = "australia";
    else if (t.includes("europe") || ["netherlands","germany","france","switzerland","italy","spain"].includes(t)) c = "europe";
    if (c && !out.includes(c)) out.push(c);
  }
  return out.length ? out : ["us"];
}

function normalizeOutput(v) {
  const s = text(v);
  if (s) return s;
  if (v && typeof v === "object") {
    const pieces = [v.type, v.name, v.title, v.description].map(text).filter(Boolean);
    if (pieces.length) return pieces.join(": ");
  }
  return null;
}

export function normalizeApplicantProfile(raw = {}) {
  const r = raw && typeof raw === "object" ? raw : {};
  const activities = Array.isArray(r.activities) ? r.activities : [];
  const awards = Array.isArray(r.awards) ? r.awards : [];
  const outputs = Array.isArray(r.distinctive_outputs) ? r.distinctive_outputs : (r.distinctive_outputs ? [r.distinctive_outputs] : []);
  const uncertainties = Array.isArray(r.uncertainties) ? r.uncertainties : (r.uncertainties ? [r.uncertainties] : []);

  return {
    applicant_type: oneOf(r.applicant_type,["china_international","other_international","us_domestic","uk_home","unknown"],{
      "chineseinternational":"china_international","chinainternationalstudent":"china_international","internationalchina":"china_international",
      "international":"other_international","internationalstudent":"other_international","us":"us_domestic","domestic":"us_domestic","uk":"uk_home"
    }),
    age_band: oneOf(r.age_band,["13_17","18_plus","unknown"],{"1317":"13_17","under18":"13_17","teen":"13_17","18plus":"18_plus","adult":"18_plus"}),
    graduation_year: num(r.graduation_year),
    current_grade: oneOf(r.current_grade,["8","9","10","11","12","gap","unknown"],{"8th":"8","9th":"9","10th":"10","11th":"11","12th":"12","junior":"11","senior":"12","sophomore":"10","freshman":"9","gapyear":"gap"}),
    high_school_id: text(r.high_school_id),
    high_school_name: text(r.high_school_name),
    school_country: text(r.school_country),
    curriculum: normalizeCurriculum(r.curriculum),
    gpa_description: text(r.gpa_description ?? r.gpa),
    grade_band: oneOf(r.grade_band,["top1","top5","top10","top25","mid","unknown"],{"top1%":"top1","top5%":"top5","top10%":"top10","top25%":"top25","middle":"mid","average":"mid"}),
    sat: num(r.sat), act: num(r.act), toefl: num(r.toefl), ielts: num(r.ielts),
    ap_5_count: num(r.ap_5_count), ap_4_count: num(r.ap_4_count), ib_predicted: num(r.ib_predicted), a_star_count: num(r.a_star_count),
    academic_rigor: normalizeStrength(r.academic_rigor, true),
    quantitative_preparation: normalizeStrength(r.quantitative_preparation, false),
    writing_preparation: normalizeStrength(r.writing_preparation, false),
    primary_major: text(r.primary_major), secondary_major: text(r.secondary_major),
    intended_countries: normalizeCountries(r.intended_countries),
    aid_need: oneOf(r.aid_need,["none","some","high","unknown"],{"no":"none","noaid":"none","noneed":"none","low":"some","moderate":"some","yes":"some","significant":"high","full":"high","highneed":"high"}),
    awards: awards.map(a => ({
      name: text(a?.name ?? a?.title) || "",
      level: normalizeAwardLevel(a?.level ?? a?.scope),
      status: oneOf(a?.status,["earned","planned","unknown"],{"received":"earned","won":"earned","completed":"earned","achieved":"earned","future":"planned","intended":"planned"}),
      major_related: bool(a?.major_related)
    })),
    activities: activities.map(a => ({
      name: text(a?.name ?? a?.title) || "",
      category: normalizeActivityCategory(a?.category ?? a?.type, a?.name ?? a?.title),
      status: oneOf(a?.status,["completed","ongoing","planned","unknown"],{"current":"ongoing","active":"ongoing","inprogress":"ongoing","done":"completed","finished":"completed","future":"planned","intended":"planned"}),
      years: num(a?.years ?? a?.duration_years),
      hours_per_week: num(a?.hours_per_week ?? a?.weekly_hours),
      role: text(a?.role),
      impact_scope: normalizeImpact(a?.impact_scope ?? a?.scope),
      measurable_outcome: text(a?.measurable_outcome ?? a?.outcome ?? a?.impact),
      major_related: bool(a?.major_related)
    })),
    distinctive_outputs: outputs.map(normalizeOutput).filter(Boolean),
    essay_quality: oneOf(r.essay_quality,["unknown","average","good","excellent"],{"strong":"good","verygood":"excellent","exceptional":"excellent","weak":"average"}),
    recommendation_quality: oneOf(r.recommendation_quality,["unknown","average","good","excellent"],{"strong":"good","verygood":"excellent","exceptional":"excellent","weak":"average"}),
    profile_summary: text(r.profile_summary) || "",
    uncertainties: uncertainties.map(text).filter(Boolean)
  };
}

function validationPrompt(issues, raw) {
  return [
    { role: "system", content: `Repair a university-applicant JSON object so it matches the exact schema. Return JSON only. Do not add achievements or change factual scores. Use only the enum values shown by the schema template.\nSchema template:\n${JSON.stringify(TEMPLATE)}` },
    { role: "user", content: `Validation problems:\n${JSON.stringify(issues)}\n\nObject to repair:\n${JSON.stringify(raw)}` }
  ];
}

export async function extractProfileWithAI(textInput, ageBand) {
  const system = `You extract a university applicant profile into strict JSON. Return JSON only.
Rules:
- Never inflate achievements.
- Use null or "unknown" when information is missing.
- Mark future intentions as planned, not completed.
- Do not infer race, religion, sexuality, disability, health status, political affiliation, family wealth, or other sensitive traits.
- Preserve exact test scores and intended majors.
- Activities should capture duration, role, impact, measurable output and status only when supported.
- Awards should be earned only if the text clearly says they were received.
- distinctive_outputs MUST be an array of strings, not objects.
- high_school_id should remain null unless an exact catalog identifier is provided; high_school_name may be natural language.
- Put uncertain or contradictory information in uncertainties.
- Enum values must match the template EXACTLY. Do not invent labels such as "AP", "very strong", "city", or "global" when the template uses lowercase canonical values.
Required JSON structure:\n${JSON.stringify(TEMPLATE)}`;

  let last;
  for (let i = 0; i < 2; i++) {
    try {
      let raw = await deepseekJson([
        { role: "system", content: system },
        { role: "user", content: `Declared age band: ${ageBand}\n\nApplicant description:\n${textInput}\n\nReturn JSON only.` }
      ], { temperature: .05, max_tokens: 6200 });

      if (["13_17", "18_plus"].includes(ageBand)) raw.age_band = ageBand;
      let normalized = normalizeApplicantProfile(raw);
      let parsed = ApplicantProfileSchema.safeParse(normalized);
      if (parsed.success) return parsed.data;

      // One targeted repair pass is cheaper and more reliable than surfacing a raw Zod enum dump.
      raw = await deepseekJson(validationPrompt(parsed.error.issues, normalized), { temperature: 0, max_tokens: 5200 });
      if (["13_17", "18_plus"].includes(ageBand)) raw.age_band = ageBand;
      normalized = normalizeApplicantProfile(raw);
      parsed = ApplicantProfileSchema.safeParse(normalized);
      if (parsed.success) return parsed.data;

      throw new Error(`AI profile extraction could not be normalized: ${parsed.error.issues.slice(0,4).map(x=>`${x.path.join(".")}: ${x.message}`).join("; ")}`);
    } catch (e) {
      last = e;
    }
  }
  throw last || new Error("AI profile extraction failed.");
}
