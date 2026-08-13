import { resolveMajor } from "@/lib/major-resolver";

const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const clean=v=>String(v||"").normalize("NFKC").toLowerCase().replace(/[^a-z0-9一-鿿]+/g," ").trim();

const SUBJECTS=[
  ["calculus",/calculus|calc\b|微积分|数学分析/],
  ["mathematics",/mathematics|math\b|数学|further math|高等数学/],
  ["statistics",/statistics|stats?\b|统计/],
  ["physics",/physics|物理/],
  ["chemistry",/chemistry|化学/],
  ["biology",/biology|生物/],
  ["environment",/environment|环境|earth science|地球科学/],
  ["computer_science",/computer science|computing|programming|informatics|计算机|编程/],
  ["economics",/economics|microeconomics|macroeconomics|经济/],
  ["english",/english|literature|language|writing|英语|文学|写作/],
  ["history",/history|历史/],
  ["social_science",/psychology|sociology|politics|government|human geography|社会|心理|政治|地理/],
  ["art",/art|design|music|theatre|film|艺术|设计|音乐|戏剧|电影/]
];
function subjectKey(s){const x=clean(s);for(const [k,re] of SUBJECTS)if(re.test(x))return k;return "other"}

// Weights are about preparation for the intended field, not a ranking of the course itself.
// Related subjects can satisfy broader foundations (e.g. Calculus BC also demonstrates mathematics).
const REQ={
  materials_engineering:{calculus:1,physics:1,chemistry:1,mathematics:.55,computer_science:.35,statistics:.35,english:.2},
  environmental_engineering:{calculus:1,chemistry:1,physics:.8,biology:.65,environment:.8,mathematics:.5,statistics:.45,computer_science:.3,english:.25},
  mechanical_engineering:{calculus:1,physics:1,mathematics:.55,chemistry:.4,computer_science:.45,statistics:.35,english:.2},
  chemical_engineering:{calculus:1,chemistry:1,physics:.65,mathematics:.5,biology:.35,computer_science:.25,english:.2},
  computer_science:{calculus:.9,computer_science:1,mathematics:.65,physics:.55,statistics:.65,english:.25},
  artificial_intelligence:{calculus:1,computer_science:1,statistics:.9,mathematics:.65,physics:.35,english:.2},
  data_science:{statistics:1,calculus:.8,computer_science:.8,mathematics:.55,economics:.35,english:.2},
  physics:{calculus:1,physics:1,mathematics:.6,chemistry:.3,computer_science:.4},
  chemistry:{chemistry:1,calculus:.55,physics:.5,mathematics:.35,biology:.35},
  biology:{biology:1,chemistry:.8,statistics:.55,calculus:.45,physics:.35},
  economics:{economics:1,calculus:.8,statistics:.7,mathematics:.5,english:.45,social_science:.35},
  business_administration:{economics:.7,english:.65,statistics:.55,mathematics:.45,social_science:.35},
  political_science:{english:1,social_science:1,history:.8,statistics:.35,economics:.35},
  sociology:{social_science:1,english:.9,history:.55,statistics:.45},
  history:{history:1,english:1,social_science:.55},
  english:{english:1,history:.5,social_science:.35},
};
function requirements(major){
  const r=resolveMajor(major);
  if(REQ[r.slug])return REQ[r.slug];
  switch(r.category){
    case"engineering":return {calculus:1,physics:.9,chemistry:.6,mathematics:.5,computer_science:.35,english:.2};
    case"computing":return REQ.computer_science;
    case"natural":return {calculus:.6,physics:.55,chemistry:.55,biology:.55,mathematics:.35,computer_science:.3};
    case"humanities":return {english:1,history:.75,social_science:.45};
    case"social":return {social_science:1,english:.8,statistics:.4,economics:.35};
    case"business":return REQ.business_administration;
    default:return {mathematics:.45,english:.45};
  }
}
function achievement(course,type){
  if(course.status==="planned")return .12;
  if(course.status==="current")return .55;
  if(type==="ap")return ({5:1,4:.86,3:.64,2:.32,1:.15}[course.score]||.5);
  if(type==="ib"){const score=course.score||4;return clamp((score-2)/5,.25,1)*(course.level==="HL"?1:.82)}
  if(type==="alevel")return ({"A*":1,A:.9,B:.72,C:.5,D:.3,E:.18,U:.08,predicted:.5,unknown:.45}[course.grade]||.45);
  return .5;
}

function bestFor(best,key){
  const direct=best[key];
  const candidates=[];
  if(direct)candidates.push({...direct,substitution:1,source_key:key});
  // A calculus course is also strong evidence of general mathematics preparation.
  if(key==="mathematics"&&best.calculus)candidates.push({...best.calculus,achievement:best.calculus.achievement*.98,substitution:.98,source_key:"calculus"});
  // IB/A-level Mathematics often contains calculus; credit it, but do not treat it as identical to AP Calculus BC.
  if(key==="calculus"&&best.mathematics)candidates.push({...best.mathematics,achievement:best.mathematics.achievement*.84,substitution:.84,source_key:"mathematics"});
  // Statistics contributes partially to a broad mathematics foundation, never the reverse.
  if(key==="mathematics"&&best.statistics)candidates.push({...best.statistics,achievement:best.statistics.achievement*.72,substitution:.72,source_key:"statistics"});
  return candidates.sort((a,b)=>b.achievement-a.achievement)[0]||null;
}
function relevanceForCourse(req,c){
  let rel=req[c.key]||0;
  if(c.key==="calculus")rel=Math.max(rel,(req.mathematics||0)*.98);
  if(c.key==="mathematics")rel=Math.max(rel,(req.calculus||0)*.84);
  if(c.key==="statistics")rel=Math.max(rel,(req.mathematics||0)*.72);
  return Math.min(1,rel);
}

export function evaluateCourseFit(profile,major){
  const req=requirements(major),courses=[];
  for(const c of profile.ap_courses||[])courses.push({...c,type:"ap",key:subjectKey(c.subject)});
  for(const c of profile.ib_courses||[])courses.push({...c,type:"ib",key:subjectKey(c.subject)});
  for(const c of profile.alevel_courses||[])courses.push({...c,type:"alevel",key:subjectKey(c.subject)});
  if(!courses.length)return {course_strength:65,course_alignment:65,coverage:55,missing_foundations:[],course_breakdown:[],confidence:.25};

  const best={};
  for(const c of courses){const a=achievement(c,c.type);if(!best[c.key]||a>best[c.key].achievement)best[c.key]={...c,achievement:a}}
  let denom=0,got=0,covered=0;const completedStrength=[],missing=[];
  for(const [key,w] of Object.entries(req)){
    denom+=w;const b=bestFor(best,key);
    if(b){got+=w*b.achievement;covered+=w*Math.min(1,b.substitution||1);if(b.status==="completed")completedStrength.push(b.achievement)}
    else if(w>=.75)missing.push(key);
  }
  const alignment=denom?100*got/denom:65;
  const coverage=denom?100*covered/denom:60;
  const strength=completedStrength.length?100*completedStrength.reduce((a,b)=>a+b,0)/completedStrength.length:60;
  const breakdown=courses.map(c=>({
    subject:c.subject,type:c.type,status:c.status,score:c.score??c.grade??null,
    relevance:relevanceForCourse(req,c),achievement:Math.round(achievement(c,c.type)*100),subject_key:c.key
  })).sort((a,b)=>b.relevance-a.relevance||b.achievement-a.achievement);
  return {course_strength:clamp(strength),course_alignment:clamp(alignment),coverage:clamp(coverage),missing_foundations:[...new Set(missing)],course_breakdown:breakdown,confidence:.9};
}
