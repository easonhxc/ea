import baseSchools from "@/data/schools.json";
import majors from "@/data/majors.json";
import highSchools from "@/data/high-schools.json";
import rankings from "@/data/rankings-2026.json";
import { resolveMajor, majorCategory } from "@/lib/major-resolver";
import { evaluateCourseFit } from "@/lib/academic-fit";
import { evaluateEvidenceFit } from "@/lib/evidence-fit";
import { buildAutomaticStrategy } from "@/lib/simulator";

const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const majorMap=Object.fromEntries(majors.map(m=>[m.slug,m]));
const hsMap=Object.fromEntries(highSchools.map(s=>[s.id,s]));
const categoryFor=text=>majorCategory(text);
const gradeScore=p=>({top1:98,top5:92,top10:84,top25:72,mid:56,unknown:76}[p.grade_band]||76);

function legacyAcademic(profile,category){
  let academic=gradeScore(profile),test=null;
  if(profile.sat)test=clamp((profile.sat-1200)/400*100);
  if(profile.act){const a=clamp((profile.act-24)/12*100);test=test==null?a:Math.max(test,a)}
  if(test!=null)academic=academic*.80+test*.20;
  const detailed=(profile.ap_courses?.length||0)+(profile.ib_courses?.length||0)+(profile.alevel_courses?.length||0);
  if(!detailed){
    if(profile.curriculum==="ap")academic+=clamp((profile.ap_5_count||0)*.85+(profile.ap_4_count||0)*.25,0,9);
    else if(profile.curriculum==="ib"&&profile.ib_predicted)academic+=clamp((profile.ib_predicted-36)*1.15,-5,9);
    else if(profile.curriculum==="alevel")academic+=clamp((profile.a_star_count||0)*1.8,0,9);
  }
  academic+=profile.academic_rigor==="highest"?4:profile.academic_rigor==="strong"?2:0;
  if(["engineering","computing","natural"].includes(category))academic+=profile.quantitative_preparation==="strong"?3:profile.quantitative_preparation==="weak"?-3:0;
  else if(["humanities","social"].includes(category))academic+=profile.writing_preparation==="strong"?3:profile.writing_preparation==="weak"?-3:0;
  return clamp(academic);
}
function academicScore(profile,category,course){
  const legacy=legacyAcademic(profile,category);if(!course||course.confidence<.5)return legacy;
  // Transcript/rank and tests remain primary; subject-by-subject rigor/major alignment now has material weight.
  return clamp(legacy*.66+course.course_strength*.09+course.course_alignment*.19+course.coverage*.06);
}
function activityScore(profile){
  const impact={self:50,school:63,local:75,regional:84,national:93,international:98,unknown:58};
  const vals=(profile.activities||[]).map(a=>{let v=48;if((a.years||0)>=4)v+=17;else if((a.years||0)>=3)v+=14;else if((a.years||0)>=2)v+=9;else if((a.years||0)>=1)v+=5;if((a.hours_per_week||0)>=15)v+=9;else if((a.hours_per_week||0)>=8)v+=6;else if((a.hours_per_week||0)>=3)v+=3;if(/founder|president|captain|lead|director|editor|chair|creator|创办|负责人|队长|主席|主编/i.test(a.role||""))v+=10;v+=((impact[a.impact_scope]||58)-58)*.33;if(a.measurable_outcome)v+=7;if(a.description&&a.description.length>80)v+=2;if(a.major_related)v+=3;const f=a.status==="planned"?.20:a.status==="unknown"?.80:1;return clamp(v*f,32,98)}).sort((a,b)=>b-a);
  if(!vals.length)return 50;const weights=[.34,.24,.18,.14,.10];let total=0,w=0;vals.slice(0,5).forEach((v,i)=>{total+=v*weights[i];w+=weights[i]});return clamp(total/w+Math.min(vals.length,5)*.8,45,100);
}
function awardScore(profile){const map={school:48,regional:63,national:79,international:90,elite:100,unknown:55};const vals=(profile.awards||[]).map(a=>((map[a.level]||55)+(a.major_related?3:0))*(a.status==="planned"?.15:1)).sort((a,b)=>b-a);if(!vals.length)return 43;return clamp(vals.slice(0,5).reduce((a,b)=>a+b,0)/Math.min(vals.length,5),40,100)}
function outputScore(profile,category){const outputs=(profile.distinctive_outputs||[]).length;const measured=(profile.activities||[]).filter(a=>a.measurable_outcome&&a.status!=="planned").length;let b=48+Math.min(outputs,4)*8+Math.min(measured,4)*4;if(category==="arts")b+=5;return clamp(b,42,100)}
function narrativeScore(profile){const m={unknown:68,average:62,good:80,excellent:95};const essay=m[profile.essay_quality]??68,rec=m[profile.recommendation_quality]??68,writing=profile.writing_preparation==="strong"?5:profile.writing_preparation==="weak"?-5:0;return clamp((essay+rec)/2+writing,50,100)}

export function scoreProfile(profile,majorText,aiAssessment=null){
  const category=categoryFor(majorText),course=evaluateCourseFit(profile,majorText),evidence=evaluateEvidenceFit(profile,majorText);
  const academic=academicScore(profile,category,course),rawActivities=activityScore(profile),activities=clamp(rawActivities*.82+evidence.project_major_alignment*.12+evidence.interdisciplinary_fit*.06),awards=awardScore(profile),output=clamp(outputScore(profile,category)*.78+evidence.project_evidence*.22),narrative=narrativeScore(profile);
  const weights={engineering:{academic:.37,activities:.26,output:.10,awards:.12,narrative:.15},computing:{academic:.38,activities:.24,output:.10,awards:.12,narrative:.16},natural:{academic:.37,activities:.25,output:.11,awards:.11,narrative:.16},life:{academic:.35,activities:.26,output:.11,awards:.11,narrative:.17},business:{academic:.34,activities:.27,output:.08,awards:.11,narrative:.20},social:{academic:.31,activities:.29,output:.06,awards:.09,narrative:.25},humanities:{academic:.30,activities:.28,output:.07,awards:.08,narrative:.27},arts:{academic:.24,activities:.24,output:.30,awards:.06,narrative:.16},agriculture:{academic:.34,activities:.30,output:.10,awards:.10,narrative:.16},other:{academic:.34,activities:.28,output:.10,awards:.10,narrative:.18}}[category]||{academic:.34,activities:.28,output:.10,awards:.10,narrative:.18};
  const base=academic*weights.academic+activities*weights.activities+output*weights.output+awards*weights.awards+narrative*weights.narrative;
  const auditableFit=course.course_alignment*.48+evidence.project_major_alignment*.37+evidence.interdisciplinary_fit*.15;
  const deterministic=base*.92+auditableFit*.08;
  const aiWeight=aiAssessment?clamp(.10*(aiAssessment.confidence??.6),.03,.10):0;
  const aiComposite=aiAssessment?aiAssessment.overall*.55+(aiAssessment.course_major_alignment??70)*.15+(aiAssessment.project_major_alignment??70)*.20+(aiAssessment.interdisciplinary_fit??70)*.10:null;
  const overall=aiAssessment?deterministic*(1-aiWeight)+aiComposite*aiWeight:deterministic;
  return {academic,activities,awards,output,narrative,deterministic,ai:aiAssessment?.overall??null,ai_weight:aiWeight,overall,category,weights,course_fit:course,evidence_fit:evidence,auditable_fit:auditableFit};
}

const SCHOOLWIDE=new Set(["Harvard","MIT","Stanford","Princeton","Yale","Caltech","Brown","UChicago","Georgia Tech","Dartmouth","Vanderbilt"]);
const PUBLIC_US=new Set(["UC Berkeley","UCLA","Michigan","UVA","UC San Diego","UT Austin","Florida","Georgia Tech","UIUC","Purdue","Wisconsin–Madison","Maryland","Ohio State","Penn State","Virginia Tech","Minnesota Twin Cities","Texas A&M","Arizona State","UC Davis","UC Irvine","UC Santa Barbara","UNC Chapel Hill","University of Washington","Colorado Boulder","Rutgers–New Brunswick","Stony Brook","UMass Amherst","Indiana Bloomington","Michigan State","Iowa State","NC State","UConn","Delaware","Pittsburgh"]);
function mergeOverrides(overrides=[]){const by=Object.fromEntries(overrides.map(o=>[o.school_name,o.data||{}]));return baseSchools.map(s=>({...s,...(by[s.name]||{})}))}
function strengthMultiplier(s,score){const base=Number(s.sel)||.25,anchor=base<.05?86:base<.10?84:base<.20?81:base<.35?77:72,denom=base<.20?17:22,raw=Math.exp((score.overall-anchor)/denom),caps=base<.10?[.55,1.70]:base<.20?[.60,1.75]:base<.35?[.65,1.55]:[.72,1.35];return clamp(raw,caps[0],caps[1])}
function highSchoolContext(profile,target,highSchoolOverrides=[]){const base=hsMap[profile.high_school_id];const ov=highSchoolOverrides.find(x=>x.high_school_id===profile.high_school_id&&x.verified);const hs=base?{...base,...(ov?.data||{}),verified:ov?true:base.verified,outcomes_url:ov?.source_url||base.outcomes_url,outcome_year:ov?.source_year||base.outcome_year}:null;if(!hs?.verified||!hs.context_strength)return {multiplier:1,label:null,source:null};let boost=Math.min(.045,Number(hs.context_strength)||0);const direct=(hs.outcomes?.matriculation_targets||[]).some(x=>x.toLowerCase()===target.name.toLowerCase());const offer=(hs.outcomes?.offer_targets||[]).some(x=>x.toLowerCase()===target.name.toLowerCase());if(direct)boost+=.01;else if(offer)boost+=.005;const total=hs.graduating_class||0;if(total&&target.rank<=20&&hs.outcomes?.top20_students)boost+=Math.min(.008,(hs.outcomes.top20_students/total)*.02);boost=clamp(boost,0,.06);return {multiplier:1+boost,label:`Verified school context +${(boost*100).toFixed(1)}% relative`,source:hs.outcomes_url||hs.profile_url,school:hs.name,year:hs.outcome_year,direct,offer_history:offer}}
function fitMultiplier(score){const c=score.course_fit?.course_alignment??65,p=score.evidence_fit?.project_major_alignment??65,i=score.evidence_fit?.interdisciplinary_fit??60;return clamp(.965+(c-65)/35*.030+(p-65)/35*.030+(i-60)/40*.020,.92,1.08)}
function probability(s,profile,score,highSchoolOverrides=[]){let baseline=Number(s.sel)||.25;if(!SCHOOLWIDE.has(s.name)){const factor={computing:.72,engineering:.90,business:.86,arts:.82,social:1.05,humanities:1.08,natural:1,life:.96,agriculture:1.08,other:1}[score.category]||1;baseline*=factor}const intl=["china_international","other_international"].includes(profile.applicant_type);if(intl&&s.country==="us"){baseline*=PUBLIC_US.has(s.name)?.90:.96;if(profile.aid_need==="high"&&!['Harvard','MIT','Yale','Princeton','Brown','Dartmouth'].includes(s.name))baseline*=.78}else if(intl&&s.country==="uk")baseline*=.98;const hs=highSchoolContext(profile,s,highSchoolOverrides);let p=baseline*strengthMultiplier(s,score)*fitMultiplier(score)*hs.multiplier;const ceiling=s.ultra?.14:baseline<.10?.24:baseline<.20?.40:baseline<.35?.58:.82;p=clamp(p,.006,ceiling);return {center:p,min:clamp(p*.75,.006,ceiling),max:clamp(p*1.29,p+.012,ceiling),baseline,high_school_context:hs}}
const tier=p=>p<.05?"Lottery":p<.10?"Super Reach":p<.20?"Reach":p<.40?"Target":"Likely";
const trackTier=(country,p)=>country==="uk"?(p<.10?"UK Aspirational":p<.24?"UK Competitive":p<.48?"UK Realistic":"UK Safer") : tier(p);
const programName=(s,slug)=>s.over?.[slug]||majorMap[slug]?.label||String(slug||"").replaceAll("_"," ");
const COMMON_APP_EXCLUDED=new Set(["MIT","Georgetown","UC Berkeley","UCLA","UC San Diego","UC Davis","UC Irvine","UC Santa Barbara"]);
const baseSchoolByName=Object.fromEntries(baseSchools.map(s=>[s.name,s]));
function commonAppMember(name,country){return country==="us"&&!COMMON_APP_EXCLUDED.has(name)}
function rankingFor(name){const country=baseSchoolByName[name]?.country;const r=rankings[name]||{};return {qs_world_2026:r.qs_world_2026??null,usnews_2026:r.usnews_2026??null,usnews_system:r.usnews_system||(country==="us"?"National University":"Best Global 2026-27"),common_app:commonAppMember(name,country)}}
function preference(profile,name){const n=String(name).toLowerCase().replace(/[^a-z0-9]/g,"");const x=(profile.school_preferences||[]).find(p=>{const q=String(p.school_name||"").toLowerCase().replace(/[^a-z0-9]/g,"");return q&&(q===n||q.includes(n)||n.includes(q))});return x?.interest??null}
function recommendationScore(row,profile){
  const fit=row.personal_fit_score||70,pref=preference(profile,row.school),p=row.probability||0;
  const frontier=p<.03?25:p<.08?58:p<.20?82:p<.45?95:88;
  // Explicit preference meaningfully personalizes the 20-school ladder, but cannot rescue an implausible school
  // because probability/profile guardrails are applied before the final selection.
  const prefTerm=(pref==null?6.5:pref)*2.4;
  return fit*.46+frontier*.27+(row.research||7)*1.15+prefTerm;
}
function quotaFor(score){if(score>=90)return {high:4,reach:6,target:6,likely:4};if(score>=84)return {high:3,reach:5,target:7,likely:5};if(score>=78)return {high:2,reach:4,target:7,likely:7};return {high:0,reach:3,target:7,likely:10}}
function appropriateForProfile(row,overall){
  const p=Number(row.probability)||0;
  const sel=Number(baseSchoolByName[row.school]?.sel)||.25;
  // Prevent prestige outliers from appearing merely to decorate a list. Ultra-selective
  // institutions only enter when the underlying profile band and modeled probability support them.
  if(sel<.045 && overall<90)return false;
  if(sel<.070 && overall<87)return false;
  if(overall<74)return p>=.14;
  if(overall<78)return p>=.10;
  if(overall<82)return p>=.065;
  if(overall<86)return p>=.035;
  if(overall<90)return p>=.015;
  return p>=.006;
}
function selectCommonApp20(rows,score,profile){
  const all=rows.filter(r=>r.country==="us"&&r.common_app).sort((a,b)=>b.recommendation_score-a.recommendation_score);
  const guarded=all.filter(r=>appropriateForProfile(r,score.overall));
  const maxHigh=score.overall>=90?3:score.overall>=86?2:score.overall>=82?1:0;
  const q=score.overall>=90?{high:3,reach:5,target:7,likely:5}:score.overall>=86?{high:2,reach:5,target:7,likely:6}:score.overall>=82?{high:1,reach:5,target:7,likely:7}:score.overall>=78?{high:0,reach:4,target:7,likely:9}:{high:0,reach:3,target:7,likely:10};
  const band=x=>["Lottery","Super Reach"].includes(x.tier)?"high":x.tier==="Reach"?"reach":x.tier==="Target"?"target":"likely";
  const chosen=[];
  const take=(pool,n)=>{for(const x of pool){if(chosen.length>=20||n<=0)break;if(chosen.includes(x))continue;if(band(x)==="high"&&chosen.filter(y=>band(y)==="high").length>=maxHigh)continue;chosen.push(x);n--;}};
  for(const k of ["high","reach","target","likely"])take(guarded.filter(x=>band(x)===k),q[k]);
  // Fill from the closest admissible probability bands first. Ranking never drives the fill order.
  take(guarded,20-chosen.length);
  if(chosen.length<20){
    const conservative=all.filter(x=>!chosen.includes(x)&&!["Lottery","Super Reach"].includes(x.tier));
    take(conservative,20-chosen.length);
  }
  if(chosen.length<20 && maxHigh>0)take(all,20-chosen.length);
  // Hard invariant for the product: with the built-in catalog the U.S. Common App list is exactly 20.
  // If catalog coverage ever degrades, use the nearest remaining modeled options rather than returning 0/partial silently.
  if(chosen.length<20)for(const x of all){if(chosen.length>=20)break;if(!chosen.includes(x))chosen.push(x)}
  return chosen.slice(0,20).sort((a,b)=>{const order={"Lottery":0,"Super Reach":1,Reach:2,Target:3,Likely:4};return (order[a.tier]-order[b.tier])||b.recommendation_score-a.recommendation_score});
}
function adjacentUSRows(schools,existing,profile,score,majorResolution,highSchoolOverrides){const existingNames=new Set(existing.map(x=>x.school));const targetCat=score.category;const out=[];for(const s of schools){const rk=rankingFor(s.name);if(s.country!=="us"||!rk.common_app||existingNames.has(s.name))continue;const alt=s.support.find(sl=>majorMap[sl]?.category===targetCat);if(!alt)continue;const pr=probability(s,profile,score,highSchoolOverrides);const row={school:s.name,country:"us",rank:s.rank,research:s.research,mechanism:"adjacent_program",recommended_direction:"primary",major:majorResolution.label||majorResolution.original||"Undeclared",program:programName(s,alt),major_match:"adjacent",probability:pr.center,interval:[pr.min,pr.max],tier:tier(pr.center),display_tier:trackTier("us",pr.center),profile_score:Math.round(score.overall),personal_fit_score:Math.round(score.auditable_fit),academic_fit:Math.round(score.course_fit.course_alignment),project_fit:Math.round(score.evidence_fit.project_major_alignment),interdisciplinary_fit:Math.round(score.evidence_fit.interdisciplinary_fit),fit_explanation:`Adjacent ${targetCat} pathway; exact intended major not confirmed in the built-in catalog.`,academic_details:score.course_fit.course_breakdown||[],academic_gaps:score.course_fit.missing_foundations||[],project_strengths:score.evidence_fit.evidence_strengths||[],project_gaps:score.evidence_fit.evidence_gaps||[],interdisciplinary_need:score.evidence_fit.interdisciplinary_need,interdisciplinary_note:score.evidence_fit.interdisciplinary_note,project_details:score.evidence_fit.details||[],high_school_context:pr.high_school_context,data_quality:s.data_quality||"seed",catalog_verified:!!s.catalog_verified,source_note:s.source_note||"Planning baseline; verify current official data.",qs_2026:rk.qs_world_2026,usnews_2026:rk.usnews_2026,usnews_system:rk.usnews_system,common_app:true};row.recommendation_score=recommendationScore(row,profile)-12;out.push(row)}return out}

function broadUSFallbackRows(schools,existing,profile,score,majorResolution,highSchoolOverrides){
  const existingNames=new Set(existing.map(x=>x.school)),out=[];const target=majorResolution.label||majorResolution.original||"intended major";
  for(const s of schools){const rk=rankingFor(s.name);if(s.country!=="us"||!rk.common_app||existingNames.has(s.name))continue;const pr=probability(s,profile,score,highSchoolOverrides);const row={school:s.name,country:"us",rank:s.rank,research:s.research,mechanism:"catalog_verification",recommended_direction:"primary",major:target,program:`Verify ${target} program`,major_match:"catalog_unverified",probability:pr.center,interval:[pr.min,pr.max],tier:tier(pr.center),display_tier:trackTier("us",pr.center),profile_score:Math.round(score.overall),personal_fit_score:Math.round(score.auditable_fit),academic_fit:Math.round(score.course_fit.course_alignment),project_fit:Math.round(score.evidence_fit.project_major_alignment),interdisciplinary_fit:Math.round(score.evidence_fit.interdisciplinary_fit),fit_explanation:`University-level fit is modeled, but the exact ${target} program needs catalog verification before applying.`,academic_details:score.course_fit.course_breakdown||[],academic_gaps:score.course_fit.missing_foundations||[],project_strengths:score.evidence_fit.evidence_strengths||[],project_gaps:score.evidence_fit.evidence_gaps||[],interdisciplinary_need:score.evidence_fit.interdisciplinary_need,interdisciplinary_note:score.evidence_fit.interdisciplinary_note,project_details:score.evidence_fit.details||[],high_school_context:pr.high_school_context,data_quality:s.data_quality||"seed",catalog_verified:false,source_note:s.source_note||"Planning baseline; verify current official data.",qs_2026:rk.qs_world_2026,usnews_2026:rk.usnews_2026,usnews_system:rk.usnews_system,common_app:true};row.recommendation_score=recommendationScore(row,profile)-18;out.push(row)}return out;
}

export function predict(profile,primaryMajorText,secondaryMajorText,overrides=[],aiAssessment=null,highSchoolOverrides=[]){
  const schools=mergeOverrides(overrides),primaryInput=primaryMajorText||profile.primary_major||"",secondaryInput=secondaryMajorText||profile.secondary_major||"";
  const primaryResolution=resolveMajor(primaryInput),secondaryResolution=secondaryInput?resolveMajor(secondaryInput):{slug:null,label:null,matched:false,method:"empty",confidence:0,category:"other"};
  const primarySlug=primaryResolution.slug,secondarySlug=secondaryResolution.slug,unresolvedAll=!primarySlug&&!secondarySlug;
  const primaryScore=scoreProfile(profile,primaryResolution.label||primaryInput||"Undeclared",aiAssessment),secondaryScore=secondarySlug?scoreProfile(profile,secondaryResolution.label||secondaryInput,aiAssessment):null;
  const rows=[],warnings=[];if(primaryInput&&!primaryResolution.matched)warnings.push(`Primary major “${primaryInput}” was not matched to the major catalog; using a broad fallback.`);if(secondaryInput&&!secondaryResolution.matched)warnings.push(`Secondary major “${secondaryInput}” was not matched and is not used for program filtering.`);
  for(const s of schools){const has1=primarySlug?s.support.includes(primarySlug):unresolvedAll,has2=secondarySlug?s.support.includes(secondarySlug):false;if(!has1&&!has2)continue;let p1=has1?probability(s,profile,primaryScore,highSchoolOverrides):null,p2=has2?probability(s,profile,secondaryScore,highSchoolOverrides):null,chosen=has1?"primary":"secondary",reason=null;if(p1&&p2){if(SCHOOLWIDE.has(s.name)){p2={...p2,center:p1.center,min:p1.min,max:p1.max};reason="Schoolwide admission: changing intended major does not create a modeled boost."}else if(p2.center>=Math.max(p1.center+.025,p1.center*1.18)){chosen="secondary";reason="Secondary direction is materially friendlier only if the profile genuinely supports it."}else reason="Primary direction remains the stronger strategic choice."}const chosenSlug=chosen==="primary"?primarySlug:secondarySlug,chosenScore=chosen==="primary"?primaryScore:secondaryScore,pr=chosen==="primary"?p1:p2,chosenMajor=chosen==="primary"?(primaryResolution.label||primaryInput||"Undeclared"):(secondaryResolution.label||secondaryInput);const rk=rankingFor(s.name);const row={school:s.name,country:s.country,rank:s.rank,research:s.research,mechanism:SCHOOLWIDE.has(s.name)?"schoolwide":s.country==="uk"?"course":"college_or_major",recommended_direction:chosen,major:chosenMajor,program:chosenSlug?programName(s,chosenSlug):"Undeclared / verify program",major_match:"direct",primary:p1?{...p1,program:primarySlug?programName(s,primarySlug):"Undeclared / verify program"}:null,secondary:p2?{...p2,program:programName(s,secondarySlug)}:null,second_major_reason:reason,probability:pr.center,interval:[pr.min,pr.max],tier:tier(pr.center),display_tier:trackTier(s.country,pr.center),profile_score:Math.round(chosenScore.overall),personal_fit_score:Math.round(chosenScore.auditable_fit),academic_fit:Math.round(chosenScore.course_fit.course_alignment),project_fit:Math.round(chosenScore.evidence_fit.project_major_alignment),interdisciplinary_fit:Math.round(chosenScore.evidence_fit.interdisciplinary_fit),fit_explanation:`Course alignment ${Math.round(chosenScore.course_fit.course_alignment)}/100 · project-content alignment ${Math.round(chosenScore.evidence_fit.project_major_alignment)}/100 · interdisciplinary fit ${Math.round(chosenScore.evidence_fit.interdisciplinary_fit)}/100.`,academic_details:chosenScore.course_fit.course_breakdown||[],academic_gaps:chosenScore.course_fit.missing_foundations||[],project_strengths:chosenScore.evidence_fit.evidence_strengths||[],project_gaps:chosenScore.evidence_fit.evidence_gaps||[],interdisciplinary_need:chosenScore.evidence_fit.interdisciplinary_need,interdisciplinary_note:chosenScore.evidence_fit.interdisciplinary_note,project_details:chosenScore.evidence_fit.details||[],ai_score:aiAssessment?.overall??null,high_school_context:pr.high_school_context,data_quality:s.data_quality||"seed",catalog_verified:!!s.catalog_verified,source_note:s.source_note||"Planning baseline; verify current official data.",qs_2026:rk.qs_world_2026,usnews_2026:rk.usnews_2026,usnews_system:rk.usnews_system,common_app:!!rk.common_app};row.recommendation_score=recommendationScore(row,profile);rows.push(row)}
  let allRows=[...rows];let caCandidates=allRows.filter(x=>x.country==="us"&&x.common_app);
  if(caCandidates.length<20){const adj=adjacentUSRows(schools,allRows,profile,primaryScore,primaryResolution,highSchoolOverrides);allRows=allRows.concat(adj);caCandidates=allRows.filter(x=>x.country==="us"&&x.common_app);if(adj.length)warnings.push("The exact-major Common App pool had fewer than 20 options, so adjacent-field choices were added and clearly labeled for program verification.")}
  if(caCandidates.length<20){const broad=broadUSFallbackRows(schools,allRows,profile,primaryScore,primaryResolution,highSchoolOverrides);allRows=allRows.concat(broad);caCandidates=allRows.filter(x=>x.country==="us"&&x.common_app);if(broad.length)warnings.push("A small number of catalog-unverified U.S. options were added only to complete the 20-slot planning list; verify the exact major before applying.")}
  const usCommonApp20=selectCommonApp20(allRows,primaryScore,profile);if(usCommonApp20.length<20)warnings.push(`The built-in U.S. catalog currently produced ${usCommonApp20.length}/20 Common App recommendations. This is a data-quality failure and should be fixed before using the list.`);
  const usOutsideCommon=allRows.filter(x=>x.country==="us"&&!x.common_app).sort((a,b)=>b.recommendation_score-a.recommendation_score).slice(0,12);
  const ukTrack=allRows.filter(x=>x.country==="uk").sort((a,b)=>b.recommendation_score-a.recommendation_score||b.probability-a.probability).slice(0,15);
  const otherTracks={};for(const c of ["canada","singapore","hk","australia","europe"])otherTracks[c]=allRows.filter(x=>x.country===c).sort((a,b)=>b.recommendation_score-a.recommendation_score).slice(0,12);
  const roundStrategy=buildAutomaticStrategy(usCommonApp20,usOutsideCommon,profile);
  return {primary_major:primaryResolution.label||primaryInput||null,secondary_major:secondaryResolution.label||secondaryInput||null,major_resolution:{primary:primaryResolution,secondary:secondaryResolution},warnings,scores:primaryScore,ai_assessment:aiAssessment||null,schools:allRows.sort((a,b)=>b.recommendation_score-a.recommendation_score).slice(0,100),us_common_app_20:usCommonApp20,us_outside_common_app:usOutsideCommon,uk_track:ukTrack,other_tracks:otherTracks,round_strategy:roundStrategy,ranking_snapshot:"QS World University Rankings 2026 + U.S. News Best Colleges 2026; non-U.S. schools use Best Global Universities 2026–27 where verified. Rankings are display-only.",common_app_note:"Common App supports up to 20 colleges. Membership and round policies should be re-verified for the applicant's actual cycle."};
}
export function slugForMajor(text){return resolveMajor(text).slug}
