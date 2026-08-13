import { deepseekJson } from "@/lib/deepseek";
import { ApplicantProfileSchema } from "@/lib/schema";
import { canonicalMajorLabel } from "@/lib/major-resolver";

const TEMPLATE = ApplicantProfileSchema.parse({});

const token = v => String(v ?? "").trim().toLowerCase().replace(/[\s_\-./]+/g, "");
const NULL_TEXT = new Set(["unknown","unk","n/a","na","none","null","notprovided","notspecified","unspecified","tbd","notavailable"]);
const text = v => {
  if (v == null) return null;
  if (typeof v === "string") {
    const out=v.trim();
    if(!out || NULL_TEXT.has(token(out))) return null;
    return out;
  }
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
const durationYears = v => {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v >= 0 && v <= 12 ? Math.round(v*100)/100 : null;
  const raw=String(v).trim().toLowerCase();
  const range=raw.match(/(20\d{2})\s*[-–—~至到]\s*(20\d{2}|present|current|now|至今)/i);
  if(range){const start=Number(range[1]);const end=/20\d{2}/.test(range[2])?Number(range[2]):new Date().getFullYear();const y=end-start;return y>=0&&y<=12?Math.max(.25,Math.round(y*100)/100):null;}
  const months=raw.match(/(\d+(?:\.\d+)?)\s*(?:months?|mos?|个月|月)/i);if(months){const y=Number(months[1])/12;return y>=0&&y<=12?Math.round(y*100)/100:null;}
  const years=raw.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|年)/i);if(years){const y=Number(years[1]);return y>=0&&y<=12?y:null;}
  const n=num(v);return n!=null&&n>=0&&n<=12?n:null;
};
const weeklyHours = v => {const n=num(v);return n!=null&&n>=0&&n<=100?n:null;};
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
  const vt=token(v);
  const t = token(`${vt==="other"||vt==="unknown"?"":v||""} ${name||""}`);
  if (!t) return "other";
  if (t.includes("research") || t.includes("paper") || t.includes("lab")) return "research";
  if (t.includes("robot") || t.includes("engineering") || t.includes("stem") || t.includes("computer") || t.includes("coding") || t.includes("technology") || t.includes("science") || t.includes("prototype") || t.includes("device") || t.includes("insole") || t.includes("typewriter") || t.includes("material") || t.includes("adsorption") || t.includes("geotextile") || t.includes("lattice")) return "stem";
  if (t.includes("business") || t.includes("entrepreneur") || t.includes("finance")) return "business";
  if (t.includes("service") || t.includes("volunteer") || t.includes("community")) return "service";
  if (t.includes("sport") || t.includes("athletic") || t.includes("badminton") || t.includes("tennis") || t.includes("running")) return "sports";
  if (t.includes("art") || t.includes("music") || t.includes("film") || t.includes("documentary") || t.includes("photo") || t.includes("drum") || t.includes("theater") || t.includes("摄影") || t.includes("纪录片")) return "arts";
  if (t.includes("humanit") || t.includes("history") || t.includes("literature") || t.includes("philosophy")) return "humanities";
  if (t.includes("socialscience") || t.includes("sociology") || t.includes("politicalscience") || t.includes("economics")) return "social_science";
  if (t.includes("work") || t.includes("job") || t.includes("internship") || t.includes("employment")) return "work";
  if (t.includes("family") || t.includes("caregiving") || t.includes("responsibility")) return "family_responsibility";
  return oneOf(v, ["research","stem","business","service","sports","arts","humanities","social_science","work","family_responsibility","other"], {}, "other");
}


function inferImpactScope(activity){
  if(activity.impact_scope&&activity.impact_scope!=="unknown") return activity.impact_scope;
  const hay=token(`${activity.name||""} ${activity.role||""} ${activity.measurable_outcome||""}`);
  if(/international|global|world|国际|全球|世界/.test(hay)) return "international";
  if(/national|全国|国家级|国家队/.test(hay)) return "national";
  if(/regional|province|provincial|state|city|district|上海市|省级|市级|区级|地区/.test(hay)) return "regional";
  if(/community|local|museum|hospital|charity|volunteer|社区|志愿|博物馆|医院|公益/.test(hay)) return "local";
  if(/school|campus|studentclub|club|team|校内|学校|社团|校队|学生会/.test(hay)) return "school";
  if(activity.status!=="planned"&&["research","stem","arts","humanities","social_science","sports"].includes(activity.category)) return "self";
  return "unknown";
}

function inferOutcome(activity, outputs=[]){
  if(activity.measurable_outcome) return activity.measurable_outcome;
  if(activity.status==="planned") return null;
  const name=String(activity.name||"");
  const nameCompact=token(name);
  const candidates=outputs.filter(Boolean);
  const matched=candidates.find(o=>{
    const oc=token(o);if(!oc||!nameCompact)return false;
    const words=cleanWords(name).filter(w=>w.length>=3);return nameCompact.includes(oc)||oc.includes(nameCompact)||words.filter(w=>oc.includes(token(w))).length>=2;
  });
  if(matched) return matched;
  const hay=token(`${name} ${activity.role||""}`);
  if(activity.category==="research"&&/paper|manuscript|poster|publication|论文|海报|发表/.test(hay)) return "Completed research output";
  if(activity.category==="research"&&activity.status==="completed") return "Completed research project";
  if(activity.category==="stem"&&/prototype|device|model|app|software|insole|typewriter|原型|装置|模型|软件/.test(hay)) return "Completed prototype / project deliverable";
  if(/founder|founded|创始|创办/.test(hay)&&/club|社团/.test(hay)) return "Founded a student organization";
  return null;
}

function cleanWords(v){return String(v||"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9一-鿿]+/g," ").split(/\s+/).filter(Boolean)}


function normalizeCourseStatus(v){return oneOf(v,["completed","current","planned"],{"ongoing":"current","active":"current","inprogress":"current","taking":"current","future":"planned","intended":"planned","willtake":"planned"},"completed");}
function normalizeAPCourse(c={}){const score=num(c.score??c.ap_score);return {subject:text(c.subject??c.name??c.course)||"",score:score!=null&&score>=1&&score<=5?score:null,status:normalizeCourseStatus(c.status)};}
function normalizeIBCourse(c={}){const score=num(c.score??c.predicted_score);const level=oneOf(c.level,["HL","SL","unknown"],{"higherlevel":"HL","standardlevel":"SL","higher":"HL","standard":"SL"});return {subject:text(c.subject??c.name??c.course)||"",level,score:score!=null&&score>=1&&score<=7?score:null,status:normalizeCourseStatus(c.status)};}
function normalizeALevelCourse(c={}){let raw=String(c.grade??c.predicted_grade??"unknown").trim().toUpperCase().replace("A STAR","A*");const grade=["A*","A","B","C","D","E","U"].includes(raw)?raw:(token(raw).includes("predict")?"predicted":"unknown");return {subject:text(c.subject??c.name??c.course)||"",grade,status:normalizeCourseStatus(c.status)};}
function normalizePreferences(v){const arr=Array.isArray(v)?v:[];return arr.map(x=>{const interest=num(x?.interest??x?.rating??x?.preference);return {school_name:text(x?.school_name??x?.school??x?.name)||"",interest:interest!=null?Math.max(0,Math.min(10,interest)):null,note:text(x?.note??x?.reason)}}).filter(x=>x.school_name);}

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
  const apCourses=(Array.isArray(r.ap_courses)?r.ap_courses:[]).map(normalizeAPCourse).filter(x=>x.subject);
  const ibCourses=(Array.isArray(r.ib_courses)?r.ib_courses:[]).map(normalizeIBCourse).filter(x=>x.subject);
  const alevelCourses=(Array.isArray(r.alevel_courses)?r.alevel_courses:[]).map(normalizeALevelCourse).filter(x=>x.subject);
  const schoolPreferences=normalizePreferences(r.school_preferences);
  const ap5=apCourses.filter(x=>x.status==="completed"&&x.score===5).length;
  const ap4=apCourses.filter(x=>x.status==="completed"&&x.score===4).length;
  const astar=alevelCourses.filter(x=>x.status==="completed"&&x.grade==="A*").length;

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
    ap_courses:apCourses, ib_courses:ibCourses, alevel_courses:alevelCourses,
    ap_5_count: apCourses.length?ap5:num(r.ap_5_count), ap_4_count: apCourses.length?ap4:num(r.ap_4_count), ib_predicted: num(r.ib_predicted), a_star_count: alevelCourses.length?astar:num(r.a_star_count),
    academic_rigor: normalizeStrength(r.academic_rigor, true),
    quantitative_preparation: normalizeStrength(r.quantitative_preparation, false),
    writing_preparation: normalizeStrength(r.writing_preparation, false),
    primary_major: canonicalMajorLabel(text(r.primary_major)), secondary_major: canonicalMajorLabel(text(r.secondary_major)),
    intended_countries: normalizeCountries(r.intended_countries),
    aid_need: oneOf(r.aid_need,["none","some","high","unknown"],{"no":"none","noaid":"none","noneed":"none","low":"some","moderate":"some","yes":"some","significant":"high","full":"high","highneed":"high"}),
    school_preferences:schoolPreferences,
    awards: awards.map(a => ({
      name: text(a?.name ?? a?.title) || "",
      level: normalizeAwardLevel(a?.level ?? a?.scope),
      status: oneOf(a?.status,["earned","planned","unknown"],{"received":"earned","won":"earned","completed":"earned","achieved":"earned","future":"planned","intended":"planned"}),
      major_related: bool(a?.major_related)
    })),
    activities: activities.map(a => ({
      name: text(a?.name ?? a?.title) || "",
      description: text(a?.description ?? a?.details ?? a?.content ?? a?.summary),
      category: normalizeActivityCategory(a?.category ?? a?.type, a?.name ?? a?.title),
      status: oneOf(a?.status,["completed","ongoing","planned","unknown"],{"current":"ongoing","active":"ongoing","inprogress":"ongoing","done":"completed","finished":"completed","future":"planned","intended":"planned"}),
      years: durationYears(a?.years ?? a?.duration_years ?? a?.duration),
      hours_per_week: weeklyHours(a?.hours_per_week ?? a?.weekly_hours ?? a?.hours_week),
      role: text(a?.role),
      impact_scope: normalizeImpact(a?.impact_scope ?? a?.scope),
      measurable_outcome: text(a?.measurable_outcome ?? a?.outcome ?? a?.impact ?? a?.deliverable ?? a?.result),
      major_related: bool(a?.major_related)
    })).map(a=>{const enriched={...a};enriched.impact_scope=inferImpactScope(enriched);enriched.measurable_outcome=inferOutcome(enriched,outputs.map(normalizeOutput).filter(Boolean));return enriched;}),
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
- Extract AP, IB and A-level subjects INDIVIDUALLY. For AP include subject, 1-5 score if completed, and completed/current/planned status. For IB include subject, HL/SL, 1-7 score if known, and status. For A-level include subject, grade and status. Never collapse subject-level coursework into only a total.
- Extract explicit school preferences such as "Johns Hopkins 9/10" into school_preferences with interest 0-10.
- Activities should capture a concise factual description of what the student actually did, plus duration, role, impact, concrete output and status. Do not discard project content after classifying the activity.
- Activities should capture duration, role, impact, concrete output and status. Infer conservatively when the source supports it: independent research/project with no external reach = self; school club/team = school; community-facing work = local; regional/national/international only when reach or competition stage is explicit.
- For measurable_outcome, a concrete finished deliverable (paper, poster, prototype, documentary, published article, competition result, club founded) is valid even if it is not numeric. Use null if there is no supported outcome; NEVER return the literal string "unknown" in free-text fields.
- Parse durations such as 2024-2026, 8 months, or 2 years into non-negative years. Never output a negative duration.
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
