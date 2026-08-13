import roundRules from "@/data/rounds.json";
import { preferenceFor } from "@/lib/school-preference";

const PHASE = {ED1:1,EA:1,EA2:1,REA:1,SCEA:1,ROLLING:1,ED2:2,OX:2,RD:3,RA:3,UC:3,UCAS:3};
const BINDING = new Set(["ED1","ED2"]);

export function rulesForSchool(name,country="us") {
  return roundRules[name] || {plans:[country==="uk"?"UCAS":"RD"],default:country==="uk"?"UCAS":"RD",note:"Verify the current cycle with the university."};
}

export function validatePlan(plans=[]) {
  const errors=[],warnings=[];
  const ed1 = plans.filter(p=>p.round==="ED1");
  if (ed1.length>1) errors.push("Only one ED I application can be active at a time.");
  const restrictive = plans.filter(p=>["REA","SCEA"].includes(p.round));
  if (restrictive.length>1) errors.push("You cannot hold multiple restrictive/single-choice early applications.");
  if (restrictive.length) {
    const anchor=restrictive[0];
    const conflicts=plans.filter(p=>p.id!==anchor.id && p.country==="us" && ["ED1","EA","EA2","REA","SCEA"].includes(p.round));
    if (conflicts.length) warnings.push(`Check ${anchor.school_name}'s restrictive-early rules against: ${conflicts.map(x=>x.school_name).join(", ")}.`);
  }
  if (plans.some(p=>p.school_name==="Oxford") && plans.some(p=>p.school_name==="Cambridge")) {
    errors.push("A standard undergraduate UCAS applicant generally cannot apply to Oxford and Cambridge in the same cycle.");
  }
  return {errors,warnings};
}

function draw(p) { return Math.random() < Math.max(.001,Math.min(.999,p || 0)); }

export function oneCycle(plans=[]) {
  const ordered=[...plans].sort((a,b)=>(PHASE[a.round]||3)-(PHASE[b.round]||3));
  const results=[],deferred=[];
  let binding=false;

  for (const app of ordered) {
    const phase=PHASE[app.round]||3;
    if (binding) {
      results.push({...app,outcome:"Withdrawn",note:"A binding ED offer was already accepted."});
      continue;
    }

    const p=app.probability || 0;
    if (draw(p)) {
      results.push({...app,outcome:"Admit",note:BINDING.has(app.round)?"Binding offer; unresolved applications are withdrawn.":"Offer received."});
      if (BINDING.has(app.round)) binding=true;
      continue;
    }

    if (phase===1 && Math.random()<Math.min(.22,Math.max(.06,p*.8))) {
      const item={...app,outcome:"Defer",note:"Moves to a later review stage."};
      results.push(item); deferred.push(item); continue;
    }

    if (phase===3 && Math.random()<Math.min(.14,Math.max(.03,p*.45))) {
      results.push({...app,outcome:"Waitlist",note:"Waitlist is not counted as an admit."});
    } else {
      results.push({...app,outcome:"Deny",note:"Final denial in this simulated cycle."});
    }
  }

  if (!binding) {
    for (const d of deferred) {
      const idx=results.findIndex(x=>x.id===d.id);
      const laterP=Math.max(.01,(d.probability || 0)*.65);
      let final="Deny";
      if (draw(laterP)) final="Admit";
      else if (Math.random()<.10) final="Waitlist";
      results[idx]={...results[idx],outcome:`Defer → ${final}`,note:"Deferred application resolved in later review."};
    }
  }

  const admits=results.filter(x=>x.outcome==="Admit"||x.outcome==="Defer → Admit").length;
  return {results,admits,binding};
}

export function monteCarlo(plans=[],runs=1000) {
  runs=Math.max(100,Math.min(10000,Number(runs)||1000));
  let total=0,zero=0,binding=0,top20=0;
  let visible=null;

  for (let i=0;i<runs;i++) {
    const cycle=oneCycle(plans);
    if (i===0) visible=cycle;
    total+=cycle.admits;
    if (cycle.admits===0) zero++;
    if (cycle.binding) binding++;
    if (cycle.results.some(r => (r.rank||999)<=20 && (r.outcome==="Admit"||r.outcome==="Defer → Admit"))) top20++;
  }

  return {
    runs,
    expected_admits:total/runs,
    zero_admit_risk:zero/runs,
    binding_finish_rate:binding/runs,
    top20_hit_rate:top20/runs,
    visible_cycle:visible
  };
}

export function optimizeEarly(plans=[]) {
  const enriched=(plans||[]).map(p=>({...p,country:p.country||rulesForSchool(p.school_name).country||null,rank:Number(p.rank)||999}));
  const ed1Pool=enriched.filter(p=>rulesForSchool(p.school_name,p.country).plans.includes("ED1"));
  const ed2Pool=enriched.filter(p=>rulesForSchool(p.school_name,p.country).plans.includes("ED2"));
  const earlyPool=enriched.filter(p=>rulesForSchool(p.school_name,p.country).plans.some(x=>["EA","EA2","REA","SCEA"].includes(x)));

  const dedupe=(items)=>{const out=[];for(const x of items){if(x&&!out.some(y=>y.school_name===x.school_name))out.push(x)}return out;};
  const ambitious=(pool)=>[...pool].sort((a,b)=>(a.rank||999)-(b.rank||999)||(a.probability||0)-(b.probability||0))[0]||null;
  const probability=(pool)=>[...pool].sort((a,b)=>(b.probability||0)-(a.probability||0)||(a.rank||999)-(b.rank||999))[0]||null;
  const balanced=(pool)=>[...pool].sort((a,b)=>{
    const score=x=>(Number(x.probability)||0)*70 + Math.max(0,30-(Number(x.rank)||999))*.5;
    return score(b)-score(a);
  })[0]||null;
  const toCandidate=(x,label)=>x?{school:x.school_name,label,probability:x.probability,tier:x.tier,rank:x.rank}:null;

  const ed1Candidates=dedupe([ambitious(ed1Pool),balanced(ed1Pool),probability(ed1Pool)]).map((x,i)=>toCandidate(x,["Ambitious","Balanced","Probability-first"][i]||"Candidate"));
  const ed2Candidates=dedupe([balanced(ed2Pool),probability(ed2Pool),ambitious(ed2Pool)]).slice(0,3).map((x,i)=>toCandidate(x,["Balanced","Probability-first","Ambitious"][i]||"Candidate"));
  const ea=earlyPool.sort((a,b)=>(a.rank||999)-(b.rank||999)||b.probability-a.probability).slice(0,5).map(x=>x.school_name);
  const rdCore=enriched.filter(p=>!['UC','UCAS','OX'].includes(p.round)).sort((a,b)=>{
    const tierOrder={Likely:0,Target:1,Reach:2,"Super Reach":3,Lottery:4};
    return (tierOrder[a.tier]??9)-(tierOrder[b.tier]??9)||(a.rank||999)-(b.rank||999);
  }).map(x=>x.school_name);

  return {
    ed1:ed1Candidates[0]||null,
    ed2:ed2Candidates[0]||null,
    ed1_candidates:ed1Candidates,
    ed2_candidates:ed2Candidates,
    ea,
    rd_core:rdCore,
    note:"Round planning is portfolio organization, not a causal ED boost estimate. Binding choices still require personal preference, affordability, and current-cycle policy verification."
  };
}

function prefScore(profile,name){return preferenceFor(profile,name)}
function strategyValue(row,profile){
  const pref=prefScore(profile,row.school);const fit=Number(row.personal_fit_score||row.profile_score||70);
  const p=Number(row.probability)||0;const research=Number(row.research)||7;
  return (pref==null?6.5:pref)*6 + fit*.38 + Math.min(.45,p)*35 + research*1.2;
}

export function buildAutomaticStrategy(common20=[],outsideCommon=[],profile={}){
  const us=[...(common20||[]),...(outsideCommon||[])];
  const byValue=[...us].sort((a,b)=>strategyValue(b,profile)-strategyValue(a,profile));
  const edEligible=x=>{
    const pref=prefScore(profile,x.school);
    // Binding early should not be generated merely because a high-probability school is easy.
    // Reach/Target schools are eligible on modeled fit; a Likely requires an explicit near-first-choice signal.
    if(["Lottery","Super Reach","Reach","Target"].includes(x.tier))return true;
    return x.tier==="Likely" && pref!=null && pref>=9.5;
  };
  const ed1Pool=byValue.filter(x=>rulesForSchool(x.school,"us").plans.includes("ED1")&&edEligible(x));
  const ed2Pool=byValue.filter(x=>rulesForSchool(x.school,"us").plans.includes("ED2")&&edEligible(x));
  const restrictivePool=byValue.filter(x=>rulesForSchool(x.school,"us").plans.some(r=>["REA","SCEA"].includes(r)));
  const explicitPrefs=(profile.school_preferences||[]).some(x=>Number(x.interest)>=8);

  const bestED=ed1Pool[0]||null;
  const bestRestrictive=restrictivePool[0]||null;
  const edPref=bestED?prefScore(profile,bestED.school):null;
  const restrictivePref=bestRestrictive?prefScore(profile,bestRestrictive.school):null;
  // If a student explicitly rates a restrictive-early school as a materially stronger first choice,
  // prefer that route instead of inventing a binding ED commitment elsewhere.
  const chooseRestrictive=!!bestRestrictive && restrictivePref!=null && restrictivePref>=9.5 && (edPref==null || restrictivePref>=edPref+1);
  const route=chooseRestrictive?"restrictive_early":bestED?"binding_ed":"nonbinding_early";
  const ed1=route==="binding_ed"?bestED:null;
  const restrictive=route==="restrictive_early"?bestRestrictive:null;
  const ed2=route==="binding_ed"?ed2Pool.find(x=>x.school!==ed1?.school)||null:null;
  const restrictiveRound=restrictive?rulesForSchool(restrictive.school,"us").plans.find(r=>["REA","SCEA"].includes(r)):null;

  const publicOrGenerallyCompatibleEA=new Set([
    "MIT","Michigan","Georgia Tech","Rutgers–New Brunswick","UMass Amherst","UNC Chapel Hill",
    "UVA","Ohio State","Penn State","Virginia Tech","Purdue","Wisconsin–Madison","Maryland",
    "Minnesota Twin Cities","Texas A&M","Arizona State","NC State","UConn","Stony Brook"
  ]);

  const plan=[];
  for(const x of common20||[]){
    const rules=rulesForSchool(x.school,"us");let round="RD";
    if(x.school===ed1?.school)round="ED1";
    else if(x.school===ed2?.school)round="ED2"; // conditional phase-2 fallback in the simulator
    else if(x.school===restrictive?.school)round=restrictiveRound||"REA";
    else if(route==="restrictive_early"){
      // Keep the automatic recommendation conservative: only obvious public/nonbinding-compatible EA
      // is left early; current-cycle school-specific restrictions must still be verified.
      if(publicOrGenerallyCompatibleEA.has(x.school)&&rules.plans.includes("EA"))round="EA";
      else if(publicOrGenerallyCompatibleEA.has(x.school)&&rules.plans.includes("EA2"))round="EA2";
    } else if(rules.plans.includes("EA"))round="EA";
    else if(rules.plans.includes("EA2"))round="EA2";
    const round_reason=round==="ED1"?"Model-selected binding first choice: strongest ED-eligible combination of preference (if supplied), personal fit, and calibrated list value.":round==="ED2"?"Conditional ED II fallback only if ED I does not end the process.":round==="EA"||round==="EA2"?"Use the available nonbinding early round to receive an earlier decision without consuming the ED slot.":round==="REA"||round==="SCEA"?"Restrictive early route selected because this school is the strongest stated early preference; verify conflict rules before applying.":"Keep in RD to preserve flexibility and portfolio balance.";
    plan.push({school_name:x.school,program:x.program,country:"us",round,round_reason,probability:x.probability,probability_min:x.interval?.[0],probability_max:x.interval?.[1],tier:x.tier,rank:x.usnews_2026||x.rank||999,draft:true});
  }

  // Outside Common App schools such as MIT and UC campuses are shown separately but still receive a round recommendation.
  const outsidePlan=(outsideCommon||[]).slice(0,10).map(x=>{
    const rules=rulesForSchool(x.school,"us");let round="RD";
    if(x.school===restrictive?.school)round=restrictiveRound||"REA";
    else if(route==="restrictive_early"){
      if(publicOrGenerallyCompatibleEA.has(x.school)&&rules.plans.includes("EA"))round="EA";
      else if(publicOrGenerallyCompatibleEA.has(x.school)&&rules.plans.includes("EA2"))round="EA2";
      else if(rules.plans.includes("UC"))round="UC";
      else if(rules.plans.includes("RA"))round="RA";
    } else if(rules.plans.includes("EA"))round="EA";
    else if(rules.plans.includes("EA2"))round="EA2";
    else if(rules.plans.includes("UC"))round="UC";
    else if(rules.plans.includes("RA"))round="RA";
    const round_reason=round==="EA"||round==="EA2"?"Nonbinding early option outside the Common App 20-slot list.":round==="UC"?"Apply through the UC system; this does not consume a Common App slot.":round==="REA"||round==="SCEA"?"Restrictive early option; verify all conflict rules before submission.":"Separate application system / regular-round recommendation.";
    return {school_name:x.school,program:x.program,country:"us",round,round_reason,probability:x.probability,probability_min:x.interval?.[0],probability_max:x.interval?.[1],tier:x.tier,rank:x.usnews_2026||x.rank||999,draft:true};
  });

  const combined=[...plan,...outsidePlan];
  const ea=combined.filter(x=>["EA","EA2","REA","SCEA"].includes(x.round)).map(x=>x.school_name);
  const rdCore=plan.filter(x=>x.round==="RD").map(x=>x.school_name);
  return {
    route,
    ed1:ed1?{school:ed1.school,probability:ed1.probability,tier:ed1.tier,preference:prefScore(profile,ed1.school),rationale:`Recommended binding ED I because it has the strongest combination of stated preference, academic/project fit and modeled list value among ED schools.${explicitPrefs?" Explicit school preferences were used.":" No strong explicit preference was supplied, so treat this as a model candidate—not permission to make a binding commitment."}`} : null,
    ed2:ed2?{school:ed2.school,probability:ed2.probability,tier:ed2.tier,preference:prefScore(profile,ed2.school),rationale:"Conditional ED II fallback only if ED I does not end the process. It is modeled as the phase-2 binding application, not as a simultaneous second ED."}:null,
    restrictive_option:restrictive?{school:restrictive.school,plan:restrictiveRound,rationale:"Recommended instead of ED I because your stated preference for this restrictive-early school is materially stronger. Other early applications are kept conservative to avoid obvious policy conflicts."}:bestRestrictive?{school:bestRestrictive.school,plan:rulesForSchool(bestRestrictive.school,"us").plans.find(r=>["REA","SCEA"].includes(r)),alternative:true,rationale:"Alternative restrictive-early route. Use it only if this school becomes the clear first early preference; do not combine it blindly with a binding ED I."}:null,
    ea,rd_core:rdCore,recommended_plan:plan,outside_common_app_plan:outsidePlan,
    note:"Generated automatically from the model output. No saved-school list is required. Common App recommendations are a separate 20-school U.S. track; UK/UC/other systems are not mixed into that ladder. Rankings are display context, not probability features. Verify every current-cycle early policy before submitting."
  };
}

