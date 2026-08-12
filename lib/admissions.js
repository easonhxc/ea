import baseSchools from "@/data/schools.json";
import majors from "@/data/majors.json";
import highSchools from "@/data/high-schools.json";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const majorMap=Object.fromEntries(majors.map(m=>[m.slug,m]));
const hsMap=Object.fromEntries(highSchools.map(s=>[s.id,s]));

function slugifyMajor(text=""){
  const q=String(text).toLowerCase().trim();
  const aliases=[["materials","materials_engineering"],["computer science","computer_science"],["environmental engineering","environmental_engineering"],["mechanical engineering","mechanical_engineering"],["electrical engineering","electrical_engineering"],["biomedical engineering","biomedical_engineering"],["economics","economics"],["finance","finance"],["business","business_administration"],["political science","political_science"],["international relations","international_relations"],["psychology","psychology"],["history","history"],["philosophy","philosophy"],["english","english"],["biology","biology"],["neuroscience","neuroscience"],["physics","physics"],["chemistry","chemistry"],["mathematics","mathematics"],["architecture","architecture"],["film","film"],["music","music"]];
  for(const [needle,slug] of aliases) if(q.includes(needle)) return slug;
  return q.replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
const categoryFor=text=>majorMap[slugifyMajor(text)]?.category||"other";
const gradeScore=p=>({top1:98,top5:92,top10:84,top25:72,mid:56,unknown:76}[p.grade_band]||76);

function academicScore(profile,category){
  let academic=gradeScore(profile),test=null;
  if(profile.sat) test=clamp((profile.sat-1200)/400*100,0,100);
  if(profile.act){const a=clamp((profile.act-24)/12*100,0,100);test=test==null?a:Math.max(test,a)}
  if(test!=null) academic=academic*.80+test*.20;
  if(profile.curriculum==="ap") academic+=clamp((profile.ap_5_count||0)*.85+(profile.ap_4_count||0)*.25,0,9);
  else if(profile.curriculum==="ib"&&profile.ib_predicted) academic+=clamp((profile.ib_predicted-36)*1.15,-5,9);
  else if(profile.curriculum==="alevel") academic+=clamp((profile.a_star_count||0)*1.8,0,9);
  academic+=profile.academic_rigor==="highest"?4:profile.academic_rigor==="strong"?2:0;
  if(["engineering","computing","natural"].includes(category)){
    academic+=profile.quantitative_preparation==="strong"?3:profile.quantitative_preparation==="weak"?-3:0;
    academic+=profile.writing_preparation==="strong"?.5:0;
  }else if(["humanities","social"].includes(category)){
    academic+=profile.writing_preparation==="strong"?3:profile.writing_preparation==="weak"?-3:0;
  }else if(category==="business"){
    academic+=profile.quantitative_preparation==="strong"?1.8:0;academic+=profile.writing_preparation==="strong"?1.8:0;
  }else{academic+=profile.writing_preparation==="strong"?1.2:0;academic+=profile.quantitative_preparation==="strong"?1.2:0}
  return clamp(academic,0,100);
}

function activityScore(profile){
  const impact={self:50,school:63,local:75,regional:84,national:93,international:98,unknown:58};
  const vals=(profile.activities||[]).map(a=>{
    let v=48;
    if((a.years||0)>=4)v+=17;else if((a.years||0)>=3)v+=14;else if((a.years||0)>=2)v+=9;else if((a.years||0)>=1)v+=5;
    if((a.hours_per_week||0)>=15)v+=9;else if((a.hours_per_week||0)>=8)v+=6;else if((a.hours_per_week||0)>=3)v+=3;
    if(/founder|president|captain|lead|director|editor|chair|创办|负责人|队长|主席|主编/i.test(a.role||""))v+=10;
    v+=((impact[a.impact_scope]||58)-58)*.33;if(a.measurable_outcome)v+=7;if(a.major_related)v+=3;
    const statusFactor=a.status==="planned"?.25:a.status==="unknown"?.85:1;
    return clamp(v*statusFactor,35,98);
  }).sort((a,b)=>b-a);
  if(!vals.length)return 50;const weights=[.34,.24,.18,.14,.10];let total=0,w=0;
  vals.slice(0,5).forEach((v,i)=>{total+=v*weights[i];w+=weights[i]});return clamp(total/w+Math.min(vals.length,5)*.8,45,100);
}
function awardScore(profile){
  const map={school:48,regional:63,national:79,international:90,elite:100,unknown:55};
  const vals=(profile.awards||[]).map(a=>((map[a.level]||55)+(a.major_related?3:0))*(a.status==="planned"?.15:1)).sort((a,b)=>b-a);
  if(!vals.length)return 43;return clamp(vals.slice(0,5).reduce((a,b)=>a+b,0)/Math.min(vals.length,5),40,100);
}
function outputScore(profile,category){const outputs=(profile.distinctive_outputs||[]).length;const measured=(profile.activities||[]).filter(a=>a.measurable_outcome&&a.status!=="planned").length;let b=48+Math.min(outputs,4)*8+Math.min(measured,4)*4;if(category==="arts")b+=5;return clamp(b,42,100)}
function narrativeScore(profile){const m={unknown:68,average:62,good:80,excellent:95};const essay=m[profile.essay_quality]??68,rec=m[profile.recommendation_quality]??68,writing=profile.writing_preparation==="strong"?5:profile.writing_preparation==="weak"?-5:0;return clamp((essay+rec)/2+writing,50,100)}

export function scoreProfile(profile,majorText,aiAssessment=null){
  const category=categoryFor(majorText),academic=academicScore(profile,category),activities=activityScore(profile),awards=awardScore(profile),output=outputScore(profile,category),narrative=narrativeScore(profile);
  const weights={engineering:{academic:.37,activities:.26,output:.10,awards:.12,narrative:.15},computing:{academic:.38,activities:.24,output:.10,awards:.12,narrative:.16},natural:{academic:.37,activities:.25,output:.11,awards:.11,narrative:.16},life:{academic:.35,activities:.26,output:.11,awards:.11,narrative:.17},business:{academic:.34,activities:.27,output:.08,awards:.11,narrative:.20},social:{academic:.31,activities:.29,output:.06,awards:.09,narrative:.25},humanities:{academic:.30,activities:.28,output:.07,awards:.08,narrative:.27},arts:{academic:.24,activities:.24,output:.30,awards:.06,narrative:.16},agriculture:{academic:.34,activities:.30,output:.10,awards:.10,narrative:.16},other:{academic:.34,activities:.28,output:.10,awards:.10,narrative:.18}}[category]||{academic:.34,activities:.28,output:.10,awards:.10,narrative:.18};
  const deterministic=academic*weights.academic+activities*weights.activities+output*weights.output+awards*weights.awards+narrative*weights.narrative;
  const aiWeight=aiAssessment?clamp(.12*(aiAssessment.confidence??.6),.04,.12):0;
  const overall=aiAssessment?deterministic*(1-aiWeight)+aiAssessment.overall*aiWeight:deterministic;
  return {academic,activities,awards,output,narrative,deterministic,ai:aiAssessment?.overall??null,ai_weight:aiWeight,overall,category,weights};
}

const SCHOOLWIDE=new Set(["Harvard","MIT","Stanford","Princeton","Yale","Caltech","Brown","UChicago","Georgia Tech","Dartmouth","Vanderbilt"]);
const PUBLIC_US=new Set(["UC Berkeley","UCLA","Michigan","UVA","UC San Diego","UT Austin","Florida","Georgia Tech","UIUC","Purdue","Wisconsin–Madison","Maryland","Ohio State","Penn State","Virginia Tech","Minnesota Twin Cities","Texas A&M","Arizona State","UC Davis","UC Irvine","UC Santa Barbara","UNC Chapel Hill","University of Washington","Colorado Boulder","Rutgers–New Brunswick","Stony Brook","UMass Amherst","Indiana Bloomington","Michigan State","Iowa State","NC State","UConn","Delaware","Pittsburgh"]);
function mergeOverrides(overrides=[]){const by=Object.fromEntries(overrides.map(o=>[o.school_name,o.data||{}]));return baseSchools.map(s=>({...s,...(by[s.name]||{})}))}
function strengthMultiplier(s,score){const base=Number(s.sel)||.25,anchor=base<.05?86:base<.10?84:base<.20?81:base<.35?77:72,denom=base<.20?17:22,raw=Math.exp((score.overall-anchor)/denom),caps=base<.10?[.55,1.70]:base<.20?[.60,1.75]:base<.35?[.65,1.55]:[.72,1.35];return clamp(raw,caps[0],caps[1])}

function highSchoolContext(profile,target,highSchoolOverrides=[]){
  const base=hsMap[profile.high_school_id];
  const ov=highSchoolOverrides.find(x=>x.high_school_id===profile.high_school_id&&x.verified);
  const hs=base?{...base,...(ov?.data||{}),verified:ov?true:base.verified,outcomes_url:ov?.source_url||base.outcomes_url,outcome_year:ov?.source_year||base.outcome_year}:null;
  if(!hs?.verified||!hs.context_strength)return {multiplier:1,label:null,source:null};
  let boost=Math.min(.045,Number(hs.context_strength)||0);
  const direct=(hs.outcomes?.matriculation_targets||[]).some(x=>x.toLowerCase()===target.name.toLowerCase());
  if(direct)boost+=.01;
  const total=hs.graduating_class||0;
  if(total&&target.rank<=20&&hs.outcomes?.top20_students)boost+=Math.min(.008,(hs.outcomes.top20_students/total)*.02);
  boost=clamp(boost,0,.06);
  return {multiplier:1+boost,label:`Verified school context +${(boost*100).toFixed(1)}% relative`,source:hs.outcomes_url||hs.profile_url,school:hs.name,year:hs.outcome_year,direct};
}

function probability(s,profile,score,highSchoolOverrides=[]){
  let baseline=Number(s.sel)||.25;
  if(!SCHOOLWIDE.has(s.name)){const factor={computing:.72,engineering:.90,business:.86,arts:.82,social:1.05,humanities:1.08,natural:1,life:.96,agriculture:1.08,other:1}[score.category]||1;baseline*=factor}
  const intl=["china_international","other_international"].includes(profile.applicant_type);
  if(intl&&s.country==="us"){
    baseline*=PUBLIC_US.has(s.name)?.90:.96;
    if(profile.aid_need==="high"&&!['Harvard','MIT','Yale','Princeton','Brown','Dartmouth'].includes(s.name))baseline*=.78;
  }else if(intl&&s.country==="uk")baseline*=.98;
  const hs=highSchoolContext(profile,s,highSchoolOverrides);
  let p=baseline*strengthMultiplier(s,score)*hs.multiplier;
  const ceiling=s.ultra?.14:baseline<.10?.24:baseline<.20?.40:baseline<.35?.58:.82;p=clamp(p,.006,ceiling);
  return {center:p,min:clamp(p*.75,.006,ceiling),max:clamp(p*1.29,p+.012,ceiling),baseline,high_school_context:hs};
}
const tier=p=>p<.05?"Lottery":p<.10?"Super Reach":p<.20?"Reach":p<.40?"Target":"Likely";
const programName=(s,slug)=>s.over?.[slug]||majorMap[slug]?.label||String(slug||"").replaceAll("_"," ");

export function predict(profile,primaryMajorText,secondaryMajorText,overrides=[],aiAssessment=null,highSchoolOverrides=[]){
  const schools=mergeOverrides(overrides),primarySlug=slugifyMajor(primaryMajorText||profile.primary_major||""),secondarySlug=secondaryMajorText?slugifyMajor(secondaryMajorText):null;
  const primaryScore=scoreProfile(profile,primaryMajorText||profile.primary_major||primarySlug,aiAssessment),secondaryScore=secondaryMajorText?scoreProfile(profile,secondaryMajorText,aiAssessment):null,rows=[];
  for(const s of schools){
    const has1=s.support.includes(primarySlug),has2=secondarySlug&&s.support.includes(secondarySlug);if(!has1&&!has2)continue;
    let p1=has1?probability(s,profile,primaryScore,highSchoolOverrides):null,p2=has2?probability(s,profile,secondaryScore,highSchoolOverrides):null,chosen=has1?"primary":"secondary",reason=null;
    if(p1&&p2){if(SCHOOLWIDE.has(s.name)){p2={...p2,center:p1.center,min:p1.min,max:p1.max};reason="Schoolwide admission: intended-major switching does not create a modeled boost."}else if(p2.center>=Math.max(p1.center+.025,p1.center*1.18)){chosen="secondary";reason="Secondary direction is modeled as materially friendlier; only use it if the profile genuinely supports that field."}else reason="Primary direction remains the stronger strategic choice."}
    const chosenSlug=chosen==="primary"?primarySlug:secondarySlug,chosenScore=chosen==="primary"?primaryScore:secondaryScore,pr=chosen==="primary"?p1:p2;
    rows.push({school:s.name,country:s.country,rank:s.rank,research:s.research,mechanism:SCHOOLWIDE.has(s.name)?"schoolwide":s.country==="uk"?"course":"college_or_major",recommended_direction:chosen,major:chosen==="primary"?(primaryMajorText||profile.primary_major):secondaryMajorText,program:programName(s,chosenSlug),primary:p1?{...p1,program:programName(s,primarySlug)}:null,secondary:p2?{...p2,program:programName(s,secondarySlug)}:null,second_major_reason:reason,probability:pr.center,interval:[pr.min,pr.max],tier:tier(pr.center),profile_score:Math.round(chosenScore.overall),ai_score:aiAssessment?.overall??null,high_school_context:pr.high_school_context,data_quality:s.data_quality||"seed",catalog_verified:!!s.catalog_verified,source_note:s.source_note||"Planning baseline; verify current official data."});
  }
  return {primary_major:primaryMajorText||profile.primary_major,secondary_major:secondaryMajorText||null,scores:primaryScore,ai_assessment:aiAssessment||null,schools:rows.sort((a,b)=>a.rank-b.rank||b.probability-a.probability).slice(0,90)};
}
export function slugForMajor(text){return slugifyMajor(text)}
