import roundRules from "@/data/rounds.json";

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
