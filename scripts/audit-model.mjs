import assert from "node:assert/strict";
import fs from "node:fs";

const schools=JSON.parse(fs.readFileSync(new URL("../data/schools.json",import.meta.url),"utf8"));
const rounds=JSON.parse(fs.readFileSync(new URL("../data/rounds.json",import.meta.url),"utf8"));
const simulatorSource=fs.readFileSync(new URL("../lib/simulator.js",import.meta.url),"utf8")
  .replace('import roundRules from "@/data/rounds.json";','const roundRules=__roundRules;')
  .replace('import { preferenceFor } from "@/lib/school-preference";','const preferenceFor=__preferenceFor;')
  .replaceAll("export function ","function ");
const simulator=new Function("__roundRules","__preferenceFor",`${simulatorSource};return {rulesForSchool,validatePlan,oneCycle,monteCarlo,buildAutomaticStrategy};`)(rounds,()=>null);

const errors=[];
const check=(condition,message)=>{if(!condition)errors.push(message)};
for(const school of schools){
  check(Number.isFinite(Number(school.sel))&&school.sel>0&&school.sel<=1,`${school.name}: invalid selectivity`);
  if(school.cds?.status==="available"){
    check(/^\d{4}-\d{2}$/.test(school.cds.year||""),`${school.name}: available CDS lacks an academic year`);
    check(/^https?:\/\//.test(school.cds.source_url||""),`${school.name}: available CDS lacks a source URL`);
    const values=school.cds.values||{};
    check(!(values.applied?.value<values.admitted?.value),`${school.name}: CDS admits exceed applicants`);
    check(!(values.admitted?.value<values.enrolled_first_year?.value),`${school.name}: CDS enrollment exceeds admits`);
  }
}

const conflict=simulator.validatePlan([{id:"ed-a",school_name:"Duke",country:"us",round:"ED1"},{id:"ed-b",school_name:"Vanderbilt",country:"us",round:"ED1"}]);
check(conflict.errors.some(x=>x.includes("Only one ED I")),"ED I conflict was not detected");
const oxbridge=simulator.validatePlan([{id:"ox",school_name:"Oxford",country:"uk",round:"OX"},{id:"cam",school_name:"Cambridge",country:"uk",round:"OX"}]);
check(oxbridge.errors.some(x=>x.includes("Oxford and Cambridge")),"Oxbridge conflict was not detected");
const restrictive=simulator.validatePlan([{school_name:"Stanford",country:"us",round:"REA"},{school_name:"MIT",country:"us",round:"EA"}]);
check(restrictive.warnings.length===1,"restrictive-early conflict was missed for draft plans without IDs");
const cycle=simulator.oneCycle([{id:"ed",school_name:"Duke",round:"ED1",probability:1},{id:"rd",school_name:"Rice",round:"RD",probability:1}]);
check(cycle.binding&&cycle.results.find(x=>x.id==="rd")?.outcome==="Withdrawn","binding ED did not withdraw later applications");
const simulation=simulator.monteCarlo([{id:"rd",school_name:"Rice",round:"RD",probability:1,rank:17}],100);
check(simulation.expected_admits===1&&simulation.zero_admit_risk===0,"certain-admit simulation is inconsistent");

assert.equal(errors.length,0,errors.join("\n"));
console.log(`Model audit passed: ${schools.length} schools, CDS integrity, early-round conflicts, and simulation invariants.`);
