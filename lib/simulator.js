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
  const candidates=plans.filter(p=>rulesForSchool(p.school_name,p.country).plans.includes("ED1"));
  candidates.sort((a,b)=>(b.probability||0)-(a.probability||0));
  const ed1=candidates[0]||null;
  const ed2=plans.filter(p=>p.id!==ed1?.id && rulesForSchool(p.school_name,p.country).plans.includes("ED2"))
    .sort((a,b)=>(b.probability||0)-(a.probability||0))[0]||null;
  const ea=plans.filter(p=>rulesForSchool(p.school_name,p.country).plans.some(x=>["EA","EA2"].includes(x)))
    .sort((a,b)=>(b.probability||0)-(a.probability||0)).slice(0,4);

  return {
    ed1:ed1?{school:ed1.school_name,reason:"Best combination of modeled probability and an available binding ED I plan in your saved list. Confirm it is truly your first choice and affordable."}:null,
    ed2:ed2?{school:ed2.school_name,reason:"Contingency ED II option if ED I does not produce a binding offer."}:null,
    ea:ea.map(x=>x.school_name),
    note:"This optimizer does not treat a school's raw ED admit rate as a causal boost. It only organizes your saved list around available round types and modeled individual risk."
  };
}
